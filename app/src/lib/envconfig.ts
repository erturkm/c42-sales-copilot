import { getContext } from '@microsoft/power-apps/app'
import { dlog } from './log'
import { MicrosoftDataverseService } from '../generated/services/MicrosoftDataverseService'

export interface RuntimeConfig {
  orgUrl: string
  foundryHost: string
  realtimeModel: string
  defaultVoice: string
  debugLogging: boolean
}

const FALLBACK: RuntimeConfig = { orgUrl: '', foundryHost: '', realtimeModel: 'gpt-realtime-2.1', defaultVoice: 'marin', debugLogging: false }
let cfg: RuntimeConfig = { ...FALLBACK }
const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])
let loading: Promise<RuntimeConfig> | null = null

export const runtimeConfig = () => cfg
export const orgUrl = () => cfg.orgUrl

type Rows = Record<string, unknown>[]

async function listRows(org: string, entity: string, select: string, filter: string): Promise<Rows> {
  const r = await withTimeout(
    MicrosoftDataverseService.ListRecordsWithOrganization(org, entity, undefined, 'application/json', undefined, undefined, select, filter, undefined, undefined, undefined, 50), 10_000)
  if (r.success === false || r.error) throw new Error('query failed')
  return (r.data as { value?: Rows } | undefined)?.value ?? []
}

const readVars = async (org: string) => {
  const [defs, vals] = await Promise.all([
    listRows(org, 'environmentvariabledefinitions', 'environmentvariabledefinitionid,schemaname,defaultvalue', "startswith(schemaname,'c42_')"),
    listRows(org, 'environmentvariablevalues', '_environmentvariabledefinitionid_value,value', "startswith(schemaname,'c42_')"),
  ])
  return { defs, vals }
}

export interface OrgOption { url: string; name: string }
let pendingPick: { options: OrgOption[]; resolve: (url: string) => void } | null = null
const pickListeners = new Set<() => void>()
export const getPendingPick = () => pendingPick
export const subscribePick = (l: () => void) => { pickListeners.add(l); return () => { pickListeners.delete(l) } }
export function choosePick(url: string) {
  try { localStorage.setItem('c42.org', url) } catch { /* storage unavailable */ }
  const p = pendingPick
  pendingPick = null
  pickListeners.forEach((l) => l())
  p?.resolve(url)
}
function askWhichOrg(options: OrgOption[]): Promise<string> {
  try {
    const saved = localStorage.getItem('c42.org')
    if (saved && options.some((o) => o.url === saved)) return Promise.resolve(saved)
  } catch { /* storage unavailable */ }
  return new Promise((resolve) => {
    pendingPick = { options, resolve }
    pickListeners.forEach((l) => l())
  })
}

async function candidateOrgs(): Promise<OrgOption[]> {
  try {
    const ctx = await withTimeout(getContext(), 8_000)
    dlog(`ctx org=${ctx.app.dataverseOrgUrl ?? 'none'}`)
    if (ctx.app.dataverseOrgUrl) { const url = ctx.app.dataverseOrgUrl.replace(/\/+$/, ''); return [{ url, name: url }] }
  } catch (e) { dlog(`ctx failed: ${(e as Error)?.message ?? e}`) }
  try {
    const r = await withTimeout(MicrosoftDataverseService.GetOrganizations(), 10_000)
    const options = (r.data?.value ?? []).filter((o) => o.Url).map((o) => ({ url: (o.Url as string).replace(/\/+$/, ''), name: o.FriendlyName ?? (o.Url as string) }))
    dlog(`orgs from connector: ${options.length}`)
    return options
  } catch (e) { dlog(`GetOrganizations failed: ${(e as Error)?.message ?? e}`) }
  return []
}

type Vars = { defs: Rows; vals: Rows }
const pickVal = ({ defs, vals }: Vars, name: string): string | undefined => {
  const d = defs.find((x) => x.schemaname === name)
  if (!d) return undefined
  const v = vals.find((x) => x._environmentvariabledefinitionid_value === d.environmentvariabledefinitionid)
  const out = String((v?.value as string | undefined) ?? (d.defaultvalue as string | undefined) ?? '').trim()
  return out || undefined
}

async function resolveOrg(): Promise<{ org: string; vars: Vars } | null> {
  const options = await candidateOrgs()
  if (!options.length) return null
  if (options.length === 1) {
    try { const vars = await readVars(options[0].url); return vars.defs.length ? { org: options[0].url, vars } : null } catch { return null }
  }
  const probed = await Promise.all(options.map(async (o) => {
    try { const vars = await readVars(o.url); return vars.defs.length ? { o, vars } : null } catch { return null }
  }))
  const hits = probed.filter((x): x is { o: OrgOption; vars: Vars } => !!x)
  dlog(`environments with c42 config: ${hits.length} of ${options.length}`)
  if (!hits.length) return null
  if (hits.length === 1) return { org: hits[0].o.url, vars: hits[0].vars }
  const chosen = await askWhichOrg(hits.map((h) => h.o))
  const hit = hits.find((h) => h.o.url === chosen) ?? hits[0]
  return { org: hit.o.url, vars: hit.vars }
}

export function loadRuntimeConfig(): Promise<RuntimeConfig> {
  loading ??= (async () => {
    const next = { ...FALLBACK }
    try {
      const found = await resolveOrg()
      if (found) {
        next.orgUrl = found.org
        next.foundryHost = pickVal(found.vars, 'c42_FoundryEndpoint')?.replace(/^https?:\/\//, '').replace(/\/.*$/, '') ?? ''
        next.realtimeModel = pickVal(found.vars, 'c42_RealtimeDeployment') ?? next.realtimeModel
        next.defaultVoice = pickVal(found.vars, 'c42_RealtimeVoice') ?? next.defaultVoice
        next.debugLogging = (pickVal(found.vars, 'c42_DebugLogging') ?? 'false').toLowerCase() === 'true'
      }
    } catch (e) {
      dlog(`config read failed: ${(e as Error)?.message ?? e}`)
    }
    dlog(`config org=${next.orgUrl ? 'ok' : 'MISSING'} foundry=${next.foundryHost ? 'ok' : 'MISSING'} model=${next.realtimeModel}`)
    cfg = next
    return cfg
  })()
  return loading
}
