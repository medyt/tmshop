import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { OrderStatusBadge } from '../components/admin/OrdersTable'
import {
  bulkPrintOrderAwbPdf,
  fetchOrders,
  isOrdersApiEnabled,
  issueOrderAwb,
  openAwbPdfBlob,
} from '../lib/ordersApi'
import { formatRon } from '../lib/shopCatalog'
import {
  type DeliveryCarrierId,
} from '../lib/shippingCarriers'
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
  return order.status !== 'cancelled' && order.status !== 'returned'
}

function orderMatchesCarrier(order: Order, carrier: DeliveryCarrierId): boolean {
  if (!order.awbNumber) return true
  return (order.deliveryCarrier ?? 'dpd') === carrier
}

type AdminAwbPageProps = {
  onStockChanged?: () => void
}

export function AdminAwbPage({ onStockChanged }: AdminAwbPageProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(isOrdersApiEnabled())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [carrierFilter, setCarrierFilter] =
    useState<DeliveryCarrierId>('fan-courier')

  const loadOrders = useCallback(async () => {
    if (!isOrdersApiEnabled()) return
    setLoading(true)
    setError(null)
    try {
      const loaded = await fetchOrders()
      setOrders(loaded)
      setSelectedIds(
        new Set(
          loaded
            .filter(
              (order) =>
                isShippable(order) && orderMatchesCarrier(order, carrierFilter),
            )
            .map((order) => order.id),
        ),
      )
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Nu am putut încărca comenzile.',
      )
    } finally {
      setLoading(false)
    }
  }, [carrierFilter])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const visibleOrders = useMemo(
    () => orders.filter((o) => orderMatchesCarrier(o, carrierFilter)),
    [orders, carrierFilter],
  )

  const shippable = useMemo(
    () => visibleOrders.filter(isShippable),
    [visibleOrders],
  )

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.has(o.id)),
    [orders, selectedIds],
  )

  const allSelected =
    shippable.length > 0 && shippable.every((o) => selectedIds.has(o.id))

  const carrierLabel = carrierFilter === 'fan-courier' ? 'Fan Courier' : 'DPD'

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

  const openPdfForOrders = useCallback(async (list: Order[]) => {
    const ids = list.filter((o) => o.awbNumber).map((o) => o.id)
    if (ids.length === 0) {
      throw new Error('Niciuna dintre comenzile selectate nu are AWB generat.')
    }
    // Un singur PDF multi-page (ca DPD), nu câte un tab per AWB.
    const pdf = await bulkPrintOrderAwbPdf(ids)
    openAwbPdfBlob(pdf)
  }, [])

  const handleGenerateAndPrint = useCallback(async () => {
    if (busy) return
    const targets = orders.filter(
      (o) => selectedIds.has(o.id) && orderMatchesCarrier(o, carrierFilter),
    )
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
        setProgress(
          `Generez AWB ${carrierLabel} ${done + 1} din ${missing.length}…`,
        )
        const next = await issueOrderAwb(order.id, carrierFilter)
        updatedById.set(next.id, next)
        done += 1
      }

      if (updatedById.size > 0) {
        setOrders((current) =>
          current.map((item) => updatedById.get(item.id) ?? item),
        )
        onStockChanged?.()
      }

      const finalList = targets.map((o) => updatedById.get(o.id) ?? o)
      setProgress(
        missing.length > 0
          ? `${missing.length} AWB generate. Se pregătește PDF-ul…`
          : 'Se pregătește PDF-ul cu etichete…',
      )
      await openPdfForOrders(finalList)
      setProgress(null)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Nu am putut genera AWB-urile.',
      )
    } finally {
      setBusy(false)
    }
  }, [
    busy,
    carrierFilter,
    carrierLabel,
    onStockChanged,
    openPdfForOrders,
    orders,
    selectedIds,
  ])

  const handlePrintExisting = useCallback(async () => {
    if (busy) return
    const withAwb = selectedOrders.filter(
      (o) => o.awbNumber && orderMatchesCarrier(o, carrierFilter),
    )
    if (withAwb.length === 0) {
      setError('Niciuna dintre comenzile selectate nu are AWB generat.')
      return
    }
    setBusy(true)
    setError(null)
    setProgress('Se pregătește PDF-ul cu etichete…')
    try {
      await openPdfForOrders(withAwb)
      setProgress(null)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nu am putut descărca etichetele PDF.',
      )
    } finally {
      setBusy(false)
    }
  }, [busy, carrierFilter, openPdfForOrders, selectedOrders])

  const selectedCount = selectedIds.size
  const selectedWithAwb = selectedOrders.filter((o) => o.awbNumber).length

  return (
    <AdminLayout
      title="AWB pentru printare"
      lead={`Selectează comenzile, generează AWB-uri ${carrierLabel} și deschide etichetele PDF oficiale.`}
      actions={
        <>
          <button
            type="button"
            className="btn secondary"
            disabled={busy || selectedWithAwb === 0}
            onClick={() => void handlePrintExisting()}
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
          <div
            className="admin-orders__tabs admin-orders__tabs--carrier"
            role="tablist"
            aria-label="Filtru curier"
          >
            <span className="admin-orders__filter-label">Curier</span>
            {[
              { id: 'fan-courier' as const, name: 'Fan Courier' },
              { id: 'dpd' as const, name: 'DPD' },
            ].map((tab) => {
              const active = carrierFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`admin-orders__tab${active ? ' admin-orders__tab--active' : ''}`}
                  onClick={() => {
                    setCarrierFilter(tab.id)
                    setSelectedIds(new Set())
                  }}
                >
                  {tab.name}
                </button>
              )
            })}
          </div>

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

          {!loading && !error && visibleOrders.length === 0 ? (
            <div className="empty-state">
              <p className="muted">
                Nu există comenzi pentru AWB {carrierLabel}.
              </p>
            </div>
          ) : null}

          {!loading && !error && visibleOrders.length > 0 ? (
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
                  {visibleOrders.map((order) => {
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
                            aria-label={`Selectează comanda ${order.id}`}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleOne(order.id)}
                          />
                        </td>
                        <td>{formatOrderDate(order.createdAt)}</td>
                        <td>
                          <strong>#{order.id}</strong>
                        </td>
                        <td>{order.customerName}</td>
                        <td>{formatRon(order.totalAmount)}</td>
                        <td>
                          <OrderStatusBadge
                            status={order.status}
                            paymentStatus={order.paymentStatus}
                            returnReceived={order.returnReceived}
                          />
                        </td>
                        <td>
                          {order.awbNumber ? (
                            <code>{order.awbNumber}</code>
                          ) : (
                            <span className="muted">—</span>
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
    </AdminLayout>
  )
}
