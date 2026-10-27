import { useState, useSyncExternalStore } from 'react'
import { choosePick, getPendingPick, subscribePick } from './lib/envconfig'
import './App.css'
import { Assistant } from './ui/Assistant'
import { Landing } from './ui/Landing'
import { useAppSession } from './ui/useAppSession'

function OrgPicker() {
  const pick = useSyncExternalStore(subscribePick, getPendingPick)
  if (!pick) return null
  return (
    <div className="org-picker" role="dialog" aria-label="Choose environment">
      <div className="org-picker-card">
        <h2>Choose your Dataverse environment</h2>
        <p>The app couldn't tell which environment to use. Pick the one where C42 Sales Copilot is installed.</p>
        <select defaultValue="" onChange={(e) => e.target.value && choosePick(e.target.value)}>
          <option value="" disabled>Select an environment…</option>
          {pick.options.map((o) => <option key={o.url} value={o.url}>{o.name} — {o.url.replace('https://', '')}</option>)}
        </select>
      </div>
    </div>
  )
}

export default function App() {
  const session = useAppSession()
  const [started, setStarted] = useState(false)
  const idle = session.state.kind === 'idle'

  const start = () => { setStarted(true); void session.connect() }

  return (
    <div className="shell">
      <div className="phone">
        {idle && !started ? <Landing onStart={start} /> : <Assistant session={session} />}
        <OrgPicker />
      </div>
    </div>
  )
}
