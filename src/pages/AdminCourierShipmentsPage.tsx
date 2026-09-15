import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'
import {
  SHIPMENT_STATUS_LABEL,
  backfillShipments,
  carrierLabel,
  fetchShipments,
  isCouriersApiEnabled,
  syncShipments,
  type Shipment,
  type ShipmentsResponse,
} from '../lib/couriersApi'
import { formatRon } from '../lib/shopCatalog'
import './AdminCourierShipmentsPage.css'
import { CourierNav } from '../components/admin/couriers/CourierNav'

type CarrierFilter = 'all' | 'dpd' | 'fan-courier'
type StatusFilter = 'all' | 'active' | 'livrat' | 'returned' | 'anulat'

const DAYS_OPTIONS = [
  { value: 20, label: '20 zile' },
  { value: 30, label: '30 zile' },
  { value: 90, label: '90 zile' },
  { value: 365, label: '1 an' },
  { value: 0, label: 'Tot' },
]

function fmtDate(value: string | null | undefined, withTime = true): string {
  if (!value) return '—'
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : { year: '2-digit' }),
  })
}

function statusTone(s: Shipment['status']): string {
  if (s === 'livrat') return 'ok'
  if (s === 'retur' || s === 'refuzat') return 'bad'
  if (s === 'anulat') return 'neutral'
  if (s === 'in_livrare' || s === 'in_tranzit' || s === 'ridicat') return 'info'
  return 'neutral'
}

export function AdminCourierShipmentsPage() {
  const [data, setData] = useState<ShipmentsResponse | null>(null)
  const [loading, setLoading] = useState(isCouriersApiEnabled())
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [carrier, setCarrier] = useState<CarrierFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [days, setDays] = useState(90)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<'sync' | 'backfill' | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  const [reloadTick, setReloadTick] = useState(0)
  const load = useCallback(() => setReloadTick((t) => t + 1), [])

  useEffect(() => {
    if (!isCouriersApiEnabled()) return
    let cancelled = false
    fetchShipments({ carrier: carrier === 'all' ? '' : carrier, status, days })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Nu am putut încărca expedierile.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [carrier, status, days, reloadTick])

  async function runSync(kind: 'sync' | 'backfill') {
    if (busy) return
    setBusy(kind)
    setError(null)
    setNotice(null)
    try {
      // Rulează în buclă (câte un lot) până când nu mai rămâne nimic de sincronizat
      // sau până când un lot nu mai avansează (ex. curier neconfigurat).
      let imported = 0
      let synced = 0
      let errors = 0
      let pending = 0
      let lastPending = Number.POSITIVE_INFINITY
      for (let i = 0; i < 40; i++) {
        const r = i === 0 && kind === 'backfill' ? await backfillShipments() : await syncShipments(true)
        imported += r.backfill.inserted
        synced += r.sync.synced
        errors += r.sync.errors
        pending = r.sync.pending
        setNotice(`Se sincronizează… ${synced} actualizate, ${pending} rămase`)
        if (pending === 0 || r.sync.synced === 0 || pending >= lastPending) break
        lastPending = pending
      }
      const parts: string[] = []
      if (imported > 0) parts.push(`${imported} AWB-uri importate`)
      parts.push(`${synced} actualizate${errors ? `, ${errors} erori` : ''}`)
      if (pending > 0) parts.push(`${pending} rămase (curier neconfigurat sau tracking indisponibil)`)
      setNotice(parts.join(' · '))
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sincronizarea a eșuat.')
    } finally {
      setBusy(null)
    }
  }

  const visible = useMemo(() => {
    const list = data?.shipments ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((s) =>
      `${s.awb} ${s.orderId} ${s.city} ${s.county} ${s.lastEvent}`.toLowerCase().includes(q),
    )
  }, [data, query])

  const sync = data?.sync

  return (
    <AdminLayout
      title="Expedieri"
      lead="Toate AWB-urile cu evenimentele din tracking: ridicare, livrare, la timp, retururi, cost."
      parent={{ to: '/admin/curieri', label: 'Curieri' }}
      actions={
        <>
          <button type="button" className="btn secondary" disabled={busy !== null} onClick={() => void runSync('backfill')}>
            {busy === 'backfill' ? 'Se importă…' : 'Importă istoricul'}
          </button>
          <button type="button" className="btn primary" disabled={busy !== null} onClick={() => void runSync('sync')}>
            {busy === 'sync' ? 'Se sincronizează…' : 'Sincronizează acum'}
          </button>
        </>
      }
    >
      {!isCouriersApiEnabled() ? (
        <section className="panel panel--form">
          <p className="muted">Disponibil când aplicația folosește API-ul de pe server.</p>
        </section>
      ) : (
        <div className="cp">
          <CourierNav active="expedieri" />
          {error ? <p className="app-status app-status--error" role="alert">{error}</p> : null}
          {notice ? <p className="app-status app-status--ok" role="status">{notice}</p> : null}

          {sync ? (
            <section className="cp-sync">
              <span>
                Ultima sincronizare: <strong>{sync.lastSyncAt ? fmtDate(sync.lastSyncAt) : 'niciodată'}</strong>
                {' · '}automat la {sync.intervalMin} min când admin-ul e deschis
              </span>
              <span className="cp-sync__meta">
                {sync.total} expedieri · {sync.pending} de sincronizat
                {sync.missingFromOrders > 0 ? ` · ${sync.missingFromOrders} AWB-uri neimportate` : ''}
                {!sync.fanConfigured ? ' · Fan neconfigurat' : ''}
                {!sync.dpdConfigured ? ' · DPD neconfigurat' : ''}
              </span>
            </section>
          ) : null}

          <section className="panel panel--list cp-list">
            <div className="ao-filters">
              <div className="ao-filter">
                <span className="ao-filter__label">Perioadă</span>
                <div className="ao-filter__body">
                  <div className="ao-seg" role="group">
                    {DAYS_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        className={`ao-seg__btn${days === o.value ? ' ao-seg__btn--active' : ''}`}
                        onClick={() => setDays(o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <span className="ao-filter__summary">după data AWB-ului</span>
                </div>
              </div>
              <div className="ao-filter">
                <span className="ao-filter__label">Curier</span>
                <div className="ao-filter__body">
                  <div className="ao-seg" role="group">
                    {(['all', 'fan-courier', 'dpd'] as CarrierFilter[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`ao-seg__btn${carrier === c ? ' ao-seg__btn--active' : ''}`}
                        onClick={() => setCarrier(c)}
                      >
                        {c === 'all' ? 'Toți' : carrierLabel(c)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="ao-filter">
                <span className="ao-filter__label">Stare</span>
                <div className="ao-filter__body">
                  <div className="ao-seg" role="group">
                    {(
                      [
                        ['all', 'Toate'],
                        ['active', 'Pe drum'],
                        ['livrat', 'Livrate'],
                        ['returned', 'Refuzate + returnate'],
                        ['anulat', 'Anulate'],
                      ] as Array<[StatusFilter, string]>
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={`ao-seg__btn${status === id ? ' ao-seg__btn--active' : ''}${id === 'returned' ? ' ao-seg__btn--danger' : ''}`}
                        onClick={() => setStatus(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="cp-search">
                    <span className="sr-only">Caută</span>
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="AWB, comandă, localitate…"
                    />
                  </label>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="cp-empty">Se încarcă…</p>
            ) : visible.length === 0 ? (
              <p className="cp-empty">
                Nicio expediere.{' '}
                {sync && sync.total === 0 ? 'Apasă „Importă istoricul” ca să aduci AWB-urile din comenzi.' : ''}
              </p>
            ) : (
              <div className="cp-scroll">
                <table className="data-table cp-table">
                  <thead>
                    <tr>
                      <th scope="col">AWB</th>
                      <th scope="col">Comandă</th>
                      <th scope="col">Destinație</th>
                      <th scope="col">Emis</th>
                      <th scope="col">Ridicat</th>
                      <th scope="col">Livrat</th>
                      <th scope="col" className="cp-num">Zile lucr.</th>
                      <th scope="col">La timp</th>
                      <th scope="col">Stare</th>
                      <th scope="col" className="cp-num">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((s) => {
                      const open = openId === s.id
                      return (
                        <Fragment key={s.id}>
                          <tr className={`cp-row${s.syncError ? ' cp-row--err' : ''}`}>
                            <td>
                              <button type="button" className="cp-awb" onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open}>
                                <span className={`cp-carrier cp-carrier--${s.carrier}`}>{carrierLabel(s.carrier)}</span>
                                <code>{s.awb}</code>
                                {s.kind === 'return' ? <span className="cp-tag">retur</span> : null}
                              </button>
                            </td>
                            <td>
                              <Link to={`/admin/comenzi?carrier=all&tab=all&q=${encodeURIComponent(s.orderId)}`} className="cell-order-id">
                                {s.orderId}
                              </Link>
                            </td>
                            <td>
                              <span className="cp-main">{s.city || '—'}</span>
                              <span className="cp-sub">{s.county}</span>
                            </td>
                            <td className="cp-nowrap">{fmtDate(s.awbAt)}</td>
                            <td className="cp-nowrap">
                              {fmtDate(s.pickedUpAt)}
                              {s.pickedUpAt && s.pickupEstimated ? <span className="cp-sub">estimat</span> : null}
                              {s.pickedOnTime === false ? <span className="cp-sub cp-sub--warn">peste 36h</span> : null}
                            </td>
                            <td className="cp-nowrap">{fmtDate(s.deliveredAt)}</td>
                            <td className="cp-num">
                              {s.workingDays === null ? '—' : s.workingDays}
                              {s.promisedDays !== null ? <span className="cp-sub">termen {s.promisedDays}</span> : null}
                            </td>
                            <td>
                              {s.onTime === null ? (
                                <span className="muted">—</span>
                              ) : s.onTime ? (
                                <span className="cp-pill cp-pill--ok">da</span>
                              ) : (
                                <span className="cp-pill cp-pill--bad">{s.customerDelay ? 'nu · client' : 'nu · curier'}</span>
                              )}
                            </td>
                            <td>
                              <span className={`cp-pill cp-pill--${statusTone(s.status)}`}>{SHIPMENT_STATUS_LABEL[s.status] ?? s.status}</span>
                              {s.customerDelay && s.status !== 'livrat' ? <span className="cp-sub">vina clientului</span> : null}
                              {s.syncError ? <span className="cp-sub cp-sub--warn" title={s.syncError}>eroare tracking</span> : null}
                            </td>
                            <td className="cp-num">
                              {s.cost === null ? '—' : formatRon(s.cost)}
                              {s.costSource ? <span className="cp-sub">{s.costSource === 'estimate' || s.costSource === 'contract' ? 'estimat' : 'real'}</span> : null}
                            </td>
                          </tr>
                          {open ? (
                            <tr key={`${s.id}-ev`} className="cp-events-row">
                              <td colSpan={10}>
                                {s.events.length === 0 ? (
                                  <p className="muted small">
                                    Fără evenimente încă{s.syncError ? `: ${s.syncError}` : '. Apasă „Sincronizează acum”.'}
                                  </p>
                                ) : (
                                  <ul className="cp-events">
                                    {s.events.map((e, i) => (
                                      <li key={i} className={`cp-event cp-event--${e.type}${e.customer ? ' cp-event--customer' : ''}`}>
                                        <span className="cp-event__at">{fmtDate(e.at)}</span>
                                        <span className="cp-event__type">{e.type}</span>
                                        <span className="cp-event__desc">{e.description}</span>
                                        {e.place ? <span className="cp-event__place">{e.place}</span> : null}
                                        {e.customer ? <span className="cp-tag cp-tag--warn">client</span> : null}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </AdminLayout>
  )
}
