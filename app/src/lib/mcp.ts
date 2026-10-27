import type { IOperationResult } from '@microsoft/power-apps/data'
import { MicrosoftDataverseService } from '../generated/services/MicrosoftDataverseService'
import type { QueryRequest } from '../generated/models/MicrosoftDataverseModel'
import { AppConfig } from './config'

export type Json = Record<string, unknown>
export interface McpTool { name: string; description: string; inputSchema: Json }
type Invoke = (body: QueryRequest, sessionId?: string) => Promise<IOperationResult<unknown>>

export const asObj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {})
export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e))

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    p.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

/** Extracts the JSON-RPC message for `id` from a connector payload: object, JSON string or raw SSE text. */
export function parseRpc(data: unknown, id: string): Json | undefined {
  if (data == null || data === '') return undefined
  if (typeof data === 'object') {
    const o = asObj(data)
    if ('result' in o || 'error' in o) return o
    if ('body' in o) return parseRpc(o.body, id)
    if ('data' in o) return parseRpc(o.data, id)
    return undefined
  }
  const text = String(data).trim()
  if (text.startsWith('{')) {
    try { return parseRpc(JSON.parse(text), id) } catch { /* maybe SSE */ }
  }
  let last: Json | undefined
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (!payload) continue
    try {
      const msg = asObj(JSON.parse(payload))
      if (String(msg.id) === id) return msg
      if ('result' in msg || 'error' in msg) last = msg
    } catch { /* partial frame */ }
  }
  return last
}

export function toolText(result: unknown): string {
  const r = asObj(result)
  const content = Array.isArray(r.content) ? (r.content as Json[]) : []
  const text = content.map((c) => (typeof c.text === 'string' ? c.text : '')).filter(Boolean).join('\n')
  if (r.isError === true) return `Error: ${text || 'tool failed'}`
  if (text) return text
  if (r.structuredContent !== undefined) return JSON.stringify(r.structuredContent)
  return 'Done.'
}

export class McpClient {
  private nextId = 1
  private sessionId: string | undefined
  tools: McpTool[] = []
  private readonly label: string
  private readonly invoke: Invoke
  constructor(label: string, invoke: Invoke) { this.label = label; this.invoke = invoke }

  private async request(method: string, params: Json): Promise<Json> {
    const id = String(this.nextId++)
    const res = await withTimeout(
      this.invoke({ jsonrpc: '2.0', id, method, params }, this.sessionId), AppConfig.mcpTimeoutMs, `${this.label} ${method}`)
    if (res.success === false || res.error) throw new Error(`${this.label} ${method} failed: ${errMsg(res.error)}`)
    const msg = parseRpc(res.data, id)
    if (!msg) throw new Error(`${this.label} ${method} returned an unreadable response`)
    const err = asObj(msg.error)
    if (Object.keys(err).length) throw new Error(`${this.label} ${method} error: ${String(err.message ?? 'unknown')}`)
    return asObj(msg.result)
  }

  private async notify(method: string) {
    try { await this.invoke({ jsonrpc: '2.0', method, params: {} }, this.sessionId) } catch { /* 202, no body */ }
  }

  async init(): Promise<void> {
    const result = await this.request('initialize', {
      protocolVersion: AppConfig.mcpProtocolVersion,
      capabilities: {},
      clientInfo: { name: 'C42 Sales Copilot', version: '0.1' },
    })
    const sid = asObj(result).sessionId
    if (typeof sid === 'string') this.sessionId = sid
    await this.notify('notifications/initialized')
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.request('tools/list', {})
    const raw = Array.isArray(result.tools) ? (result.tools as Json[]) : []
    this.tools = raw
      .filter((t) => typeof t.name === 'string')
      .map((t) => ({
        name: t.name as string,
        description: typeof t.description === 'string' ? t.description : '',
        inputSchema: Object.keys(asObj(t.inputSchema)).length ? asObj(t.inputSchema) : { type: 'object' },
      }))
    return this.tools
  }

  async callTool(name: string, args: Json): Promise<string> {
    try {
      return toolText(await this.request('tools/call', { name, arguments: args }))
    } catch (e) {
      return `Error: ${errMsg(e)}`
    }
  }
}

export class DataverseMCP extends McpClient {
  constructor() {
    super('Dataverse', (body, sid) => MicrosoftDataverseService.InvokeMCP(sid, body) as Promise<IOperationResult<unknown>>)
  }

  /** Runs read_query and returns the rows. Throws on tool errors so callers can fall back. */
  async query(sql: string): Promise<Json[]> {
    const text = await this.callTool('read_query', { querytext: sql })
    if (text.startsWith('Error:')) throw new Error(text)
    return parseRows(text)
  }
}

export function parseRows(text: string): Json[] {
  const start = text.indexOf('[')
  const objStart = text.indexOf('{')
  try {
    if (start >= 0 && (objStart < 0 || start < objStart)) {
      const v = JSON.parse(text.slice(start, text.lastIndexOf(']') + 1))
      return Array.isArray(v) ? (v as Json[]) : []
    }
    if (objStart >= 0) {
      const o = asObj(JSON.parse(text.slice(objStart, text.lastIndexOf('}') + 1)))
      for (const k of ['value', 'rows', 'records', 'data', 'results']) if (Array.isArray(o[k])) return o[k] as Json[]
    }
  } catch { /* unparseable */ }
  return []
}
