import { useState } from 'react'
import Sheet from './Sheet'
import { useStore } from '../store/useStore'
import { login, logout } from '../lib/auth'

export default function AccountPanel() {
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  const user = useStore((s) => s.user)
  const showToast = useStore((s) => s.showToast)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
      showToast('Signed in')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={panel === 'account'}
      onClose={() => setPanel('none')}
      title={user ? 'Account' : 'Sign in'}
      subtitle={user ? user.email : 'Optional — sync your saved spots'}
    >
      {user ? (
        <div className="account">
          <div className="account__who">
            <span className="account__avatar">{(user.name ?? user.email)[0]?.toUpperCase()}</span>
            <div>
              <strong>{user.name ?? 'Forager'}</strong>
              <span className="muted small">{user.email}</span>
            </div>
          </div>
          <button className="btn btn--block btn--ghost" onClick={() => { logout(); showToast('Signed out') }}>
            Sign out
          </button>
          <p className="muted small">
            Manage your account, contributions and email settings on{' '}
            <a href="https://fallingfruit.org/users/edit" target="_blank" rel="noopener noreferrer">
              fallingfruit.org
            </a>
            .
          </p>
        </div>
      ) : (
        <form className="account" onSubmit={submit}>
          <p className="muted">
            Sign in with your <strong>Falling Fruit</strong> account to sync saved spots across
            devices. Browsing and saving work fine without an account.
          </p>
          <input
            className="field"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            className="field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn--block btn--primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="muted small">
            No account?{' '}
            <a href="https://fallingfruit.org/users/sign_up" target="_blank" rel="noopener noreferrer">
              Create one on fallingfruit.org
            </a>
          </p>
        </form>
      )}

      <div className="divider" />
      <div className="about">
        <p className="muted small">
          Map data © <a href="https://fallingfruit.org" target="_blank" rel="noopener noreferrer">Falling Fruit</a> & contributors.
          Basemap © <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> /
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer"> OpenStreetMap</a>.
          Place search © OpenStreetMap Nominatim.
        </p>
        <p className="muted small">Fruit Liberation — an independent, open client. Forage responsibly: only pick where permitted, and leave plenty for others and wildlife. 🌍</p>
      </div>
    </Sheet>
  )
}
