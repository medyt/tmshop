import { useMemo, useState } from 'react'
import { formatRon } from '../../lib/shopCatalog'
import { orderStatusLabel } from '../../lib/ordersApi'
import type { Order, OrderStatus } from '../../types/order'

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

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {orderStatusLabel(status)}
    </span>
  )
}

type SortKey = 'date' | 'total' | 'status' | 'customer'

type Props = {
  orders: Order[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function itemsCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

function sortOrders(list: Order[], key: SortKey, dir: 1 | -1): Order[] {
  const mul = dir
  return [...list].sort((a, b) => {
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

export function OrdersTable({ orders, selectedId, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) => {
      const haystack = `${o.id} ${o.customerName} ${o.customerPhone} ${
        o.customerEmail ?? ''
      }`.toLowerCase()
      return haystack.includes(q)
    })
  }, [orders, search])

  const sorted = useMemo(
    () => sortOrders(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? -1 : 1)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <p>Nu există comenzi încă.</p>
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
          placeholder="ID, nume client, telefon sau email…"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="table-toolbar__count muted">
          {filtered.length} din {orders.length}
        </span>
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
          <div className="table-wrap">
            <table className="data-table data-table--orders">
              <thead>
                <tr>
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
                    <SortButton
                      label="Client"
                      active={sortKey === 'customer'}
                      dir={sortDir}
                      onClick={() => toggleSort('customer')}
                    />
                  </th>
                  <th scope="col">Produse</th>
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
                {sorted.map((order) => {
                  const selected = order.id === selectedId
                  return (
                    <tr
                      key={order.id}
                      className={selected ? 'row-selected' : undefined}
                    >
                      <td className="cell-nowrap">
                        {formatOrderDate(order.createdAt)}
                      </td>
                      <td>
                        <span className="cell-order-id">{order.id}</span>
                      </td>
                      <td>
                        <span className="cell-title">{order.customerName}</span>
                        <span className="cell-sku">{order.customerPhone}</span>
                      </td>
                      <td>{itemsCount(order)}</td>
                      <td className="cell-nowrap">
                        <strong>{formatRon(order.totalAmount)}</strong>
                      </td>
                      <td>
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td>
                        {order.awbNumber ? (
                          <span className="cell-sku">{order.awbNumber}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn primary btn--sm"
                          onClick={() => onSelect(order.id)}
                        >
                          Editează
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="card-list">
            {sorted.map((order) => {
              const selected = order.id === selectedId
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    className={`product-card order-card${
                      selected ? ' product-card--selected' : ''
                    }`}
                    onClick={() => onSelect(order.id)}
                  >
                    <div className="product-card__body">
                      <div className="order-card__top">
                        <strong>{order.id}</strong>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <span className="muted">
                        {formatOrderDate(order.createdAt)}
                      </span>
                      <span>
                        {order.customerName} · {order.customerPhone}
                      </span>
                      <span className="order-card__total">
                        {formatRon(order.totalAmount)} · {itemsCount(order)}{' '}
                        produse
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}
