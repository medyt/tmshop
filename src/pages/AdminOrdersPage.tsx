import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'
import { ConfirmModal } from '../components/admin/ConfirmModal'
import { OrdersTable } from '../components/admin/OrdersTable'
import { OrderCreateModal } from '../components/admin/OrderCreateModal'
import { OrderEditModal } from '../components/admin/OrderEditModal'
import { useProducts } from '../hooks/useProducts'
import {
  bulkCancelOrderAwb,
  bulkIssueOrderAwb,
  bulkPrintOrderAwbPdf,
  bulkSyncOrderDpdStatus,
  cancelOrder,
  deleteOrder,
  fetchOrders,
  isOrderReturnReceived,
  isOrdersApiEnabled,
  openAwbPdfBlob,
} from '../lib/ordersApi'
import { toLocalDateKey } from '../lib/adminStats'
import type { DeliveryCarrierId } from '../lib/shippingCarriers'
import type { Order, OrderStatus, PaymentMethod } from '../types/order'

type Props = {
  onStockChanged?: () => void
}

type PendingAction =
  | { kind: 'cancel'; orderId: string }
  | { kind: 'delete'; orderId: string }
  | { kind: 'cancelAwb'; orderIds: string[] }

/** Filtru pe secțiuni (similar Emag / BaseLinker). */
type OrderStatusFilter =
  | 'waiting'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'return_received'
  | 'all'

const ORDER_STATUS_TABS: Array<{
  id: OrderStatusFilter
  label: string
  statuses: OrderStatus[] | null
}> = [
  {
    id: 'waiting',
    label: 'În așteptare',
    statuses: ['new', 'confirmed'],
  },
  {
    id: 'processing',
    label: 'În procesare',
    statuses: ['processing'],
  },
  {
    id: 'shipped',
    label: 'Expediate',
    statuses: ['shipped'],
  },
  {
    id: 'delivered',
    label: 'Livrate',
    statuses: ['delivered'],
  },
  {
    id: 'returned',
    label: 'Refuzate',
    statuses: ['returned'],
  },
  {
    id: 'return_received',
    label: 'Returnate',
    statuses: ['returned'],
  },
  {
    id: 'all',
    label: 'Toate',
    statuses: null,
  },
]

type PaymentFilter = 'all' | PaymentMethod

const PAYMENT_TABS: Array<{ id: PaymentFilter; label: string }> = [
  { id: 'all', label: 'Toate' },
  { id: 'card', label: 'Card' },
  { id: 'cod', label: 'Ramburs' },
]

const CARRIER_TABS: Array<{ id: DeliveryCarrierId; label: string }> = [
  { id: 'fan-courier', label: 'Fan Courier' },
  { id: 'dpd', label: 'DPD' },
]

function orderPayment(order: Order): PaymentMethod {
  return order.paymentMethod === 'card' ? 'card' : 'cod'
}

/** Comenzi fără AWB apar pe ambele taburi; după AWB doar pe curierul salvat (legacy = DPD). */
function orderMatchesCarrier(order: Order, carrier: DeliveryCarrierId): boolean {
  if (!order.awbNumber) return true
  const locked = order.deliveryCarrier ?? 'dpd'
  return locked === carrier
}

function formatBulkErrors(
  errors: Array<{ orderId: string; error: string }>,
): string {
  if (errors.length === 0) return ''
  const preview = errors
    .slice(0, 3)
    .map((e) => `${e.orderId}: ${e.error}`)
    .join(' · ')
  const more =
    errors.length > 3 ? ` (+${errors.length - 3} alte erori)` : ''
  return preview + more
}

function orderMatchesFilter(
  order: Order,
  filter: OrderStatusFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'returned') {
    return order.status === 'returned' && !isOrderReturnReceived(order)
  }
  if (filter === 'return_received') {
    return order.status === 'returned' && isOrderReturnReceived(order)
  }
  const tab = ORDER_STATUS_TABS.find((t) => t.id === filter)
  if (!tab || tab.statuses === null) return true
  return tab.statuses.includes(order.status)
}

function orderMatchesPayment(
  order: Order,
  filter: PaymentFilter,
): boolean {
  if (filter === 'all') return true
  return orderPayment(order) === filter
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function orderCreatedDateKey(order: Order): string | null {
  const created = new Date(order.createdAt)
  if (Number.isNaN(created.getTime())) return null
  return toLocalDateKey(created)
}

function orderMatchesDate(order: Order, dateKey: string): boolean {
  return orderCreatedDateKey(order) === dateKey
}

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function isOrderStatusFilter(value: string): value is OrderStatusFilter {
  return ORDER_STATUS_TABS.some((tab) => tab.id === value)
}

export function AdminOrdersPage({ onStockChanged }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = (searchParams.get('q') ?? '').trim()
  const tabFromUrl = (searchParams.get('tab') ?? '').trim()
  const dateFromUrl = (searchParams.get('date') ?? '').trim()
  const carrierFromUrl = (searchParams.get('carrier') ?? '').trim()

  const { products, loading: productsLoading } = useProducts()
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>(() => {
    if (isOrderStatusFilter(tabFromUrl)) return tabFromUrl
    return queryFromUrl ? 'all' : 'waiting'
  })
  const [carrierFilter, setCarrierFilter] = useState<DeliveryCarrierId>(() =>
    carrierFromUrl === 'dpd' ? 'dpd' : 'fan-courier',
  )
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [dateFilter, setDateFilter] = useState(() =>
    isDateKey(dateFromUrl) ? dateFromUrl : '',
  )
  const [orderSearch, setOrderSearch] = useState(queryFromUrl)
  const [loading, setLoading] = useState(isOrdersApiEnabled())
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [dpdSyncing, setDpdSyncing] = useState(false)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [pending, setPending] = useState<PendingAction | null>(null)
  const dpdSyncingRef = useRef(false)
  const bulkBusyRef = useRef(false)
  const loadGenRef = useRef(0)
  bulkBusyRef.current = bulkBusy
  dpdSyncingRef.current = dpdSyncing

  const loadOrders = useCallback(() => {
    if (!isOrdersApiEnabled()) return

    const gen = ++loadGenRef.current
    setLoading(true)
    setError(null)

    void fetchOrders()
      .then((loaded) => {
        if (loadGenRef.current !== gen) return
        setOrders(loaded)
        setCheckedIds((ids) =>
          ids.filter((id) => loaded.some((order) => order.id === id)),
        )
        setSelectedId((current) =>
          current && loaded.some((order) => order.id === current)
            ? current
            : null,
        )
      })
      .catch((err: unknown) => {
        if (loadGenRef.current !== gen) return
        const msg =
          err instanceof Error ? err.message : 'Nu am putut încărca comenzile.'
        setError(msg)
      })
      .finally(() => {
        if (loadGenRef.current === gen) setLoading(false)
      })
  }, [])

  useEffect(() => {
    const q = (searchParams.get('q') ?? '').trim()
    const tab = (searchParams.get('tab') ?? '').trim()
    const date = (searchParams.get('date') ?? '').trim()
    const carrier = (searchParams.get('carrier') ?? '').trim()
    setOrderSearch(q)
    setDateFilter(isDateKey(date) ? date : '')
    if (carrier === 'fan-courier' || carrier === 'dpd') {
      setCarrierFilter(carrier)
    }
    if (isOrderStatusFilter(tab)) {
      setStatusFilter(tab)
    } else if (q) {
      setStatusFilter('all')
    }
  }, [searchParams])

  useEffect(() => {
    loadOrders()
    return () => {
      loadGenRef.current += 1
    }
  }, [loadOrders])

  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null

  const ordersByDate = useMemo(() => {
    if (!dateFilter) return orders
    return orders.filter((order) => orderMatchesDate(order, dateFilter))
  }, [orders, dateFilter])

  const ordersByCarrier = useMemo(
    () =>
      ordersByDate.filter((order) =>
        orderMatchesCarrier(order, carrierFilter),
      ),
    [ordersByDate, carrierFilter],
  )

  const tabCounts = useMemo(() => {
    const scoped = ordersByCarrier.filter((order) =>
      orderMatchesPayment(order, paymentFilter),
    )
    const counts: Record<OrderStatusFilter, number> = {
      waiting: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      returned: 0,
      return_received: 0,
      all: scoped.length,
    }
    for (const order of scoped) {
      if (order.status === 'new' || order.status === 'confirmed') {
        counts.waiting += 1
      } else if (order.status === 'processing') {
        counts.processing += 1
      } else if (order.status === 'shipped') {
        counts.shipped += 1
      } else if (order.status === 'delivered') {
        counts.delivered += 1
      } else if (order.status === 'returned') {
        if (isOrderReturnReceived(order)) {
          counts.return_received += 1
        } else {
          counts.returned += 1
        }
      }
    }
    return counts
  }, [ordersByCarrier, paymentFilter])

  const paymentCounts = useMemo(() => {
    const scoped = ordersByCarrier.filter((order) =>
      orderMatchesFilter(order, statusFilter),
    )
    const counts: Record<PaymentFilter, number> = {
      all: scoped.length,
      card: 0,
      cod: 0,
    }
    for (const order of scoped) {
      counts[orderPayment(order)] += 1
    }
    return counts
  }, [ordersByCarrier, statusFilter])

  const carrierCounts = useMemo(() => {
    const scoped = ordersByDate.filter(
      (order) =>
        orderMatchesFilter(order, statusFilter) &&
        orderMatchesPayment(order, paymentFilter),
    )
    const counts: Record<DeliveryCarrierId, number> = {
      dpd: 0,
      'fan-courier': 0,
    }
    for (const order of scoped) {
      if (orderMatchesCarrier(order, 'dpd')) counts.dpd += 1
      if (orderMatchesCarrier(order, 'fan-courier')) counts['fan-courier'] += 1
    }
    return counts
  }, [ordersByDate, statusFilter, paymentFilter])

  const filteredOrders = useMemo(
    () =>
      ordersByCarrier.filter(
        (o) =>
          orderMatchesFilter(o, statusFilter) &&
          orderMatchesPayment(o, paymentFilter),
      ),
    [ordersByCarrier, statusFilter, paymentFilter],
  )

  const activeTabLabel =
    ORDER_STATUS_TABS.find((t) => t.id === statusFilter)?.label ?? 'Comenzi'
  const activePaymentLabel =
    PAYMENT_TABS.find((t) => t.id === paymentFilter)?.label ?? 'Toate'
  const activeCarrierLabel =
    CARRIER_TABS.find((t) => t.id === carrierFilter)?.label ?? 'DPD'

  const setFilter = (next: OrderStatusFilter) => {
    setStatusFilter(next)
    setCheckedIds([])
    setSelectedId(null)
  }

  const setPayFilter = (next: PaymentFilter) => {
    setPaymentFilter(next)
    setCheckedIds([])
    setSelectedId(null)
  }

  const setCarrier = (next: DeliveryCarrierId) => {
    setCarrierFilter(next)
    setCheckedIds([])
    setSelectedId(null)
    const params = new URLSearchParams(searchParams)
    params.set('carrier', next)
    setSearchParams(params, { replace: true })
  }

  const updateDateFilter = (next: string) => {
    const normalized = isDateKey(next) ? next : ''
    setDateFilter(normalized)
    setCheckedIds([])
    setSelectedId(null)
    const params = new URLSearchParams(searchParams)
    if (normalized) params.set('date', normalized)
    else params.delete('date')
    setSearchParams(params, { replace: true })
  }

  const mergeOrders = useCallback((updated: Order[]) => {
    if (updated.length === 0) return
    setOrders((current) => {
      const byId = new Map(updated.map((o) => [o.id, o]))
      return current.map((item) => byId.get(item.id) ?? item)
    })
  }, [])

  const handleUpdated = (updated: Order) => {
    setOrders((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    )
  }

  const runCancel = useCallback(
    (id: string) => {
      setBusyId(id)
      setError(null)
      void cancelOrder(id)
        .then((updated) => {
          handleUpdated(updated)
          onStockChanged?.()
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Nu am putut anula comanda.',
          )
        })
        .finally(() => {
          setBusyId(null)
          setPending(null)
        })
    },
    [onStockChanged],
  )

  const runDelete = useCallback(
    (id: string) => {
      setBusyId(id)
      setError(null)
      void deleteOrder(id)
        .then(() => {
          setOrders((current) => current.filter((item) => item.id !== id))
          setCheckedIds((current) => current.filter((x) => x !== id))
          if (selectedId === id) setSelectedId(null)
          onStockChanged?.()
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Nu am putut șterge comanda.',
          )
        })
        .finally(() => {
          setBusyId(null)
          setPending(null)
        })
    },
    [onStockChanged, selectedId],
  )

  const handleCancel = useCallback(
    (id: string) => {
      if (busyId || bulkBusy) return
      setPending({ kind: 'cancel', orderId: id })
    },
    [busyId, bulkBusy],
  )

  const handleDelete = useCallback(
    (id: string) => {
      if (busyId || bulkBusy) return
      setPending({ kind: 'delete', orderId: id })
    },
    [busyId, bulkBusy],
  )

  const runDpdSync = useCallback(
    (orderIds: string[]) => {
      if (dpdSyncingRef.current || bulkBusyRef.current) return
      if (orderIds.length === 0) {
        setError('Selectează cel puțin o comandă cu AWB pentru sync DPD.')
        return
      }
      dpdSyncingRef.current = true
      setDpdSyncing(true)
      setError(null)
      setMessage(null)
      void bulkSyncOrderDpdStatus(orderIds)
        .then((result) => {
          mergeOrders(result.orders)
          onStockChanged?.()
          const changed = result.statusChanged
          const fail = result.errors.length
          if (changed > 0) {
            setMessage(
              fail === 0
                ? `DPD: ${changed} comenzi actualizate (status / plată / factură).`
                : `DPD: ${changed} actualizate, ${fail} erori. ${formatBulkErrors(result.errors)}`,
            )
          } else {
            setMessage(
              fail === 0
                ? `DPD: ${result.synced} comenzi verificate, fără schimbări.`
                : `DPD: fără schimbări. ${fail} erori. ${formatBulkErrors(result.errors)}`,
            )
          }
          if (fail === 0) setCheckedIds([])
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Nu am putut sincroniza statusurile DPD.',
          )
        })
        .finally(() => {
          dpdSyncingRef.current = false
          setDpdSyncing(false)
        })
    },
    [mergeOrders, onStockChanged],
  )

  const handleBulkSyncDpd = useCallback(() => {
    const ids = checkedIds.filter((id) => {
      const order = orders.find((o) => o.id === id)
      return Boolean(order?.awbNumber || order?.dpdParcelId)
    })
    runDpdSync(ids)
  }, [checkedIds, orders, runDpdSync])

  const handleBulkIssueAwb = useCallback(() => {
    if (bulkBusy || checkedIds.length === 0) return
    const ids = [...checkedIds]
    const carrier = carrierFilter
    setBulkBusy(true)
    setError(null)
    setMessage(null)
    void bulkIssueOrderAwb(ids, carrier)
      .then(async (result) => {
        mergeOrders(result.orders)
        onStockChanged?.()

        const printIds = [
          ...result.orders.filter((o) => o.awbNumber).map((o) => o.id),
          ...ids.filter((id) => {
            const local = orders.find((o) => o.id === id)
            return (
              Boolean(local?.awbNumber) &&
              !result.orders.some((o) => o.id === id)
            )
          }),
        ]
        const uniquePrintIds = [...new Set(printIds)]

        if (uniquePrintIds.length === 0) {
          setError(
            formatBulkErrors(result.errors) ||
              'Nicio comandă nu are AWB de tipărit.',
          )
          return
        }

        const pdf = await bulkPrintOrderAwbPdf(uniquePrintIds)
        openAwbPdfBlob(pdf)

        const ok = result.orders.length
        const fail = result.errors.length
        if (fail > 0 && ok === 0) {
          setError(formatBulkErrors(result.errors))
          return
        }
        setMessage(
          fail === 0
            ? `AWB emis pentru ${ok} comenzi. PDF etichete A6 deschis.`
            : `AWB: ${ok} ok, ${fail} eșuate. PDF generat pentru cele reușite. ${formatBulkErrors(result.errors)}`,
        )
        setCheckedIds([])
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut emite AWB-urile / PDF-ul.',
        )
      })
      .finally(() => setBulkBusy(false))
  }, [bulkBusy, carrierFilter, checkedIds, mergeOrders, onStockChanged, orders])

  const handleBulkCancelAwb = useCallback(() => {
    if (bulkBusy || checkedIds.length === 0) return
    const ids = checkedIds.filter((id) => {
      const order = orders.find((o) => o.id === id)
      return (
        Boolean(order?.awbNumber) &&
        order?.status !== 'shipped' &&
        order?.status !== 'delivered' &&
        order?.status !== 'returned' &&
        order?.status !== 'cancelled'
      )
    })
    if (ids.length === 0) {
      setError(
        'Selectează comenzi cu AWB încă neexpediate pentru anulare.',
      )
      return
    }
    setPending({ kind: 'cancelAwb', orderIds: ids })
  }, [bulkBusy, checkedIds, orders])

  const runBulkCancelAwb = useCallback(
    (orderIds: string[]) => {
      if (bulkBusy || orderIds.length === 0) return
      setBulkBusy(true)
      setError(null)
      setMessage(null)
      void bulkCancelOrderAwb(orderIds)
        .then((result) => {
          mergeOrders(result.orders)
          onStockChanged?.()
          const ok = result.orders.length
          const fail = result.errors.length
          if (fail > 0 && ok === 0) {
            setError(formatBulkErrors(result.errors))
            return
          }
          setMessage(
            fail === 0
              ? `AWB anulat pentru ${ok} ${ok === 1 ? 'comandă' : 'comenzi'}. Poți reemite din tab-ul Fan Courier, „În așteptare”.`
              : `Anulare AWB: ${ok} ok, ${fail} eșuate. ${formatBulkErrors(result.errors)}`,
          )
          if (fail === 0) setCheckedIds([])
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Nu am putut anula AWB-urile.',
          )
        })
        .finally(() => {
          setBulkBusy(false)
          setPending(null)
        })
    },
    [bulkBusy, mergeOrders, onStockChanged],
  )

  const confirmBusy =
    pending?.kind === 'cancelAwb'
      ? bulkBusy
      : busyId !== null && pending !== null

  return (
    <AdminLayout
      title={activeTabLabel}
      lead={
        statusFilter === 'processing' ||
        statusFilter === 'shipped' ||
        statusFilter === 'delivered' ||
        statusFilter === 'returned'
          ? 'Selectează comenzile cu AWB. „Anulare AWB + deblocare” înainte de predare; „Sync” pentru status / plată / factură.'
          : statusFilter === 'waiting'
            ? 'Selectează comenzi pentru emitere AWB (etichete A6).'
            : statusFilter === 'return_received'
              ? 'Colete reîntorse la magazin (confirmate din DPD sau manual).'
              : 'Gestionează comenzile pe status.'
      }
      actions={
        isOrdersApiEnabled() ? (
          <>
            <button
              type="button"
              className="btn secondary"
              disabled={loading}
              onClick={() => {
                setMessage(null)
                loadOrders()
              }}
            >
              {loading ? 'Se reîncarcă…' : 'Reîncarcă'}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setSelectedId(null)
                setCreateOpen(true)
                setError(null)
                setMessage(null)
              }}
            >
              Adaugă comandă
            </button>
          </>
        ) : null
      }
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
          {!loading || orders.length > 0 ? (
            <div className="admin-orders__filters">
              <div className="admin-orders__date-filter">
                <label className="field admin-orders__date" htmlFor="order-date-filter">
                  <span>Data comenzii</span>
                  <input
                    id="order-date-filter"
                    type="date"
                    value={dateFilter}
                    max={toLocalDateKey(new Date())}
                    onChange={(e) => updateDateFilter(e.target.value)}
                    aria-label="Filtru dată comandă"
                  />
                </label>
                <button
                  type="button"
                  className="admin-orders__date-action"
                  onClick={() => updateDateFilter(toLocalDateKey(new Date()))}
                >
                  Astăzi
                </button>
                {dateFilter ? (
                  <>
                    <span className="admin-orders__date-summary muted">
                      {ordersByDate.length}{' '}
                      {ordersByDate.length === 1 ? 'comandă' : 'comenzi'}
                    </span>
                    <button
                      type="button"
                      className="admin-orders__date-action"
                      onClick={() => updateDateFilter('')}
                    >
                      Toate zilele
                    </button>
                  </>
                ) : null}
              </div>
              <div
                className="admin-orders__tabs admin-orders__tabs--carrier"
                role="tablist"
                aria-label="Filtru curier"
              >
                <span className="admin-orders__filter-label">Curier</span>
                {CARRIER_TABS.map((tab) => {
                  const active = carrierFilter === tab.id
                  const count = carrierCounts[tab.id]
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`admin-orders__tab${active ? ' admin-orders__tab--active' : ''}`}
                      onClick={() => setCarrier(tab.id)}
                    >
                      {tab.label}
                      <span className="admin-orders__tab-count">({count})</span>
                    </button>
                  )
                })}
              </div>
              <div
                className="admin-orders__tabs"
                role="tablist"
                aria-label="Filtru status comenzi"
              >
                {ORDER_STATUS_TABS.map((tab) => {
                  const active = statusFilter === tab.id
                  const count = tabCounts[tab.id]
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`admin-orders__tab${active ? ' admin-orders__tab--active' : ''}`}
                      onClick={() => setFilter(tab.id)}
                    >
                      {tab.label}
                      <span className="admin-orders__tab-count">({count})</span>
                    </button>
                  )
                })}
              </div>
              <div
                className="admin-orders__tabs admin-orders__tabs--payment"
                role="tablist"
                aria-label="Filtru metodă de plată"
              >
                <span className="admin-orders__filter-label">Plată</span>
                {PAYMENT_TABS.map((tab) => {
                  const active = paymentFilter === tab.id
                  const count = paymentCounts[tab.id]
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`admin-orders__tab${active ? ' admin-orders__tab--active' : ''}`}
                      onClick={() => setPayFilter(tab.id)}
                    >
                      {tab.label}
                      <span className="admin-orders__tab-count">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {loading && orders.length === 0 ? (
            <div className="empty-state">
              <p className="muted">Se încarcă comenzile…</p>
            </div>
          ) : null}
          {loading && orders.length > 0 ? (
            <p className="app-status" role="status">
              Se reîncarcă comenzile…
            </p>
          ) : null}
          {error ? (
            <p className="app-status app-status--error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="app-status app-status--ok" role="status">
              {message}
            </p>
          ) : null}

          {dpdSyncing ? (
            <p className="app-status app-status--ok" role="status">
              Se sincronizează statusurile cu {activeCarrierLabel}…
            </p>
          ) : null}

          {!loading || orders.length > 0 ? (
            <OrdersTable
              orders={filteredOrders}
              emptyMessage={
                orders.length === 0
                  ? 'Nu există comenzi încă.'
                  : dateFilter && ordersByDate.length === 0
                    ? `Nicio comandă în data de ${formatDateLabel(dateFilter)}.`
                    : paymentFilter === 'all'
                      ? dateFilter
                        ? `Nicio comandă ${activeCarrierLabel} în „${activeTabLabel}" pentru ${formatDateLabel(dateFilter)}.`
                        : `Nicio comandă ${activeCarrierLabel} în „${activeTabLabel}".`
                      : dateFilter
                        ? `Nicio comandă ${activeCarrierLabel} cu plată ${activePaymentLabel.toLowerCase()} în „${activeTabLabel}" pentru ${formatDateLabel(dateFilter)}.`
                        : `Nicio comandă ${activeCarrierLabel} cu plată ${activePaymentLabel.toLowerCase()} în „${activeTabLabel}".`
              }
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCancel={handleCancel}
              onDelete={handleDelete}
              busyId={busyId}
              checkedIds={checkedIds}
              onCheckedIdsChange={setCheckedIds}
              bulkBusy={bulkBusy}
              statusFilter={statusFilter}
              onBulkIssueAwb={handleBulkIssueAwb}
              onBulkCancelAwb={handleBulkCancelAwb}
              onBulkSyncDpd={handleBulkSyncDpd}
              dpdSyncing={dpdSyncing}
              syncLabel={activeCarrierLabel}
              initialSearch={orderSearch}
            />
          ) : null}
        </section>
      )}

      {createOpen ? (
        <OrderCreateModal
          products={products}
          productsLoading={productsLoading}
          onClose={() => setCreateOpen(false)}
          onCreated={(order) => {
            setOrders((current) => [order, ...current])
            setCreateOpen(false)
            setSelectedId(order.id)
            setFilter(
              orderMatchesFilter(order, 'waiting') ? 'waiting' : statusFilter,
            )
            setMessage(`Comanda ${order.id} a fost creată.`)
            onStockChanged?.()
          }}
        />
      ) : null}

      {selectedOrder ? (
        <OrderEditModal
          order={selectedOrder}
          preferredCarrier={carrierFilter}
          products={products}
          productsLoading={productsLoading}
          onClose={() => setSelectedId(null)}
          onUpdated={(updated) => {
            handleUpdated(updated)
            onStockChanged?.()
          }}
          onCancelOrder={() => handleCancel(selectedOrder.id)}
          onDeleteOrder={() => handleDelete(selectedOrder.id)}
          busy={busyId === selectedOrder.id || bulkBusy}
        />
      ) : null}

      <ConfirmModal
        open={pending?.kind === 'cancelAwb'}
        tone="warning"
        title={
          pending?.kind === 'cancelAwb'
            ? `Anulezi AWB-ul pentru ${pending.orderIds.length} ${
                pending.orderIds.length === 1 ? 'comandă' : 'comenzi'
              }?`
            : 'Anulezi AWB-ul?'
        }
        description="AWB-ul se anulează la curier (doar dacă coletul nu a fost predat). Comanda se deblochează și revine la „În așteptare”, ca să poți reemite cu Fan Courier sau DPD."
        confirmLabel="Anulează AWB"
        busy={confirmBusy && pending?.kind === 'cancelAwb'}
        onCancel={() => {
          if (!confirmBusy) setPending(null)
        }}
        onConfirm={() => {
          if (pending?.kind === 'cancelAwb') runBulkCancelAwb(pending.orderIds)
        }}
      />

      <ConfirmModal
        open={pending?.kind === 'cancel'}
        tone="warning"
        title={
          pending?.kind === 'cancel'
            ? `Anulezi comanda ${pending.orderId}?`
            : 'Anulezi comanda?'
        }
        description="Comanda trece pe status Anulată. Dacă stocul a fost scăzut pentru această comandă, va fi returnat în gestiune."
        confirmLabel="Anulează comanda"
        busy={confirmBusy && pending?.kind === 'cancel'}
        onCancel={() => {
          if (!confirmBusy) setPending(null)
        }}
        onConfirm={() => {
          if (pending?.kind === 'cancel') runCancel(pending.orderId)
        }}
      />

      <ConfirmModal
        open={pending?.kind === 'delete'}
        tone="danger"
        title={
          pending?.kind === 'delete'
            ? `Ștergi comanda ${pending.orderId}?`
            : 'Ștergi comanda?'
        }
        description="Ștergerea este definitivă. Stocul rezervat (dacă există) va fi returnat în gestiune."
        confirmLabel="Șterge definitiv"
        busy={confirmBusy && pending?.kind === 'delete'}
        onCancel={() => {
          if (!confirmBusy) setPending(null)
        }}
        onConfirm={() => {
          if (pending?.kind === 'delete') runDelete(pending.orderId)
        }}
      />
    </AdminLayout>
  )
}
