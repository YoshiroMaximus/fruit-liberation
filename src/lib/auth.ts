import { configureAuth, login as apiLogin, refreshToken, fetchUser } from './api'
import { useStore } from '../store/useStore'

/** Returns a valid access token, refreshing if it's near expiry. */
async function ensureToken(): Promise<string | null> {
  const { auth, setAuth } = useStore.getState()
  if (!auth.token || !auth.acquiredAt) return null

  const expiresAtMs = auth.acquiredAt + auth.token.expires_in * 1000
  const stillValid = Date.now() < expiresAtMs - 60_000 // 60s safety margin
  if (stillValid) return auth.token.access_token

  try {
    const fresh = await refreshToken(auth.token.refresh_token)
    setAuth(fresh)
    return fresh.access_token
  } catch {
    // Refresh failed → session is dead.
    logout()
    return null
  }
}

/** Wire the api client to our token store. Call once at startup. */
export function initAuth() {
  configureAuth(ensureToken)
  const { auth } = useStore.getState()
  if (auth.token) {
    // Best-effort: load the profile (and validate the token) in the background.
    void loadUser()
  }
}

export async function loadUser() {
  try {
    const user = await fetchUser()
    useStore.getState().setUser(user)
  } catch {
    // token invalid – ensureToken/logout will handle it on next authed call
  }
}

export async function login(email: string, password: string) {
  const token = await apiLogin(email, password)
  useStore.getState().setAuth(token)
  await loadUser()
}

export function logout() {
  const s = useStore.getState()
  s.setAuth(null)
  s.setUser(null)
}
