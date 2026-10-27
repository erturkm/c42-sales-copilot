import { getContext } from '@microsoft/power-apps/app'
import { orgUrl, runtimeConfig, loadRuntimeConfig } from './envconfig'
import { MicrosoftDataverseService } from '../generated/services/MicrosoftDataverseService'

const lines: string[] = []
const pending: { n: number; text: string }[] = []
const sessionId = Math.random().toString(36).slice(2, 8)
let seq = 0
let who = ''
let flushing = false
const device = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 290) : ''

void getContext().then((c) => { who = c.user.userPrincipalName ?? c.user.fullName ?? '' }).catch(() => {})

async function flush() {
  if (flushing || !runtimeConfig().debugLogging || !orgUrl()) return
  flushing = true
  try {
    while (pending.length) {
      const batch = pending.splice(0, 5)
      await Promise.all(batch.map((b) => MicrosoftDataverseService.CreateRecordWithOrganization('return=minimal', 'application/json', orgUrl(), 'c42_applogs', {
        c42_name: `${sessionId} #${String(b.n).padStart(4, '0')}`, c42_session: sessionId, c42_user: who, c42_device: device, c42_message: b.text.slice(0, 3900),
      }).catch(() => {})))
    }
  } finally { flushing = false }
}
setTimeout(() => { void loadRuntimeConfig() }, 0)
setInterval(() => { void flush() }, 1500)

const listeners = new Set<() => void>()

export function dlog(msg: string) {
  const t = new Date().toTimeString().slice(0, 8)
  lines.push(`${t} ${msg}`)
  pending.push({ n: ++seq, text: `${t} ${msg}` })
  if (pending.length > 200) pending.shift()
  if (lines.length > 120) lines.shift()
  console.log('[dbg]', msg)
  listeners.forEach((l) => l())
}
export const getLog = () => lines.slice()
export function onLog(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => dlog(`window error: ${e.message}`))
  window.addEventListener('unhandledrejection', (e) => dlog(`unhandled: ${String((e.reason as Error)?.message ?? JSON.stringify(e.reason) ?? e.reason)} ${(e.reason as Error)?.stack?.slice(0, 200) ?? ''}`))
  dlog(`UA ${navigator.userAgent.slice(0, 110)}`)
  dlog(`mediaDevices=${!!navigator.mediaDevices} secure=${window.isSecureContext} framed=${window.top !== window}`)
  void (navigator as Navigator & { permissions?: Permissions }).permissions?.query({ name: 'microphone' as PermissionName })
    .then((p) => { dlog(`mic permission: ${p.state}`); p.onchange = () => dlog(`mic permission -> ${p.state}`) })
    .catch((e) => dlog(`permissions.query failed: ${e}`))
}

if (typeof window !== 'undefined') {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
  const report = () => {
    document.body.appendChild(probe)
    const cs = getComputedStyle(probe)
    const vv = window.visualViewport
    dlog(`viewport inner=${innerWidth}x${innerHeight} outer=${outerWidth}x${outerHeight} screen=${screen.width}x${screen.height} vv=${vv ? `${Math.round(vv.width)}x${Math.round(vv.height)}@${Math.round(vv.offsetTop)}` : 'n/a'} dpr=${devicePixelRatio}`)
    dlog(`insets t=${cs.paddingTop} r=${cs.paddingRight} b=${cs.paddingBottom} l=${cs.paddingLeft} standalone=${(navigator as Navigator & { standalone?: boolean }).standalone} dm=${matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'}`)
    probe.remove()
  }
  window.addEventListener('load', () => setTimeout(report, 800))
  window.addEventListener('orientationchange', () => setTimeout(report, 500))
}
