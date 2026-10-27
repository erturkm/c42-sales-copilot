import type { ReactNode, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }
const Svg = ({ size = 20, children, ...rest }: P & { children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{children}</svg>
)

/** Waveform glyph in a blue circle (the sign-in logo). */
export function LogoMark({ size = 76 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <circle cx="32" cy="32" r="32" fill="var(--accent)" />
      <g stroke="#fff" strokeWidth="4.2" strokeLinecap="round">
        <path className="bar b1" d="M17 27v10" /><path className="bar b2" d="M24.5 21v22" />
        <path className="bar b3" d="M32 14v36" /><path className="bar b4" d="M39.5 21v22" />
        <path className="bar b5" d="M47 27v10" />
      </g>
    </svg>
  )
}

export const IconBubble = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z"
    fill={filled ? 'currentColor' : 'none'} /></Svg>
)
export const IconKeyboard = (p: P) => (
  <Svg {...p}><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></Svg>
)
export const IconMic = (p: P) => (
  <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></Svg>
)
export const IconMicOutline = (p: P) => (
  <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></Svg>
)
export const IconMicSlash = (p: P) => (
  <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M3.5 3.5l17 17" /></Svg>
)
export const IconStop = (p: P) => <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" /></Svg>
export const IconReset = (p: P) => <Svg {...p}><path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5" /></Svg>
export const IconSliders = (p: P) => (
  <Svg {...p}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></Svg>
)
export const IconSend = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="16" fill="currentColor" />
    <path d="M16 23V10M10.5 15.5 16 10l5.5 5.5" stroke="var(--bg)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
)
export const IconCheck = (p: P) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7" strokeWidth={2.4} /></Svg>
export const IconSparkle = (p: P) => (
  <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" fill="currentColor" strokeWidth={1} /></Svg>
)
export const IconChevronUp = (p: P) => <Svg {...p}><path d="M6 15l6-6 6 6" /></Svg>
export const IconChevronRight = (p: P) => <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>
export const IconClose = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="14" fill="rgba(0,0,0,.45)" />
    <path d="M9.5 9.5l9 9M18.5 9.5l-9 9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)
export const IconWarning = (p: P) => <Svg {...p}><path d="M12 3.5l9.5 16.5h-19zM12 10v4.5M12 17.2h.01" /></Svg>
export const IconStar = (p: P) => <Svg {...p}><path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.8 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z" fill="currentColor" strokeWidth={1} /></Svg>
export const IconRefresh = (p: P) => <Svg {...p}><path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v4.5h-4.5" /></Svg>
