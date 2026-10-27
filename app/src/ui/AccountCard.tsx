import { useEffect, useId, useState, type ReactNode } from 'react'
import type { Account360, Level, ServiceLine } from '../lib/types'
import { IconChevronRight, IconStar, IconWarning } from './Icons'
import './AccountCard.css'

const initialsOf = (t: string) => t.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

function compact(v: number, cur: string): string {
  const a = Math.abs(v)
  const n = a >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : a >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : a >= 1e3 ? Math.round(v / 1e3) + 'K' : String(Math.round(v))
  return `${cur} ${n}`
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Glyph({ family }: { family: string }) {
  const f = family.toLowerCase()
  let body: ReactNode
  if (f.includes('compass')) body = (<><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M15.5 8.5l-2 5-5 2 2-5z" {...stroke} /><path d="M19 3.5v3M17.5 5h3" {...stroke} strokeWidth={1.3} /></>)
  else if (f.includes('ai cloud') || f.includes('gpu')) body = (<><rect x="6" y="6" width="12" height="12" rx="2" {...stroke} /><rect x="9.5" y="9.5" width="5" height="5" rx=".8" {...stroke} /><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3" {...stroke} strokeWidth={1.4} /></>)
  else if (f.includes('sovereign')) body = (<><path d="M12 3l7 2.7v5.6c0 4.2-2.9 7.6-7 9.2-4.1-1.6-7-5-7-9.2V5.7z" {...stroke} /><path d="M8.7 12.6a2.4 2.4 0 0 1 .5-4.7 3 3 0 0 1 5.6.8 2 2 0 0 1 0 3.9z" {...stroke} strokeWidth={1.3} /></>)
  else if (f.includes('insight')) body = (<><path d="M4 20h16" {...stroke} /><rect x="5.5" y="12" width="3" height="6" rx=".8" {...stroke} /><rect x="10.5" y="7" width="3" height="11" rx=".8" {...stroke} /><rect x="15.5" y="10" width="3" height="8" rx=".8" {...stroke} /></>)
  else if (f.includes('professional')) body = (<><circle cx="9" cy="8.5" r="3" {...stroke} /><path d="M3.5 19c.4-3.2 2.7-5 5.5-5s5.1 1.8 5.5 5" {...stroke} /><circle cx="17" cy="9.5" r="2.3" {...stroke} /><path d="M16.5 14.2c2.4-.2 4 1.3 4.4 4" {...stroke} /></>)
  else body = <circle cx="12" cy="12" r="6" {...stroke} />
  return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">{body}</svg>
}

const familyClass = (f: string) => f.toLowerCase().replace(/[^a-z]+/g, '-')

function Trend({ trend }: { trend: NonNullable<Account360['trend']> }) {
  const gid = useId().replace(/:/g, '')
  const [on, setOn] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true))); return () => cancelAnimationFrame(id) }, [])
  const pts = trend.points
  if (pts.length < 2) return null
  const W = 300, H = 84, P = 4
  const vals = pts.map((p) => p.value)
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1
  const xy = pts.map((p, i) => [P + (i / (pts.length - 1)) * (W - 2 * P), 10 + (1 - (p.value - lo) / span) * (H - 22)] as const)
  let d = `M${xy[0][0]},${xy[0][1]}`
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i], p1 = xy[i], p2 = xy[i + 1], p3 = xy[i + 2] ?? p2
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`
  }
  const last = xy[xy.length - 1]
  const first = pts[0].value, end = pts[pts.length - 1].value
  const pct = first ? Math.round(((end - first) / first) * 100) : 0
  return (
    <div className="a360-trend">
      <div className="a360-sec-head"><span>{trend.title.toUpperCase()}</span><span className={pct >= 0 ? 'up' : 'down'}>{pct >= 0 ? '+' : ''}{pct}% · {pts.length} mo</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={trend.title} className={on ? 'in' : ''}>
        <defs>
          <linearGradient id={`f${gid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--a-teal)" stopOpacity=".38" /><stop offset="1" stopColor="var(--a-violet)" stopOpacity="0" /></linearGradient>
          <linearGradient id={`s${gid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--a-violet)" /><stop offset="1" stopColor="var(--a-teal)" /></linearGradient>
        </defs>
        {[0.25, 0.6].map((t) => <line key={t} x1={P} x2={W - P} y1={10 + t * (H - 22)} y2={10 + t * (H - 22)} className="a360-grid" />)}
        <path className="area" d={`${d} L${last[0]},${H - 2} L${xy[0][0]},${H - 2}Z`} fill={`url(#f${gid})`} />
        <path className="line" d={d} pathLength={1} fill="none" stroke={`url(#s${gid})`} strokeWidth="2.4" strokeLinecap="round" />
        <circle className="dot-halo" cx={last[0]} cy={last[1]} r="7" fill="var(--a-teal)" opacity=".22" />
        <circle className="dot" cx={last[0]} cy={last[1]} r="3.4" fill="var(--a-teal)" stroke="var(--a-card)" strokeWidth="1.5" />
      </svg>
      <div className="a360-axis"><span>{pts[0].label}</span><span>{pts[pts.length - 1].label}</span></div>
    </div>
  )
}

function statusLabel(s?: ServiceLine['status']) {
  return s ? s[0].toUpperCase() + s.slice(1) : undefined
}

export function AccountCard({ card }: { card: Account360 }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true))); return () => cancelAnimationFrame(id) }, [])
  const initials = card.initials || initialsOf(card.name)
  const commit = card.commit
  const pct = commit && commit.commit > 0 ? Math.min(1, commit.consumed / commit.commit) : 0
  const pctLevel: Level = pct >= 0.8 ? 'good' : pct >= 0.5 ? 'watch' : 'risk'
  const badges = card.tier || card.aiMaturity || card.health
  const metrics = card.metrics.slice(0, 3)
  const services = card.services
  const groups = services.length

  return (
    <article className={`a360${on ? ' in' : ''}`} aria-label={`Account 360: ${card.name}`}>
      <header className="a360-head">
        <div className="a360-avatar" aria-hidden="true"><span>{initials}</span></div>
        <div className="a360-title">
          <h3>{card.name}</h3>
          {card.subtitle && <p>{card.subtitle}</p>}
          {badges && (
            <div className="a360-badges">
              {card.tier && <span className="badge tier"><IconStar size={11} />{card.tier}</span>}
              {card.aiMaturity && <span className="badge ai"><i />AI · {card.aiMaturity}</span>}
              {card.health && <span className={`badge lvl-${card.health.level}`}><i className="dot" />{card.health.label}</span>}
            </div>
          )}
        </div>
      </header>

      {metrics.length > 0 && (
        <div className="a360-metrics">
          {metrics.map((m, i) => {
            const down = m.delta?.trim().startsWith('-') || m.delta?.trim().startsWith('−')
            return (
              <div className="metric" key={m.label + i}>
                <strong>{m.value}</strong>
                <span className="mlabel">
                  <span>{m.label.toUpperCase()}</span>
                  {m.delta && <em className={down ? 'down' : 'up'}>{m.delta}</em>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {commit && (
        <div className="a360-commit">
          <div className="row">
            <span className="k">{commit.label ?? 'Commit'}</span>
            <span><b>{compact(commit.consumed, commit.currency)}</b> <span className="muted">of {compact(commit.commit, commit.currency)}</span></span>
          </div>
          <div className={`track lvl-${pctLevel}`}><div className="fill" style={{ width: on ? `${pct * 100}%` : 0 }} /></div>
          <div className="row small">
            <span>{Math.round(pct * 100)}% consumed</span>
            {commit.renewalDue && <span>Renewal due {commit.renewalDue}</span>}
          </div>
        </div>
      )}

      {card.alert?.text && (
        <div className={`a360-alert lvl-${card.alert.level}`} role="status"><IconWarning size={15} /><span>{card.alert.text}</span></div>
      )}

      {groups > 0 && (
        <section className="a360-sec">
          <div className="a360-sec-head"><span>SERVICES CONSUMED</span><span>{groups}</span></div>
          <div className="a360-services">
            {services.map((s, i) => (
              <div className={`svc fam-${familyClass(s.family)}`} key={s.name + i} style={{ ['--i' as string]: i }}>
                <div className="glyph"><Glyph family={s.family} /></div>
                <div className="txt">
                  <b>{s.name}</b>
                  <span>{s.detail ?? s.family}</span>
                </div>
                {s.status && <i className={`sdot st-${s.status}`} title={statusLabel(s.status)} aria-label={statusLabel(s.status)} />}
              </div>
            ))}
          </div>
        </section>
      )}

      {card.trend && <section className="a360-sec"><Trend trend={card.trend} /></section>}

      {card.contacts.length > 0 && (
        <section className="a360-sec">
          <div className="a360-sec-head"><span>KEY CONTACTS</span></div>
          <div className="a360-contacts">
            {card.contacts.map((c, i) => (
              <div className={`pill${c.sponsor ? ' sponsor' : ''}`} key={c.name + i}>
                <span className="ini">{c.sponsor ? <IconStar size={12} /> : initialsOf(c.name)}</span>
                <span className="who"><b>{c.name}</b>{c.role && <small>{c.role}</small>}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {card.opportunities.length > 0 && (
        <section className="a360-sec">
          <div className="a360-sec-head"><span>OPEN OPPORTUNITIES</span><span>{card.opportunities.length}</span></div>
          <div className="a360-opps">
            {card.opportunities.map((o, i) => (
              <div className="opp" key={o.name + i}>
                <i className="d" />
                <span className="n"><b>{o.name}</b>{(o.stage || o.closeDate) && <small>{[o.stage, o.closeDate].filter(Boolean).join(' · ')}</small>}</span>
                {o.value && <span className="v">{o.value}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {card.support && (
        <section className="a360-sec">
          <div className="a360-sec-head"><span>SUPPORT HEALTH</span></div>
          <div className="a360-support">
            <span className="cnt"><b>{card.support.open}</b> open</span>
            {!!card.support.critical && <span className="cnt crit"><b>{card.support.critical}</b> critical</span>}
            {card.support.summary && <span className="sum">{card.support.summary}</span>}
          </div>
        </section>
      )}

      {card.nextBestAction && (
        <div className="a360-nba">
          <div><span className="a360-eyebrow">NEXT BEST ACTION</span><b>{card.nextBestAction}</b></div>
          <IconChevronRight size={18} />
        </div>
      )}

      {(card.customerSince || card.lastContact) && (
        <footer className="a360-foot">
          <span>{card.customerSince ? `Customer since ${card.customerSince}` : ''}</span>
          <span>{card.lastContact ? `Last contact ${card.lastContact}` : ''}</span>
        </footer>
      )}
    </article>
  )
}
