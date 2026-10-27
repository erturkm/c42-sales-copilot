import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Account360, ChartSpec, ConnectionState, Message, Mode, SessionApi } from './types'

export const MOCK_ACCOUNT: Account360 = {
  id: 'acc-ehsn',
  name: 'Emirates Health Sovereign Network',
  subtitle: 'Government Health · Abu Dhabi, UAE',
  tier: 'Strategic',
  aiMaturity: 'Scaling',
  health: { label: 'Renewal in 75 days', level: 'watch' },
  metrics: [
    { label: 'ARR', value: 'USD 8.4M' },
    { label: 'YTD consumption', value: 'USD 6.1M', delta: '+18%' },
    { label: 'Open pipeline', value: 'USD 3.2M' },
  ],
  commit: { consumed: 6.1e6, commit: 9e6, currency: 'USD', label: 'FY26 commit', renewalDue: 'Jan 10, 2027' },
  alert: { text: 'Churn risk: AI Cloud H100 stack at 41% of commit', level: 'risk' },
  services: [
    { family: 'Compass', name: 'gpt-oss-120b · Core42', detail: '412M tokens/mo', status: 'active' },
    { family: 'Compass', name: 'GPT-5', detail: '96M tokens/mo', status: 'active' },
    { family: 'Compass', name: 'GPT-4.1 Arabic', status: 'pilot' },
    { family: 'AI Cloud', name: 'H100 SXM5 stack', detail: '64 GPUs', status: 'risk' },
    { family: 'Sovereign Cloud', name: 'Sovereign Cloud', detail: 'Abu Dhabi region', status: 'active' },
    { family: 'Insight', name: 'Insight', detail: 'Clinical analytics', status: 'renewal' },
  ],
  trend: {
    title: 'Monthly consumption', unit: 'USD',
    points: [310, 340, 365, 400, 430, 455, 410, 480, 520, 545, 580, 610].map((v, i) => ({
      label: ['N', 'D', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O'][i], value: v * 1000,
    })),
  },
  contacts: [
    { name: 'Dr. Amal Al Hashimi', role: 'CIO · Sponsor', sponsor: true },
    { name: 'Omar Siddiqui', role: 'Head of AI' },
    { name: 'Layla Haddad', role: 'Procurement' },
    { name: 'Rashid Al Nuaimi', role: 'CISO' },
  ],
  opportunities: [
    { name: 'B200 migration — AI Cloud', value: 'USD 1.6M', stage: 'Propose' },
    { name: 'Compass Arabic fine-tune', value: 'USD 0.9M', stage: 'Develop' },
    { name: 'Insight clinical suite', value: 'USD 0.7M', stage: 'Qualify' },
  ],
  support: { open: 3, critical: 1, summary: 'GPU node latency escalation' },
  nextBestAction: 'Offer B200 migration before renewal',
  customerSince: '2022',
  lastContact: '3 days ago',
}

const pipeline = (kind: ChartSpec['kind']): ChartSpec => ({
  id: 'chart-' + Date.now(),
  title: kind === 'line' ? 'Pipeline by month' : kind === 'pie' ? 'Pipeline by stage' : 'Top opportunities by value',
  kind,
  points: kind === 'line'
    ? [['Jun', 2.1], ['Jul', 2.6], ['Aug', 2.4], ['Sep', 3.3], ['Oct', 3.9], ['Nov', 4.6]].map(([label, v]) => ({ label: label as string, value: (v as number) * 1e6 }))
    : kind === 'pie'
      ? [['Qualify', 2.2], ['Develop', 3.4], ['Propose', 4.8], ['Negotiate', 1.9]].map(([label, v]) => ({ label: label as string, value: (v as number) * 1e6 }))
      : [['Emirates Health B200', 3.2], ['G42 Sovereign Compass', 2.7], ['ADNOC AI Cloud', 2.1], ['Etihad Insight', 1.4], ['Mubadala GPU Cluster', 0.9]]
        .map(([label, v]) => ({ label: label as string, value: (v as number) * 1e6 })),
})

const VOICE_REPLY = "Sure — you have eleven open opportunities worth about twelve million dollars. Emirates Health is the largest."
const CHAT_REPLY = "Happy to help. I can pull up pipeline, accounts and contacts from Dynamics 365. Try “show pipeline” or “show Emirates Health”."

let uid = 0
const nid = () => 'm' + ++uid

export function useMockSession(): SessionApi {
  const [messages, setMessages] = useState<Message[]>([])
  const [mode, setMode] = useState<Mode>('chat')
  const [state, setState] = useState<ConnectionState>({ kind: 'idle' })
  const [isListening, setListening] = useState(false)
  const [isSpeaking, setSpeaking] = useState(false)
  const [isMuted, setMuted] = useState(false)
  const [inputLevel, setLevel] = useState(0)
  const [busyTool, setBusy] = useState<string | undefined>()
  const [latestChart, setChart] = useState<ChartSpec | undefined>()
  const [latestCard, setCard] = useState<Account360 | undefined>()
  const [voice, setVoice] = useState('marin')
  const [frames, setFrames] = useState(0)
  const timers = useRef<number[]>([])
  const failedOnce = useRef(false)
  const mutedRef = useRef(false)
  mutedRef.current = isMuted

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Fake mic level while listening.
  useEffect(() => {
    if (!isListening) { setLevel(0); return }
    const t0 = performance.now()
    const id = window.setInterval(() => {
      setFrames((f) => f + 3)
      if (mutedRef.current) { setLevel(0); return }
      const s = (performance.now() - t0) / 1000
      const v = 0.35 + 0.3 * Math.sin(s * 5.1) + 0.2 * Math.sin(s * 11.3 + 1) + Math.random() * 0.15
      setLevel(Math.max(0, Math.min(1, v)))
    }, 90)
    return () => clearInterval(id)
  }, [isListening])

  const stream = useCallback((text: string, extra: Partial<Message> = {}, done?: () => void) => {
    const id = nid()
    setMessages((m) => [...m, { id, role: 'assistant', text: '', isStreaming: true }])
    const words = text.split(' ')
    let i = 0
    const tick = () => {
      i++
      const t = words.slice(0, i).join(' ')
      const last = i >= words.length
      setMessages((m) => m.map((x) => x.id === id ? { ...x, text: t, isStreaming: !last, ...(last ? extra : {}) } : x))
      if (last) done?.(); else later(tick, 55)
    }
    later(tick, 250)
  }, [later])

  const respond = useCallback((text: string, spoken: boolean) => {
    const q = text.toLowerCase()
    const finish = () => setSpeaking(false)
    const speak = () => { if (spoken) setSpeaking(true) }
    if (q.includes('emirates')) {
      setBusy('looking up Emirates Health')
      setMessages((m) => [...m, { id: nid(), role: 'tool', text: '', toolName: 'Looked up account · Emirates Health' }])
      later(() => {
        setBusy(undefined); speak()
        stream("Here's the 360 view. Consumption is up 18% but the AI Cloud commit is at risk.", { card: MOCK_ACCOUNT }, () => { setCard(MOCK_ACCOUNT); setChart(undefined); later(finish, 1200) })
      }, 1400)
    } else if (q.includes('pipeline') || q.includes('chart') || q.includes('pie') || q.includes('line')) {
      const kind: ChartSpec['kind'] = q.includes('pie') ? 'pie' : q.includes('line') || q.includes('trend') ? 'line' : 'bar'
      setBusy('pulling up your pipeline')
      setMessages((m) => [...m, { id: nid(), role: 'tool', text: '', toolName: 'Queried opportunities' }])
      later(() => {
        setBusy(undefined); speak()
        const chart = pipeline(kind)
        stream('Here is your pipeline — Emirates Health leads at $3.2M.', { chart }, () => { setChart(chart); setCard(undefined); later(finish, 1200) })
      }, 1400)
    } else {
      later(() => { speak(); stream(spoken ? VOICE_REPLY : CHAT_REPLY, {}, () => later(finish, 800)) }, 500)
    }
  }, [later, stream])

  const connect = useCallback(async () => {
    setState({ kind: 'connecting' })
    await new Promise((r) => setTimeout(r, 1300))
    if (new URLSearchParams(location.search).has('fail') && !failedOnce.current) {
      failedOnce.current = true
      setState({ kind: 'failed', message: 'Could not reach the Core42 Foundry realtime endpoint (503). Check your connection and try again.' })
      return
    }
    setState({ kind: 'ready' })
  }, [])

  const send = useCallback(async (text: string) => {
    const t = text.trim()
    if (!t) return
    setMessages((m) => [...m, { id: nid(), role: 'user', text: t }])
    respond(t, false)
  }, [respond])

  const api: SessionApi = useMemo(() => ({
    messages, mode, state, isListening, isSpeaking, isMuted, inputLevel, busyTool,
    toolCount: 14, latestChart, latestCard, voice, userName: 'Ercument Turkmenoglu',
    connect,
    disconnect: () => { setState({ kind: 'idle' }); setListening(false); setSpeaking(false) },
    resetConversation: async () => {
      timers.current.forEach(clearTimeout); timers.current = []
      setMessages([]); setChart(undefined); setCard(undefined); setBusy(undefined); setSpeaking(false); setListening(false)
    },
    send,
    startListening: async () => { setMode('voice'); setMuted(false); setListening(true) },
    stopListening: () => {
      setListening(false)
      setMessages((m) => [...m, { id: nid(), role: 'user', text: "What's in my pipeline?" }])
      respond('show pipeline', true)
    },
    toggleMute: () => setMuted((v) => !v),
    switchMode: async (m: Mode) => { setMode(m); if (m === 'chat') { setListening(false); setSpeaking(false) } },
    changeVoice: async (v: string) => {
      setVoice(v); setMessages([]); setChart(undefined); setCard(undefined)
      setState({ kind: 'connecting' }); await new Promise((r) => setTimeout(r, 900)); setState({ kind: 'ready' })
    },
    dismissChart: () => setChart(undefined),
    dismissCard: () => setCard(undefined),
    diagnostics: () => [
      ['Frames captured', String(frames)], ['Sent to service', String(Math.max(0, frames - 2))],
      ['Send errors', '0'], ['Socket', state.kind === 'ready' ? 'OPEN' : 'CLOSED'], ['Voice', voice],
    ],
  }), [messages, mode, state, isListening, isSpeaking, isMuted, inputLevel, busyTool, latestChart, latestCard, voice, frames, connect, send, respond])

  return api
}
