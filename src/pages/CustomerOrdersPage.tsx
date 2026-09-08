import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ShopLayout } from '../components/shop/ShopLayout'
import { useAuth } from '../contexts/AuthContext'
import { usePageMeta } from '../hooks/usePageMeta'
import {
  fetchMyOrders,
  isOrdersApiEnabled,
  orderStatusLabel,
} from '../lib/ordersApi'
import { formatRon } from '../lib/shopCatalog'
import { SITE_LEGAL } from '../lib/siteLegal'
import type { Order } from '../types/order'

function formatOrderDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ro-RO')
}

function orderItemsSubtotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.lineTotal, 0)
}

function orderShippingAmount(order: Order): number {
  return Math.max(
    0,
    Math.round((order.totalAmount - orderItemsSubtotal(order)) * 100) / 100,
  )
}

export function CustomerOrdersPage() {
  const location = useLocation()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(isOrdersApiEnabled())
  const [error, setError] = useState<string | null>(null)

  usePageMeta({
    title: `Comenzile mele — ${SITE_LEGAL.brandName}`,
    description: 'Istoricul comenzilor tale și status livrare.',
    path: '/comenzile-mele',
    robots: 'noindex, nofollow',
  })

  useEffect(() => {
    if (!isOrdersApiEnabled() || authLoading || !user) return

    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchMyOrders()
      .then((loaded) => {
        if (!cancelled) setOrders(loaded)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Nu am putut încărca comenzile.'
        setError(message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  if (!authLoading && !user) {
    return <Navigate to="/conectare" state={{ from: location.pathname }} replace />
  }

  return (
    <ShopLayout>
      <section className="shop-page">
        <div className="shop-page__head">
          <h1 className="shop-page__title">Comenzile mele</h1>
          <p className="shop-page__lead muted">
            Vezi comenzile din cont și statusul livrării.
          </p>
        </div>

        {!isOrdersApiEnabled() ? (
          <p className="muted">Istoricul comenzilor necesită API-ul configurat.</p>
        ) : loading || authLoading ? (
          <p className="muted">Se încarcă comenzile…</p>
        ) : error ? (
          <p className="shop-form__error" role="alert">
            {error}
          </p>
        ) : orders.length === 0 ? (
          <div className="shop-empty-panel">
            <p className="muted">Nu există comenzi asociate contului tău încă.</p>
            {isAdmin ? (
              <p className="muted">
                Pentru toate comenzile magazinului, folosește panoul Admin.
              </p>
            ) : null}
            <div className="shop-order__actions">
              {isAdmin ? (
                <Link className="shop-btn shop-btn--primary" to="/admin/comenzi">
                  Comenzi în admin
                </Link>
              ) : null}
              <Link className="shop-btn shop-btn--ghost" to="/">
                Mergi la catalog
              </Link>
            </div>
          </div>
        ) : (
          <ul className="shop-customer-orders">
            {orders.map((order) => {
              const shippingAmount = orderShippingAmount(order)
              const previewItems = order.items.slice(0, 3)
              const hiddenCount = Math.max(0, order.items.length - previewItems.length)

              return (
                <li key={order.id} className="shop-customer-order">
                  <div className="shop-customer-order__head">
                    <div>
                      <p className="shop-customer-order__id">
                        Comandă <strong>{order.id}</strong>
                      </p>
                      <p className="shop-customer-order__meta muted">
                        {formatOrderDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="shop-customer-order__aside">
                      <span
                        className={`shop-order-status shop-order-status--${order.status}`}
                      >
                        {orderStatusLabel(order.status)}
                      </span>
                      <strong className="shop-customer-order__total">
                        {formatRon(order.totalAmount)}
                      </strong>
                    </div>
                  </div>

                  <ul className="shop-customer-order__items">
                    {previewItems.map((item) => (
                      <li key={`${order.id}-${item.productId}`}>
                        <span>
                          {item.productName} × {item.quantity}
                        </span>
                        <span>{formatRon(item.lineTotal)}</span>
                      </li>
                    ))}
                    {hiddenCount > 0 ? (
                      <li className="shop-customer-order__more muted">
                        + încă {hiddenCount}{' '}
                        {hiddenCount === 1 ? 'produs' : 'produse'}
                      </li>
                    ) : null}
                  </ul>

                  <div className="shop-customer-order__footer">
                    <div className="shop-customer-order__details muted">
                      <p>Curier: Curier</p>
                      {shippingAmount > 0 ? (
                        <p>Transport: {formatRon(shippingAmount)}</p>
                      ) : null}
                      {order.awbNumber ? (
                        <p>
                          AWB: <strong>{order.awbNumber}</strong>
                        </p>
                      ) : null}
                    </div>
                    <Link
                      className="shop-btn shop-btn--ghost"
                      to={`/comanda/${order.id}`}
                    >
                      Vezi detalii
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </ShopLayout>
  )
}
