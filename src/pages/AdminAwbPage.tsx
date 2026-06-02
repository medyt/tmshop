import { useCallback, useEffect, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { AwbPrintSheet } from '../components/admin/AwbPrintSheet'
import {
  fetchOrders,
  isOrdersApiEnabled,
  issueOrderAwb,
} from '../lib/ordersApi'
import { formatRon } from '../lib/shopCatalog'
import type { Order } from '../types/order'

function formatOrderDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ro-RO')
}

export function AdminAwbPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(isOrdersApiEnabled())
  const [error, setError] = useState<string | null>(null)
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const [printOrder, setPrintOrder] = useState<Order | null>(null)

  const loadOrders = useCallback(async () => {
    if (!isOrdersApiEnabled()) return
    setLoading(true)
    setError(null)
    try {
      const loaded = await fetchOrders()
      setOrders(loaded)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Nu am putut încărca comenzile.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const openPrint = useCallback((order: Order) => {
    setPrintOrder(order)
    window.setTimeout(() => window.print(), 0)
  }, [])

  const handleIssueAwb = useCallback(
    async (order: Order) => {
      if (busyOrderId) return
      if (order.awbNumber) {
        openPrint(order)
        return
      }

      setBusyOrderId(order.id)
      setError(null)
      try {
        const next = await issueOrderAwb(order.id)
        setOrders((current) =>
          current.map((item) => (item.id === next.id ? next : item)),
        )
        openPrint(next)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Nu am putut genera AWB-ul.'
        setError(message)
      } finally {
        setBusyOrderId(null)
      }
    },
    [busyOrderId, openPrint],
  )

  return (
    <AdminLayout
      title="AWB pentru printare"
      lead="Generează AWB pentru comenzi și deschide fișa gata de printat."
    >
      {!isOrdersApiEnabled() ? (
        <section className="panel orders-panel">
          <p className="muted">
            AWB-urile sunt disponibile când aplicația folosește API-ul de pe
            server.
          </p>
        </section>
      ) : (
        <section className="panel orders-panel" aria-label="AWB comenzi">
          <div className="orders-panel__head">
            <h2>Comenzi pentru expediere</h2>
            <p className="muted">{orders.length} înregistrate</p>
          </div>

          {loading ? <p className="muted">Se încarcă comenzile…</p> : null}
          {error ? (
            <p className="app-status app-status--error" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && !error && orders.length === 0 ? (
            <p className="muted">Nu există comenzi pentru AWB.</p>
          ) : null}

          {!loading && !error && orders.length > 0 ? (
            <ul className="orders-list">
              {orders.map((order) => {
                const busy = busyOrderId === order.id
                return (
                  <li key={order.id} className="orders-list__item">
                    <div className="orders-list__top">
                      <strong>{order.id}</strong>
                      <span>{formatRon(order.totalAmount)}</span>
                    </div>
                    <p className="orders-list__meta muted">
                      {formatOrderDate(order.createdAt)}
                    </p>
                    <p className="orders-list__meta muted">
                      {order.customerName} · {order.customerPhone}
                    </p>
                    <p className="orders-list__meta muted">
                      {order.customerAddress}
                    </p>
                    <p className="orders-list__meta">
                      AWB:{' '}
                      <strong>{order.awbNumber ?? 'Neemis'}</strong>
                    </p>
                    <div className="orders-list__actions">
                      <button
                        type="button"
                        className="btn primary"
                        disabled={Boolean(busyOrderId)}
                        onClick={() => void handleIssueAwb(order)}
                      >
                        {busy
                          ? 'Se pregătește…'
                          : order.awbNumber
                            ? 'Printează AWB'
                            : 'Generează și printează AWB'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </section>
      )}

      {printOrder ? (
        <div className="awb-print-host" role="dialog" aria-modal="true">
          <div className="awb-print-host__toolbar">
            <button
              type="button"
              className="btn secondary"
              onClick={() => setPrintOrder(null)}
            >
              Închide
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => window.print()}
            >
              Printează
            </button>
          </div>
          <AwbPrintSheet order={printOrder} />
        </div>
      ) : null}
    </AdminLayout>
  )
}
