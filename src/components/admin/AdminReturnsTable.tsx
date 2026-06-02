import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ReturnRequest, ReturnStatus } from '../../lib/returnsApi'

const STATUS_LABEL: Record<ReturnStatus, string> = {
  nou: 'Nou',
  aprobat: 'Aprobat',
  respins: 'Respins',
  finalizat: 'Finalizat',
}

const STATUS_ORDER: Record<ReturnStatus, number> = {
  nou: 0,
  aprobat: 1,
  respins: 2,
  finalizat: 3,
}

function formatReturnDate(value: string): string {
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

function formatReturnItems(items: unknown): string {
  if (typeof items === 'string') return items
  if (Array.isArray(items)) return items.map((i) => String(i)).join(', ')
  if (items && typeof items === 'object') return JSON.stringify(items)
  return ''
}

function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <span className={`return-badge return-badge--${status}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

type SortKey = 'date' | 'order' | 'customer' | 'status' | 'reason'

type Props = {
  returns: ReturnRequest[]
  onStatusChange: (id: number, status: ReturnStatus) => void
  onDelete: (id: number) => void
}

function sortReturns(list: ReturnRequest[], key: SortKey, dir: 1 | -1): ReturnRequest[] {
  const mul = dir
  return [...list].sort((a, b) => {
    let va: number | string = ''
    let vb: number | string = ''
    switch (key) {
      case 'order':
        va = a.orderId.toLowerCase()
        vb = b.orderId.toLowerCase()
        break
      case 'customer':
        va = a.customerName.toLowerCase()
        vb = b.customerName.toLowerCase()
        break
      case 'status':
        va = STATUS_ORDER[a.status]
        vb = STATUS_ORDER[b.status]
        break
      case 'reason':
        va = a.reason.toLowerCase()
        vb = b.reason.toLowerCase()
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

export function AdminReturnsTable({
  returns,
  onStatusChange,
  onDelete,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return returns
    return returns.filter((r) => {
      const itemsText = formatReturnItems(r.items).toLowerCase()
      const haystack = `${r.id} ${r.orderId} ${r.customerName} ${r.customerEmail} ${
        r.customerPhone ?? ''
      } ${r.reason} ${r.iban ?? ''} ${r.adminNotes ?? ''} ${itemsText}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [returns, search])

  const sorted = useMemo(
    () => sortReturns(filtered, sortKey, sortDir),
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

  if (returns.length === 0) {
    return (
      <div className="empty-state">
        <p>Nu există cereri pentru acest filtru.</p>
      </div>
    )
  }

  return (
    <>
      <div className="table-toolbar">
        <label className="table-toolbar__label" htmlFor="admin-return-search">
          Caută cerere
        </label>
        <input
          id="admin-return-search"
          type="search"
          className="table-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Comandă, client, email, motiv, produse…"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="table-toolbar__count muted">
          {filtered.length} din {returns.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state empty-state--filter">
          <p>
            <strong>Nicio cerere</strong> nu corespunde căutării „{search.trim()}”.
          </p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table data-table--returns">
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
                  <th scope="col">
                    <SortButton
                      label="Comandă"
                      active={sortKey === 'order'}
                      dir={sortDir}
                      onClick={() => toggleSort('order')}
                    />
                  </th>
                  <th scope="col">
                    <SortButton
                      label="Client"
                      active={sortKey === 'customer'}
                      dir={sortDir}
                      onClick={() => toggleSort('customer')}
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
                  <th scope="col">Produse</th>
                  <th scope="col">
                    <SortButton
                      label="Motiv"
                      active={sortKey === 'reason'}
                      dir={sortDir}
                      onClick={() => toggleSort('reason')}
                    />
                  </th>
                  <th scope="col" className="th-actions">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => {
                  const itemsText = formatReturnItems(item.items)
                  return (
                    <tr key={item.id}>
                      <td className="cell-nowrap">{formatReturnDate(item.createdAt)}</td>
                      <td>
                        <Link className="cell-order-id" to="/admin/comenzi">
                          {item.orderId}
                        </Link>
                      </td>
                      <td className="return-table__cell-customer">
                        <span className="cell-title">{item.customerName}</span>
                        <span className="cell-sku">{item.customerEmail}</span>
                        {item.customerPhone ? (
                          <span className="cell-sku">{item.customerPhone}</span>
                        ) : null}
                      </td>
                      <td>
                        <ReturnStatusBadge status={item.status} />
                      </td>
                      <td>
                        {itemsText ? (
                          <span className="return-table__preview" title={itemsText}>
                            {itemsText}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="return-table__preview" title={item.reason}>
                          {item.reason}
                        </span>
                      </td>
                      <td>
                        <div className="admin-reviews__row-actions">
                          <button
                            type="button"
                            className="btn primary btn--sm"
                            onClick={() => onStatusChange(item.id, 'aprobat')}
                          >
                            Aprobă
                          </button>
                          <button
                            type="button"
                            className="btn secondary btn--sm"
                            onClick={() => onStatusChange(item.id, 'respins')}
                          >
                            Respinge
                          </button>
                          <button
                            type="button"
                            className="btn secondary btn--sm"
                            onClick={() => onStatusChange(item.id, 'finalizat')}
                          >
                            Finalizat
                          </button>
                          <button
                            type="button"
                            className="btn danger btn--sm"
                            onClick={() => onDelete(item.id)}
                          >
                            Șterge
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="card-list">
            {sorted.map((item) => {
              const itemsText = formatReturnItems(item.items)
              return (
                <li key={item.id}>
                  <article className="return-card">
                    <div className="return-card__top">
                      <div>
                        <strong>
                          Comandă{' '}
                          <Link className="cell-order-id" to="/admin/comenzi">
                            {item.orderId}
                          </Link>
                        </strong>
                        <div className="muted">{formatReturnDate(item.createdAt)}</div>
                      </div>
                      <ReturnStatusBadge status={item.status} />
                    </div>
                    <span className="cell-title">{item.customerName}</span>
                    <span className="cell-sku">{item.customerEmail}</span>
                    {item.customerPhone ? (
                      <span className="cell-sku">{item.customerPhone}</span>
                    ) : null}
                    {itemsText ? (
                      <p className="cell-desc">
                        <strong>Produse:</strong> {itemsText}
                      </p>
                    ) : null}
                    <p className="cell-desc">
                      <strong>Motiv:</strong> {item.reason}
                    </p>
                    {item.iban ? (
                      <p className="cell-sku">
                        <strong>IBAN:</strong> {item.iban}
                      </p>
                    ) : null}
                    {item.adminNotes?.trim() ? (
                      <p className="cell-sku">
                        <strong>Notițe:</strong> {item.adminNotes}
                      </p>
                    ) : null}
                    <div className="admin-reviews__row-actions">
                      <button
                        type="button"
                        className="btn primary btn--sm"
                        onClick={() => onStatusChange(item.id, 'aprobat')}
                      >
                        Aprobă
                      </button>
                      <button
                        type="button"
                        className="btn secondary btn--sm"
                        onClick={() => onStatusChange(item.id, 'respins')}
                      >
                        Respinge
                      </button>
                      <button
                        type="button"
                        className="btn secondary btn--sm"
                        onClick={() => onStatusChange(item.id, 'finalizat')}
                      >
                        Finalizat
                      </button>
                      <button
                        type="button"
                        className="btn danger btn--sm"
                        onClick={() => onDelete(item.id)}
                      >
                        Șterge
                      </button>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}
