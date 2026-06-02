import { useState, type FormEvent } from 'react'
import { useShopNotice } from './ShopNoticeProvider'
import {
  isContactApiEnabled,
  submitContactMessage,
} from '../../lib/contactApi'

const emptyForm = {
  name: '',
  email: '',
  subject: '',
  message: '',
}

export function ContactForm() {
  const [form, setForm] = useState({ ...emptyForm })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { notify } = useShopNotice()

  const update = (key: keyof typeof emptyForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    if (!form.name.trim() || !form.email.trim()) {
      notify('Completează numele și adresa de email.', 'Date incomplete')
      return
    }
    if (form.message.trim().length < 10) {
      notify('Mesajul trebuie să aibă cel puțin 10 caractere.', 'Date incomplete')
      return
    }
    if (!isContactApiEnabled()) {
      setError(
        'Trimiterea mesajelor necesită API-ul configurat pe server. Poți folosi și linkul de email de mai sus.',
      )
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || undefined,
        message: form.message.trim(),
      })
      setDone(true)
      setForm({ ...emptyForm })
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nu am putut trimite mesajul. Încearcă din nou.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="shop-contact-form__done">
        <p className="muted" style={{ margin: 0 }}>
          Mulțumim! Am primit mesajul tău și te vom contacta cât de curând.
        </p>
        <button
          type="button"
          className="shop-btn shop-btn--ghost shop-contact-form__again"
          onClick={() => setDone(false)}
        >
          Trimite alt mesaj
        </button>
      </div>
    )
  }

  return (
    <form
      className="shop-form shop-contact-form"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="shop-form__grid">
        <label className="shop-field">
          <span>Numele tău</span>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            autoComplete="name"
            required
            maxLength={200}
          />
        </label>
        <label className="shop-field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label className="shop-field shop-field--wide">
          <span>Subiect (opțional)</span>
          <input
            value={form.subject}
            onChange={(e) => update('subject', e.target.value)}
            maxLength={200}
            placeholder="ex. Întrebare despre o comandă"
          />
        </label>
        <label className="shop-field shop-field--wide">
          <span>Mesaj</span>
          <textarea
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            required
            rows={6}
            minLength={10}
            maxLength={8000}
            placeholder="Scrie mesajul aici (minim 10 caractere)…"
          />
        </label>
      </div>
      {error ? (
        <p className="shop-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="shop-form__actions">
        <button
          type="submit"
          className="shop-btn shop-btn--primary"
          disabled={submitting}
        >
          {submitting ? 'Se trimite…' : 'Trimite mesajul'}
        </button>
      </div>
    </form>
  )
}
