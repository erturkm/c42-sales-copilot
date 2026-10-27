import { useEffect, useState } from 'react'
import type { SessionApi } from '../lib/types'
import { getLog } from '../lib/log'
import { IconCheck, IconRefresh } from './Icons'

export const VOICES = ['marin', 'cedar', 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse']
const DESC: Record<string, string> = {
  marin: 'Warm, natural — default', cedar: 'Low and steady', alloy: 'Neutral, even', ash: 'Crisp and direct',
  ballad: 'Soft, expressive', coral: 'Bright and friendly', echo: 'Calm, measured', sage: 'Considered, unhurried',
  shimmer: 'Light and airy', verse: 'Animated, lively',
}

export function SettingsSheet({ session, onClose }: { session: SessionApi; onClose: () => void }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 500)
    return () => clearInterval(id)
  }, [])
  const rows = session.diagnostics()
  const log = getLog()
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-nav">
          <span />
          <h2>Settings</h2>
          <button className="link-btn strong" onClick={onClose}>Done</button>
        </div>
        <div className="sheet-body">
          <h4 className="group-head">Voice</h4>
          <div className="group">
            {VOICES.map((v) => (
              <button key={v} className="cell" onClick={() => void session.changeVoice(v)} aria-pressed={session.voice === v}>
                <span className="cell-text"><span>{v[0].toUpperCase() + v.slice(1)}</span><small>{DESC[v]}</small></span>
                {session.voice === v && <span className="check"><IconCheck size={18} /></span>}
              </button>
            ))}
          </div>
          <p className="group-foot">Changing voice reconnects the session, so the current conversation is cleared.</p>

          <h4 className="group-head">Session</h4>
          <div className="group">
            <button className="cell" onClick={() => void session.connect()}>
              <span className="cell-text accent-text"><span><IconRefresh size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />Reconnect</span></span>
            </button>
            <button className="cell" onClick={() => { void session.resetConversation(); onClose() }}>
              <span className="cell-text danger-text"><span>Reset conversation</span></span>
            </button>
          </div>

          <h4 className="group-head">Debug log</h4>
          <div className="group" style={{ padding: 10 }}>
            <pre style={{ fontSize: 10, lineHeight: 1.35, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 220, overflow: 'auto', margin: 0 }}>{log.slice(-40).join('\n')}</pre>
            <button className="link-btn strong" onClick={() => void navigator.clipboard?.writeText(log.join('\n')).catch(() => {})}>Copy log</button>
          </div>

          <h4 className="group-head">Voice diagnostics</h4>
          <div className="group">
            {rows.map(([k, v]) => (
              <div className="cell static" key={k}>
                <span className="diag-k">{k}</span>
                <span className={`diag-v${v === 'DEAD' || (k === 'Send errors' && v !== '0') ? ' bad' : ''}`}>{v}</span>
              </div>
            ))}
          </div>
          <p className="group-foot">Open this while listening. If “Frames captured” is not climbing, the microphone tap is dead. If it climbs but “Sent to service” doesn't, audio is being blocked locally or the socket dropped.</p>

          <h4 className="group-head">Account</h4>
          <div className="group">
            <div className="cell static"><span className="cell-text"><span>{session.userName || 'Signed in'}</span><small>Signed in via Power Platform</small></span></div>
          </div>
          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  )
}
