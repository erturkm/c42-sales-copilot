import type { Account360, ChartSpec } from './types'
import { buildAccount360, chartFromArgs } from './account360'
import { asObj, type DataverseMCP, type Json, type McpTool } from './mcp'
import type { WorkIQ } from './workiq'

export const LOCAL_TOOLS = new Set(['draw_chart', 'show_account_360'])
const WORKIQ_TOOLS = new Set(['work_iq_ask', 'work_iq_retrieve', 'recent_emails', 'upcoming_meetings', 'find_person', 'teams_messages', 'send_email'])

export const isWorkIQTool = (name: string) => WORKIQ_TOOLS.has(name)

export interface ToolHost {
  dv: DataverseMCP
  wiq?: WorkIQ
  showCard(card: Account360): void
  showChart(chart: ChartSpec): void
}

const fn = (name: string, description: string, properties: Json, required: string[] = []): Json => ({
  type: 'function', name, description, parameters: { type: 'object', properties, ...(required.length ? { required } : {}) },
})

function localSchemas(): Json[] {
  return [
    fn('draw_chart',
      'Display a chart to the seller. Use whenever numbers are easier to compare visually — consumption by month, pipeline by stage, ARR by customer, utilisation by service, top deals by value. If the seller said "show", they want to SEE it: render it, don\'t just read numbers aloud.',
      {
        title: { type: 'string' },
        kind: { type: 'string', enum: ['bar', 'line', 'pie'] },
        points: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'number' } }, required: ['label', 'value'] } },
      }, ['title', 'kind', 'points']),
    fn('show_account_360',
      'Show the Account 360 card for ONE Core42 customer: ARR, consumption vs commit, services by family with health, 12-month trend, contacts, open deals, support cases and a next best action. Call whenever the seller asks about one specific customer, and ALWAYS when they say "show" plus a customer name. The card is built from live CRM data by the app; you only pass the name. Returns a short text summary to narrate.',
      {
        account_name: { type: 'string', description: 'Customer name or a distinctive part of it.' },
        account_id: { type: 'string', description: 'accountid GUID if you already have it.' },
      }),
  ]
}

function workIQSchemas(wiq: WorkIQ): Json[] {
  const out: Json[] = [
    fn('work_iq_ask', 'Ask Work IQ a natural-language question about the seller\'s work: mail, meetings, Teams, files, colleagues. Use for anything the specific mail/calendar/people tools do not cover.',
      { question: { type: 'string' } }, ['question']),
    fn('upcoming_meetings', 'The seller\'s upcoming meetings from Outlook, with attendees. Use for "what\'s my day look like", "who am I seeing", or to prepare for a customer meeting.',
      { days: { type: 'integer', description: 'How many days ahead to look. Default 7.' } }),
    fn('recent_emails', 'Search the seller\'s mailbox. Use to recall what a customer said, find the latest thread on a deal, or check what was promised. Omit query for the most recent mail.',
      { query: { type: 'string', description: 'Keywords, sender name or company.' }, days: { type: 'integer', description: 'Look back this many days. Default 14.' } }),
    fn('find_person', 'Resolve a person\'s details and email address by name from the seller\'s organisation and contacts. ALWAYS use this before send_email if you only know a name — never guess an address.',
      { name: { type: 'string', description: 'Person\'s name.' } }, ['name']),
    fn('teams_messages', 'Search the seller\'s Microsoft Teams messages: "what did X say on Teams", "did anyone message me about". Informal commitments often live here rather than in mail.',
      { query: { type: 'string', description: 'Keywords, customer name or colleague name.' } }, ['query']),
    fn('send_email', 'Send an email as the seller. When asked to send, send it — do not ask for permission first. Only pause if you cannot tell WHO it goes to. Report what you sent afterwards, briefly.',
      {
        to: { type: 'array', items: { type: 'string' }, description: 'Recipient email addresses.' },
        subject: { type: 'string' },
        body: { type: 'string', description: 'The email body. Sign off as the seller.' },
      }, ['to', 'subject', 'body']),
  ]
  if (wiq.has('retrieve') && wiq.has('ask')) {
    out.push(fn('work_iq_retrieve', 'Retrieve raw relevant passages from the seller\'s work content (documents, mail, chats) for a topic. Prefer work_iq_ask for answers.',
      { query: { type: 'string' } }, ['query']))
  }
  return out
}

export function buildToolSchemas(dvTools: McpTool[], wiq?: WorkIQ): Json[] {
  const forwarded: Json[] = dvTools.map((t) => {
    const { $schema: _s, ...schema } = t.inputSchema
    void _s
    return { type: 'function', name: t.name, description: t.description.slice(0, 1000), parameters: schema }
  })
  return [...forwarded, ...localSchemas(), ...(wiq ? workIQSchemas(wiq) : [])]
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export async function runWorkIQTool(name: string, a: Json, wiq: WorkIQ): Promise<string> {
  switch (name) {
    case 'work_iq_ask': return wiq.ask(str(a.question))
    case 'work_iq_retrieve': return wiq.retrieve(str(a.query))
    case 'upcoming_meetings': {
      const days = typeof a.days === 'number' ? a.days : 7
      return wiq.ask(`List my upcoming meetings for the next ${days} days with date, time, title and attendees. Be concise.`)
    }
    case 'recent_emails': {
      const days = typeof a.days === 'number' ? a.days : 14
      const q = str(a.query)
      return wiq.ask(q
        ? `Search my email from the last ${days} days for "${q}". For each relevant message give sender, date, subject and a one-line summary. Most recent first, up to 8.`
        : `List my most recent emails from the last ${days} days with sender, date, subject and a one-line summary. Up to 8.`)
    }
    case 'find_person':
      return wiq.ask(`Find the person "${str(a.name)}" in my organisation and contacts. Give full name, job title and email address. If several people match, list them all.`)
    case 'teams_messages':
      return wiq.ask(`Search my Microsoft Teams messages for "${str(a.query)}". Give who said what, when and in which chat. Most recent first, up to 8.`)
    case 'send_email': {
      const to = Array.isArray(a.to) ? (a.to as string[]).join(', ') : str(a.to)
      if (!to || !str(a.subject) || !str(a.body)) return 'send_email needs to, subject and body.'
      return wiq.ask(`Send an email now from me to ${to} with the subject "${str(a.subject)}" and exactly this body:\n${str(a.body)}\nConfirm once it has been sent, or say plainly if you cannot send email.`)
    }
    default: return `Unknown Work IQ tool ${name}.`
  }
}

export async function runLocalTool(name: string, a: Json, host: ToolHost): Promise<string> {
  if (name === 'draw_chart') {
    const spec = chartFromArgs(a)
    if (!spec) return 'Could not render chart: expected title, kind and points[].'
    host.showChart(spec)
    return 'Chart displayed to the user.'
  }
  const { card, summary } = await buildAccount360(host.dv, { account_name: str(a.account_name) || str(a.name), account_id: str(a.account_id) })
  if (card) host.showCard(card)
  return summary
}

/** The raw query stays in the console log, off the screen. */
export function summarise(a: Json): string {
  if (typeof a.querytext === 'string') return a.querytext
  if (typeof a.searchtext === 'string') return a.searchtext
  return JSON.stringify(a).slice(0, 180)
}

const NAME_COLUMNS = ['name', 'fullname', 'title', 'subject', 'c42_name', 'c42_servicename']

function quoted(text: string): string | undefined {
  const parts = text.split("'")
  for (let i = 1; i < parts.length; i += 2) {
    const prior = parts[i - 1].toLowerCase().split(/\s+/).filter((w) => w && w !== '=' && w !== 'like' && w !== '(')
    const column = (prior[prior.length - 1] ?? '').replace(/[(),=]/g, '')
    if (!NAME_COLUMNS.some((c) => column === c || column.endsWith(`.${c}`))) continue
    const cand = parts[i].replace(/%/g, '').trim()
    if (cand.length > 2 && cand.length < 60 && /[a-z]/i.test(cand) && (!cand.includes('-') || cand.includes(' '))) return cand
  }
  return undefined
}

const friendlyTable = (t: string) => ({ c42_subscription: 'subscription', c42_consumption: 'consumption', opportunity: 'deal', incident: 'support case' }[t] ?? t.replace(/_/g, ' '))

/** Turns a tool call into something a seller would recognise. */
export function humanise(name: string, a: Json): string {
  switch (name) {
    case 'upcoming_meetings': return 'Checking your calendar'
    case 'recent_emails': return 'Searching your email'
    case 'find_person': return 'Looking up a contact'
    case 'teams_messages': return 'Searching your Teams messages'
    case 'work_iq_ask': case 'work_iq_retrieve': return 'Checking your work context'
    case 'send_email': { const to = Array.isArray(a.to) ? str((a.to as unknown[])[0]) : str(a.to); return to ? `Sending an email to ${to}` : 'Sending an email' }
    case 'draw_chart': return 'Drawing a chart'
    case 'show_account_360': return str(a.account_name) ? `Building the ${str(a.account_name)} account view` : 'Building the account view'
    case 'describe': case 'describe_table': {
      const raw = str(a.path) || str(a.table) || str(a.tablename) || str(a.table_name)
      const table = raw.split('/').pop() ?? ''
      return table ? `Checking the ${friendlyTable(table)} fields` : 'Checking the CRM structure'
    }
    case 'search': {
      const t = str(a.searchtext) || str(a.query)
      return t ? `Searching CRM for ${t}` : 'Searching CRM'
    }
  }
  const query = a.querytext
  if (typeof query !== 'string') return name.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  const lower = query.toLowerCase()
  const subject = quoted(query)
  const aggregate = /group by|count\(|sum\(|avg\(/.test(lower)
  if (lower.includes('from c42_consumption')) return subject ? `Reading ${subject}'s usage` : aggregate ? 'Adding up consumption' : 'Pulling up consumption'
  if (lower.includes('from c42_subscription')) {
    if (subject) return `Getting ${subject}'s contracts`
    return /c42_enddate/.test(lower) ? 'Checking renewals' : aggregate ? 'Reviewing contracts and commits' : 'Pulling up subscriptions'
  }
  if (lower.includes('from opportunity')) {
    if (subject) return `Pulling up ${subject}'s deals`
    return aggregate ? 'Adding up your pipeline' : 'Pulling up your pipeline'
  }
  if (lower.includes('from incident')) return subject ? `Checking ${subject}'s support cases` : 'Checking support cases'
  if (lower.includes('from c42_bundle')) return 'Looking at GPU bundles'
  if (lower.includes('from account')) return subject ? `Getting ${subject}'s details` : aggregate ? 'Reviewing your customer portfolio' : 'Looking up customer details'
  if (lower.includes('from contact')) return subject ? `Getting ${subject}'s details` : 'Looking up contact details'
  if (lower.includes('from systemuser')) return 'Identifying you in CRM'
  if (subject) return `Looking up ${subject}`
  return aggregate ? 'Crunching the numbers' : 'Reading from CRM'
}

export const parseArgs = (raw: string): Json => { try { return asObj(JSON.parse(raw)) } catch { return {} } }
