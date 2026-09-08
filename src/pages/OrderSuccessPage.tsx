import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { ShopLayout } from '../components/shop/ShopLayout'
import { useAuth } from '../contexts/AuthContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { useProducts } from '../hooks/useProducts'
import { trackPurchase } from '../lib/analytics'
import { metaContentsFromOrderItems } from '../lib/metaCatalogCsv'
import {
  readOrderAccessToken,
  saveOrderAccessToken,
} from '../lib/orderAccess'
import {
  fetchOrder,
  fetchOrderTracking,
  orderStatusLabel,
} from '../lib/ordersApi'
import { formatRon } from '../lib/shopCatalog'
import { customerNotesWithoutCarrier } from '../lib/shippingCarriers'
import { SITE_LEGAL } from '../lib/siteLegal'
import type { Order, OrderStatus, OrderTracking } from '../types/order'

const STEPS: { id: OrderStatus; label: string }[] = [
  { id: 'new', label: 'În așteptare' },
  { id: 'processing', label: 'În procesare' },
  { id: 'shipped', label: 'Expediată' },
  { id: 'delivered', label: 'Livrată' },
]

function stepIndex(
  status: OrderStatus,
  outForDelivery: boolean,
): number {
  if (status === 'cancelled' || status === 'returned') return -1
  if (status === 'delivered') return 3
  if (status === 'shipped' || outForDelivery) return 2
  if (status === 'processing' || status === 'confirmed') return 1
  return 0
}

function formatTrackDate(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OrderSuccessPage() {
  const { orderId } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { products, loading: productsLoading } = useProducts()
  const initialOrder = (location.state as { order?: Order } | null)?.order ?? null
  const [order, setOrder] = useState<Order | null>(initialOrder)
  const [tracking, setTracking] = useState<OrderTracking | null>(null)
  const [loading, setLoading] = useState(!initialOrder && Boolean(orderId))
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const urlToken = searchParams.get('token')?.trim() || ''

  usePageMeta({
    title: order
      ? `Comandă ${order.id} — ${SITE_LEGAL.brandName}`
      : `Comandă plasată — ${SITE_LEGAL.brandName}`,
    description: 'Detalii comandă și status livrare.',
    path: orderId ? `/comanda/${orderId}` : undefined,
    robots: 'noindex, nofollow',
  })

  useEffect(() => {
    if (orderId && urlToken) {
      saveOrderAccessToken(orderId, urlToken)
    }
  }, [orderId, urlToken])

  useEffect(() => {
    if (initialOrder?.accessToken && initialOrder.id) {
      saveOrderAccessToken(initialOrder.id, initialOrder.accessToken)
    }
  }, [initialOrder])

  useEffect(() => {
    if (!orderId || authLoading) return

    let cancelled = false
    const token = urlToken || readOrderAccessToken(orderId)

    if (initialOrder && !urlToken) {
      setOrder(initialOrder)
      setLoading(false)
    } else {
      setLoading(true)
      setError(null)
      void fetchOrder(orderId, token)
        .then((loaded) => {
          if (cancelled) return
          if (!loaded) {
            const unpaidCard =
              initialOrder?.paymentMethod === 'card' &&
              initialOrder.paymentStatus !== 'paid'
            setError(
              unpaidCard
                ? 'Plata cu cardul nu a fost finalizată. Comanda nu a fost înregistrată.'
                : 'Comanda nu a fost găsită sau nu ai acces la aceste detalii.',
            )
            return
          }
          setOrder(loaded)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setError(
            err instanceof Error
              ? err.message
              : 'Nu am putut încărca detaliile comenzii.',
          )
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    return () => {
      cancelled = true
    }
  }, [initialOrder, orderId, authLoading, user?.id, urlToken])

  useEffect(() => {
    if (!order?.id || !order.awbNumber) {
      setTracking(null)
      return
    }

    let cancelled = false
    setTrackingLoading(true)
    const token = urlToken || readOrderAccessToken(order.id)

    void fetchOrderTracking(order.id, token)
      .then((loaded) => {
        if (cancelled || !loaded) return
        setOrder(loaded)
        setTracking(loaded.tracking ?? null)
      })
      .catch(() => {
        /* tracking e best-effort; pagina rămâne utilă fără el */
      })
      .finally(() => {
        if (!cancelled) setTrackingLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [order?.id, order?.awbNumber, urlToken])

  // Purchase → Meta: ramburs imediat; card doar după paymentStatus=paid
  // (IPN Netopia poate întârzia față de redirect-ul pe /comanda/:id).
  useEffect(() => {
    if (!order?.id) return
    if (productsLoading) return

    const sendPurchase = (o: Order) => {
      trackPurchase(
        o.id,
        o.totalAmount,
        metaContentsFromOrderItems(o.items, products),
      )
    }

    const isCod = !order.paymentMethod || order.paymentMethod === 'cod'
    if (isCod) {
      sendPurchase(order)
      return
    }

    if (order.paymentStatus === 'paid') {
      sendPurchase(order)
      return
    }

    // Card încă pending: poll până confirmă IPN-ul (max ~45s).
    let cancelled = false
    let attempts = 0
    const token = urlToken || readOrderAccessToken(order.id)
    const timer = window.setInterval(() => {
      attempts += 1
      if (cancelled || attempts > 15) {
        window.clearInterval(timer)
        return
      }
      void fetchOrder(order.id, token).then((loaded) => {
        if (cancelled) return
        if (!loaded) {
          window.clearInterval(timer)
          setOrder(null)
          setError(
            'Plata cu cardul nu a fost finalizată. Comanda nu a fost înregistrată.',
          )
          return
        }
        setOrder(loaded)
        if (loaded.paymentStatus === 'paid') {
          window.clearInterval(timer)
          sendPurchase(loaded)
        }
      })
    }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [order?.id, order?.paymentMethod, order?.paymentStatus, urlToken, products, productsLoading])

  const activeStep = useMemo(() => {
    if (!order) return 0
    return stepIndex(order.status, tracking?.outForDelivery === true)
  }, [order, tracking?.outForDelivery])

  const itemsSubtotal = order
    ? order.items.reduce((sum, item) => sum + item.lineTotal, 0)
    : 0
  const shippingAmount = order
    ? Math.max(0, Math.round((order.totalAmount - itemsSubtotal) * 100) / 100)
    : 0
  const customerNotes = order
    ? customerNotesWithoutCarrier(order.customerNotes)
    : undefined

  const publicTrackUrl =
    tracking?.publicUrl ||
    (order?.awbNumber
      ? order.deliveryCarrier === 'fan-courier'
        ? `https://www.fancourier.ro/awb-tracking/?awb=${encodeURIComponent(order.awbNumber)}`
        : `https://tracking.dpd.ro/?shipmentNumber=${encodeURIComponent(order.awbNumber)}`
      : null)
  const trackCarrierLabel =
    order?.deliveryCarrier === 'fan-courier' ? 'Fan Courier' : 'DPD'

  return (
    <ShopLayout>
      <section className="shop-page">
        <div className="shop-page__head">
          <h1 className="shop-page__title">
            {order?.status === 'delivered'
              ? 'Comandă livrată'
              : order?.status === 'returned'
                ? 'Comandă returnată'
                : order?.awbNumber
                  ? 'Status comandă'
                  : 'Comandă plasată'}
          </h1>
          <p className="shop-page__lead muted">
            {order?.status === 'delivered'
              ? 'Coletul a fost livrat. Îți mulțumim!'
              : order?.status === 'returned'
                ? 'Coletul a fost returnat de curier.'
                : !order?.awbNumber &&
                    (order?.status === 'new' || order?.status === 'confirmed')
                  ? order.customerEmail
                    ? `Confirmarea ajunge pe SMS la ${order.customerPhone} și pe email.`
                    : `Confirmarea ajunge pe SMS la ${order.customerPhone}.`
                  : 'Urmărește aici stadiul comenzii și al coletului.'}
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

            {order.status === 'cancelled' ? (
              <p className="shop-order__status shop-form__error" role="status">
                Status: <strong>Anulată</strong>
              </p>
            ) : order.status === 'returned' ? (
              <p className="shop-order__status shop-form__error" role="status">
                Status: <strong>Returnată</strong>
              </p>
            ) : (
              <ol className="shop-order__steps" aria-label="Progres comandă">
                {STEPS.map((step, index) => {
                  const done = activeStep > index
                  const current = activeStep === index
                  return (
                    <li
                      key={step.id}
                      className={`shop-order__step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}
                    >
                      <span className="shop-order__step-dot" aria-hidden />
                      <span className="shop-order__step-label">{step.label}</span>
                    </li>
                  )
                })}
              </ol>
            )}

            <p className="shop-order__status muted">
              Status:{' '}
              <strong>
                {tracking?.outForDelivery && order.status === 'shipped'
                  ? 'În curs de livrare'
                  : order.courierStatus &&
                      order.status !== 'delivered' &&
                      order.status !== 'returned'
                    ? order.courierStatus
                    : orderStatusLabel(order.status)}
              </strong>
            </p>
            {order.paymentMethod ? (
              <p className="shop-order__status muted">
                Plată:{' '}
                <strong>
                  {order.paymentMethod === 'card'
                    ? 'Card online'
                    : 'Ramburs la livrare'}
                </strong>
                {order.paymentMethod === 'card'
                  ? order.paymentStatus === 'paid'
                    ? ' — plătită'
                    : ' — în așteptarea confirmării'
                  : null}
              </p>
            ) : null}

            <div className="shop-order__track-panel">
              <h2>Urmărire colet</h2>
              {order.awbNumber ? (
                <>
                  <p className="shop-order__status">
                    AWB: <strong>{order.awbNumber}</strong>
                    {publicTrackUrl ? (
                      <>
                        {' · '}
                        <a
                          href={publicTrackUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Deschide pe {trackCarrierLabel}
                        </a>
                      </>
                    ) : null}
                  </p>
                  {trackingLoading ? (
                    <p className="muted">Se actualizează statusul curierului…</p>
                  ) : null}
                  {tracking?.error && !tracking.events.length ? (
                    <p className="muted">{tracking.error}</p>
                  ) : null}
                  {tracking && tracking.events.length > 0 ? (
                    <ol className="shop-order__timeline">
                      {tracking.events.map((event, index) => (
                        <li
                          key={`${event.code}-${event.dateTime}-${index}`}
                          className="shop-order__timeline-item"
                        >
                          <div className="shop-order__timeline-meta muted">
                            {formatTrackDate(event.dateTime)}
                            {event.place ? ` · ${event.place}` : ''}
                          </div>
                          <div className="shop-order__timeline-desc">
                            {event.description}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : !trackingLoading ? (
                    <p className="muted">
                      Colectul are AWB. Evenimentele de tracking apar pe măsură
                      ce curierul le înregistrează.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="muted">
                  Încă nu există AWB. Vei putea urmări coletul aici imediat ce
                  comanda este expediată.
                </p>
              )}
            </div>

            <div className="shop-order__grid">
              <div className="shop-order__card">
                <h2>Livrare</h2>
                <p>{order.customerName}</p>
                <p>{order.customerPhone}</p>
                {order.customerEmail ? <p>{order.customerEmail}</p> : null}
                <p>{order.customerAddress}</p>
                <p className="shop-order__carrier">
                  <span>Livrare prin curier</span>
                </p>
                {customerNotes ? (
                  <p className="muted">Observații: {customerNotes}</p>
                ) : null}
                <p className="muted">
                  {shippingAmount > 0
                    ? `Transport ${formatRon(shippingAmount)}.`
                    : SITE_LEGAL.deliverySummary}
                </p>
              </div>
              <div className="shop-order__card">
                <h2>Produse</h2>
                <ul className="shop-summary__items">
                  {order.items.map((item) => (
                    <li
                      key={`${item.productId}-${item.quantity}`}
                      className="shop-summary__item"
                    >
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
