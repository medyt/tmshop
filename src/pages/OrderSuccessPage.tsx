import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ShopLayout } from '../components/shop/ShopLayout'
import { useAuth } from '../contexts/AuthContext'
import { usePageMeta } from '../hooks/usePageMeta'
import {
  readOrderAccessToken,
  saveOrderAccessToken,
} from '../lib/orderAccess'
import { fetchOrder, orderStatusLabel } from '../lib/ordersApi'
import { formatRon } from '../lib/shopCatalog'
import { shippingSummaryLabel } from '../lib/shopShipping'
import {
  customerNotesWithoutCarrier,
  getDeliveryCarrier,
} from '../lib/shippingCarriers'
import { SITE_LEGAL } from '../lib/siteLegal'
import type { Order } from '../types/order'

export function OrderSuccessPage() {
  const { orderId } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const initialOrder = (location.state as { order?: Order } | null)?.order ?? null
  const [order, setOrder] = useState<Order | null>(initialOrder)
  const [loading, setLoading] = useState(!initialOrder && Boolean(orderId))
  const [error, setError] = useState<string | null>(null)

  usePageMeta({
    title: order
      ? `Comandă ${order.id} — ${SITE_LEGAL.brandName}`
      : `Comandă plasată — ${SITE_LEGAL.brandName}`,
    description: 'Detalii comandă și status livrare.',
    path: orderId ? `/comanda/${orderId}` : undefined,
    robots: 'noindex, nofollow',
  })

  useEffect(() => {
    if (initialOrder?.accessToken && initialOrder.id) {
      saveOrderAccessToken(initialOrder.id, initialOrder.accessToken)
    }
  }, [initialOrder])

  useEffect(() => {
    if (initialOrder || !orderId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchOrder(orderId, readOrderAccessToken(orderId))
      .then((loaded) => {
        if (cancelled) return
        if (!loaded) {
          setError('Comanda nu a fost găsită sau nu ai acces la aceste detalii.')
          return
        }
        setOrder(loaded)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error
            ? err.message
            : 'Nu am putut încărca detaliile comenzii.'
        setError(message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [initialOrder, orderId])

  const itemsSubtotal = order
    ? order.items.reduce((sum, item) => sum + item.lineTotal, 0)
    : 0
  const shippingAmount = order
    ? Math.max(0, Math.round((order.totalAmount - itemsSubtotal) * 100) / 100)
    : 0
  const customerNotes = order
    ? customerNotesWithoutCarrier(order.customerNotes)
    : undefined
  const deliveryCarrier = order?.deliveryCarrier
    ? getDeliveryCarrier(order.deliveryCarrier)
    : null

  return (
    <ShopLayout>
      <section className="shop-page">
        <div className="shop-page__head">
          <h1 className="shop-page__title">Comandă plasată</h1>
          <p className="shop-page__lead muted">
            Îți mulțumim. Comanda a fost înregistrată în sistem.
          </p>
        </div>

        {loading ? (
          <p className="muted">Se încarcă detaliile comenzii…</p>
        ) : error ? (
          <div className="shop-empty-panel">
            <p className="shop-form__error" role="alert">
              {error}
            </p>
            <Link className="shop-btn shop-btn--primary" to="/">
              Înapoi la magazin
            </Link>
          </div>
        ) : order ? (
          <div className="shop-order">
            <div className="shop-order__badge">
              Referință comandă: <strong>{order.id}</strong>
            </div>
            <p className="shop-order__status muted">
              Status: <strong>{orderStatusLabel(order.status)}</strong>
            </p>
            {order.awbNumber ? (
              <p className="shop-order__status">
                AWB urmărire: <strong>{order.awbNumber}</strong>
              </p>
            ) : null}
            <div className="shop-order__grid">
              <div className="shop-order__card">
                <h2>Livrare</h2>
                <p>{order.customerName}</p>
                <p>{order.customerPhone}</p>
                {order.customerEmail ? <p>{order.customerEmail}</p> : null}
                <p>{order.customerAddress}</p>
                {deliveryCarrier ? (
                  <p className="shop-order__carrier">
                    <span className="shop-order__carrier-logo-wrap">
                      <img
                        className="shop-order__carrier-logo"
                        src={deliveryCarrier.logoSrc}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </span>
                    <span>Livrare prin {deliveryCarrier.name}</span>
                  </p>
                ) : null}
                {customerNotes ? (
                  <p className="muted">Observații: {customerNotes}</p>
                ) : null}
                <p className="muted">
                  {shippingAmount > 0
                    ? deliveryCarrier
                      ? `Transport ${formatRon(shippingAmount)} prin ${deliveryCarrier.name}.`
                      : shippingSummaryLabel()
                    : SITE_LEGAL.deliverySummary}
                </p>
              </div>
              <div className="shop-order__card">
                <h2>Produse</h2>
                <ul className="shop-summary__items">
                  {order.items.map((item) => (
                    <li key={`${item.productId}-${item.quantity}`} className="shop-summary__item">
                      <span>
                        {item.productName} × {item.quantity}
                      </span>
                      <strong>{formatRon(item.lineTotal)}</strong>
                    </li>
                  ))}
                </ul>
                <div className="shop-summary__row">
                  <span>Subtotal produse</span>
                  <strong>{formatRon(itemsSubtotal)}</strong>
                </div>
                <div className="shop-summary__row">
                  <span>Transport</span>
                  <strong>{formatRon(shippingAmount)}</strong>
                </div>
                <div className="shop-summary__row shop-summary__row--total">
                  <span>Total</span>
                  <strong>{formatRon(order.totalAmount)}</strong>
                </div>
              </div>
            </div>
            <div className="shop-order__actions">
              <Link className="shop-btn shop-btn--primary" to="/">
                Continuă cumpărăturile
              </Link>
              {user ? (
                <Link className="shop-btn shop-btn--ghost" to="/comenzile-mele">
                  Comenzile mele
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </ShopLayout>
  )
}
