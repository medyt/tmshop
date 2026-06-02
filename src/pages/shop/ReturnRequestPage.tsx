import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ShopLayout } from '../../components/shop/ShopLayout'
import { useShopNotice } from '../../components/shop/ShopNoticeProvider'
import { usePageMeta } from '../../hooks/usePageMeta'
import {
  isReturnsApiEnabled,
  submitReturnRequest,
} from '../../lib/returnsApi'
import { SHOP_INFO_ROUTES, SITE_LEGAL } from '../../lib/siteLegal'

const emptyForm = {
  orderId: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  items: '',
  reason: '',
  iban: '',
}

export function ReturnRequestPage() {
  const [form, setForm] = useState({ ...emptyForm })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { notify } = useShopNotice()

  usePageMeta({
    title: `Cerere de retur — ${SITE_LEGAL.brandName}`,
    description:
      'Completează formularul de retur pentru produsele comandate în termenul legal de 14 zile.',
    path: SHOP_INFO_ROUTES.returnRequest,
  })

  const update = (key: keyof typeof emptyForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    if (!form.orderId.trim() || !form.customerName.trim() || !form.customerEmail.trim()) {
      notify('Completează numărul comenzii, numele și emailul.', 'Date incomplete')
      return
    }
    if (!form.reason.trim()) {
      notify('Te rugăm să specifici motivul returului.', 'Date incomplete')
      return
    }
    if (!isReturnsApiEnabled()) {
      setError('Trimiterea cererilor necesită API-ul configurat pe server.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await submitReturnRequest({
        orderId: form.orderId.trim(),
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim() || undefined,
        reason: form.reason.trim(),
        iban: form.iban.trim() || undefined,
        items: form.items.trim() || undefined,
      })
      setDone(true)
      setForm({ ...emptyForm })
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nu am putut trimite cererea. Încearcă din nou.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <ShopLayout>
        <section className="shop-page">
          <div className="shop-empty-panel">
            <h1 className="shop-page__title">Cerere trimisă</h1>
            <p className="muted">
              Am primit cererea ta de retur. Te contactăm în cel mai scurt timp cu
              pașii următori.
            </p>
            <Link className="shop-btn shop-btn--primary" to="/">
              Înapoi la magazin
            </Link>
          </div>
        </section>
      </ShopLayout>
    )
  }

  return (
    <ShopLayout>
      <section className="shop-page">
        <div className="shop-page__head">
          <h1 className="shop-page__title">Cerere de retur</h1>
          <p className="shop-page__lead muted">
            Ai 14 zile de la primirea produsului să soliciți returul. Completează
            datele de mai jos. Detalii în{' '}
            <Link to={SHOP_INFO_ROUTES.returns}>politica de retur</Link>.
          </p>
        </div>

        <form className="shop-form" noValidate onSubmit={handleSubmit}>
          <div className="shop-form__grid">
            <label className="shop-field">
              <span>Număr comandă</span>
              <input
                value={form.orderId}
                onChange={(e) => update('orderId', e.target.value)}
                placeholder="ex. ord-..."
                required
              />
            </label>
            <label className="shop-field">
              <span>Nume complet</span>
              <input
                value={form.customerName}
                onChange={(e) => update('customerName', e.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <label className="shop-field">
              <span>Email</span>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => update('customerEmail', e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="shop-field">
              <span>Telefon (opțional)</span>
              <input
                value={form.customerPhone}
                onChange={(e) => update('customerPhone', e.target.value)}
                autoComplete="tel"
              />
            </label>
            <label className="shop-field shop-field--wide">
              <span>Produse returnate (opțional)</span>
              <textarea
                value={form.items}
                onChange={(e) => update('items', e.target.value)}
                rows={3}
                placeholder="Numele produselor și cantitatea"
              />
            </label>
            <label className="shop-field shop-field--wide">
              <span>Motivul returului</span>
              <textarea
                value={form.reason}
                onChange={(e) => update('reason', e.target.value)}
                rows={3}
                required
              />
            </label>
            <label className="shop-field shop-field--wide">
              <span>IBAN pentru rambursare (opțional)</span>
              <input
                value={form.iban}
                onChange={(e) => update('iban', e.target.value)}
                placeholder="RO..."
              />
            </label>
          </div>

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
            {submitting ? 'Se trimite…' : 'Trimite cererea de retur'}
          </button>
        </form>
      </section>
    </ShopLayout>
  )
}
