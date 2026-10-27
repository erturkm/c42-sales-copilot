import { useEffect, useId, useState } from 'react'
import type { ChartSpec } from '../lib/types'

const PALETTE = ['#339afa', '#9e52eb', '#e654a8', '#fa9438', '#3dc7ad', '#5c7af2', '#db705c']
const color = (i: number) => PALETTE[i % PALETTE.length]

export function abbreviated(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (a >= 1e3) return Math.round(v / 1e3) + 'K'
  return Math.round(v).toString()
}
const truncate = (t: string, n = 18) => (t.length <= n ? t : t.slice(0, n - 1) + '…')

export function ChartCard({ spec }: { spec: ChartSpec }) {
  const [appeared, setAppeared] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAppeared(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  const pts = spec.points
  const total = pts.reduce((s, p) => s + p.value, 0)

  return (
    <section className={`chart-card${appeared ? ' in' : ''}`} aria-label={spec.title}>
      <header>
        <h3>{spec.title}</h3>
        <div className="chart-total">
          <strong style={{ backgroundImage: `linear-gradient(90deg, ${color(0)}, ${color(1)})` }}>{abbreviated(total)}</strong>
          <span>total across {pts.length}</span>
        </div>
      </header>
      {spec.kind === 'bar' && <Bars spec={spec} />}
      {spec.kind === 'line' && <Line spec={spec} appeared={appeared} />}
      {spec.kind === 'pie' && <Pie spec={spec} total={total} appeared={appeared} />}
    </section>
  )
}

function Bars({ spec }: { spec: ChartSpec }) {
  const max = Math.max(1, ...spec.points.map((p) => p.value))
  return (
    <div className="bars">
      {spec.points.map((p, i) => (
        <div className="bar-row" key={p.label + i} style={{ ['--i' as string]: i }}>
          <span className="bar-label" title={p.label}>{truncate(p.label)}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{
              ['--w' as string]: `${(p.value / (max * 1.28)) * 100}%`,
              background: `linear-gradient(90deg, ${color(i)}, ${color(i)}8c)`,
            }} />
            <span className="bar-value" style={{ ['--w' as string]: `${(p.value / (max * 1.28)) * 100}%` }}>{abbreviated(p.value)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function catmull(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`
  }
  return d
}

function Line({ spec, appeared }: { spec: ChartSpec; appeared: boolean }) {
  const gid = useId().replace(/:/g, '')
  const W = 340, H = 200, L = 38, R = 14, T = 22, B = 24, IN = 16
  const max = Math.max(1, ...spec.points.map((p) => p.value)) * 1.1
  const n = spec.points.length
  const xy: [number, number][] = spec.points.map((p, i) => [
    L + IN + (n === 1 ? (W - L - R - 2 * IN) / 2 : (i / (n - 1)) * (W - L - R - 2 * IN)),
    T + (1 - p.value / max) * (H - T - B),
  ])
  const line = catmull(xy)
  const area = `${line} L${xy[n - 1][0]},${H - B} L${xy[0][0]},${H - B} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  return (
    <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={spec.title}>
      <defs>
        <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color(0)} stopOpacity=".45" /><stop offset="1" stopColor={color(0)} stopOpacity=".02" />
        </linearGradient>
        <linearGradient id={`l${gid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={color(0)} /><stop offset="1" stopColor={color(1)} />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => {
        const y = T + (1 - t / max) * (H - T - B)
        return (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y} y2={y} className="grid" />
            <text x={L - 6} y={y + 3} textAnchor="end" className="axis">{abbreviated(t)}</text>
          </g>
        )
      })}
      <path d={area} fill={`url(#a${gid})`} className={`area${appeared ? ' in' : ''}`} />
      <path d={line} fill="none" stroke={`url(#l${gid})`} strokeWidth="3" strokeLinecap="round" pathLength={1} className={`stroke${appeared ? ' in' : ''}`} />
      {xy.map(([x, y], i) => (
        <g key={i} className={`pt${appeared ? ' in' : ''}`} style={{ transitionDelay: `${0.5 + i * 0.07}s` }}>
          <circle cx={x} cy={y} r="3.6" fill={color(1)} />
          <text x={x} y={y - 9} textAnchor="middle" className="ann">{abbreviated(spec.points[i].value)}</text>
          <text x={x} y={H - 8} textAnchor="middle" className="axis">{truncate(spec.points[i].label, 10)}</text>
        </g>
      ))}
    </svg>
  )
}

function arc(cx: number, cy: number, ro: number, ri: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)]
  const large = a1 - a0 > Math.PI ? 1 : 0
  const [x0, y0] = p(ro, a0), [x1, y1] = p(ro, a1), [x2, y2] = p(ri, a1), [x3, y3] = p(ri, a0)
  return `M${x0},${y0} A${ro},${ro} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${ri},${ri} 0 ${large} 0 ${x3},${y3}Z`
}

function Pie({ spec, total, appeared }: { spec: ChartSpec; total: number; appeared: boolean }) {
  const gid = useId().replace(/:/g, '')
  const ro = 92, ri = ro * 0.58, mid = (ro + ri) / 2, gap = 0.035
  let a = 0
  const slices = spec.points.map((p, i) => {
    const sweep = total > 0 ? (p.value / total) * Math.PI * 2 : 0
    const s = { d: arc(100, 100, ro - 2, ri + 2, a + gap / 2, Math.max(a + gap / 2 + 0.001, a + sweep - gap / 2)), i }
    a += sweep
    return s
  })
  const circ = 2 * Math.PI * mid
  return (
    <>
      <div className="pie-wrap">
        <svg viewBox="0 0 200 200" className="pie" role="img" aria-label={spec.title}>
          <mask id={`m${gid}`}>
            <circle cx="100" cy="100" r={mid} fill="none" stroke="#fff" strokeWidth={ro} strokeDasharray={circ}
              strokeDashoffset={appeared ? 0 : circ} transform="rotate(-90 100 100)" className="pie-sweep" />
          </mask>
          <g mask={`url(#m${gid})`}>
            {slices.map((s) => <path key={s.i} d={s.d} fill={color(s.i)} stroke={color(s.i)} strokeWidth="4" strokeLinejoin="round" />)}
          </g>
        </svg>
        <div className="pie-center"><strong>{abbreviated(total)}</strong><span>total</span></div>
      </div>
      <div className="legend">
        {spec.points.map((p, i) => (
          <div className="legend-row" key={p.label + i}>
            <i style={{ background: color(i) }} />
            <span className="lg-label">{truncate(p.label, 22)}</span>
            <b>{abbreviated(p.value)}</b>
            {total > 0 && <em>{Math.round((p.value / total) * 100)}%</em>}
          </div>
        ))}
      </div>
    </>
  )
}
