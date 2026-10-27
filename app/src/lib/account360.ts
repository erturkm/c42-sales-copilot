import { orgUrl } from './envconfig'
import { MicrosoftDataverseService } from '../generated/services/MicrosoftDataverseService'
import type { Account360, ChartPoint, ChartSpec, Contact, Level, OpenOpp, ServiceLine } from './types'
import { asObj, errMsg, type DataverseMCP, type Json } from './mcp'

type Row = Json
interface Q { set: string; select: string[]; filter?: string; orderby?: string; top?: number; sql: string }

const esc = (s: string) => s.replace(/'/g, "''")
const num = (v: unknown): number => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '')); return Number.isFinite(n) ? n : 0 }
const str = (v: unknown): string => (v == null ? '' : String(v))
const day = (v: unknown): string => str(v).slice(0, 10)
const lk = (r: Row, name: string): string => str(r[`_${name}_value`] ?? r[name])
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const FAMILY: Record<number, string> = { 100000000: 'Compass', 100000001: 'AI Cloud', 100000002: 'Sovereign Cloud', 100000003: 'Insight', 100000004: 'Professional Services' }
const STATUS: Record<number, NonNullable<ServiceLine['status']>> = { 100000000: 'active', 100000001: 'pilot', 100000002: 'renewal', 100000003: 'risk', 100000004: 'expired' }
const TIER: Record<number, string> = { 723720000: 'Prospect', 723720001: 'Pilot', 723720002: 'Growth', 723720003: 'Strategic' }
const AI: Record<number, string> = { 723720000: 'Exploring', 723720001: 'Piloting', 723720002: 'Scaling', 723720003: 'AI-Native' }
const STAGE = ['Qualify', 'Develop', 'Propose', 'Close']
const INDUSTRY: Record<number, string> = {
  6: 'Telecom & Business Services', 7: 'Consulting', 11: 'Healthcare', 12: 'Manufacturing', 16: 'Financial Services', 18: 'Industrial',
  20: 'Insurance', 24: 'Energy', 27: 'Government & Social Services', 30: 'Transportation & Logistics', 31: 'Utilities', 3: 'Media', 8: 'Consumer Services',
}

export function compactMoney(v: number): string {
  const a = Math.abs(v)
  const [d, s] = a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : a >= 1e3 ? [1e3, 'K'] : [1, '']
  const x = v / d
  return `$${x < 10 && s ? x.toFixed(1) : x.toFixed(0)}${s}`
}
const fmtDate = (iso: string): string => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
const monthKey = (iso: string) => iso.slice(0, 7)
const addMonths = (key: string, n: number): string => {
  const [y, m] = key.split('-').map(Number)
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

async function fetchRows(mcp: DataverseMCP, q: Q): Promise<Row[]> {
  try {
    const r = await MicrosoftDataverseService.ListRecordsWithOrganization(
      orgUrl(), q.set, undefined, 'application/json', undefined, undefined, q.select.join(','), q.filter, q.orderby, undefined, undefined, q.top ?? 500)
    if (r.success === false || r.error) throw new Error(errMsg(r.error))
    const items = asObj(r.data).value
    if (!Array.isArray(items)) throw new Error('unexpected ListRecords shape')
    return (items as Row[]).map((it) => ({ ...it, ...asObj(it.dynamicProperties) }))
  } catch (e) {
    console.warn('[account360] ListRecords failed, using MCP read_query', q.set, JSON.stringify(e instanceof Error ? e.message : e).slice(0, 600))
    return mcp.query(q.sql)
  }
}

async function findAccount(mcp: DataverseMCP, name?: string, id?: string): Promise<Row | undefined> {
  const cols = ['accountid', 'name', 'industrycode', 'address1_city', 'address1_country', 'incpt_customertier', 'incpt_aimaturity', 'incpt_currentarr', 'c42_customertier', 'createdon']
  const make = (filter: string, sqlWhere: string): Q => ({
    set: 'accounts', select: cols, filter, top: 10,
    sql: `SELECT TOP 5 ${cols.join(', ')} FROM account WHERE ${sqlWhere}`,
  })
  if (id) return (await fetchRows(mcp, make(`accountid eq ${id}`, `accountid = '${esc(id)}'`)))[0]
  const needle = (name ?? '').trim()
  if (!needle) return undefined
  const attempts = [needle, ...needle.split(/\s+/).filter((w) => w.length >= 4)]
  for (const t of attempts) {
    const rows = await fetchRows(mcp, make(`contains(name,'${esc(t)}')`, `name LIKE '%${esc(t)}%'`))
    if (!rows.length) continue
    const n = needle.toLowerCase()
    const rank = (r: Row) => { const x = str(r.name).toLowerCase(); return x === n ? 0 : x.startsWith(n) ? 1 : x.includes(n) ? 2 : 3 }
    const sorted = rows.sort((a, b) => rank(a) - rank(b) || str(a.name).length - str(b.name).length)
    const best = rank(sorted[0])
    const ties = sorted.filter((r) => rank(r) === best).slice(0, 5)
    for (const r of ties) {
      const aid = str(r.accountid)
      const subs = await fetchRows(mcp, { set: 'c42_subscriptions', top: 1, filter: `_c42_accountid_value eq ${aid}`, select: ['c42_subscriptionid'], sql: `SELECT TOP 1 c42_subscriptionid FROM c42_subscription WHERE c42_accountid = '${esc(aid)}'` })
      if (subs.length) return r
    }
    return sorted[0]
  }
  return undefined
}

function sparkLabel(key: string) { return MON[Number(key.slice(5, 7)) - 1] }

export async function buildAccount360(
  mcp: DataverseMCP, args: { account_name?: string; account_id?: string },
): Promise<{ card?: Account360; summary: string }> {
  const acct = await findAccount(mcp, args.account_name, args.account_id)
  if (!acct) return { summary: `No account matching "${args.account_name ?? args.account_id}" was found in CRM.` }
  const id = str(acct.accountid)
  const aid = id.toLowerCase()

  const [subsR, consR, contactsR, oppsR, casesR, actsR] = await Promise.all([
    fetchRows(mcp, {
      set: 'c42_subscriptions', top: 100, filter: `_c42_accountid_value eq ${aid}`,
      select: ['c42_subscriptionid', 'c42_name', 'c42_servicefamily', 'c42_servicename', 'c42_status', 'c42_startdate', 'c42_enddate', 'c42_annualcommitvalue', 'c42_contractedunits', 'c42_unitlabel'],
      sql: `SELECT TOP 5 c42_subscriptionid, c42_name, c42_servicefamily, c42_servicename, c42_status, c42_startdate, c42_enddate, c42_annualcommitvalue, c42_contractedunits, c42_unitlabel FROM c42_subscription WHERE c42_accountid = '${aid}' ORDER BY c42_annualcommitvalue DESC`,
    }),
    fetchRows(mcp, {
      set: 'c42_consumptions', top: 1000, filter: `_c42_accountid_value eq ${aid}`, orderby: 'c42_month asc',
      select: ['c42_subscriptionid', 'c42_month', 'c42_unitsconsumed', 'c42_billedamount', 'c42_utilisationpct'],
      sql: `SELECT TOP 5 c42_month, SUM(c42_billedamount) AS c42_billedamount FROM c42_consumption WHERE c42_accountid = '${aid}' GROUP BY c42_month ORDER BY c42_month DESC`,
    }),
    fetchRows(mcp, {
      set: 'contacts', top: 20, filter: `_parentcustomerid_value eq ${aid}`, select: ['fullname', 'jobtitle'],
      sql: `SELECT TOP 5 fullname, jobtitle FROM contact WHERE parentcustomerid = '${aid}'`,
    }),
    fetchRows(mcp, {
      set: 'opportunities', top: 50, filter: `_customerid_value eq ${aid} and statecode eq 0`, orderby: 'estimatedclosedate asc',
      select: ['name', 'estimatedvalue', 'estimatedclosedate', 'salesstage', 'closeprobability'],
      sql: `SELECT TOP 5 name, estimatedvalue, estimatedclosedate, salesstage, closeprobability FROM opportunity WHERE customerid = '${aid}' AND statecode = 0 ORDER BY estimatedclosedate`,
    }),
    fetchRows(mcp, {
      set: 'incidents', top: 50, filter: `_customerid_value eq ${aid} and statecode eq 0`, select: ['title', 'prioritycode', 'createdon'],
      sql: `SELECT TOP 5 title, prioritycode, createdon FROM incident WHERE customerid = '${aid}' AND statecode = 0 ORDER BY createdon DESC`,
    }),
    fetchRows(mcp, {
      set: 'activitypointers', top: 10, filter: `_regardingobjectid_value eq ${aid} and statecode eq 1`, orderby: 'modifiedon desc',
      select: ['subject', 'actualend', 'scheduledend', 'modifiedon'],
      sql: `SELECT TOP 5 subject, actualend, scheduledend, modifiedon FROM activitypointer WHERE regardingobjectid = '${aid}' AND statecode = 1 ORDER BY modifiedon DESC`,
    }).catch(() => [] as Row[]),
  ])

  const clock = new Date().toISOString().slice(0, 10)
  const months = consR.map((r) => monthKey(day(r.c42_month))).filter(Boolean)
  const anchor = months.length ? months.reduce((a, b) => (a > b ? a : b)) : monthKey(clock)
  const partial = anchor === monthKey(clock)
  const lastComplete = partial ? addMonths(anchor, -1) : anchor
  const window12 = Array.from({ length: 12 }, (_, i) => addMonths(anchor, i - 11))

  // consumption indexed by subscription and by month
  const bySub = new Map<string, Map<string, { billed: number; units: number; util: number }>>()
  const monthTotals = new Map<string, number>()
  for (const r of consR) {
    const k = monthKey(day(r.c42_month)); const s = lk(r, 'c42_subscriptionid').toLowerCase()
    const m = bySub.get(s) ?? new Map(); bySub.set(s, m)
    m.set(k, { billed: num(r.c42_billedamount), units: num(r.c42_unitsconsumed), util: num(r.c42_utilisationpct) })
    monthTotals.set(k, (monthTotals.get(k) ?? 0) + num(r.c42_billedamount))
  }

  const subs = subsR.map((r) => ({
    id: str(r.c42_subscriptionid).toLowerCase(), name: str(r.c42_name), family: FAMILY[num(r.c42_servicefamily)] ?? 'Other',
    svc: str(r.c42_servicename) || str(r.c42_name), status: STATUS[num(r.c42_status)] ?? 'active',
    start: day(r.c42_startdate), end: day(r.c42_enddate), commit: num(r.c42_annualcommitvalue), unit: str(r.c42_unitlabel),
  }))
  const familyOrder = ['Compass', 'AI Cloud', 'Sovereign Cloud', 'Insight', 'Professional Services']
  subs.sort((a, b) => familyOrder.indexOf(a.family) - familyOrder.indexOf(b.family) || b.commit - a.commit)

  const utilAvg = (sid: string, from: string, n: number) => {
    const m = bySub.get(sid); if (!m) return undefined
    const vals: number[] = []
    for (let i = 0; i < n; i++) { const v = m.get(addMonths(from, -i)); if (v) vals.push(v.util) }
    return vals.length ? avg(vals) : undefined
  }

  const services: ServiceLine[] = []
  const atRisk: { svc: string; recent: number; prior?: number }[] = []
  const expansion: string[] = []
  const renewals: { svc: string; end: string; days: number }[] = []
  for (const s of subs) {
    const recent = utilAvg(s.id, lastComplete, 2)
    const prior = utilAvg(s.id, addMonths(lastComplete, -2), 2)
    let status = s.status
    if (status === 'active') {
      if (recent !== undefined && (recent < 50 || (prior !== undefined && recent < prior * 0.75))) status = 'risk'
      else if (s.end && s.end >= clock && daysBetween(clock, s.end) <= 90) status = 'renewal'
    }
    if (status === 'risk') atRisk.push({ svc: s.svc, recent: recent ?? 0, prior })
    if (recent !== undefined && recent > 100) expansion.push(s.svc)
    if (s.status !== 'expired' && s.end && s.end >= clock && daysBetween(clock, s.end) <= 120) renewals.push({ svc: s.svc, end: s.end, days: daysBetween(clock, s.end) })
    const m = bySub.get(s.id)
    const u = m?.get(lastComplete)?.units
    let detail: string | undefined
    if (u !== undefined) {
      const label = /^1M tokens/i.test(s.unit) ? 'M tokens' : s.unit
      const n = u >= 100 ? Math.round(u).toLocaleString('en-US') : u.toFixed(1)
      detail = `${n}${label === 'M tokens' ? '' : ' '}${label}/mo${recent !== undefined ? ` · ${Math.round(recent)}% of commit` : ''}`
    }
    services.push({ family: s.family, name: s.family === 'Compass' ? s.svc.replace(/^Compass\s*-\s*/i, '') : s.svc, detail, status })
  }

  // headline numbers
  const live = subs.filter((s) => s.status !== 'expired')
  const commitTotal = live.reduce((a, s) => a + s.commit, 0)
  const arr = num(acct.incpt_currentarr) || commitTotal
  const year = anchor.slice(0, 4)
  const ytd = [...monthTotals].filter(([k]) => k.startsWith(year)).reduce((a, [, v]) => a + v, 0)
  const last3 = [0, 1, 2].map((i) => monthTotals.get(addMonths(lastComplete, -i)) ?? 0)
  const prev3 = [3, 4, 5].map((i) => monthTotals.get(addMonths(lastComplete, -i)) ?? 0)
  const ytdDelta = avg(prev3) > 0 && avg(last3) > 0 ? Math.round((avg(last3) / avg(prev3) - 1) * 100) : undefined
  const pipeline = oppsR.reduce((a, o) => a + num(o.estimatedvalue), 0)

  const covered = window12.filter((k) => monthTotals.has(k)).length
  const consumed12 = window12.reduce((a, k) => a + (monthTotals.get(k) ?? 0), 0)
  const commitPace = commitTotal * (covered / 12)

  renewals.sort((a, b) => a.days - b.days)
  const nextEnd = live.map((s) => s.end).filter((d) => d >= clock).sort()[0]
  const renewalDue = renewals.length ? fmtDate(renewals[0].end) : nextEnd ? fmtDate(nextEnd) : undefined

  const trendPoints: ChartPoint[] = window12.filter((k) => monthTotals.has(k)).map((k) => ({ label: sparkLabel(k), value: Math.round(monthTotals.get(k) ?? 0) }))

  const contacts: Contact[] = contactsR.map((c) => {
    const title = str(c.jobtitle)
    return { name: str(c.fullname), role: title.replace(/\s*\(Executive Sponsor\)/i, '') || undefined, sponsor: /sponsor/i.test(title) }
  }).sort((a, b) => Number(!!b.sponsor) - Number(!!a.sponsor)).slice(0, 6)
  const sponsor = contacts.find((c) => c.sponsor)

  const opportunities: OpenOpp[] = oppsR.slice(0, 6).map((o) => ({
    name: str(o.name), value: compactMoney(num(o.estimatedvalue)), stage: STAGE[num(o.salesstage)] ?? undefined,
    closeDate: o.estimatedclosedate ? fmtDate(day(o.estimatedclosedate)) : undefined,
  }))

  const critical = casesR.filter((c) => num(c.prioritycode) === 1)
  const support = {
    open: casesR.length, critical: critical.length || undefined,
    summary: casesR.slice(0, 2).map((c) => str(c.title)).join('; ') || undefined,
  }

  const lastDates = actsR.map((a) => day(a.actualend || a.scheduledend || a.modifiedon)).filter((d) => d && d <= clock).sort()
  const lastD = lastDates[lastDates.length - 1]
  const ago = lastD ? daysBetween(lastD, clock) : undefined
  const lastContact = ago === undefined ? undefined : ago <= 0 ? 'Today' : ago === 1 ? 'Yesterday' : `${ago} days ago`

  const firstStart = subs.map((s) => s.start).filter(Boolean).sort()[0]
  const customerSince = firstStart ? firstStart.slice(0, 4) : day(acct.createdon).slice(0, 4) || undefined

  // rule-based alert, health and next best action
  let alert: Account360['alert']
  let nba: string | undefined
  if (atRisk.length) {
    const r = atRisk[0]
    alert = { level: 'risk', text: `${r.svc}: utilisation ${Math.round(r.recent)}%${r.prior !== undefined ? ` (was ${Math.round(r.prior)}%)` : ''} — churn risk` }
    nba = `Escalate with ${sponsor ? sponsor.name : 'the executive sponsor'} and agree a retention plan for ${r.svc}.`
  } else if (renewals.length) {
    const r = renewals[0]
    alert = { level: r.days <= 60 ? 'risk' : 'watch', text: `${r.svc} renews ${fmtDate(r.end)} (${r.days} days)` }
    nba = `Prepare the renewal quote for ${r.svc}${expansion.length ? ' and propose a capacity expansion' : ''}.`
  } else if (critical.length) {
    alert = { level: 'risk', text: `${critical.length} high-priority support case${critical.length > 1 ? 's' : ''} open` }
    nba = 'Review the high-priority support cases with the customer success lead.'
  } else if (expansion.length) {
    nba = `Propose a capacity expansion for ${expansion[0]} — consumption is above commit.`
  } else if (opportunities.length) {
    nba = `Advance "${opportunities[0].name}"${opportunities[0].closeDate ? `, closing ${opportunities[0].closeDate}` : ''}.`
  } else {
    nba = 'Schedule a quarterly business review to review usage and the roadmap.'
  }
  if (atRisk.length && renewals.length && alert) alert.text += ` · ${renewals[0].svc} renews ${fmtDate(renewals[0].end)}`
  const level: Level = atRisk.length || critical.length ? 'risk' : renewals.length ? 'watch' : 'good'
  const health = { label: level === 'risk' ? 'At risk' : level === 'watch' ? 'Watch' : 'Healthy', level }

  const name = str(acct.name)
  const place = [str(acct.address1_city), str(acct.address1_country).replace('United Arab Emirates', 'UAE')].filter(Boolean).join(', ')
  const subtitle = [INDUSTRY[num(acct.industrycode)], place].filter(Boolean).join(' · ') || undefined
  const tier = TIER[num(acct.incpt_customertier)] ?? (num(acct.c42_customertier) === 100000000 ? 'VIP' : undefined)

  const card: Account360 = {
    id, name, subtitle,
    initials: name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join(''),
    tier, aiMaturity: AI[num(acct.incpt_aimaturity)], health,
    metrics: [
      { label: 'ARR', value: compactMoney(arr) },
      { label: `${year} YTD usage`, value: compactMoney(ytd), delta: ytdDelta === undefined ? undefined : `${ytdDelta >= 0 ? '+' : '-'}${Math.abs(ytdDelta)}%` },
      { label: 'Open pipeline', value: compactMoney(pipeline) },
    ],
    commit: commitTotal > 0
      ? { consumed: Math.round(consumed12), commit: Math.round(commitPace), currency: 'USD', label: `Consumed vs commit · ${covered || 12} mo`, renewalDue }
      : undefined,
    alert, services,
    trend: trendPoints.length ? { title: 'Monthly consumption', unit: 'USD', points: trendPoints } : undefined,
    contacts, opportunities, support, nextBestAction: nba, customerSince, lastContact,
  }

  const lines = [
    `${name}${subtitle ? ` (${subtitle})` : ''}. Tier ${tier ?? 'n/a'}, AI maturity ${card.aiMaturity ?? 'n/a'}, health ${health.label}.`,
    `ARR ${compactMoney(arr)}; ${year} YTD consumption ${compactMoney(ytd)}${ytdDelta !== undefined ? ` (${card.metrics[1].delta} vs prior 3 months)` : ''}; open pipeline ${compactMoney(pipeline)} across ${opportunities.length} deal(s).`,
    commitTotal > 0 ? `Consumed ${compactMoney(consumed12)} against a commit pace of ${compactMoney(commitPace)} over ${covered || 12} months.` : '',
    alert ? `Alert: ${alert.text}.` : 'No alerts.',
    `Services: ${services.map((s) => `${s.name} [${s.status}]`).join('; ') || 'none'}.`,
    `Support: ${support.open} open${support.critical ? `, ${support.critical} high priority` : ''}.`,
    sponsor ? `Executive sponsor: ${sponsor.name}.` : '',
    lastContact ? `Last contact: ${lastContact}.` : '',
    `Next best action: ${nba}`,
    'The Account 360 card is now on screen — do not read every number; give the headline and the next best action.',
  ].filter(Boolean)
  return { card, summary: lines.join('\n') }
}

export function chartFromArgs(args: Json): ChartSpec | undefined {
  const raw = Array.isArray(args.points) ? (args.points as Json[]) : []
  const points: ChartPoint[] = []
  for (const p of raw) {
    if (typeof p.label !== 'string') continue
    const v = typeof p.value === 'number' ? p.value : parseFloat(String(p.value))
    if (Number.isFinite(v)) points.push({ label: p.label, value: v })
  }
  if (!points.length) return undefined
  const kind = args.kind === 'line' || args.kind === 'pie' ? args.kind : 'bar'
  return { id: crypto.randomUUID(), title: typeof args.title === 'string' ? args.title : 'Chart', kind, points }
}
