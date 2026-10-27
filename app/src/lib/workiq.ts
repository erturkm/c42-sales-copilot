import type { IOperationResult } from '@microsoft/power-apps/data'
import { WorkIQMCPService } from '../generated/services/WorkIQMCPService'
import type { QueryRequest } from '../generated/models/WorkIQMCPModel'
import { McpClient, asObj, type McpTool } from './mcp'

const TEXT_KEYS = ['question', 'query', 'prompt', 'text', 'input', 'message']

/** Work IQ MCP — replaces the iOS Microsoft Graph client (mail, calendar, people, Teams). */
export class WorkIQ extends McpClient {
  constructor() {
    super('Work IQ', (body, sid) =>
      WorkIQMCPService.InvokeWorkIQMCP(sid, body as QueryRequest) as unknown as Promise<IOperationResult<unknown>>)
  }

  has(name: string): boolean { return this.tools.some((t) => t.name === name) }

  private textArg(tool: McpTool): string {
    const props = Object.keys(asObj(asObj(tool.inputSchema).properties))
    const required = Array.isArray(asObj(tool.inputSchema).required) ? (asObj(tool.inputSchema).required as string[]) : []
    return TEXT_KEYS.find((k) => props.includes(k)) ?? required[0] ?? props[0] ?? 'question'
  }

  /** Calls `ask` (falling back to `retrieve`) with a natural-language question. */
  async ask(question: string): Promise<string> {
    const tool = this.tools.find((t) => t.name === 'ask') ?? this.tools.find((t) => t.name === 'retrieve')
    if (!tool) return 'Work IQ is not available right now.'
    return this.callTool(tool.name, { [this.textArg(tool)]: question })
  }

  async retrieve(query: string): Promise<string> {
    const tool = this.tools.find((t) => t.name === 'retrieve')
    if (!tool) return this.ask(query)
    return this.callTool(tool.name, { [this.textArg(tool)]: query })
  }

  /** Quick runtime probe: logs the live tool list so schemas can be checked in the player. */
  async probe(): Promise<string[]> {
    const names = this.tools.map((t) => `${t.name}(${Object.keys(asObj(asObj(t.inputSchema).properties)).join(',')})`)
    console.info('[workiq] tools', names)
    return names
  }
}
