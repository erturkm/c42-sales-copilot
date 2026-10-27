import type { Message } from '../lib/types'
import { AccountCard } from './AccountCard'
import { ChartCard } from './ChartCard'
import { IconSparkle } from './Icons'

export function MessageRow({ message }: { message: Message }) {
  if (message.role === 'user') {
    return <div className="msg msg-user"><div className="bubble user">{message.text}</div></div>
  }
  if (message.role === 'tool') {
    return (
      <div className="msg tool-row"><IconSparkle size={12} /><span>{message.toolName ?? 'Working'}</span></div>
    )
  }
  return (
    <div className="msg msg-assistant">
      {message.text !== '' && (
        <div className="bubble reply">
          {message.text}{message.isStreaming && <span className="caret" aria-hidden="true" />}
        </div>
      )}
      {message.card && <AccountCard card={message.card} />}
      {message.chart && <ChartCard spec={message.chart} />}
    </div>
  )
}
