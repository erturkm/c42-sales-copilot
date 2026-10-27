// Shared contract between the UI layer (src/ui) and the session/logic layer (src/lib).
// Ported from the native iOS app (Session.swift) — keep field names stable.

export interface ChartPoint { label: string; value: number }
export interface ChartSpec { id: string; title: string; kind: 'bar' | 'line' | 'pie'; points: ChartPoint[] }

export interface Metric { label: string; value: string; delta?: string }            // delta like "+12%" / "-3%"
export interface ServiceLine {
  family: 'Compass' | 'AI Cloud' | 'Sovereign Cloud' | 'Insight' | 'Professional Services' | string
  name: string                                  // e.g. "gpt-oss-120b · Core42"
  detail?: string                               // e.g. "412M tokens/mo"
  status?: 'active' | 'pilot' | 'renewal' | 'risk' | 'expired'
}
export interface Contact { name: string; role?: string; sponsor?: boolean }
export interface OpenOpp { name: string; value?: string; stage?: string; closeDate?: string }
export type Level = 'good' | 'watch' | 'risk' | 'info'

/** Core42 Account 360 card. Only `name` is required; render whatever is present. */
export interface Account360 {
  id: string
  name: string
  subtitle?: string                             // "Healthcare · Abu Dhabi, UAE"
  initials?: string
  tier?: string                                 // "Strategic" / "VIP"
  aiMaturity?: string                           // "Scaling"
  health?: { label: string; level: Level }
  metrics: Metric[]                             // up to 3 headline numbers (ARR, YTD consumption, open pipeline)
  commit?: { consumed: number; commit: number; currency: string; label?: string; renewalDue?: string }
  alert?: { text: string; level: Level }
  services: ServiceLine[]
  trend?: { title: string; unit?: string; points: ChartPoint[] }   // monthly consumption sparkline
  contacts: Contact[]
  opportunities: OpenOpp[]
  support?: { open: number; critical?: number; summary?: string }
  nextBestAction?: string
  customerSince?: string
  lastContact?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool'
  text: string
  toolName?: string
  chart?: ChartSpec
  card?: Account360
  isStreaming?: boolean
}

export type Mode = 'chat' | 'voice'
export type ConnectionState = { kind: 'idle' | 'connecting' | 'ready' } | { kind: 'failed'; message: string }

export interface SessionApi {
  messages: Message[]
  mode: Mode
  state: ConnectionState
  isListening: boolean
  isSpeaking: boolean
  isMuted: boolean
  inputLevel: number                 // 0..1, drives the mic ring
  busyTool?: string                  // plain-language status, e.g. "pulling up your pipeline"
  toolCount: number
  latestChart?: ChartSpec
  latestCard?: Account360
  voice: string
  userName: string                   // signed-in seller display name
  connect(): Promise<void>
  disconnect(): void
  resetConversation(): Promise<void>
  send(text: string): Promise<void>
  startListening(): Promise<void>
  stopListening(): void
  toggleMute(): void
  switchMode(m: Mode): Promise<void>
  changeVoice(v: string): Promise<void>
  dismissChart(): void
  dismissCard(): void
  diagnostics(): [string, string][]
}
