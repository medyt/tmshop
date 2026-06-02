import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShopLayout } from '../components/shop/ShopLayout'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
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
      await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(typeof from === 'string' && from.startsWith('/') ? from : '/')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Nu am putut autentifica contul.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ShopLayout>
      <section className="shop-page shop-auth">
        <div className="shop-page__head">
          <h1 className="shop-page__title">Conectare</h1>
          <p className="shop-page__lead muted">
            Intră în contul tău de client. Comanda poate fi plasată și fără cont.
          </p>
        </div>

        <form className="shop-form shop-auth__form" onSubmit={handleSubmit}>
          <label className="shop-field shop-field--wide">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="shop-field shop-field--wide">
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
            <p className="shop-form__error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="shop-btn shop-btn--primary shop-btn--block"
            disabled={submitting}
          >
            {submitting ? 'Se conectează…' : 'Conectare'}
          </button>
        </form>

        <p className="shop-auth__footer muted">
          Nu ai cont? <Link to="/inregistrare">Înregistrare</Link>
        </p>
      </section>
    </ShopLayout>
  )
}
