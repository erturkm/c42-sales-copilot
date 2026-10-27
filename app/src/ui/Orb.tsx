import type { CSSProperties } from 'react'

interface Props {
  level?: number
  isListening?: boolean
  isSpeaking?: boolean
  isThinking?: boolean
  isMuted?: boolean
  onClick?: () => void
}

/** The presence orb: breathes idle, swells with your voice, ripples while speaking. */
export function Orb({ level = 0, isListening, isSpeaking, isThinking, isMuted, onClick }: Props) {
  const live = !!isListening && !isMuted
  const state = live ? 'listening' : isSpeaking ? 'speaking' : isThinking ? 'thinking' : 'idle'
  const style = { '--s': 1 + Math.min(level, 1) * 0.28 } as CSSProperties
  return (
    <div
      className={`orb orb-${state}${isMuted ? ' orb-muted' : ''}${isListening || isSpeaking ? ' orb-active' : ''}`}
      style={style}
      onClick={onClick}
      role="img"
      aria-label={`Assistant ${isMuted ? 'muted' : state}`}
    >
      <div className="orb-bloom" />
      <div className="orb-core" />
      <div className="orb-spec" />
      {isThinking && <div className="orb-ring" />}
    </div>
  )
}
