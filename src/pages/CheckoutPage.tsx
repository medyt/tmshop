import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShopLayout } from '../components/shop/ShopLayout'
import { ShippingCarrierPicker } from '../components/shop/ShippingCarrierPicker'
import { useShopNotice } from '../components/shop/ShopNoticeProvider'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { trackBeginCheckout, trackPurchase } from '../lib/analytics'
import { getCheckoutValidationMessage } from '../lib/checkoutValidation'
import { saveOrderAccessToken } from '../lib/orderAccess'
import { createOrder, isOrdersApiEnabled, startCardPayment } from '../lib/ordersApi'
import type { PaymentMethod } from '../types/order'
import { SHOP_INFO_ROUTES, SITE_LEGAL } from '../lib/siteLegal'
import { formatRon } from '../lib/shopCatalog'
import {
  GIFT_ADDON_PRICE_RON,
  giftAddonAmount,
  orderTotal,
  shippingCost,
  shippingSummaryLabel,
} from '../lib/shopShipping'
import {
  getDeliveryCarrierLabel,
  type DeliveryCarrierId,
} from '../lib/shippingCarriers'
import type { CheckoutCustomer } from '../types/order'

type CheckoutPageProps = {
  onOrderComplete?: () => void
}

const emptyCustomer: CheckoutCustomer = {
  name: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
}

export function CheckoutPage({ onOrderComplete }: CheckoutPageProps) {
  const navigate = useNavigate()
  const { user, isCustomer } = useAuth()
  const { lines, subtotal, clearCart } = useCart()
  const [customer, setCustomer] = useState<CheckoutCustomer>(emptyCustomer)
  const [deliveryCarrier, setDeliveryCarrier] = useState<DeliveryCarrierId | null>(
    null,
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [giftAddon, setGiftAddon] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { notify } = useShopNotice()
  const shipping = shippingCost(subtotal)
  const giftLine = giftAddonAmount(giftAddon)
  const total = orderTotal(subtotal, { giftAddon })

  usePageMeta({
    title: `Checkout — ${SITE_LEGAL.brandName}`,
    description: 'Finalizează comanda cu livrare prin curier și plată la livrare.',
    path: '/checkout',
    robots: 'noindex, nofollow',
  })

  useEffect(() => {
    if (lines.length > 0) {
      trackBeginCheckout(lines.length, subtotal)
    }
  }, [lines.length, subtotal])

  useEffect(() => {
    if (!isCustomer || !user?.email) return
    setCustomer((current) =>
      current.email.trim() ? current : { ...current, email: user.email },
    )
  }, [isCustomer, user?.email])

  if (lines.length === 0) {
    return (
      <ShopLayout>
        <section className="shop-page">
          <div className="shop-empty-panel">
            <p className="muted">Nu ai produse în coș.</p>
            <Link className="shop-btn shop-btn--primary" to="/">
              Mergi la catalog
            </Link>
          </div>
        </section>
      </ShopLayout>
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const validationMessage = getCheckoutValidationMessage(
      customer,
      acceptedTerms,
      deliveryCarrier,
    )
    if (validationMessage) {
      notify(validationMessage, 'Date incomplete')
      return
    }

    if (!deliveryCarrier) {
      return
    }

    if (!isOrdersApiEnabled()) {
      setError('Comenzile online necesită API-ul configurat pe server.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const order = await createOrder({
        customer,
        deliveryCarrier,
        paymentMethod,
        giftAddon,
        items: lines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
      })
      if (order.accessToken) {
        saveOrderAccessToken(order.id, order.accessToken)
      }

      if (paymentMethod === 'card') {
        // Inainte de redirect catre Netopia: golim cosul si obtinem linkul de plata.
        const paymentUrl = await startCardPayment(order.id, order.accessToken)
        clearCart()
        onOrderComplete?.()
        window.location.href = paymentUrl
        return
      }

      trackPurchase(order.id, order.totalAmount)
      clearCart()
      onOrderComplete?.()
      navigate(`/comanda/${order.id}`, { state: { order } })
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Nu am putut trimite comanda. Încearcă din nou.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ShopLayout>
      <section className="shop-page">
        <div className="shop-page__head">
          <h1 className="shop-page__title">Checkout</h1>
          <p className="shop-page__lead muted">
            Completează datele de livrare și alege metoda de plată.
          </p>
        </div>

        <div className="shop-checkout">
          <form className="shop-form" noValidate onSubmit={handleSubmit}>
            <div className="shop-form__grid">
              <label className="shop-field">
                <span>Nume complet</span>
                <input
                  value={customer.name}
                  onChange={(event) =>
                    setCustomer((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                  autoComplete="name"
                />
              </label>
              <label className="shop-field">
                <span>Telefon</span>
                <input
                  value={customer.phone}
                  onChange={(event) =>
                    setCustomer((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  required
                  autoComplete="tel"
                />
              </label>
              <label className="shop-field shop-field--wide">
                <span>Email (opțional)</span>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(event) =>
                    setCustomer((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  autoComplete="email"
                />
              </label>
              <label className="shop-field shop-field--wide">
                <span>Adresă livrare</span>
                <textarea
                  value={customer.address}
                  onChange={(event) =>
                    setCustomer((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  rows={3}
                  required
                  autoComplete="street-address"
                />
              </label>
              <label className="shop-field shop-field--wide">
                <span>Observații (opțional)</span>
                <textarea
                  value={customer.notes}
                  onChange={(event) =>
                    setCustomer((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </label>
            </div>

            <ShippingCarrierPicker
              value={deliveryCarrier}
              onChange={setDeliveryCarrier}
            />

            <label className="shop-field shop-field--wide shop-field--checkbox shop-checkout__gift">
              <input
                type="checkbox"
                checked={giftAddon}
                onChange={(event) => setGiftAddon(event.target.checked)}
              />
              <span>
                <strong>Adaugă produs surpriză</strong>
                <span className="muted">
                  {' '}
                  — {GIFT_ADDON_PRICE_RON} RON (se adaugă la total și apare pe
                  factura comenzii ca linie separată).
                </span>
              </span>
            </label>

            <fieldset className="shop-payment">
              <legend className="shop-payment__legend">Metodă de plată</legend>
              <label
                className={`shop-payment__option${
                  paymentMethod === 'cod' ? ' shop-payment__option--active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <span>
                  <strong>Plată la livrare (ramburs)</strong>
                  <span className="muted"> — plătești curierului la primire.</span>
                </span>
              </label>
              <label
                className={`shop-payment__option${
                  paymentMethod === 'card' ? ' shop-payment__option--active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <span>
                  <strong>Card online (Netopia)</strong>
                  <span className="muted">
                    {' '}
                    — ești redirecționat securizat pentru plata cu cardul.
                  </span>
                </span>
              </label>
            </fieldset>

            <label className="shop-field shop-field--wide shop-field--checkbox">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
              />
              <span>
                Accept{' '}
                <Link to={SHOP_INFO_ROUTES.terms}>termenii și condițiile</Link>{' '}
                și{' '}
                <Link to={SHOP_INFO_ROUTES.privacy}>
                  politica de confidențialitate
                </Link>
                . Datele furnizate sunt folosite pentru livrarea comenzii.
              </span>
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
              {submitting
                ? 'Se trimite comanda…'
                : paymentMethod === 'card'
                  ? 'Continuă spre plată'
                  : 'Plasează comanda'}
            </button>
          </form>

          <aside className="shop-summary">
            <h2 className="shop-summary__title">Comanda ta</h2>
            <ul className="shop-summary__items">
              {lines.map((line) => (
                <li key={line.product.id} className="shop-summary__item">
                  <span>
                    {line.product.name} × {line.quantity}
                  </span>
                  <strong>
                    {formatRon(line.product.salePrice * line.quantity)}
                  </strong>
                </li>
              ))}
            </ul>
            <div className="shop-summary__row">
              <span>Subtotal</span>
              <strong>{formatRon(subtotal)}</strong>
            </div>
            <div className="shop-summary__row">
              <span>Transport</span>
              <strong>{shipping <= 0 ? 'Gratuit' : formatRon(shipping)}</strong>
            </div>
            {giftAddon ? (
              <div className="shop-summary__row">
                <span>Produs surpriză</span>
                <strong>{formatRon(giftLine)}</strong>
              </div>
            ) : null}
            <div className="shop-summary__row shop-summary__row--total">
              <span>Total</span>
              <strong>{formatRon(total)}</strong>
            </div>
            <p className="shop-summary__note muted">
              {deliveryCarrier
                ? `Livrare prin ${getDeliveryCarrierLabel(deliveryCarrier)}: ${formatRon(shipping)}.`
                : `${shippingSummaryLabel(subtotal)}.`}
              {customer.email.trim()
                ? ' Vei primi confirmarea pe email și pe această pagină.'
                : ' Vei primi confirmarea comenzii pe această pagină după trimitere.'}
            </p>
            <div className="shop-summary__actions">
              <Link className="shop-btn shop-btn--ghost shop-btn--block" to="/cos">
                Înapoi la coș
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </ShopLayout>
  )
}
