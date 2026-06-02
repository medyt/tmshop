import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../App.css'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const user = await login(email, password)
      if (user.role !== 'admin') {
        await logout()
        setError('Acest cont nu are acces la zona de admin.')
        return
      }
      const redirectTo =
        typeof location.state === 'object' &&
        location.state &&
        'from' in location.state &&
        typeof (location.state as { from?: unknown }).from === 'string'
          ? (location.state as { from: string }).from
          : '/admin'
      navigate(redirectTo, { replace: true })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Nu am putut autentifica contul.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app admin-auth">
      <header className="app-header">
        <div className="app-header__titles">
          <h1>Admin Shoptop</h1>
          <p className="gestiune-subnav muted">
            <Link to="/">← Înapoi la magazin</Link>
          </p>
        </div>
      </header>

      <main className="app-main admin-auth__main">
        <section className="panel admin-auth__panel">
          <h2>Conectare admin</h2>
          <p className="muted">
            Doar conturile cu rol admin pot accesa gestiunea.
          </p>

          <form className="admin-auth__form" onSubmit={handleSubmit}>
            <label className="admin-auth__field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="admin-auth__field">
              <span>Parolă</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                minLength={8}
                required
              />
            </label>
            {error ? (
              <p className="app-status app-status--error" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? 'Se conectează…' : 'Intră în admin'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
