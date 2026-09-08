import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShopLayout } from '../components/shop/ShopLayout'
import { useShopNotice } from '../components/shop/ShopNoticeProvider'
import { useAuth } from '../contexts/AuthContext'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { notify } = useShopNotice()
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
      const { confirmationEmailSent } = await register(email, password)
      if (confirmationEmailSent) {
        notify(
          'Ți-am trimis un email de confirmare la adresa introdusă. Verifică și folderul Spam.',
          'Cont creat',
        )
      } else {
        notify(
          'Contul a fost creat, dar emailul de confirmare nu s-a putut trimite automat. Dacă nu primești mesajul în câteva minute, scrie-ne.',
          'Cont creat',
        )
      }
      navigate('/')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Nu am putut crea contul.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ShopLayout>
      <section className="shop-page shop-auth">
        <div className="shop-page__head">
          <h1 className="shop-page__title">Înregistrare</h1>
          <p className="shop-page__lead muted">
            Creează un cont de client cu email și parolă. După înregistrare
            primești un email de confirmare la adresa folosită.
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
              autoComplete="new-password"
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
            {submitting ? 'Se creează contul…' : 'Creează cont'}
          </button>
        </form>

        <p className="shop-auth__footer muted">
          Ai deja cont? <Link to="/conectare">Conectare</Link>
        </p>
      </section>
    </ShopLayout>
  )
}
