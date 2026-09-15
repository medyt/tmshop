import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'
import { CourierNav } from '../components/admin/couriers/CourierNav'
import { CountyTiles, Donut, HBar, Legend, SegmentBar, StackedColumns, type StackedDay } from '../components/admin/couriers/charts'
import { DateRangePicker } from '../components/admin/couriers/DateRangePicker'
import { toneForPct } from '../lib/countyTiles'
import { defaultRange, formatRange, parseIsoDate, rangeDays, toIsoDate, type DateRange } from '../lib/dateRange'
import {
  carrierColor,
  carrierLabel,
  fetchCourierDashboard,
  fmtPct,
  isCouriersApiEnabled,
  runCourierSyncLoop,
  type Agg,
  type CountyAgg,
  type DashboardResponse,
} from '../lib/couriersApi'
import { formatRon } from '../lib/shopCatalog'
import './AdminCourierPanels.css'

type MapMetric = 'otd' | 'in24h' | 'return'

type Filters = { range: DateRange; carrier: string; sla: number }

const initialFilters = (): Filters => ({ range: defaultRange(), carrier: 'all', sla: 0 })

const SLA_OPTIONS = [
  { value: 0, label: 'Termen curier' },
  { value: 1, label: '1 zi lucr.' },
  { value: 2, label: '2 zile lucr.' },
  { value: 3, label: '3 zile lucr.' },
]

const COLORS = {
  otd: '#16a34a',
  client: '#f59e0b',
  courier: '#dc2626',
  progress: '#93c5fd',
  unknown: '#d1d5db',
  returned: '#dc2626',
  refused: '#f97316',
}

function hours(v: number | null): string {
  return v === null ? '—' : `${v.toFixed(v % 1 === 0 ? 0 : 1)} h`
}

function num(v: number | null | undefined, suffix = '', digits = 1): string {
  return v === null || v === undefined ? '—' : `${v.toFixed(v % 1 === 0 ? 0 : digits)}${suffix}`
}

function metricOf(a: { otdPct: number | null; in24hPct: number | null; returnAllPct: number | null }, m: MapMetric): number | null {
  return m === 'otd' ? a.otdPct : m === 'in24h' ? a.in24hPct : a.returnAllPct
}

function CarrierCard({ carrier, a }: { carrier: string; a: Agg }) {
  const color = carrierColor(carrier)
  const bucketSegments = [
    { value: a.buckets[0], color: '#16a34a', label: '≤ 24 h' },
    { value: a.buckets[1], color: '#84cc16', label: '24–48 h' },
    { value: a.buckets[2], color: '#f59e0b', label: '48–72 h' },
    { value: a.buckets[3], color: '#dc2626', label: '> 72 h' },
  ]
  return (
    <article className="cd-carrier" style={{ borderTopColor: color }}>
      <header className="cd-carrier__head">
        <h3>{carrierLabel(carrier)}</h3>
        <span className="cd-carrier__meta">
          {a.n} AWB · {a.finalized} finalizate · {a.inProgress} pe drum
        </span>
      </header>
      <div className="cd-carrier__bars">
        <HBar
          label="Livrate în 24 h"
          value={a.in24hPct}
          color={color}
          sub={`${a.in24h} din ${a.deliveredKnown} livrate cu tracking · ${fmtPct(a.in24hOfFinalizedPct)} din finalizate · P50 ${hours(a.p50Hours)} · P90 ${hours(a.p90Hours)}`}
        />
        <HBar
          label="La timp (OTD)"
          value={a.otdPct}
          color={COLORS.otd}
          sub={`client ${fmtPct(a.lateClientPct)} · curier ${fmtPct(a.lateCourierPct)} · termen ≤ 1 zi lucr. ${fmtPct(a.nextDayPct)}`}
        />
        <HBar
          label="Rată retur (retur + refuzate)"
          value={a.returnAllPct}
          color={COLORS.returned}
          sub={`${a.returned} returnate (${fmtPct(a.returnPct)}) · ${a.refused} refuzate (${fmtPct(a.refusedPct)})`}
        />
      </div>
      <div className="cd-carrier__dist">
        <div className="cd-carrier__dist-head">
          <span>Timp de la ridicare la livrare</span>
          <span className="muted">
            {a.deliveredKnown} livrate · medie {num(a.avgWorkingDays, ' zl')} / {hours(a.avgHours)}
          </span>
        </div>
        <SegmentBar segments={bucketSegments} />
        <Legend items={bucketSegments.map((s) => ({ color: s.color, label: s.label, value: String(s.value) }))} />
      </div>
      <footer className="cd-carrier__foot">
        <span>
          Ridicat în 36 h: <strong>{fmtPct(a.pickedOnTimePct)}</strong>
        </span>
        <span>
          Cost mediu: <strong>{a.avgCost === null ? '—' : formatRon(a.avgCost)}</strong>
        </span>
        {a.deliveredUnknown > 0 ? <span className="cd-warn">{a.deliveredUnknown} livrate fără tracking</span> : null}
      </footer>
    </article>
  )
}

export function AdminCouriersPage() {
  const [applied, setApplied] = useState<Filters>(initialFilters)
  const [pending, setPending] = useState<Filters>(initialFilters)
  const sla = applied.sla
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(isCouriersApiEnabled())
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mapMetric, setMapMetric] = useState<MapMetric>('otd')
  const [county, setCounty] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    if (!isCouriersApiEnabled()) return
    let cancelled = false
    fetchCourierDashboard({ from: applied.range.from, to: applied.range.to, carrier: applied.carrier, sla: applied.sla })
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Nu am putut încărca panoul.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [applied, reloadTick])

  const dirty = pending.range.from !== applied.range.from || pending.range.to !== applied.range.to || pending.carrier !== applied.carrier || pending.sla !== applied.sla

  function applyFilters() {
    setApplied(pending)
  }

  function resetFilters() {
    const f = initialFilters()
    setPending(f)
    setApplied(f)
  }

  async function runSync() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await runCourierSyncLoop('sync', setNotice)
      setNotice(r.message)
      setReloadTick((t) => t + 1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sincronizarea a eșuat.')
    } finally {
      setBusy(false)
    }
  }

  const total = data?.total
  const carriers = useMemo(() => Object.entries(data?.carriers ?? {}).sort((a, b) => b[1].n - a[1].n), [data])
  const countyMap = useMemo(() => {
    const m: Record<string, CountyAgg> = {}
    for (const c of data?.counties ?? []) m[c.code] = c
    return m
  }, [data])
  const tileValues = useMemo(() => {
    const v: Record<string, { value: number | null; n: number }> = {}
    for (const c of data?.counties ?? []) v[c.code] = { value: metricOf(c, mapMetric), n: c.n }
    return v
  }, [data, mapMetric])
  const selectedCounty = county && countyMap[county] ? countyMap[county] : (data?.counties[0] ?? null)

  const dayColumns: StackedDay[] = useMemo(() => {
    const src = data?.days ?? []
    // Peste ~10 săptămâni, coloanele se grupează pe săptămâni (luni–duminică) ca să rămână lizibile.
    const weekly = rangeDays(applied.range) > 70
    const groups = new Map<string, { label: string; title: string; otd: number; lateClient: number; lateCourier: number; inProgress: number; unknown: number }>()
    for (const d of src) {
      let key = d.date
      let label = d.date.slice(8, 10) + '.' + d.date.slice(5, 7)
      let title = d.date
      if (weekly) {
        const dt = parseIsoDate(d.date)
        dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7))
        key = toIsoDate(dt)
        label = key.slice(8, 10) + '.' + key.slice(5, 7)
        title = `săptămâna din ${label}`
      }
      const g = groups.get(key) ?? { label, title, otd: 0, lateClient: 0, lateCourier: 0, inProgress: 0, unknown: 0 }
      g.otd += d.otd
      g.lateClient += d.lateClient
      g.lateCourier += d.lateCourier
      g.inProgress += d.inProgress
      g.unknown += d.unknown
      groups.set(key, g)
    }
    return [...groups.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([, g]) => ({
        label: g.label,
        title: g.title,
        parts: [
          { value: g.otd, color: COLORS.otd, label: 'la timp' },
          { value: g.lateClient, color: COLORS.client, label: 'întârziere client' },
          { value: g.lateCourier, color: COLORS.courier, label: 'întârziere curier / retur' },
          { value: g.inProgress, color: COLORS.progress, label: 'pe drum' },
          { value: g.unknown, color: COLORS.unknown, label: 'fără tracking' },
        ],
      }))
  }, [data, applied.range])

  const returnRows = useMemo(() => {
    const rows = carriers.map(([c, a]) => ({ key: c, label: carrierLabel(c), a }))
    if (total) rows.push({ key: 'total', label: 'Total', a: total })
    return rows
  }, [carriers, total])

  return (
    <AdminLayout
      title="Panou curierat"
      lead="Performanța reală a curierilor din tracking: livrare în 24 h, la timp pe județe, retururi și refuzuri. Model Innoship."
      actions={
        <>
          <Link to="/admin/curieri/expedieri" className="btn secondary">
            Expedieri
          </Link>
          <button type="button" className="btn primary" disabled={busy} onClick={() => void runSync()}>
            {busy ? 'Se sincronizează…' : 'Sincronizează acum'}
          </button>
        </>
      }
    >
      {!isCouriersApiEnabled() ? (
        <section className="panel panel--form">
          <p className="muted">Disponibil când aplicația folosește API-ul de pe server.</p>
        </section>
      ) : (
        <div className="cd">
          <CourierNav active="panou" />
          {error ? <p className="app-status app-status--error" role="alert">{error}</p> : null}
          {notice ? <p className="app-status app-status--ok" role="status">{notice}</p> : null}

          <section className="cd-filters cd-filters--bar">
            <label className="cd-filter">
              <span className="cd-filter__label">SLA</span>
              <select value={pending.sla} onChange={(e) => setPending((p) => ({ ...p, sla: Number(e.target.value) }))}>
                {SLA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="cd-filter">
              <span className="cd-filter__label">Perioadă (data AWB)</span>
              <DateRangePicker value={pending.range} onChange={(range) => setPending((p) => ({ ...p, range }))} />
            </div>
            <label className="cd-filter">
              <span className="cd-filter__label">Curier</span>
              <select value={pending.carrier} onChange={(e) => setPending((p) => ({ ...p, carrier: e.target.value }))}>
                <option value="all">Toți curierii</option>
                <option value="fan-courier">Fan Courier</option>
                <option value="dpd">DPD</option>
              </select>
            </label>
            <div className="cd-filter cd-filter--actions">
              <button type="button" className={`btn ${dirty ? 'primary' : 'secondary'}`} onClick={applyFilters} disabled={!dirty}>
                Aplică
              </button>
              <button type="button" className="btn secondary" onClick={resetFilters}>
                Șterge filtre
              </button>
            </div>
            <span className="cd-filters__summary">
              {formatRange(applied.range)} · {rangeDays(applied.range)} zile · {applied.carrier === 'all' ? 'toți curierii' : carrierLabel(applied.carrier)} · termen{' '}
              {applied.sla === 0 ? 'al curierului' : `${applied.sla} zile lucr.`}
            </span>
          </section>

          {loading || !total ? (
            <p className="cd-empty">{loading ? 'Se încarcă…' : 'Nicio expediere în perioada aleasă.'}</p>
          ) : (
            <>
              {total.deliveredUnknown > 0 || total.retUnknown > 0 ? (
                <p className="cd-note">
                  {total.deliveredUnknown > 0 ? `${total.deliveredUnknown} AWB-uri livrate` : ''}
                  {total.deliveredUnknown > 0 && total.retUnknown > 0 ? ' și ' : ''}
                  {total.retUnknown > 0 ? `${total.retUnknown} returnate` : ''} nu au încă evenimente din tracking și nu intră în procente. Apasă „Sincronizează acum” (rulează
                  până la zero).
                </p>
              ) : null}

              <section className="cd-kpis">
                <article className="cd-kpi cd-kpi--hero">
                  <span className="cd-kpi__label">Livrate în 24 h de la ridicare</span>
                  <strong className="cd-kpi__value">{fmtPct(total.in24hPct)}</strong>
                  <span className="cd-kpi__sub">
                    {total.in24h} din {total.deliveredKnown} livrate cu tracking · {fmtPct(total.in24hOfFinalizedPct)} din toate finalizate
                  </span>
                  <span className="cd-kpi__sub">
                    în 48 h: {fmtPct(total.in48hPct)} · P50 {hours(total.p50Hours)} · P90 {hours(total.p90Hours)}
                  </span>
                </article>
                <article className="cd-kpi cd-kpi--donut">
                  <span className="cd-kpi__label">Livrare la timp (OTD)</span>
                  <div className="cd-kpi__donut">
                    <Donut
                      size={128}
                      thickness={16}
                      segments={[
                        { value: total.otd, color: COLORS.otd, label: 'La timp' },
                        { value: total.lateClient, color: COLORS.client, label: 'Întârziere client' },
                        { value: total.lateCourier, color: COLORS.courier, label: 'Întârziere curier' },
                      ]}
                      center={
                        <>
                          <strong>{fmtPct(total.otdPct, 0)}</strong>
                          <small>OTD</small>
                        </>
                      }
                    />
                    <Legend
                      items={[
                        { color: COLORS.otd, label: 'La timp', value: `${fmtPct(total.otdPct)} · ${total.otd}` },
                        { color: COLORS.client, label: 'Client', value: `${fmtPct(total.lateClientPct)} · ${total.lateClient}` },
                        { color: COLORS.courier, label: 'Curier', value: `${fmtPct(total.lateCourierPct)} · ${total.lateCourier}` },
                      ]}
                    />
                  </div>
                  <span className="cd-kpi__sub">{total.otdBase} finalizate cu tracking · termen: {sla === 0 ? 'al curierului' : `${sla} zile lucr.`}</span>
                </article>
                <article className="cd-kpi">
                  <span className="cd-kpi__label">Rată retur (retur + refuzate)</span>
                  <strong className="cd-kpi__value cd-kpi__value--bad">{fmtPct(total.returnAllPct)}</strong>
                  <span className="cd-kpi__sub">
                    returnate {fmtPct(total.returnPct)} ({total.returned}) · refuzate {fmtPct(total.refusedPct)} ({total.refused})
                  </span>
                  <span className="cd-kpi__sub">din {total.n} AWB · vina clientului {total.retClient} · curier {total.retCourier}</span>
                </article>
                <article className="cd-kpi">
                  <span className="cd-kpi__label">Tranzit mediu</span>
                  <strong className="cd-kpi__value">{num(total.avgWorkingDays, ' zl')}</strong>
                  <span className="cd-kpi__sub">
                    {hours(total.avgHours)} calendaristic · ridicat în 36 h {fmtPct(total.pickedOnTimePct)}
                  </span>
                  <span className="cd-kpi__sub">
                    cost mediu {total.avgCost === null ? '—' : formatRon(total.avgCost)} · {total.inProgress} pe drum
                  </span>
                </article>
              </section>

              <section className="cd-section">
                <header className="cd-section__head">
                  <h2>Performanță per curier</h2>
                  <span className="muted">Livrare în 24 h, la timp și retururi pe fiecare curier, cu distribuția timpului de livrare.</span>
                </header>
                <div className="cd-carriers">
                  {carriers.map(([c, a]) => (
                    <CarrierCard key={c} carrier={c} a={a} />
                  ))}
                </div>
              </section>

              <section className="cd-section">
                <header className="cd-section__head">
                  <h2>Livrare pe județe</h2>
                  <div className="ao-seg" role="group">
                    {(
                      [
                        ['otd', 'La timp'],
                        ['in24h', 'În 24 h'],
                        ['return', 'Retur'],
                      ] as Array<[MapMetric, string]>
                    ).map(([id, label]) => (
                      <button key={id} type="button" className={`ao-seg__btn${mapMetric === id ? ' ao-seg__btn--active' : ''}`} onClick={() => setMapMetric(id)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </header>
                <div className="cd-map">
                  <div className="cd-map__tiles">
                    <CountyTiles values={tileValues} names={data?.countyNames ?? {}} selected={selectedCounty?.code ?? null} onSelect={setCounty} invert={mapMetric === 'return'} />
                    <Legend
                      items={
                        mapMetric === 'return'
                          ? [
                              { color: '#16a34a', label: '≤ 20 % retur' },
                              { color: '#f59e0b', label: '20–35 %' },
                              { color: '#dc2626', label: '> 35 %' },
                              { color: '#e5e7eb', label: 'fără date' },
                            ]
                          : [
                              { color: '#16a34a', label: '≥ 80 %' },
                              { color: '#f59e0b', label: '65–80 %' },
                              { color: '#dc2626', label: '< 65 %' },
                              { color: '#e5e7eb', label: 'fără date' },
                            ]
                      }
                    />
                    {data && data.unmappedCounty > 0 ? <p className="muted small">{data.unmappedCounty} AWB-uri fără județ recunoscut.</p> : null}
                  </div>
                  <aside className="cd-map__detail">
                    {selectedCounty ? (
                      <>
                        <h3>{selectedCounty.name}</h3>
                        <dl className="cd-dl">
                          <div>
                            <dt>AWB</dt>
                            <dd>{selectedCounty.n}</dd>
                          </div>
                          <div>
                            <dt>La timp</dt>
                            <dd className={`cd-tone--${toneForPct(selectedCounty.otdPct)}`}>{fmtPct(selectedCounty.otdPct)}</dd>
                          </div>
                          <div>
                            <dt>În 24 h</dt>
                            <dd className={`cd-tone--${toneForPct(selectedCounty.in24hPct)}`}>{fmtPct(selectedCounty.in24hPct)}</dd>
                          </div>
                          <div>
                            <dt>Retur</dt>
                            <dd className={`cd-tone--${toneForPct(selectedCounty.returnAllPct, true)}`}>{fmtPct(selectedCounty.returnAllPct)}</dd>
                          </div>
                          <div>
                            <dt>Tranzit</dt>
                            <dd>{num(selectedCounty.avgWorkingDays, ' zl')}</dd>
                          </div>
                        </dl>
                        <table className="cd-mini">
                          <thead>
                            <tr>
                              <th>Curier</th>
                              <th>AWB</th>
                              <th>La timp</th>
                              <th>24 h</th>
                              <th>Retur</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(selectedCounty.carriers).map(([c, v]) => (
                              <tr key={c}>
                                <td>
                                  <span className="cd-dot" style={{ background: carrierColor(c) }} />
                                  {carrierLabel(c)}
                                </td>
                                <td>{v.n}</td>
                                <td className={`cd-tone--${toneForPct(v.otdPct)}`}>{fmtPct(v.otdPct)}</td>
                                <td>{fmtPct(v.in24hPct)}</td>
                                <td className={`cd-tone--${toneForPct(v.returnAllPct, true)}`}>{fmtPct(v.returnAllPct)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <p className="muted">Alege un județ.</p>
                    )}
                  </aside>
                </div>
                <div className="cd-scroll">
                  <table className="data-table cd-table">
                    <thead>
                      <tr>
                        <th>Județ</th>
                        <th className="cd-num">AWB</th>
                        <th className="cd-num">La timp</th>
                        <th className="cd-num">În 24 h</th>
                        <th className="cd-num">Retur</th>
                        <th className="cd-num">Tranzit</th>
                        {carriers.map(([c]) => (
                          <th key={c} className="cd-num">
                            {carrierLabel(c)} la timp
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.counties ?? []).slice(0, 15).map((c) => (
                        <tr key={c.code} className={selectedCounty?.code === c.code ? 'cd-row--selected' : ''} onClick={() => setCounty(c.code)}>
                          <td>{c.name}</td>
                          <td className="cd-num">{c.n}</td>
                          <td className={`cd-num cd-tone--${toneForPct(c.otdPct)}`}>{fmtPct(c.otdPct)}</td>
                          <td className="cd-num">{fmtPct(c.in24hPct)}</td>
                          <td className={`cd-num cd-tone--${toneForPct(c.returnAllPct, true)}`}>{fmtPct(c.returnAllPct)}</td>
                          <td className="cd-num">{num(c.avgWorkingDays, ' zl')}</td>
                          {carriers.map(([cc]) => (
                            <td key={cc} className="cd-num">
                              {c.carriers[cc] ? `${fmtPct(c.carriers[cc].otdPct)} (${c.carriers[cc].n})` : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="cd-section">
                <header className="cd-section__head">
                  <h2>Retururi per curier</h2>
                  <span className="muted">Rata retur ca la Innoship (doar returnate la expeditor) și varianta cu refuzurile la livrare.</span>
                </header>
                <div className="cd-returns">
                  <div className="cd-scroll">
                    <table className="data-table cd-table">
                      <thead>
                        <tr>
                          <th>Curier</th>
                          <th className="cd-num">AWB</th>
                          <th className="cd-num">Returnate</th>
                          <th className="cd-num">Refuzate</th>
                          <th className="cd-num">Rată retur</th>
                          <th className="cd-num">Retur + refuz</th>
                          <th className="cd-num">Vina clientului</th>
                          <th className="cd-num">Vina curierului</th>
                          <th className="cd-num">Fără date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnRows.map((r) => (
                          <tr key={r.key} className={r.key === 'total' ? 'cd-row--total' : ''}>
                            <td>
                              {r.key !== 'total' ? <span className="cd-dot" style={{ background: carrierColor(r.key) }} /> : null}
                              {r.label}
                            </td>
                            <td className="cd-num">{r.a.n}</td>
                            <td className="cd-num">{r.a.returned}</td>
                            <td className="cd-num">{r.a.refused}</td>
                            <td className="cd-num">
                              <strong>{fmtPct(r.a.returnPct)}</strong>
                            </td>
                            <td className={`cd-num cd-tone--${toneForPct(r.a.returnAllPct, true)}`}>
                              <strong>{fmtPct(r.a.returnAllPct)}</strong>
                            </td>
                            <td className="cd-num">{r.a.retClient}</td>
                            <td className="cd-num">{r.a.retCourier}</td>
                            <td className="cd-num muted">{r.a.retUnknown}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="cd-reasons">
                    <h3>Motive (din tracking)</h3>
                    {(data?.returnReasons ?? []).length === 0 ? (
                      <p className="muted small">Fără retururi în perioadă.</p>
                    ) : (
                      <ul>
                        {(data?.returnReasons ?? []).map((r) => (
                          <li key={r.reason}>
                            <div className="cd-reasons__head">
                              <span>{r.reason}</span>
                              <strong>{r.n}</strong>
                            </div>
                            <SegmentBar
                              height={8}
                              segments={Object.entries(r.carriers).map(([c, n]) => ({ value: n, color: carrierColor(c), label: carrierLabel(c) }))}
                            />
                            <small className="muted">
                              {Object.entries(r.carriers)
                                .map(([c, n]) => `${carrierLabel(c)} ${n}`)
                                .join(' · ')}
                              {r.client > 0 ? ` · ${r.client} din vina clientului` : ''}
                            </small>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>

              <section className="cd-section">
                <header className="cd-section__head">
                  <h2>{rangeDays(applied.range) > 70 ? 'Pe săptămâni' : 'Pe zile'}</h2>
                  <Legend
                    items={[
                      { color: COLORS.otd, label: 'la timp' },
                      { color: COLORS.client, label: 'întârziere client' },
                      { color: COLORS.courier, label: 'întârziere curier / retur' },
                      { color: COLORS.progress, label: 'pe drum' },
                      { color: COLORS.unknown, label: 'fără tracking' },
                    ]}
                  />
                </header>
                {dayColumns.length === 0 ? <p className="muted small">Fără date.</p> : <StackedColumns days={dayColumns} />}
              </section>

              <section className="cd-section">
                <header className="cd-section__head">
                  <h2>Top localități</h2>
                </header>
                <div className="cd-scroll">
                  <table className="data-table cd-table">
                    <thead>
                      <tr>
                        <th>Localitate</th>
                        <th>Județ</th>
                        <th className="cd-num">AWB</th>
                        <th className="cd-num">La timp</th>
                        <th className="cd-num">În 24 h</th>
                        <th className="cd-num">Retur</th>
                        <th className="cd-num">Tranzit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.cities ?? []).map((c) => (
                        <tr key={`${c.county}-${c.city}`}>
                          <td>{c.city}</td>
                          <td>{data?.countyNames[c.county] ?? c.county}</td>
                          <td className="cd-num">{c.n}</td>
                          <td className={`cd-num cd-tone--${toneForPct(c.otdPct)}`}>{fmtPct(c.otdPct)}</td>
                          <td className="cd-num">{fmtPct(c.in24hPct)}</td>
                          <td className={`cd-num cd-tone--${toneForPct(c.returnAllPct, true)}`}>{fmtPct(c.returnAllPct)}</td>
                          <td className="cd-num">{num(c.avgWorkingDays, ' zl')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </AdminLayout>
  )
}
