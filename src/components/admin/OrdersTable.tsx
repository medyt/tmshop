import { Fragment, useEffect, useMemo, useState } from 'react'
import { formatRon } from '../../lib/shopCatalog'
import {
  isOrderReturnReceived,
  orderStatusBanner,
  paymentStatusBanner,
} from '../../lib/ordersApi'
import type { Order, OrderStatus, PaymentStatus } from '../../types/order'

const BULK_MAX = 50
const PAGE_SIZE = BULK_MAX

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

export function OrderStatusBadge({
  status,
  paymentStatus,
  returnReceived,
}: {
  status: OrderStatus
  paymentStatus?: PaymentStatus | null
  returnReceived?: boolean
}) {
  const paid = paymentStatus === 'paid'
  const statusText =
    status === 'returned' && returnReceived
      ? 'Returnată'
      : status === 'returned'
        ? 'Refuzată'
        : orderStatusBanner(status)
  return (
    <div className="order-status-stack" role="group" aria-label="Status comandă">
      <span className={`status-banner status-banner--${status}`}>
        {statusText}
      </span>
      <span
        className={`status-banner status-banner--pay-${paid ? 'paid' : 'pending'}`}
      >
        {paymentStatusBanner(paymentStatus)}
      </span>
    </div>
  )
}

type SortKey = 'date' | 'total' | 'status' | 'customer' | 'product'

type Props = {
  orders: Order[]
  /** Mesaj când lista filtrată e goală. */
  emptyMessage?: string
  selectedId: string | null
  onSelect: (id: string) => void
  onCancel: (id: string) => void
  onDelete: (id: string) => void
  busyId?: string | null
  checkedIds: string[]
  onCheckedIdsChange: (ids: string[]) => void
  bulkBusy?: boolean
  /** Tab activ — controlează ce butoane bulk apar. */
  statusFilter?:
    | 'waiting'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'returned'
    | 'return_received'
    | 'all'
  onBulkIssueAwb?: () => void
  onBulkCancelAwb?: () => void
  onBulkSyncDpd?: () => void
  dpdSyncing?: boolean
  /** Etichetă curier pentru butonul sync (DPD / Fan Courier). */
  syncLabel?: string
  /** Prefill căutare (ex. din `/admin/comenzi?q=`). */
  initialSearch?: string
}

function itemsCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

function orderProductGroupKey(order: Order): string {
  const ids = order.items
    .map((item) => item.productId.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
  if (ids.length > 0) return ids.join('|')
  const names = order.items
    .map((item) => item.productName.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'ro'))
  return names.join('|') || '—'
}

function orderProductGroupLabel(order: Order): string {
  if (order.items.length === 0) return 'Fără produse'
  const seen = new Set<string>()
  const names: string[] = []
  for (const item of order.items) {
    const name = item.productName.trim()
    const key = item.productId.trim() || name.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    names.push(name || key)
  }
  return names.join(', ') || 'Fără produse'
}

function orderProductSortValue(order: Order): string {
  return orderProductGroupLabel(order).toLowerCase()
}

function sortOrders(list: Order[], key: SortKey, dir: 1 | -1): Order[] {
  const mul = dir
  return [...list].sort((a, b) => {
    if (key === 'product') {
      const byName = orderProductSortValue(a).localeCompare(
        orderProductSortValue(b),
        'ro',
      )
      if (byName !== 0) return byName * mul
      const byKey = orderProductGroupKey(a).localeCompare(orderProductGroupKey(b))
      if (byKey !== 0) return byKey * mul
      return b.createdAt.localeCompare(a.createdAt)
    }

    let va: number | string = ''
    let vb: number | string = ''
    switch (key) {
      case 'total':
        va = a.totalAmount
        vb = b.totalAmount
        break
      case 'status':
        va = a.status
        vb = b.status
        break
      case 'customer':
        va = a.customerName.toLowerCase()
        vb = b.customerName.toLowerCase()
        break
      default:
        va = a.createdAt
        vb = b.createdAt
        break
    }
    if (typeof va === 'string' && typeof vb === 'string') {
      return va.localeCompare(vb) * mul
    }
    return ((va as number) - (vb as number)) * mul
  })
}

function OrdersPagination({
  page,
  totalPages,
  totalItems,
  pageStart,
  pageEnd,
  onPageChange,
}: {
  page: number
  totalPages: number
  totalItems: number
  pageStart: number
  pageEnd: number
  onPageChange: (page: number) => void
}) {
  if (totalItems <= PAGE_SIZE) return null

  return (
    <nav
      className="orders-pagination"
      aria-label="Paginare comenzi"
    >
      <span className="orders-pagination__info muted">
        {pageStart}–{pageEnd} din {totalItems} · pagina {page}/{totalPages}
      </span>
      <div className="orders-pagination__actions">
        <button
          type="button"
          className="btn secondary btn--sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Înapoi
        </button>
        <button
          type="button"
          className="btn secondary btn--sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Înainte
        </button>
      </div>
    </nav>
  )
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: 1 | -1
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`th-sort${active ? ' th-sort--active' : ''}`}
      onClick={onClick}
    >
      {label}
      {active ? (dir === 1 ? ' ↑' : ' ↓') : ''}
    </button>
  )
}

function canIssueAwb(order: Order): boolean {
  return (
    (order.status === 'new' || order.status === 'confirmed') &&
    !order.awbNumber
  )
}

function canCancelAwb(order: Order): boolean {
  return (
    Boolean(order.awbNumber) &&
    order.status !== 'shipped' &&
    order.status !== 'delivered' &&
    order.status !== 'returned' &&
    order.status !== 'cancelled'
  )
}

function canSyncDpdSelect(order: Order): boolean {
  return (
    (order.status === 'processing' ||
      order.status === 'shipped' ||
      order.status === 'delivered' ||
      order.status === 'returned') &&
    Boolean(order.awbNumber || order.dpdParcelId)
  )
}

function OrderItemsGrid({ order }: { order: Order }) {
  if (order.items.length === 0) return null
  return (
    <ul className="order-items-grid" aria-label="Produse comandate">
      {order.items.map((item, index) => (
        <li
          key={`${item.productId}-${index}`}
          className="order-items-grid__row"
        >
          <span className="order-items-grid__qty">{item.quantity}×</span>
          <span className="order-items-grid__name" title={item.productName}>
            {item.productName}
          </span>
          <span className="order-items-grid__price">
            {formatRon(item.lineTotal)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function OrdersTable({
  orders,
  emptyMessage = 'Nu există comenzi încă.',
  selectedId,
  onSelect,
  onCancel,
  onDelete,
  busyId = null,
  checkedIds,
  onCheckedIdsChange,
  bulkBusy = false,
  statusFilter = 'all',
  onBulkIssueAwb,
  onBulkCancelAwb,
  onBulkSyncDpd,
  dpdSyncing = false,
  syncLabel = 'DPD',
  initialSearch = '',
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>(
    statusFilter === 'waiting' ? 'product' : 'date',
  )
  const [sortDir, setSortDir] = useState<1 | -1>(
    statusFilter === 'waiting' ? 1 : -1,
  )
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setSearch(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    if (statusFilter === 'waiting') {
      setSortKey('product')
      setSortDir(1)
    } else {
      setSortKey('date')
      setSortDir(-1)
    }
  }, [statusFilter])

  useEffect(() => {
    setPage(1)
  }, [orders, search, statusFilter, sortKey, sortDir])

  const showIssueAwb = statusFilter === 'waiting'
  const showCancelAwb =
    statusFilter === 'waiting' ||
    statusFilter === 'processing' ||
    statusFilter === 'all'
  const showSyncDpd =
    statusFilter === 'processing' ||
    statusFilter === 'shipped' ||
    statusFilter === 'delivered' ||
    statusFilter === 'returned' ||
    statusFilter === 'return_received' ||
    statusFilter === 'all'
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) => {
      const products = o.items
        .map((item) => `${item.productName} ${item.productSku ?? ''}`)
        .join(' ')
      const haystack = `${o.id} ${o.customerName} ${o.customerPhone} ${
        o.customerEmail ?? ''
      } ${products}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [orders, search])

  const sorted = useMemo(
    () => sortOrders(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  )

  const productGroupCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const order of sorted) {
      const key = orderProductGroupKey(order)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [sorted])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const pagedOrders = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return sorted.slice(start, start + PAGE_SIZE)
  }, [sorted, safePage])

  const pageStart = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(safePage * PAGE_SIZE, sorted.length)

  const checkedSet = useMemo(() => new Set(checkedIds), [checkedIds])
  const selectableIds = useMemo(() => {
    const source = pagedOrders
    if (statusFilter === 'waiting') {
      return source.filter((o) => canIssueAwb(o) || canCancelAwb(o)).map((o) => o.id)
    }
    if (
      statusFilter === 'processing' ||
      statusFilter === 'shipped' ||
      statusFilter === 'delivered' ||
      statusFilter === 'returned' ||
      statusFilter === 'return_received'
    ) {
      return source.filter(canSyncDpdSelect).map((o) => o.id)
    }
    if (statusFilter === 'all') {
      return source
        .filter((o) => canIssueAwb(o) || canCancelAwb(o) || canSyncDpdSelect(o))
        .map((o) => o.id)
    }
    return []
  }, [pagedOrders, statusFilter])
  const selectableSet = useMemo(
    () => new Set(selectableIds),
    [selectableIds],
  )
  const allVisibleChecked =
    selectableIds.length > 0 && selectableIds.every((id) => checkedSet.has(id))
  const cancelableSelectedCount = orders.reduce(
    (n, order) =>
      checkedSet.has(order.id) && canCancelAwb(order) ? n + 1 : n,
    0,
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? -1 : 1)
    }
  }

  function toggleOne(id: string) {
    if (checkedSet.has(id)) {
      onCheckedIdsChange(checkedIds.filter((x) => x !== id))
      return
    }
    if (checkedIds.length >= BULK_MAX) return
    onCheckedIdsChange([...checkedIds, id])
  }

  function toggleAllVisible() {
    if (allVisibleChecked) {
      const drop = new Set(selectableIds)
      onCheckedIdsChange(checkedIds.filter((id) => !drop.has(id)))
      return
    }
    const next = new Set(checkedIds)
    for (const id of selectableIds) {
      if (next.size >= BULK_MAX) break
      next.add(id)
    }
    onCheckedIdsChange([...next])
  }

  function selectProductGroup(groupKey: string) {
    const ids = sorted
      .filter(
        (order) =>
          orderProductGroupKey(order) === groupKey && canIssueAwb(order),
      )
      .map((order) => order.id)
    if (ids.length === 0) return
    const next = new Set(checkedIds)
    for (const id of ids) {
      if (next.size >= BULK_MAX) break
      next.add(id)
    }
    onCheckedIdsChange([...next])
  }

  const showProductGroups = sortKey === 'product'

  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="table-toolbar">
        <label className="table-toolbar__label" htmlFor="order-search">
          Caută comandă
        </label>
        <input
          id="order-search"
          type="search"
          className="table-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ID, nume, produs, telefon sau email…"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="table-toolbar__count muted">
          {sorted.length === 0
            ? `0 din ${orders.length}`
            : totalPages > 1
              ? `${pageStart}–${pageEnd} din ${sorted.length} (${orders.length} total)`
              : `${filtered.length} din ${orders.length}`}
        </span>
      </div>

      <div className="orders-bulk-bar">
        <div className="orders-bulk-bar__meta">
          <strong>{checkedIds.length}</strong>
          <span className="muted"> selectate (max. {BULK_MAX})</span>
        </div>
        <div className="orders-bulk-bar__actions">
          <button
            type="button"
            className="btn secondary btn--sm"
            disabled={bulkBusy || dpdSyncing || selectableIds.length === 0}
            onClick={toggleAllVisible}
          >
            {allVisibleChecked ? 'Deselectează pagina' : 'Selectează pagina'}
          </button>
          {showIssueAwb && onBulkIssueAwb ? (
            <button
              type="button"
              className="btn primary btn--sm"
              disabled={bulkBusy || dpdSyncing || checkedIds.length === 0}
              onClick={onBulkIssueAwb}
            >
              Emitere AWB + PDF
            </button>
          ) : null}
          {showCancelAwb && onBulkCancelAwb ? (
            <button
              type="button"
              className="btn secondary btn--sm"
              disabled={
                bulkBusy || dpdSyncing || cancelableSelectedCount === 0
              }
              onClick={onBulkCancelAwb}
              title="Anulează AWB-ul la curier și deblochează comanda pentru reemitere"
            >
              Anulare AWB + deblocare
            </button>
          ) : null}
          {showSyncDpd && onBulkSyncDpd ? (
            <button
              type="button"
              className="btn primary btn--sm"
              disabled={bulkBusy || dpdSyncing || checkedIds.length === 0}
              onClick={onBulkSyncDpd}
              title={
                checkedIds.length === 0
                  ? 'Selectează comenzile de sincronizat'
                  : undefined
              }
            >
              {dpdSyncing ? `Sync ${syncLabel}…` : `Sync ${syncLabel}`}
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state empty-state--filter">
          <p>
            <strong>Nicio comandă</strong> nu corespunde căutării „
            {search.trim()}”.
          </p>
        </div>
      ) : (
        <>
          <OrdersPagination
            page={safePage}
            totalPages={totalPages}
            totalItems={sorted.length}
            pageStart={pageStart}
            pageEnd={pageEnd}
            onPageChange={setPage}
          />

          <div className="table-wrap">
            <table className="data-table data-table--orders">
              <thead>
                <tr>
                  <th scope="col" className="th-check">
                    <input
                      type="checkbox"
                      checked={allVisibleChecked}
                      disabled={bulkBusy || selectableIds.length === 0}
                      onChange={toggleAllVisible}
                      aria-label="Selectează comenzile de pe pagina curentă"
                    />
                  </th>
                  <th scope="col">
                    <SortButton
                      label="Dată"
                      active={sortKey === 'date'}
                      dir={sortDir}
                      onClick={() => toggleSort('date')}
                    />
                  </th>
                  <th scope="col">Comandă</th>
                  <th scope="col">
                    <div className="th-sort-group">
                      <SortButton
                        label="Client"
                        active={sortKey === 'customer'}
                        dir={sortDir}
                        onClick={() => toggleSort('customer')}
                      />
                      <SortButton
                        label="Produs"
                        active={sortKey === 'product'}
                        dir={sortDir}
                        onClick={() => toggleSort('product')}
                      />
                    </div>
                  </th>
                  <th scope="col">
                    <SortButton
                      label="Total"
                      active={sortKey === 'total'}
                      dir={sortDir}
                      onClick={() => toggleSort('total')}
                    />
                  </th>
                  <th scope="col">
                    <SortButton
                      label="Status"
                      active={sortKey === 'status'}
                      dir={sortDir}
                      onClick={() => toggleSort('status')}
                    />
                  </th>
                  <th scope="col">AWB</th>
                  <th scope="col" className="th-actions">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedOrders.map((order, index) => {
                  const selected = order.id === selectedId
                  const busy = busyId === order.id || bulkBusy
                  const canCancel = order.status !== 'cancelled'
                  const canCheck = selectableSet.has(order.id)
                  const checked = checkedSet.has(order.id)
                  const groupKey = orderProductGroupKey(order)
                  const prev = index > 0 ? pagedOrders[index - 1] : null
                  const showGroupRow =
                    showProductGroups &&
                    (prev == null ||
                      orderProductGroupKey(prev) !== groupKey)
                  const groupCount = productGroupCounts.get(groupKey) ?? 0
                  return (
                    <Fragment key={order.id}>
                      {showGroupRow ? (
                        <tr className="orders-product-group">
                          <td colSpan={8}>
                            <div className="orders-product-group__inner">
                              <span className="orders-product-group__label">
                                {orderProductGroupLabel(order)}
                                <span className="muted">
                                  {' '}
                                  · {groupCount}{' '}
                                  {groupCount === 1 ? 'comandă' : 'comenzi'}
                                </span>
                              </span>
                              {showIssueAwb ? (
                                <button
                                  type="button"
                                  className="btn secondary btn--sm"
                                  disabled={
                                    bulkBusy ||
                                    dpdSyncing ||
                                    groupCount === 0
                                  }
                                  onClick={() => selectProductGroup(groupKey)}
                                >
                                  Selectează produsul
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      <tr
                        className={
                          selected || checked ? 'row-selected' : undefined
                        }
                      >
                      <td className="th-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={
                            busy ||
                            (!checked &&
                              (!canCheck || checkedIds.length >= BULK_MAX))
                          }
                          onChange={() => toggleOne(order.id)}
                          aria-label={`Selectează ${order.id}`}
                        />
                      </td>
                      <td className="cell-nowrap">
                        {formatOrderDate(order.createdAt)}
                      </td>
                      <td>
                        <span className="cell-order-id">{order.id}</span>
                      </td>
                      <td className="order-cell-customer">
                        <span className="cell-title">{order.customerName}</span>
                        <span className="cell-sku">{order.customerPhone}</span>
                        {order.customerEmail ? (
                          <span className="cell-sku">{order.customerEmail}</span>
                        ) : null}
                        <OrderItemsGrid order={order} />
                      </td>
                      <td className="cell-nowrap">
                        <strong>{formatRon(order.totalAmount)}</strong>
                        <span className="cell-sku">
                          {itemsCount(order)} prod.
                        </span>
                      </td>
                      <td>
                        <OrderStatusBadge
                          status={order.status}
                          paymentStatus={order.paymentStatus}
                          returnReceived={isOrderReturnReceived(order)}
                        />
                      </td>
                      <td>
                        {order.awbNumber ? (
                          <span className="cell-sku">{order.awbNumber}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="admin-reviews__row-actions">
                          <button
                            type="button"
                            className="btn primary btn--sm"
                            disabled={busy}
                            onClick={() => onSelect(order.id)}
                          >
                            Editează
                          </button>
                          {canCancel ? (
                            <button
                              type="button"
                              className="btn secondary btn--sm"
                              disabled={busy}
                              onClick={() => onCancel(order.id)}
                            >
                              Anulează
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn danger btn--sm"
                            disabled={busy}
                            onClick={() => onDelete(order.id)}
                          >
                            Șterge
                          </button>
                        </div>
                      </td>
                    </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="card-list">
            {pagedOrders.map((order, index) => {
              const selected = order.id === selectedId
              const busy = busyId === order.id || bulkBusy
              const canCancel = order.status !== 'cancelled'
              const canCheck = selectableSet.has(order.id)
              const checked = checkedSet.has(order.id)
              const groupKey = orderProductGroupKey(order)
              const prev = index > 0 ? pagedOrders[index - 1] : null
              const showGroupRow =
                showProductGroups &&
                (prev == null || orderProductGroupKey(prev) !== groupKey)
              const groupCount = productGroupCounts.get(groupKey) ?? 0
              return (
                <Fragment key={order.id}>
                  {showGroupRow ? (
                    <li className="orders-product-group orders-product-group--card">
                      <span className="orders-product-group__label">
                        {orderProductGroupLabel(order)}
                        <span className="muted">
                          {' '}
                          · {groupCount}{' '}
                          {groupCount === 1 ? 'comandă' : 'comenzi'}
                        </span>
                      </span>
                      {showIssueAwb ? (
                        <button
                          type="button"
                          className="btn secondary btn--sm"
                          disabled={bulkBusy || dpdSyncing || groupCount === 0}
                          onClick={() => selectProductGroup(groupKey)}
                        >
                          Selectează produsul
                        </button>
                      ) : null}
                    </li>
                  ) : null}
                  <li>
                  <article
                    className={`product-card order-card${
                      selected || checked ? ' product-card--selected' : ''
                    }`}
                  >
                    <div className="order-card__check">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={
                          busy ||
                          (!checked &&
                            (!canCheck || checkedIds.length >= BULK_MAX))
                        }
                        onChange={() => toggleOne(order.id)}
                        aria-label={`Selectează ${order.id}`}
                      />
                    </div>
                    <button
                      type="button"
                      className="order-card__hit"
                      onClick={() => onSelect(order.id)}
                    >
                      <div className="product-card__body">
                        <div className="order-card__top">
                          <strong>{order.id}</strong>
                        </div>
                        <OrderStatusBadge
                          status={order.status}
                          paymentStatus={order.paymentStatus}
                          returnReceived={isOrderReturnReceived(order)}
                        />
                        <span className="muted">
                          {formatOrderDate(order.createdAt)}
                        </span>
                        <span>
                          {order.customerName} · {order.customerPhone}
                        </span>
                        {order.customerEmail ? (
                          <span className="muted">{order.customerEmail}</span>
                        ) : null}
                        <OrderItemsGrid order={order} />
                        <span className="order-card__total">
                          {formatRon(order.totalAmount)} · {itemsCount(order)}{' '}
                          produse
                        </span>
                      </div>
                    </button>
                    <div className="admin-reviews__row-actions order-card__actions">
                      <button
                        type="button"
                        className="btn primary btn--sm"
                        disabled={busy}
                        onClick={() => onSelect(order.id)}
                      >
                        Editează
                      </button>
                      {canCancel ? (
                        <button
                          type="button"
                          className="btn secondary btn--sm"
                          disabled={busy}
                          onClick={() => onCancel(order.id)}
                        >
                          Anulează
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn danger btn--sm"
                        disabled={busy}
                        onClick={() => onDelete(order.id)}
                      >
                        Șterge
                      </button>
                    </div>
                  </article>
                </li>
                </Fragment>
              )
            })}
          </ul>

          <OrdersPagination
            page={safePage}
            totalPages={totalPages}
            totalItems={sorted.length}
            pageStart={pageStart}
            pageEnd={pageEnd}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
