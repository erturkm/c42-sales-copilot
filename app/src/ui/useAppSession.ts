import { useMockSession } from '../lib/mockSession'
import { useSession } from '../lib/session'

const mock = new URLSearchParams(location.search).has('mock') || import.meta.env.DEV && location.hostname === 'localhost'

// Chosen once at module load so hook order never changes between renders.
export const useAppSession = mock ? useMockSession : useSession
