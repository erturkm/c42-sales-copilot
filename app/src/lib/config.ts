import { runtimeConfig } from './envconfig'

export const AppConfig = {
  noiseReduction: 'near_field',
  vadEagerness: 'low',
  voices: ['marin', 'cedar', 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'],
  transcriptionModel: 'whisper-1',
  mcpProtocolVersion: '2025-03-26',
  toolResultLimit: 12_000,
  mcpTimeoutMs: 90_000,
  voiceStorageKey: 'c42.voice',
} as const

export function loadVoice(): string {
  try {
    const v = localStorage.getItem(AppConfig.voiceStorageKey)
    if (v && (AppConfig.voices as readonly string[]).includes(v)) return v
  } catch { /* storage unavailable in sandboxed iframe */ }
  return runtimeConfig().defaultVoice
}

export function saveVoice(v: string) {
  try { localStorage.setItem(AppConfig.voiceStorageKey, v) } catch { /* ignore */ }
}
