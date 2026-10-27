import { useEffect, useSyncExternalStore } from 'react'
import { getContext } from '@microsoft/power-apps/app'
import { MicrosoftDataverseService } from '../generated/services/MicrosoftDataverseService'
import type { Account360, ChartSpec, ConnectionState, Message, Mode, SessionApi } from './types'
import { loadRuntimeConfig } from './envconfig'
import { AppConfig, loadVoice, saveVoice } from './config'
import { DataverseMCP, asObj, errMsg, type Json } from './mcp'
import { dlog } from './log'
import { WorkIQ } from './workiq'
import { RealtimeClient, type RealtimeEvent } from './realtime'
import { instructions } from './prompts'
import { LOCAL_TOOLS, buildToolSchemas, humanise, isWorkIQTool, parseArgs, runLocalTool, runWorkIQTool, summarise } from './tools'

const uid = () => crypto.randomUUID()
const esc = (s: string) => s.replace(/'/g, "''")

interface Patch {
  messages?: Message[]; mode?: Mode; state?: ConnectionState; isListening?: boolean; isSpeaking?: boolean; isMuted?: boolean
  inputLevel?: number; busyTool?: string | undefined; toolCount?: number; latestChart?: ChartSpec | undefined
  latestCard?: Account360 | undefined; voice?: string; userName?: string
}

class SessionEngine {
  private messages: Message[] = []
  private mode: Mode = 'chat'
  private state: ConnectionState = { kind: 'idle' }
  private isListening = false
  private isSpeaking = false
  private isMuted = false
  private inputLevel = 0
  private busyTool: string | undefined
  private toolCount = 0
  private latestChart: ChartSpec | undefined
  private latestCard: Account360 | undefined
  private voice = loadVoice()
  private voiceChosen = false
  private userName = ''

  private dv = new DataverseMCP()
  private wiq: WorkIQ | undefined
  private rt: RealtimeClient | undefined
  private userId = ''
  private startingListening = false
  private pendingTools = 0
  private started = false
  private connecting: Promise<void> | undefined
  private listeners = new Set<() => void>()
  private snap: SessionApi

  constructor() {
    this.snap = this.buildSnapshot()
  }

  // MARK: store plumbing

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  getSnapshot = () => this.snap

  private emit() {
    this.snap = this.buildSnapshot()
    this.listeners.forEach((l) => l())
  }

  private set(patch: Patch) {
    Object.assign(this, patch)
    this.emit()
  }

  private buildSnapshot(): SessionApi {
    return {
      messages: this.messages, mode: this.mode, state: this.state, isListening: this.isListening, isSpeaking: this.isSpeaking,
      isMuted: this.isMuted, inputLevel: this.inputLevel, busyTool: this.busyTool, toolCount: this.toolCount,
      latestChart: this.latestChart, latestCard: this.latestCard, voice: this.voice, userName: this.userName || 'there',
      connect: () => this.connect(), disconnect: () => this.disconnect(), resetConversation: () => this.resetConversation(),
      send: (t) => this.send(t), startListening: () => this.startListening(), stopListening: () => this.stopListening(),
      toggleMute: () => this.toggleMute(), switchMode: (m) => this.switchMode(m), changeVoice: (v) => this.changeVoice(v),
      dismissChart: () => this.set({ latestChart: undefined }), dismissCard: () => this.set({ latestCard: undefined }),
      diagnostics: () => this.diagnostics(),
    }
  }

  private diagnostics(): [string, string][] {
    const rt = this.rt
    return [
      ['Listening', this.isListening ? 'yes' : 'no'],
      ['Muted', this.isMuted ? 'yes' : 'no'],
      ['Data channel', rt?.isAlive ? 'open' : 'DEAD'],
      ['Mic track', rt?.hasMic ? 'live' : 'none'],
      ['Mic level', this.inputLevel.toFixed(3)],
      ['Realtime events', String(rt?.eventsReceived ?? 0)],
      ['Dataverse tools', String(this.dv.tools.length)],
      ['Work IQ', this.wiq ? `${this.wiq.tools.length} tools` : 'unavailable'],
      ['Last realtime error', rt?.lastError || 'none'],
    ]
  }

  // MARK: connect

  start(): Promise<void> {
    if (this.started && this.connecting) return this.connecting
    if (this.started) return Promise.resolve()
    this.started = true
    return this.connect()
  }

  connect(): Promise<void> {
    if (this.connecting) return this.connecting
    this.connecting = this.doConnect().finally(() => { this.connecting = undefined })
    return this.connecting
  }

  private async doConnect() {
    let step = 'Connecting'
    this.rt?.disconnect(); this.rt = undefined
    this.set({ state: { kind: 'connecting' }, messages: [], latestChart: undefined, latestCard: undefined, busyTool: undefined, isSpeaking: false })
    try {
      step = 'Connecting to Dataverse'
      dlog('step: dataverse init')
      await this.dv.init()
      await this.dv.listTools()

      dlog(`dataverse tools ${this.dv.tools.length}`)
      step = 'Identifying you'
      const wiqReady = this.connectWorkIQ()
      await this.resolveUser(wiqReady)

      dlog(`identified: ${this.userName || '(none)'} id=${this.userId ? 'yes' : 'no'}`)
      step = 'Starting the assistant'
      await this.connectRealtime()
      dlog('ready')
      this.set({ state: { kind: 'ready' } })
      if (this.mode === 'voice') await this.startListening()
    } catch (e) {
      dlog(`CONNECT FAILED at ${step}: ${errMsg(e)} ${(e as Error)?.stack?.slice(0, 250) ?? ''}`)
      this.set({ state: { kind: 'failed', message: `${step}: ${errMsg(e)}` } })
    }
  }

  /** Work IQ is optional: CRM keeps working without mail and calendar. */
  private connectWorkIQ(): Promise<boolean> {
    const client = new WorkIQ()
    return (async () => {
      try {
        await client.init()
        await client.listTools()
        await client.probe()
        this.wiq = client
        return true
      } catch (e) {
        dlog(`workiq unavailable: ${errMsg(e)}`)
        console.warn('[session] Work IQ unavailable', errMsg(e))
        this.wiq = undefined
        return false
      }
    })()
  }

  /** WhoAmI via the connector, then fall back to Work IQ's profile; failure is non-fatal. */
  private async resolveUser(wiqReady: Promise<boolean>) {
    this.userId = ''
    let name = ''
    let upn = ''
    try {
      const ctx = await getContext()
      name = ctx.user.fullName ?? ''
      upn = ctx.user.userPrincipalName ?? ''
      if (ctx.user.systemUserId) this.userId = ctx.user.systemUserId
    } catch (e) {
      console.warn('[session] getContext failed', errMsg(e))
    }
    if (!this.userId && upn) {
      try {
        const rows = await this.dv.query(`SELECT TOP 1 systemuserid, fullname FROM systemuser WHERE internalemailaddress = '${esc(upn)}'`)
        if (rows[0]) { this.userId = String(rows[0].systemuserid ?? ''); name = String(rows[0].fullname ?? name) }
      } catch (e) {
        console.warn('[session] systemuser lookup by upn failed', errMsg(e))
      }
    }
    if (this.userId) { await wiqReady; this.set({ userName: name }); return }
    try {
      const r = await MicrosoftDataverseService.PerformUnboundAction('WhoAmI')
      const id = asObj(r.data).UserId
      if (typeof id === 'string' && id) {
        const rows = await this.dv.query(`SELECT TOP 1 systemuserid, fullname FROM systemuser WHERE systemuserid = '${esc(id)}'`)
        this.userId = String(rows[0]?.systemuserid ?? id)
        name = String(rows[0]?.fullname ?? '')
      }
    } catch (e) {
      console.warn('[session] WhoAmI failed', errMsg(e))
    }
    if (!this.userId && await wiqReady && this.wiq) {
      try {
        const reply = await this.wiq.ask('What is my full name and primary email address? Reply with only: Full Name | email@address')
        const email = reply.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)?.[0]
        const display = reply.split('|')[0].replace(/[*"]/g, '').trim()
        if (display && display.length < 60 && !display.includes('\n')) name = display
        if (email) {
          const rows = await this.dv.query(`SELECT TOP 1 systemuserid, fullname FROM systemuser WHERE internalemailaddress = '${esc(email)}'`)
          if (rows[0]) { this.userId = String(rows[0].systemuserid ?? ''); name = String(rows[0].fullname ?? name) }
        }
      } catch (e) {
        console.warn('[session] identity fallback failed', errMsg(e))
      }
    }
    await wiqReady
    this.set({ userName: name })
  }

  private async connectRealtime() {
    const wiq = this.wiq
    const tools = buildToolSchemas(this.dv.tools, wiq)
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const prompt = instructions({
      seller: this.userName || 'the seller', userName: this.userName, userId: this.userId, today,
      dataverseTools: this.dv.tools.map((t) => t.name), workIQTools: wiq ? tools.map((t) => String(t.name)).filter(isWorkIQTool) : [],
    })
    const client = new RealtimeClient()
    client.onEvent = (e) => { if (this.rt === client) this.handle(e) }
    client.onLevel = (level) => {
      if (this.rt !== client) return
      const next = this.inputLevel + (level - this.inputLevel) * 0.35
      if (Math.abs(next - this.inputLevel) > 0.01 || (level === 0 && next !== 0)) this.set({ inputLevel: level === 0 && next < 0.02 ? 0 : next })
    }
    this.rt = client
    this.set({ toolCount: tools.length })
    try {
      await loadRuntimeConfig()
      if (!this.voiceChosen) this.voice = loadVoice()
      await client.connect({ tools, instructions: prompt, voice: this.voice, voiceEnabled: this.mode === 'voice' })
    } catch (e) {
      client.disconnect()
      if (this.rt === client) this.rt = undefined
      throw e
    }
  }

  /** Rebuilds only the realtime session — it is what holds the history. */
  private async rebuildRealtime() {
    this.stopListening()
    this.rt?.disconnect(); this.rt = undefined
    this.set({ messages: [], latestChart: undefined, latestCard: undefined, busyTool: undefined, isSpeaking: false, state: { kind: 'connecting' } })
    try {
      await this.connectRealtime()
      this.set({ state: { kind: 'ready' } })
      if (this.mode === 'voice') await this.startListening()
    } catch (e) {
      console.warn('[session] realtime rebuild failed, reconnecting fully', errMsg(e))
      await this.connect()
    }
  }

  async resetConversation() {
    if (this.state.kind !== 'ready') return this.connect()
    await this.rebuildRealtime()
  }

  disconnect() {
    this.stopListening()
    this.rt?.disconnect(); this.rt = undefined
    this.set({ state: { kind: 'idle' }, isSpeaking: false, busyTool: undefined })
  }

  async switchMode(m: Mode) {
    if (m === this.mode) return
    this.mode = m
    // The modality is fixed per session, so reconnect; history resets as on iOS.
    if (this.state.kind === 'ready') await this.rebuildRealtime()
    else { this.emit(); await this.connect() }
  }

  async changeVoice(v: string) {
    if (v === this.voice) return
    saveVoice(v)
    const wasListening = this.isListening
    this.voice = v
    this.voiceChosen = true
    if (this.state.kind === 'ready') await this.rebuildRealtime()
    else await this.connect()
    if (wasListening && this.mode === 'voice' && !this.isListening) await this.startListening()
  }

  // MARK: input

  async send(text: string) {
    const t = text.trim()
    if (!t || !this.rt) return
    this.set({ messages: [...this.messages, { id: uid(), role: 'user', text: t }] })
    this.rt.sendText(t)
  }

  async startListening() {
    if (this.mode !== 'voice') { await this.switchMode('voice'); return }
    const rt = this.rt
    if (!rt || this.isListening || this.startingListening) return
    this.startingListening = true
    try {
      dlog('startListening')
      await rt.startMic()
      rt.setMuted(this.isMuted)
      this.set({ isListening: true })
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
      this.set({ state: { kind: 'failed', message: denied ? 'Microphone access is required for voice mode. Allow it for this app and try again.' : `Couldn't start audio: ${errMsg(e)}` } })
    } finally {
      this.startingListening = false
    }
  }

  stopListening() {
    this.rt?.setMuted(false)
    if (!this.isListening) { if (this.isMuted) this.set({ isMuted: false }); return }
    this.rt?.stopMic()
    this.set({ isMuted: false, isListening: false, isSpeaking: false, inputLevel: 0 })
  }

  toggleMute() {
    const muted = !this.isMuted
    this.rt?.setMuted(muted)
    this.set({ isMuted: muted, ...(muted ? { inputLevel: 0 } : {}) })
  }

  // MARK: events

  private handle(e: RealtimeEvent) {
    switch (e.kind) {
      case 'connected':
        break
      case 'speaking':
        this.set({ isSpeaking: e.value })
        break
      case 'speechStarted':
        // Genuine barge-in only; while muted any VAD trigger is stale.
        if (this.isMuted) break
        this.rt?.interrupt()
        this.set({ isSpeaking: false })
        break
      case 'userTranscript':
        this.set({ messages: [...this.messages, { id: uid(), role: 'user', text: e.text }] })
        break
      case 'assistantDelta': {
        const i = this.lastStreaming()
        if (i >= 0) this.set({ messages: this.messages.map((m, j) => (j === i ? { ...m, text: m.text + e.text } : m)) })
        else this.set({ messages: [...this.messages, { id: uid(), role: 'assistant', text: e.text, isStreaming: true }] })
        break
      }
      case 'assistantDone': {
        const i = this.lastStreaming()
        if (i >= 0) this.set({ messages: this.messages.map((m, j) => (j === i ? { ...m, text: e.text, isStreaming: false } : m)) })
        else this.set({ messages: [...this.messages, { id: uid(), role: 'assistant', text: e.text }] })
        break
      }
      case 'responseDone': {
        const i = this.lastStreaming()
        if (i >= 0) this.set({ messages: this.messages.map((m, j) => (j === i ? { ...m, isStreaming: false } : m)) })
        break
      }
      case 'toolCall':
        void this.execute(e.callId, e.name, e.args)
        break
      case 'failed':
        this.set({ state: { kind: 'failed', message: e.message } })
        break
      case 'transientError':
        console.info('[session] recovered from', e.message)
        this.set({ isSpeaking: false, busyTool: undefined })
        break
    }
  }

  private lastStreaming(): number {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant' && this.messages[i].isStreaming) return i
    }
    return -1
  }

  private async execute(callId: string, name: string, raw: string) {
    const rt = this.rt
    const args: Json = parseArgs(raw)
    const label = humanise(name, args)
    this.pendingTools++
    this.set({ busyTool: label, messages: [...this.messages, { id: uid(), role: 'tool', text: '', toolName: label }] })
    console.info('[tool]', name, summarise(args))

    let result: string
    try {
      if (LOCAL_TOOLS.has(name)) {
        result = await runLocalTool(name, args, {
          dv: this.dv, wiq: this.wiq,
          showCard: (card) => this.set({ latestCard: card, latestChart: undefined, messages: [...this.messages, { id: uid(), role: 'assistant', text: '', card }] }),
          showChart: (chart) => this.set({ latestChart: chart, latestCard: undefined, messages: [...this.messages, { id: uid(), role: 'assistant', text: '', chart }] }),
        })
      } else if (isWorkIQTool(name)) {
        result = this.wiq
          ? await runWorkIQTool(name, args, this.wiq)
          : 'Work data is not available in this session, so mail, calendar and Teams cannot be reached.'
      } else {
        result = await this.dv.callTool(name, args)
      }
    } catch (e) {
      result = `Error: ${errMsg(e)}`
    }

    this.pendingTools = Math.max(0, this.pendingTools - 1)
    if (this.pendingTools === 0) this.set({ busyTool: undefined })
    if (this.rt === rt) rt?.sendToolResult(callId, result.slice(0, AppConfig.toolResultLimit))
  }
}

const engine = new SessionEngine()

export function useSession(): SessionApi {
  useEffect(() => { void engine.start() }, [])
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot)
}
