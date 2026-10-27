import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import type { SessionApi } from '../lib/types'
import { AccountCard } from './AccountCard'
import { ChartCard } from './ChartCard'
import {
  IconBubble, IconChevronUp, IconClose, IconKeyboard, IconMic, IconMicOutline, IconMicSlash,
  IconReset, IconSend, IconSliders, IconStop,
} from './Icons'
import { MessageRow } from './MessageRow'
import { Orb } from './Orb'
import { SettingsSheet } from './SettingsSheet'

const SUGGESTIONS = ["What's in my pipeline?", 'Show Emirates Health', 'Which deals close this quarter?']

export function Assistant({ session }: { session: SessionApi }) {
  const s = session
  const [draft, setDraft] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLElement>(null)
  const ready = s.state.kind === 'ready'
  const connecting = s.state.kind === 'connecting'

  const greeting = (() => {
    if (connecting) return 'Connecting to\nCore42 CRM…'
    if (s.state.kind === 'failed') return 'Something needs attention'
    if (s.busyTool) return `${s.busyTool}…`
    if (s.isMuted) return 'Muted'
    if (s.isSpeaking) return '…'
    if (s.isListening) return "I'm listening"
    return "Let's talk!\nWhat's on your mind?"
  })()

  useEffect(() => {
    const el = controlsRef.current, root = rootRef.current
    if (!el || !root) return
    const ro = new ResizeObserver(() => root.style.setProperty('--controls-h', `${el.offsetHeight}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const last = s.messages[s.messages.length - 1]
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [s.messages.length, s.busyTool, showTranscript, last?.text.length])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
  }, [draft])

  const openTranscript = () => { setShowTranscript(true); s.dismissChart(); s.dismissCard() }

  const toggleMic = async () => {
    if (!ready) return
    if (s.isListening) { s.stopListening(); return }
    setShowTranscript(false)
    if (s.mode !== 'voice') await s.switchMode('voice')
    await s.startListening()
  }

  const submit = () => {
    const t = draft.trim()
    if (!t || !ready) return
    setDraft('')
    setShowTranscript(true)
    void s.send(t)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const pickMode = (m: 'chat' | 'voice') => {
    if (m === 'chat') { openTranscript(); void s.switchMode('chat') }
    else { setShowTranscript(false); void s.switchMode('voice') }
  }

  // Tap toggles; hold-to-talk releases on pointer-up after a long press.
  const press = useRef({ at: 0, wasListening: false, started: false })
  const micDown = (e: React.PointerEvent) => {
    if (!ready) return
    e.currentTarget.setPointerCapture(e.pointerId)
    press.current = { at: Date.now(), wasListening: s.isListening, started: !s.isListening }
    if (!s.isListening) void toggleMic()
  }
  const micUp = () => {
    const p = { ...press.current }
    if (!ready || p.at === 0) return
    press.current.at = 0
    if (p.wasListening || (p.started && Date.now() - p.at > 450)) s.stopListening()
  }

  const statusColor = ready ? 'var(--green)' : connecting ? 'var(--orange)' : s.state.kind === 'failed' ? 'var(--red)' : 'var(--gray)'
  const statusText = ready ? `${s.toolCount} tools` : connecting ? 'Connecting…' : s.state.kind === 'failed' ? 'Disconnected' : 'Idle'

  const overlay: ReactNode = !showTranscript && (s.latestCard
    ? <FloatingCard key={s.latestCard.id} onDismiss={s.dismissCard}><AccountCard card={s.latestCard} /></FloatingCard>
    : s.latestChart
      ? <FloatingCard key={s.latestChart.id} onDismiss={s.dismissChart}><ChartCard spec={s.latestChart} /></FloatingCard>
      : null)

  return (
    <div className="assistant" ref={rootRef}>
      <div className="backdrop" />

      <header className="toolbar">
        <div className="tb-left">
          <span className="tb-title">C42 Sales Copilot</span>
          <span className="tb-status"><i style={{ background: statusColor }} />{statusText}</span>
        </div>
        <div className="tb-right">
          <button className="icon-btn" aria-label="Reset conversation" disabled={connecting}
            onClick={() => { s.dismissChart(); s.dismissCard(); setShowTranscript(false); void s.resetConversation() }}>
            <IconReset size={22} />
          </button>
          <button className="icon-btn" aria-label="Settings" onClick={() => setShowSettings(true)}><IconSliders size={22} /></button>
        </div>
      </header>

      <div className="seg" role="tablist" aria-label="Mode">
        <span className="seg-thumb" style={{ transform: s.mode === 'voice' ? 'translateX(100%)' : 'none' }} />
        <button role="tab" aria-selected={s.mode === 'chat'} onClick={() => pickMode('chat')}>Chat</button>
        <button role="tab" aria-selected={s.mode === 'voice'} onClick={() => pickMode('voice')}>Voice</button>
      </div>

      <div className="body">
      <section className={`stage${showTranscript ? ' covered' : ''}`}>
        <div className="stage-spacer" />
        <Orb level={s.inputLevel} isListening={s.isListening} isSpeaking={s.isSpeaking} isMuted={s.isMuted}
          isThinking={!!s.busyTool || connecting} onClick={() => void toggleMic()} />
        <h2 className="greeting" key={greeting} aria-live="polite">{greeting}</h2>
        {s.state.kind === 'failed' ? (
          <div className="error-card">
            <p>{s.state.message}</p>
            <button className="link-btn strong" onClick={() => void s.connect()}>Try again</button>
          </div>
        ) : s.messages.length === 0 ? (
          <div className="suggestions">
            {SUGGESTIONS.map((p) => (
              <button key={p} className="chip" disabled={!ready} onClick={() => { setShowTranscript(true); void s.send(p) }}>{p}</button>
            ))}
          </div>
        ) : last && (
          <button className="glance" onClick={openTranscript}>
            {last.chart ? <ChartCard spec={last.chart} /> : last.text && <span className="glance-text">{last.text}</span>}
            <span className="glance-hint"><IconChevronUp size={11} /> Show transcript</span>
          </button>
        )}
        <div className="stage-spacer" />
      </section>

      {overlay}

      <section className={`transcript${showTranscript ? ' open' : ''}`} aria-hidden={!showTranscript}>
        <GrabHandle onClose={() => setShowTranscript(false)} />
        <div className="transcript-scroll" ref={scroller}>
          {s.messages.length === 0 && !s.busyTool && <p className="empty-note">Ask about your accounts, pipeline or contacts.</p>}
          {s.messages.map((m) => <MessageRow key={m.id} message={m} />)}
          {s.busyTool && <div className="busy-pill"><span className="spinner" />{s.busyTool}…</div>}
        </div>
      </section>
      </div>

      <footer className="controls" ref={controlsRef}>
        {(inputFocused || showTranscript) && (
          <div className="composer">
            <textarea ref={inputRef} rows={1} value={draft} placeholder="Ask about your book…" aria-label="Message"
              onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey}
              onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} />
            <button className="send" aria-label="Send" onClick={submit} disabled={!draft.trim() || !ready}><IconSend size={32} /></button>
          </div>
        )}
        <div className="pill-bar">
          <button className={`pill-btn${showTranscript ? ' active' : ''}`} aria-label={showTranscript ? 'Hide transcript' : 'Show transcript'}
            aria-pressed={showTranscript} onClick={() => (showTranscript ? setShowTranscript(false) : openTranscript())}>
            <IconBubble size={22} filled={showTranscript} />
          </button>
          <button className={`pill-btn${inputFocused ? ' active' : ''}`} aria-label="Keyboard"
            onClick={() => { if (inputFocused) inputRef.current?.blur(); else { openTranscript(); setTimeout(() => inputRef.current?.focus(), 30) } }}>
            <IconKeyboard size={22} />
          </button>
          <button className={`mic${s.isListening ? ' live' : ''}`} disabled={!ready} aria-label={s.isListening ? 'Stop listening' : 'Hold to talk'}
            onPointerDown={micDown} onPointerUp={micUp} onPointerCancel={micUp}
            style={{ '--lvl': s.isMuted ? 0 : s.inputLevel } as CSSProperties}>
            <span className="mic-ring" />
            <span className="mic-face">{s.isListening ? <IconStop size={22} /> : <IconMic size={24} />}</span>
          </button>
          <button className={`pill-btn${s.isMuted ? ' active warn' : ''}`} aria-label={s.isMuted ? 'Unmute' : 'Mute'} aria-pressed={s.isMuted}
            disabled={!s.isListening} style={{ opacity: s.isListening ? 1 : 0.35 }} onClick={s.toggleMute}>
            {s.isMuted ? <IconMicSlash size={22} /> : <IconMicOutline size={22} />}
          </button>
        </div>
      </footer>

      {showSettings && <SettingsSheet session={s} onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function FloatingCard({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  return (
    <div className="floating">
      <div className="floating-frame">
        <div className="floating-scroll">{children}</div>
        <button className="floating-close" aria-label="Dismiss" onClick={onDismiss}><IconClose size={28} /></button>
      </div>
    </div>
  )
}

function GrabHandle({ onClose }: { onClose: () => void }) {
  const y0 = useRef<number | null>(null)
  return (
    <div className="grab" role="button" aria-label="Close transcript" tabIndex={0}
      onClick={onClose}
      onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerUp={(e) => { if (y0.current !== null && e.clientY - y0.current > 40) onClose(); y0.current = null }}>
      <span />
    </div>
  )
}
