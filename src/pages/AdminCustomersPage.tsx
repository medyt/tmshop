import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'
import {
  downloadCustomersCsv,
  fetchCustomer,
  fetchCustomers,
  isCustomersApiEnabled,
  updateCustomerMeta,
  type Customer,
  type CustomerDetail,
} from '../lib/customersApi'
import { orderStatusLabel } from '../lib/ordersApi'
import { formatRon } from '../lib/shopCatalog'
import type { OrderStatus } from '../types/order'
import './AdminCustomersPage.css'

type CustomerFilter = 'all' | 'account' | 'noAccount' | 'recurring' | 'company' | 'blacklist'
type CustomerSort = 'last' | 'total' | 'orders' | 'name' | 'first'

const FILTERS: Array<{ id: CustomerFilter; label: string }> = [
  { id: 'all', label: 'Toți' },
  { id: 'recurring', label: 'Recurenți' },
  { id: 'account', label: 'Cu cont' },
  { id: 'noAccount', label: 'Fără cont' },
  { id: 'company', label: 'Firme' },
  { id: 'blacklist', label: 'Blacklist' },
]

const SORTS: Array<{ id: CustomerSort; label: string }> = [
  { id: 'last', label: 'Ultima comandă' },
  { id: 'total', label: 'Total cheltuit' },
  { id: 'orders', label: 'Număr comenzi' },
  { id: 'first', label: 'Client din' },
  { id: 'name', label: 'Nume' },
]

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(value: string, withTime = false): string {
  if (!value) return '—'
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

function statusLabel(status: string): string {
  return orderStatusLabel(status as OrderStatus)
}

function matchesFilter(c: Customer, filter: CustomerFilter): boolean {
  switch (filter) {
    case 'account':
      return c.hasAccount
    case 'noAccount':
      return !c.hasAccount
    case 'recurring':
      return c.countableOrders >= 2
    case 'company':
      return c.billingType === 'company'
    case 'blacklist':
      return c.blacklisted
    default:
      return true
  }
}

function sortCustomers(list: Customer[], sort: CustomerSort): Customer[] {
  const copy = [...list]
  switch (sort) {
    case 'total':
      return copy.sort((a, b) => b.totalSpent - a.totalSpent)
    case 'orders':
      return copy.sort((a, b) => b.countableOrders - a.countableOrders || b.ordersCount - a.ordersCount)
    case 'first':
      return copy.sort((a, b) => b.firstOrderAt.localeCompare(a.firstOrderAt))
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'ro'))
    default:
      return copy.sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt))
  }
}

function CustomerDrawer({
  customerKey,
  metaAvailable,
  onClose,
  onMetaSaved,
}: {
  customerKey: string
  metaAvailable: boolean
  onClose: () => void
  onMetaSaved: (key: string, meta: { notes: string; tags: string; blacklisted: boolean }) => void
}) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [blacklisted, setBlacklisted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchCustomer(customerKey)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        setNotes(d.notes)
        setTags(d.tags)
        setBlacklisted(d.blacklisted)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Nu am putut încărca clientul.')
      })
    return () => {
      cancelled = true
    }
  }, [customerKey])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const dirty =
    detail !== null &&
    (notes !== detail.notes || tags !== detail.tags || blacklisted !== detail.blacklisted)

  async function save() {
    if (!detail || saving) return
    setSaving(true)
    setError(null)
    try {
      await updateCustomerMeta({ key: detail.key, notes, tags, blacklisted })
      setDetail({ ...detail, notes, tags, blacklisted })
      onMetaSaved(detail.key, { notes, tags, blacklisted })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nu am putut salva.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ac-drawer-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside className="ac-drawer" role="dialog" aria-modal="true" aria-label="Detalii client">
        <header className="ac-drawer__head">
          <div className="ac-drawer__identity">
            <span className="ac-avatar ac-avatar--lg" aria-hidden="true">
              {initials(detail?.name ?? '?')}
            </span>
            <div>
              <h2 className="ac-drawer__title">{detail?.name ?? 'Se încarcă…'}</h2>
              {detail ? (
                <p className="ac-drawer__sub">
                  {detail.hasAccount ? (
                    <span className="ac-badge ac-badge--ok">Cont client</span>
                  ) : (
                    <span className="ac-badge">Fără cont</span>
                  )}
                  {detail.blacklisted ? <span className="ac-badge ac-badge--bad">Blacklist</span> : null}
                  {detail.billingType === 'company' ? <span className="ac-badge">Firmă</span> : null}
                  {detail.firstOrderAt ? <span className="muted"> · client din {formatDate(detail.firstOrderAt)}</span> : null}
                </p>
              ) : null}
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Închide">
            ✕
          </button>
        </header>

        {error ? <p className="app-status app-status--error" role="alert">{error}</p> : null}

        {detail ? (
          <div className="ac-drawer__body">
            <section className="ac-kpis">
              <div className="ac-kpi">
                <span>Comenzi valide</span>
                <strong>{detail.countableOrders}</strong>
                <small>{detail.ordersCount} total · {detail.cancelledOrders} anulate · {detail.returnedOrders} returnate</small>
              </div>
              <div className="ac-kpi ac-kpi--accent">
                <span>Total cheltuit</span>
                <strong>{formatRon(detail.totalSpent)}</strong>
                <small>
                  {detail.countableOrders > 0
                    ? `medie ${formatRon(detail.totalSpent / detail.countableOrders)} / comandă`
                    : '—'}
                </small>
              </div>
              <div className="ac-kpi">
                <span>Ultima comandă</span>
                <strong>{formatDate(detail.lastOrderAt)}</strong>
                <small>{detail.lastStatus ? statusLabel(detail.lastStatus) : '—'}</small>
              </div>
            </section>

            <section className="ac-section">
              <h3 className="ac-section__title">Contact și livrare</h3>
              <dl className="ac-dl">
                <div><dt>Prenume</dt><dd>{detail.firstName || '—'}</dd></div>
                <div><dt>Nume</dt><dd>{detail.lastName || '—'}</dd></div>
                <div><dt>Telefon</dt><dd>{detail.phone ? <a href={`tel:${detail.phone}`}>{detail.phone}</a> : '—'}</dd></div>
                <div><dt>Email</dt><dd>{detail.email ? <a href={`mailto:${detail.email}`}>{detail.email}</a> : '—'}</dd></div>
                <div><dt>Județ</dt><dd>{detail.countyName || detail.county || '—'}</dd></div>
                <div><dt>Localitate</dt><dd>{detail.city || '—'}</dd></div>
                <div><dt>Stradă</dt><dd>{[detail.street, detail.streetNumber ? `nr. ${detail.streetNumber}` : ''].filter(Boolean).join(' ') || '—'}</dd></div>
                <div><dt>Detalii</dt><dd>{detail.addressExtra || '—'}</dd></div>
                <div><dt>Cod poștal</dt><dd>{detail.postalCode || '—'}</dd></div>
                {detail.cities.length > 1 ? (
                  <div><dt>Alte localități</dt><dd>{detail.cities.join(', ')}</dd></div>
                ) : null}
                {detail.billingType === 'company' ? (
                  <>
                    <div><dt>Firmă</dt><dd>{detail.companyName || '—'}</dd></div>
                    <div><dt>CUI</dt><dd>{detail.companyCui || '—'}</dd></div>
                    <div><dt>Reg. Com.</dt><dd>{detail.companyRegCom || '—'}</dd></div>
                  </>
                ) : null}
                {detail.hasAccount ? (
                  <div><dt>Cont</dt><dd>{detail.accountEmail} · creat {formatDate(detail.accountCreatedAt)}</dd></div>
                ) : null}
              </dl>
            </section>

            <section className="ac-section">
              <h3 className="ac-section__title">Notițe interne</h3>
              {!metaAvailable ? (
                <p className="ac-note-warn">
                  Rulează migrarea <code>sql/migrate-customer-meta.sql</code> ca să poți salva notițe și blacklist.
                </p>
              ) : null}
              <label className="field">
                <span className="sr-only">Notițe</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex.: preferă livrare după ora 17, a cerut factură pe firmă…"
                  disabled={!metaAvailable}
                />
              </label>
              <div className="ac-meta-row">
                <label className="field ac-tags">
                  <span>Etichete</span>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="vip, reseller, problema livrare"
                    disabled={!metaAvailable}
                  />
                </label>
                <label className="ac-check">
                  <input
                    type="checkbox"
                    checked={blacklisted}
                    onChange={(e) => setBlacklisted(e.target.checked)}
                    disabled={!metaAvailable}
                  />
                  <span>Blacklist (refuzuri repetate / fraudă)</span>
                </label>
              </div>
              <div className="ac-meta-actions">
                <button
                  type="button"
                  className="btn primary"
                  disabled={!metaAvailable || !dirty || saving}
                  onClick={() => { void save() }}
                >
                  {saving ? 'Se salvează…' : 'Salvează'}
                </button>
                {saved ? <span className="ac-saved">Salvat.</span> : null}
              </div>
            </section>

            <section className="ac-section">
              <h3 className="ac-section__title">Istoric comenzi ({detail.orders.length})</h3>
              {detail.orders.length === 0 ? (
                <p className="muted">Nicio comandă.</p>
              ) : (
                <ul className="ac-orders">
                  {detail.orders.map((o) => (
                    <li key={o.id} className="ac-order">
                      <div className="ac-order__head">
                        <Link to={`/admin/comenzi?carrier=all&tab=all&q=${encodeURIComponent(o.id)}`} className="ac-order__id">
                          #{o.id}
                        </Link>
                        <span className="ac-order__date">{formatDate(o.createdAt, true)}</span>
                        <span className={`ac-status ac-status--${o.status}`}>{statusLabel(o.status)}</span>
                        <strong className="ac-order__total">{formatRon(o.totalAmount)}</strong>
                      </div>
                      <div className="ac-order__meta">
                        {o.paymentMethod === 'card' ? 'Card' : 'Ramburs'}
                        {o.paymentStatus === 'paid' ? ' · plătit' : ''}
                        {o.awbNumber ? ` · AWB ${o.awbNumber}` : ''}
                        {o.courierStatus ? ` · ${o.courierStatus}` : ''}
                      </div>
                      <ul className="ac-order__items">
                        {o.items.map((it, i) => (
                          <li key={`${it.productId}-${i}`}>
                            <span>{it.quantity}×</span> {it.productName}
                            {it.productSku ? <code>{it.productSku}</code> : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : !error ? (
          <p className="ac-drawer__loading muted">Se încarcă…</p>
        ) : null}
      </aside>
    </div>
  )
}

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [metaAvailable, setMetaAvailable] = useState(true)
  const [loading, setLoading] = useState(isCustomersApiEnabled())
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CustomerFilter>('all')
  const [sort, setSort] = useState<CustomerSort>('last')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!isCustomersApiEnabled()) return
    let cancelled = false
    fetchCustomers()
      .then((r) => {
        if (cancelled) return
        setCustomers(r.customers)
        setMetaAvailable(r.metaAvailable)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Nu am putut încărca clienții.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const c = { all: 0, account: 0, noAccount: 0, recurring: 0, company: 0, blacklist: 0 }
    for (const cust of customers) {
      c.all++
      if (cust.hasAccount) c.account++
      else c.noAccount++
      if (cust.countableOrders >= 2) c.recurring++
      if (cust.billingType === 'company') c.company++
      if (cust.blacklisted) c.blacklist++
    }
    return c
  }, [customers])

  const visible = useMemo(() => {
    const q = fold(query.trim())
    const filtered = customers.filter((c) => {
      if (!matchesFilter(c, filter)) return false
      if (!q) return true
      const hay = fold(
        `${c.name} ${c.phone} ${c.email} ${c.city} ${c.countyName} ${c.companyName} ${c.companyCui} ${c.tags} ${c.lastOrderId}`,
      )
      return hay.includes(q)
    })
    return sortCustomers(filtered, sort)
  }, [customers, filter, query, sort])

  const totalRevenue = useMemo(
    () => visible.reduce((sum, c) => sum + c.totalSpent, 0),
    [visible],
  )

  const handleMetaSaved = useCallback(
    (key: string, meta: { notes: string; tags: string; blacklisted: boolean }) => {
      setCustomers((prev) => prev.map((c) => (c.key === key ? { ...c, ...meta } : c)))
    },
    [],
  )
  const closeDrawer = useCallback(() => setSelectedKey(null), [])

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    setError(null)
    try {
      await downloadCustomersCsv()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nu am putut exporta.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminLayout
      title="Clienți"
      lead="Toți clienții derivați din comenzi, plus conturile create pe site. Click pe un client pentru istoric și notițe."
      actions={
        <button type="button" className="btn primary" disabled={exporting || loading} onClick={() => { void handleExport() }}>
          {exporting ? 'Se exportă…' : 'Export CSV (Excel)'}
        </button>
      }
    >
      {!isCustomersApiEnabled() ? (
        <section className="panel panel--form">
          <p className="muted">Lista clienților este disponibilă când aplicația folosește API-ul de pe server.</p>
        </section>
      ) : (
        <section className="panel panel--list ac" aria-label="Clienți">
          {error ? <p className="app-status app-status--error" role="alert">{error}</p> : null}

          <div className="ac-summary">
            <div className="ac-summary__item"><span>Clienți</span><strong>{counts.all}</strong></div>
            <div className="ac-summary__item"><span>Recurenți (≥2 comenzi)</span><strong>{counts.recurring}</strong></div>
            <div className="ac-summary__item"><span>Cu cont pe site</span><strong>{counts.account}</strong></div>
            <div className="ac-summary__item ac-summary__item--accent">
              <span>Venit clienții afișați</span><strong>{formatRon(totalRevenue)}</strong>
            </div>
          </div>

          <div className="ac-toolbar">
            <label className="ac-search">
              <span className="sr-only">Caută client</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="20" y1="20" x2="16.5" y2="16.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nume, telefon, email, localitate, firmă, etichetă…"
                autoComplete="off"
              />
            </label>
            <div className="ao-seg" role="tablist" aria-label="Filtru clienți">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  className={`ao-seg__btn${filter === f.id ? ' ao-seg__btn--active' : ''}${f.id === 'blacklist' ? ' ao-seg__btn--danger' : ''}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                  <span className="ao-seg__count">{counts[f.id]}</span>
                </button>
              ))}
            </div>
            <label className="ac-sort">
              <span className="sr-only">Sortează</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as CustomerSort)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <span className="ac-count muted">
              {visible.length === customers.length ? `${customers.length} clienți` : `${visible.length} din ${customers.length}`}
            </span>
          </div>

          {loading ? (
            <p className="ac-empty">Se încarcă clienții…</p>
          ) : visible.length === 0 ? (
            <p className="ac-empty">Niciun client pentru filtrul curent.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table ac-table">
                <thead>
                  <tr>
                    <th scope="col">Client</th>
                    <th scope="col">Localitate</th>
                    <th scope="col">Cont</th>
                    <th scope="col" className="ac-num">Comenzi</th>
                    <th scope="col" className="ac-num">Total</th>
                    <th scope="col">Ultima comandă</th>
                    <th scope="col" className="ac-actions-col"><span className="sr-only">Acțiuni</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr key={c.key} className={c.blacklisted ? 'ac-row--blacklist' : undefined}>
                      <td>
                        <button type="button" className="ac-client" onClick={() => setSelectedKey(c.key)}>
                          <span className="ac-avatar" aria-hidden="true">{initials(c.name)}</span>
                          <span className="ac-client__main">
                            <span className="ac-client__name">
                              {c.name}
                              {c.blacklisted ? <span className="ac-badge ac-badge--bad">Blacklist</span> : null}
                              {c.billingType === 'company' ? <span className="ac-badge">Firmă</span> : null}
                            </span>
                            <span className="ac-client__meta">
                              {c.phone || '—'}{c.email ? ` · ${c.email}` : ''}
                            </span>
                            {c.tags ? <span className="ac-client__tags">{c.tags}</span> : null}
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className="ac-cell-main">{c.city || '—'}</span>
                        <span className="ac-cell-sub">{c.countyName || c.county}</span>
                      </td>
                      <td>
                        {c.hasAccount ? (
                          <>
                            <span className="ac-badge ac-badge--ok">Da</span>
                            <span className="ac-cell-sub">{formatDate(c.accountCreatedAt)}</span>
                          </>
                        ) : (
                          <span className="ac-badge">Nu</span>
                        )}
                      </td>
                      <td className="ac-num">
                        <span className="ac-cell-main">{c.countableOrders}</span>
                        {c.cancelledOrders + c.returnedOrders > 0 ? (
                          <span className="ac-cell-sub ac-cell-sub--warn">
                            {c.cancelledOrders > 0 ? `${c.cancelledOrders} anulate` : ''}
                            {c.cancelledOrders > 0 && c.returnedOrders > 0 ? ' · ' : ''}
                            {c.returnedOrders > 0 ? `${c.returnedOrders} retur` : ''}
                          </span>
                        ) : null}
                      </td>
                      <td className="ac-num">
                        <span className="ac-cell-main">{formatRon(c.totalSpent)}</span>
                      </td>
                      <td>
                        <span className="ac-cell-main">{formatDate(c.lastOrderAt)}</span>
                        {c.lastStatus ? (
                          <span className={`ac-status ac-status--${c.lastStatus}`}>{statusLabel(c.lastStatus)}</span>
                        ) : (
                          <span className="ac-cell-sub">fără comenzi</span>
                        )}
                      </td>
                      <td className="ac-actions-col">
                        <button type="button" className="btn secondary btn--sm" onClick={() => setSelectedKey(c.key)}>
                          Detalii
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {selectedKey ? (
        <CustomerDrawer
          customerKey={selectedKey}
          metaAvailable={metaAvailable}
          onClose={closeDrawer}
          onMetaSaved={handleMetaSaved}
        />
      ) : null}
    </AdminLayout>
  )
}
