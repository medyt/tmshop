import { useEffect, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import {
  fetchOrders,
  isOrdersApiEnabled,
  updateOrderStatus,
} from '../lib/ordersApi'
import { formatRon } from '../lib/shopCatalog'
import {
  customerNotesWithoutCarrier,
  getDeliveryCarrierLabel,
} from '../lib/shippingCarriers'
import type { Order, OrderStatus } from '../types/order'

function formatOrderDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ro-RO')
}

export function AdminOrdersPage() {
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
  }, [])

  return (
    <AdminLayout
      title="Comenzi"
      lead="Listă cu comenzile înregistrate în magazin."
    >
      {!isOrdersApiEnabled() ? (
        <section className="panel orders-panel">
          <p className="muted">
            Lista comenzilor este disponibilă când aplicația folosește API-ul de
            pe server.
          </p>
        </section>
      ) : (
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
                    {formatOrderDate(order.createdAt)}
                  </p>
                  <label className="field orders-list__status">
                    <span>Status</span>
                    <select
                      className="orders-list__status-select"
                      value={order.status}
                      onChange={(event) => {
                        const nextStatus = event.target.value as OrderStatus
                        void updateOrderStatus(order.id, nextStatus)
                          .then((updated) => {
                            setOrders((current) =>
                              current.map((item) =>
                                item.id === updated.id ? updated : item,
                              ),
                            )
                          })
                          .catch((err: unknown) => {
                            const message =
                              err instanceof Error
                                ? err.message
                                : 'Nu am putut actualiza statusul comenzii.'
                            setError(message)
                          })
                      }}
                    >
                      <option value="new">Nouă</option>
                      <option value="confirmed">Confirmată</option>
                      <option value="cancelled">Anulată</option>
                      {order.status === 'processing' ? (
                        <option value="processing">În procesare</option>
                      ) : null}
                      <option value="shipped">Expediată</option>
                      <option value="delivered">Livrată</option>
                    </select>
                  </label>
                  <p className="orders-list__meta muted">
                    {order.customerName} · {order.customerPhone}
                  </p>
                  {order.customerEmail ? (
                    <p className="orders-list__meta muted">{order.customerEmail}</p>
                  ) : null}
                  <p className="orders-list__meta muted">{order.customerAddress}</p>
                  {order.deliveryCarrier ? (
                    <p className="orders-list__meta muted">
                      Curier: {getDeliveryCarrierLabel(order.deliveryCarrier)}
                    </p>
                  ) : null}
                  {customerNotesWithoutCarrier(order.customerNotes) ? (
                    <p className="orders-list__meta muted">
                      Observații: {customerNotesWithoutCarrier(order.customerNotes)}
                    </p>
                  ) : null}
                  {order.awbNumber ? (
                    <p className="orders-list__meta">
                      AWB: <strong>{order.awbNumber}</strong>
                    </p>
                  ) : null}
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
      )}
    </AdminLayout>
  )
}
