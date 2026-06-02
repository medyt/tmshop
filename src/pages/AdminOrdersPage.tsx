import { useEffect, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { OrdersTable } from '../components/admin/OrdersTable'
import { OrderEditModal } from '../components/admin/OrderEditModal'
import { fetchOrders, isOrdersApiEnabled } from '../lib/ordersApi'
import type { Order } from '../types/order'

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(isOrdersApiEnabled())
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null

  const handleUpdated = (updated: Order) => {
    setOrders((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    )
  }

  return (
    <AdminLayout
      title="Comenzi"
      lead="Caută, filtrează și editează comenzile înregistrate în magazin."
    >
      {!isOrdersApiEnabled() ? (
        <section className="panel panel--form">
          <p className="muted">
            Lista comenzilor este disponibilă când aplicația folosește API-ul de
            pe server.
          </p>
        </section>
      ) : (
        <section className="panel panel--list" aria-label="Comenzi">
          {loading ? (
            <div className="empty-state">
              <p className="muted">Se încarcă comenzile…</p>
            </div>
          ) : null}
          {error ? (
            <p className="app-status app-status--error" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && !error ? (
            <OrdersTable
              orders={orders}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : null}
        </section>
      )}

      {selectedOrder ? (
        <OrderEditModal
          order={selectedOrder}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
        />
      ) : null}
    </AdminLayout>
  )
}
