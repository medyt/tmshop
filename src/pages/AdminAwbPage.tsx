import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { AwbPrintSheet } from '../components/admin/AwbPrintSheet'
import { OrderStatusBadge } from '../components/admin/OrdersTable'
import { fetchOrders, isOrdersApiEnabled, issueOrderAwb } from '../lib/ordersApi'
import { formatRon } from '../lib/shopCatalog'
import type { Order } from '../types/order'

function formatOrderDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Comenzile care nu se mai expediază (nu au rost pentru AWB). */
function isShippable(order: Order): boolean {
  return order.status !== 'cancelled'
}

export function AdminAwbPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(isOrdersApiEnabled())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [printOrders, setPrintOrders] = useState<Order[] | null>(null)

  const loadOrders = useCallback(async () => {
    if (!isOrdersApiEnabled()) return
    setLoading(true)
    setError(null)
    try {
      const loaded = await fetchOrders()
      setOrders(loaded)
      // Preselectează comenzile expediabile.
      setSelectedIds(
        new Set(loaded.filter(isShippable).map((order) => order.id)),
      )
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Nu am putut încărca comenzile.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const shippable = useMemo(() => orders.filter(isShippable), [orders])

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.has(o.id)),
    [orders, selectedIds],
  )

  const allSelected =
    shippable.length > 0 && shippable.every((o) => selectedIds.has(o.id))

  const toggleAll = () => {
    setSelectedIds((current) => {
      if (shippable.every((o) => current.has(o.id))) {
        return new Set()
      }
      return new Set(shippable.map((o) => o.id))
    })
  }

  const toggleOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openPrint = useCallback((list: Order[]) => {
    setPrintOrders(list)
    window.setTimeout(() => window.print(), 80)
  }, [])

  /** Generează AWB pentru selecția care nu are încă, apoi deschide print în masă. */
  const handleGenerateAndPrint = useCallback(async () => {
    if (busy) return
    const targets = orders.filter((o) => selectedIds.has(o.id))
    if (targets.length === 0) {
      setError('Selectează cel puțin o comandă.')
      return
    }

    setBusy(true)
    setError(null)
    setProgress(null)

    const updatedById = new Map<string, Order>()
    const missing = targets.filter((o) => !o.awbNumber)

    try {
      let done = 0
      for (const order of missing) {
        setProgress(`Generez AWB ${done + 1} din ${missing.length}…`)
        const next = await issueOrderAwb(order.id)
        updatedById.set(next.id, next)
        done += 1
      }

      if (updatedById.size > 0) {
        setOrders((current) =>
          current.map((item) => updatedById.get(item.id) ?? item),
        )
      }

      const finalList = targets.map((o) => updatedById.get(o.id) ?? o)
      setProgress(
        missing.length > 0
          ? `${missing.length} AWB generate. Se deschide printarea…`
          : 'Se deschide printarea…',
      )
      openPrint(finalList)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Nu am putut genera AWB-urile.',
      )
    } finally {
      setBusy(false)
    }
  }, [busy, openPrint, orders, selectedIds])

  /** Printează doar selecția care are deja AWB (fără să genereze nimic nou). */
  const handlePrintExisting = useCallback(() => {
    const withAwb = selectedOrders.filter((o) => o.awbNumber)
    if (withAwb.length === 0) {
      setError('Niciuna dintre comenzile selectate nu are AWB generat.')
      return
    }
    setError(null)
    openPrint(withAwb)
  }, [openPrint, selectedOrders])

  const selectedCount = selectedIds.size
  const selectedWithAwb = selectedOrders.filter((o) => o.awbNumber).length

  return (
    <AdminLayout
      title="AWB pentru printare"
      lead="Selectează comenzile, generează AWB-urile lipsă și printează-le în masă, gata de lipit pe colete."
      actions={
        <>
          <button
            type="button"
            className="btn secondary"
            disabled={busy || selectedWithAwb === 0}
            onClick={handlePrintExisting}
          >
            Printează AWB existente
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={busy || selectedCount === 0}
            onClick={() => void handleGenerateAndPrint()}
          >
            {busy ? 'Se procesează…' : 'Generează lipsă + printează'}
          </button>
        </>
      }
    >
      {!isOrdersApiEnabled() ? (
        <section className="panel panel--form">
          <p className="muted">
            AWB-urile sunt disponibile când aplicația folosește API-ul de pe
            server.
          </p>
        </section>
      ) : (
        <section className="panel panel--list" aria-label="AWB comenzi">
          <div className="awb-toolbar">
            <div className="awb-toolbar__info">
              <strong>{selectedCount}</strong> selectate · {shippable.length}{' '}
              expediabile · {selectedWithAwb} cu AWB
            </div>
            {progress ? (
              <span className="awb-toolbar__progress">{progress}</span>
            ) : null}
          </div>

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

          {!loading && !error && orders.length === 0 ? (
            <div className="empty-state">
              <p className="muted">Nu există comenzi pentru AWB.</p>
            </div>
          ) : null}

          {!loading && !error && orders.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table data-table--orders">
                <thead>
                  <tr>
                    <th scope="col" className="th-check">
                      <input
                        type="checkbox"
                        aria-label="Selectează tot"
                        checked={allSelected}
                        onChange={toggleAll}
                      />
                    </th>
                    <th scope="col">Dată</th>
                    <th scope="col">Comandă</th>
                    <th scope="col">Client</th>
                    <th scope="col">Total</th>
                    <th scope="col">Status</th>
                    <th scope="col">AWB</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const checked = selectedIds.has(order.id)
                    const disabled = !isShippable(order)
                    return (
                      <tr
                        key={order.id}
                        className={checked ? 'row-selected' : undefined}
                      >
                        <td className="th-check">
                          <input
                            type="checkbox"
                            aria-label={`Selectează ${order.id}`}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleOne(order.id)}
                          />
                        </td>
                        <td className="cell-nowrap">
                          {formatOrderDate(order.createdAt)}
                        </td>
                        <td>
                          <span className="cell-order-id">{order.id}</span>
                        </td>
                        <td>
                          <span className="cell-title">
                            {order.customerName}
                          </span>
                          <span className="cell-sku">
                            {order.customerPhone}
                          </span>
                        </td>
                        <td className="cell-nowrap">
                          {formatRon(order.totalAmount)}
                        </td>
                        <td>
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td>
                          {order.awbNumber ? (
                            <span className="cell-sku">{order.awbNumber}</span>
                          ) : (
                            <span className="muted">Neemis</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      )}

      {printOrders && printOrders.length > 0 ? (
        <div className="awb-print-host" role="dialog" aria-modal="true">
          <div className="awb-print-host__toolbar">
            <span className="awb-print-host__count">
              {printOrders.length} AWB
            </span>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setPrintOrders(null)}
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
          <div className="awb-print-host__sheets">
            {printOrders.map((order) => (
              <AwbPrintSheet key={order.id} order={order} />
            ))}
          </div>
        </div>
      ) : null}
    </AdminLayout>
  )
}
