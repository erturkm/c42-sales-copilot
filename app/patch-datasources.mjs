// The Work IQ MCP connector answers with text/event-stream. The generated schema declares a JSON object
// response, which makes the SDK JSON.parse the SSE text and fail. Dropping responseInfo returns the raw string.
import fs from 'node:fs'
const f = '.power/schemas/appschemas/dataSourcesInfo.ts'
let s = fs.readFileSync(f, 'utf8')
const i = s.indexOf('"InvokeWorkIQMCP"')
const j = s.indexOf('"responseInfo"', i)
const end = s.indexOf('},\n      "GetInvokeWorkIQMCP"', j)
if (i > 0 && j > 0 && end > j && j - i < 800) {
  s = s.slice(0, s.lastIndexOf(',', j)) + '\n      ' + s.slice(end)
  fs.writeFileSync(f, s)
  console.log('patched InvokeWorkIQMCP responseInfo')
} else console.log('already patched or not found')

// The Foundry calls connector reads the bearer from header x-ek and a policy copies it to Authorization,
// because the connector gateway rejects a caller-supplied Authorization header. Cached generated code still says Authorization.
{
  let t = fs.readFileSync(f, 'utf8')
  const a = t.indexOf('"CreateRealtimeCall"')
  if (a > 0) {
    const b = t.indexOf('"name": "Authorization"', a)
    if (b > 0 && b - a < 1500) {
      t = t.slice(0, b) + '"name": "x-ek"' + t.slice(b + '"name": "Authorization"'.length)
      fs.writeFileSync(f, t)
      console.log('patched CreateRealtimeCall header name')
    }
  }
  const g = 'src/generated/services/C42FoundryCallsService.ts'
  let u = fs.readFileSync(g, 'utf8')
  if (u.includes('{ model, Authorization, body }')) {
    u = u.replace('{ model, Authorization, body }', "{ model, 'x-ek': Authorization, body }").replace(/\{ model: string, Authorization: string, body: string \}/g, "{ model: string, 'x-ek': string, body: string }")
    u = u.replace('IOperationResult<string>>', 'IOperationResult<{ sdp?: string }>>').replace("'x-ek': string, body: string }, string>", "'x-ek': string, body: string }, { sdp?: string }>")
    fs.writeFileSync(g, u)
    console.log('patched calls service')
  }
}
