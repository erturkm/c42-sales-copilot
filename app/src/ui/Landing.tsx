import { LogoMark } from './Icons'

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <main className="landing">
      <div className="landing-inner">
        <LogoMark size={76} />
        <div className="landing-copy">
          <h1>C42 Sales Copilot</h1>
          <p>Talk or type to your Core42 accounts. Signed in as you — your CRM permissions apply.</p>
        </div>
        <button className="btn-prominent" onClick={onStart}>Start</button>
      </div>
    </main>
  )
}
