import { useEffect, useState } from 'react'
import { fetchOrders, isOrdersApiEnabled } from '../lib/ordersApi'
import { formatRon } from '../lib/shopCatalog'
import type { Order } from '../types/order'

export function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(isOrdersApiEnabled())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOrdersApiEnabled()) return

    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchOrders()
      .then((loaded) => {
        if (cancelled) return
        setOrders(loaded)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error
            ? err.message
            : 'Nu am putut încărca comenzile.'
        setError(message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!isOrdersApiEnabled()) {
    return (
      <section className="panel orders-panel" aria-label="Comenzi">
        <h2>Comenzi</h2>
        <p className="muted">
          Lista comenzilor este disponibilă când aplicația folosește API-ul de
          pe server.
        </p>
      </section>
    )
  }

  return (
    <section className="panel orders-panel" aria-label="Comenzi">
      <div className="orders-panel__head">
        <h2>Comenzi recente</h2>
        <p className="muted">{orders.length} înregistrate</p>
      </div>

      {loading ? <p className="muted">Se încarcă comenzile…</p> : null}
      {error ? (
        <p className="app-status app-status--error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && orders.length === 0 ? (
        <p className="muted">Nu există comenzi încă.</p>
      ) : null}

      {!loading && !error && orders.length > 0 ? (
        <ul className="orders-list">
          {orders.map((order) => (
            <li key={order.id} className="orders-list__item">
              <div className="orders-list__top">
                <strong>{order.id}</strong>
                <span>{formatRon(order.totalAmount)}</span>
              </div>
              <p className="orders-list__meta muted">
                {order.customerName} · {order.customerPhone}
              </p>
              <p className="orders-list__meta muted">{order.customerAddress}</p>
              <ul className="orders-list__products">
                {order.items.map((item) => (
                  <li key={`${order.id}-${item.productId}`}>
                    {item.productName} × {item.quantity}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
