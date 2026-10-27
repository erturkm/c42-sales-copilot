import { C42FoundryCallsService } from '../generated/services/C42FoundryCallsService'
import { C42FoundryRealtimeService } from '../generated/services/C42FoundryRealtimeService'
import { dlog } from './log'
import { AppConfig } from './config'
import { loadRuntimeConfig, runtimeConfig } from './envconfig'
import { asObj, errMsg, type Json } from './mcp'

export type RealtimeEvent =
  | { kind: 'connected' }
  | { kind: 'userTranscript'; text: string }
  | { kind: 'assistantDelta'; text: string }
  | { kind: 'assistantDone'; text: string }
  | { kind: 'speechStarted' }
  | { kind: 'speaking'; value: boolean }
  | { kind: 'responseDone' }
  | { kind: 'toolCall'; callId: string; name: string; args: string }
  | { kind: 'failed'; message: string }
  | { kind: 'transientError'; message: string }

export interface ConnectOptions {
  tools: Json[]
  instructions: string
  voice: string
  voiceEnabled: boolean
}

const DELTA = ['response.output_audio_transcript.delta', 'response.audio_transcript.delta', 'response.output_text.delta', 'response.text.delta']
const DONE = ['response.output_audio_transcript.done', 'response.audio_transcript.done', 'response.output_text.done', 'response.text.done']

/** Foundry gpt-realtime over WebRTC with an ephemeral key; events travel on the 'oai-events' data channel. */
export class RealtimeClient {
  onEvent: (e: RealtimeEvent) => void = () => {}
  private pc?: RTCPeerConnection
  private dc?: RTCDataChannel
  private audioEl?: HTMLAudioElement
  private sender?: RTCRtpSender
  private mic?: MediaStream
  private micCtx?: AudioContext
  private heard = false
  private levelTimer?: ReturnType<typeof setInterval>
  private closing = false
  private textBuffer = ''
  private responding = false
  private speaking = false
  private seenCalls = new Set<string>()
  onLevel: (level: number) => void = () => {}
  micMuted = false
  lastError = ''
  eventsReceived = 0

  get isAlive(): boolean { return this.dc?.readyState === 'open' && this.pc?.connectionState !== 'failed' }
  get hasMic(): boolean { return !!this.mic }

  private async mintKey(voice: string): Promise<string> {
    const r = await C42FoundryRealtimeService.CreateRealtimeClientSecret(runtimeConfig().foundryHost, {
      session: { type: 'realtime', model: runtimeConfig().realtimeModel, audio: { output: { voice } } },
    })
    const value = asObj(r.data).value
    if (typeof value !== 'string') throw new Error(`The assistant session response didn't contain a key. ${errMsg(r.error ?? '')}`.trim())
    return value
  }

  async connect(opts: ConnectOptions): Promise<void> {
    const rc = await loadRuntimeConfig()
    if (!rc.foundryHost) throw new Error('The Foundry endpoint is not configured. Ask an admin to set the c42_FoundryEndpoint environment variable.')
    dlog('minting key')
    const key = await this.mintKey(opts.voice)
    dlog('key minted')
    this.closing = false
    const pc = new RTCPeerConnection()
    this.pc = pc

    // sendrecv with no track: no mic prompt in chat mode, and replaceTrack later needs no renegotiation.
    const transceiver = pc.addTransceiver('audio', { direction: 'sendrecv' })
    this.sender = transceiver.sender

    const audio = sharedAudio()
    this.audioEl = audio
    pc.ontrack = (ev) => {
      dlog(`remote track ${ev.track.kind} state=${ev.track.readyState}`)
      audio.srcObject = ev.streams[0] ?? new MediaStream([ev.track])
      audio.play().then(() => dlog('audio.play ok')).catch((e) => dlog(`audio.play BLOCKED: ${(e as Error).name}`))
    }
    // iOS Safari needs the mic track in the offer; attaching it after negotiation often stays silent.
    if (opts.voiceEnabled) await this.startMic()

    const dc = pc.createDataChannel('oai-events')
    this.dc = dc
    dc.onmessage = (m) => this.handle(String(m.data))
    dc.onclose = () => { if (!this.closing) this.onEvent({ kind: 'failed', message: 'The assistant connection closed.' }) }
    pc.oniceconnectionstatechange = () => dlog(`ice ${pc.iceConnectionState}`)
    pc.onconnectionstatechange = () => {
      dlog(`pc ${pc.connectionState}`)
      if (!this.closing && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) {
        this.onEvent({ kind: 'failed', message: `Voice connection ${pc.connectionState}.` })
      }
    }

    const opened = new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timed out opening the assistant data channel.')), 20_000)
      dc.onopen = () => { clearTimeout(t); resolve() }
    })

    await pc.setLocalDescription(await pc.createOffer())
    const res = await C42FoundryCallsService.CreateRealtimeCall(runtimeConfig().foundryHost, runtimeConfig().realtimeModel, `Bearer ${key}`, pc.localDescription?.sdp ?? '')
    const sdp = asObj(res.data).sdp
    if (typeof sdp !== 'string' || !sdp.startsWith('v=')) throw new Error(`Realtime handshake failed. ${errMsg(res.error ?? res.data ?? '')}`.slice(0, 300))
    dlog(`sdp answer ${sdp.length}b; local audio dir=${sdp.includes('a=recvonly') ? 'server recvonly' : sdp.includes('a=sendrecv') ? 'sendrecv' : 'other'}`)
    await pc.setRemoteDescription({ type: 'answer', sdp })
    await opened

    this.configure(opts)
    this.onEvent({ kind: 'connected' })
  }

  private configure(o: ConnectOptions) {
    const session: Json = {
      type: 'realtime',
      instructions: o.instructions,
      tools: o.tools,
      tool_choice: 'auto',
      output_modalities: o.voiceEnabled ? ['audio'] : ['text'],
    }
    if (o.voiceEnabled) {
      session.audio = {
        input: {
          noise_reduction: { type: AppConfig.noiseReduction },
          turn_detection: { type: 'semantic_vad', eagerness: AppConfig.vadEagerness, create_response: true, interrupt_response: true },
          transcription: { model: AppConfig.transcriptionModel },
        },
        output: { voice: o.voice },
      }
    }
    this.send({ type: 'session.update', session })
  }

  disconnect() {
    this.closing = true
    this.stopMic()
    try { this.dc?.close() } catch { /* already closed */ }
    try { this.pc?.close() } catch { /* already closed */ }
    if (this.audioEl) { this.audioEl.srcObject = null }
    this.dc = undefined; this.pc = undefined; this.audioEl = undefined; this.sender = undefined
    this.responding = false; this.speaking = false
  }

  // MARK: sending

  private send(payload: Json) {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(payload))
  }

  sendText(text: string) {
    this.send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } })
    this.send({ type: 'response.create' })
  }

  sendToolResult(callId: string, output: string) {
    this.send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output } })
    this.send({ type: 'response.create' })
  }

  /** Barge-in: stop generating and drop whatever audio is still buffered. */
  interrupt() {
    if (this.responding) this.send({ type: 'response.cancel' })
    this.send({ type: 'output_audio_buffer.clear' })
  }

  // MARK: microphone

  async startMic(): Promise<void> {
    if (this.mic) return
    dlog('getUserMedia requested')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
    } catch (e) {
      dlog(`getUserMedia FAILED: ${(e as Error).name}: ${(e as Error).message}`)
      throw e
    }
    const track = stream.getAudioTracks()[0]
    if (!track) { stream.getTracks().forEach((t) => t.stop()); throw new Error('No microphone found.') }
    dlog(`mic track ok: ${track.label || 'unlabelled'} state=${track.readyState} muted=${track.muted} enabled=${track.enabled}`)
    track.onmute = () => dlog('mic track muted by system')
    track.onunmute = () => dlog('mic track unmuted')
    track.onended = () => dlog('mic track ended')
    track.enabled = !this.micMuted
    this.mic = stream
    await this.sender?.replaceTrack(track)
    void this.audioEl?.play().catch(() => {})

    const ctx = new AudioContext()
    void ctx.resume().then(() => dlog(`audioctx ${ctx.state}`)).catch(() => {})
    this.micCtx = ctx
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    ctx.createMediaStreamSource(stream).connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    this.levelTimer = setInterval(() => {
      if (this.micMuted) { this.onLevel(0); return }
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (const s of buf) sum += s * s
      const lvl = Math.min(1, Math.sqrt(sum / buf.length) * 4)
      if (lvl > 0.02 && !this.heard) { this.heard = true; dlog('mic level: audio detected') }
      this.onLevel(lvl)
    }, 50)
  }

  stopMic() {
    if (this.levelTimer) clearInterval(this.levelTimer)
    this.levelTimer = undefined
    void this.sender?.replaceTrack(null).catch(() => {})
    this.mic?.getTracks().forEach((t) => t.stop())
    this.mic = undefined
    void this.micCtx?.close().catch(() => {})
    this.micCtx = undefined
    this.onLevel(0)
  }

  setMuted(muted: boolean) {
    this.micMuted = muted
    this.mic?.getAudioTracks().forEach((t) => { t.enabled = !muted })
  }

  // MARK: receiving

  private setSpeaking(v: boolean) {
    if (this.speaking === v) return
    this.speaking = v
    this.onEvent({ kind: 'speaking', value: v })
  }

  private emitToolCall(callId: unknown, name: unknown, args: unknown) {
    if (typeof callId !== 'string' || typeof name !== 'string' || this.seenCalls.has(callId)) return
    this.seenCalls.add(callId)
    this.onEvent({ kind: 'toolCall', callId, name, args: typeof args === 'string' && args ? args : '{}' })
  }

  private handle(raw: string) {
    let ev: Json
    try { ev = asObj(JSON.parse(raw)) } catch { return }
    const type = typeof ev.type === 'string' ? ev.type : ''
    this.eventsReceived++

    if (DELTA.includes(type)) {
      if (typeof ev.delta === 'string') { this.textBuffer += ev.delta; this.onEvent({ kind: 'assistantDelta', text: ev.delta }) }
      return
    }
    if (DONE.includes(type)) {
      const text = (typeof ev.transcript === 'string' ? ev.transcript : typeof ev.text === 'string' ? ev.text : this.textBuffer)
      this.textBuffer = ''
      if (text) this.onEvent({ kind: 'assistantDone', text })
      return
    }

    if (type !== 'response.output_audio_transcript.delta' && type !== 'response.output_text.delta' && !type.endsWith('.delta')) dlog(`evt ${type}${type === 'error' ? ' ' + JSON.stringify(ev.error).slice(0, 200) : ''}`)
    switch (type) {
      case 'input_audio_buffer.speech_started':
        this.onEvent({ kind: 'speechStarted' })
        break
      case 'conversation.item.input_audio_transcription.completed':
        if (typeof ev.transcript === 'string' && ev.transcript.trim()) this.onEvent({ kind: 'userTranscript', text: ev.transcript.trim() })
        break
      case 'response.created':
        this.responding = true
        break
      case 'output_audio_buffer.started':
        this.setSpeaking(true)
        break
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        this.setSpeaking(false)
        break
      case 'response.function_call_arguments.done':
        this.emitToolCall(ev.call_id, ev.name, ev.arguments)
        break
      case 'response.output_item.done': {
        const item = asObj(ev.item)
        if (item.type === 'function_call') this.emitToolCall(item.call_id, item.name, item.arguments)
        break
      }
      case 'response.done':
        this.responding = false
        this.onEvent({ kind: 'responseDone' })
        break
      case 'error': {
        const e = asObj(ev.error)
        const message = typeof e.message === 'string' ? e.message : 'Realtime error'
        this.lastError = message
        if (this.isAlive) this.onEvent({ kind: 'transientError', message })
        else this.onEvent({ kind: 'failed', message })
        break
      }
    }
  }
}

let audioEl: HTMLAudioElement | undefined
/** One persistent element in the DOM, unlocked by the first tap, so iOS allows playback of the remote stream. */
function sharedAudio(): HTMLAudioElement {
  if (audioEl) return audioEl
  const a = document.createElement('audio')
  a.autoplay = true
  a.setAttribute('playsinline', '')
  a.style.display = 'none'
  document.body.appendChild(a)
  audioEl = a
  const unlock = () => {
    void a.play().catch(() => {})
    document.removeEventListener('pointerdown', unlock, true)
    document.removeEventListener('touchend', unlock, true)
  }
  document.addEventListener('pointerdown', unlock, true)
  document.addEventListener('touchend', unlock, true)
  return a
}
if (typeof document !== 'undefined') sharedAudio()
