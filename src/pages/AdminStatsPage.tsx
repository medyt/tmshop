import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useProducts } from '../hooks/useProducts'
import {
  STATS_PRESET_OPTIONS,
  buildDashboardStats,
  compareMetric,
  formatDayTableLabel,
  formatDeltaPct,
  formatHours,
  formatMonthKeyLabel,
  formatPercent,
  formatRoDate,
  formatStatNumber,
  rangeForDay,
  shiftMonthKey,
  shiftStatsRange,
  statsRangeMonthKey,
  toLocalDateKey,
  type DateRangePreset,
  type MetricComparison,
  type ProductSalesRow,
  type SeriesPoint,
} from '../lib/adminStats'
import { useStatsRange, type StatsRangeState } from '../hooks/useStatsRange'
import { isApiEnabled } from '../lib/apiClient'
import { fetchOrders, backfillCourierCosts, isOrdersApiEnabled } from '../lib/ordersApi'
import {
  fetchMonthExpenseLines,
  isExpenseLinesApiEnabled,
} from '../lib/monthExpenseLinesApi'
import { formatRon } from '../lib/shopCatalog'
import { primaryImageUrl } from '../lib/productImages'
import { ProductImage } from '../components/ProductImage'
import type { Order } from '../types/order'
import './AdminHomePage.css'

function DeltaLine({
  comparison,
  previousLabel,
}: {
  comparison: MetricComparison
  previousLabel: string
}) {
  const deltaText = formatDeltaPct(
    comparison.deltaPct,
    Math.abs(comparison.current) > 0.0005,
  )
  const arrow =
    comparison.direction === 'up'
      ? '↑'
      : comparison.direction === 'down'
        ? '↓'
        : '→'
  return (
    <p
      className={`admin-stats__delta admin-stats__delta--${comparison.sentiment}`}
    >
      <span className="admin-stats__delta-main">
        {arrow} {deltaText}
      </span>
      <span className="admin-stats__delta-vs">vs. {previousLabel}</span>
    </p>
  )
}

function KpiCard({
  label,
  value,
  comparison,
  previousLabel,
  detail,
}: {
  label: string
  value: string
  comparison: MetricComparison
  previousLabel: string
  detail?: string
}) {
  return (
    <article className="panel admin-stats__kpi">
      <h2 className="admin-stats__kpi-label">{label}</h2>
      <p className="admin-stats__kpi-value">{value}</p>
      <DeltaLine comparison={comparison} previousLabel={previousLabel} />
      {detail ? (
        <p className="muted small admin-stats__kpi-detail">{detail}</p>
      ) : null}
    </article>
  )
}

function pickTickIndexes(count: number): number[] {
  if (count <= 1) return [0]
  if (count <= 8) return Array.from({ length: count }, (_, i) => i)
  const step = Math.ceil(count / 6)
  const ticks: number[] = []
  for (let i = 0; i < count; i += step) ticks.push(i)
  if (ticks[ticks.length - 1] !== count - 1) ticks.push(count - 1)
  return ticks
}

function MiniCompareChart({
  current,
  previous,
  currentName,
  previousName,
  labels,
}: {
  current: Array<number | null>
  previous: Array<number | null>
  currentName: string
  previousName: string
  labels: string[]
}) {
  const width = 360
  const height = 92
  const pad = { top: 10, right: 10, bottom: 22, left: 10 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const count = Math.max(current.length, previous.length, labels.length, 1)
  const values = [...current, ...previous].filter(
    (value): value is number => value !== null && Number.isFinite(value),
  )
  const max = Math.max(0, ...values)
  const min = 0
  const span = max - min || 1

  const xAt = (index: number, length: number) => {
    if (length <= 1) return pad.left + innerW / 2
    return pad.left + (index / (length - 1)) * innerW
  }
  const yAt = (value: number) =>
    pad.top + innerH - ((value - min) / span) * innerH

  const toPoints = (series: Array<number | null>) =>
    series
      .map((value, index) =>
        value === null || !Number.isFinite(value)
          ? null
          : `${xAt(index, series.length).toFixed(1)},${yAt(value).toFixed(1)}`,
      )
      .filter((point): point is string => point !== null)
      .join(' ')

  const currentPoints = toPoints(current)
  const previousPoints = toPoints(previous)
  const lastCurrent = [...current]
    .map((value, index) => ({ value, index }))
    .reverse()
    .find((item) => item.value !== null)
  const lastPrevious = [...previous]
    .map((value, index) => ({ value, index }))
    .reverse()
    .find((item) => item.value !== null)

  const tickIndexes = pickTickIndexes(count)

  return (
    <figure className="admin-stats__chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="admin-stats__chart-svg"
        role="img"
        aria-hidden="true"
      >
        <line
          x1={pad.left}
          y1={pad.top + innerH}
          x2={pad.left + innerW}
          y2={pad.top + innerH}
          className="admin-stats__chart-axis"
        />
        {previousPoints ? (
          <polyline
            points={previousPoints}
            className="admin-stats__chart-line admin-stats__chart-line--prev"
          />
        ) : null}
        {currentPoints ? (
          <polyline
            points={currentPoints}
            className="admin-stats__chart-line admin-stats__chart-line--now"
          />
        ) : null}
        {lastPrevious && lastPrevious.value !== null ? (
          <circle
            cx={xAt(lastPrevious.index, previous.length)}
            cy={yAt(lastPrevious.value)}
            r="3.2"
            className="admin-stats__chart-dot admin-stats__chart-dot--prev"
          />
        ) : null}
        {lastCurrent && lastCurrent.value !== null ? (
          <circle
            cx={xAt(lastCurrent.index, current.length)}
            cy={yAt(lastCurrent.value)}
            r="3.2"
            className="admin-stats__chart-dot admin-stats__chart-dot--now"
          />
        ) : null}
        {tickIndexes.map((index) => (
          <text
            key={index}
            x={xAt(index, count)}
            y={height - 6}
            textAnchor="middle"
            className="admin-stats__chart-tick"
          >
            {labels[index] ?? ''}
          </text>
        ))}
      </svg>
      <figcaption className="admin-stats__legend">
        <span>
          <i className="admin-stats__legend-dot admin-stats__legend-dot--now" />
          {currentName}
        </span>
        <span>
          <i className="admin-stats__legend-dot admin-stats__legend-dot--prev" />
          {previousName}
        </span>
      </figcaption>
    </figure>
  )
}

function ChartCard({
  label,
  value,
  comparison,
  previousLabel,
  current,
  previous,
  currentName,
  previousName,
  labels,
  detail,
}: {
  label: string
  value: string
  comparison: MetricComparison
  previousLabel: string
  current: Array<number | null>
  previous: Array<number | null>
  currentName: string
  previousName: string
  labels: string[]
  detail?: string
}) {
  return (
    <article className="panel admin-stats__chart-card">
      <h2 className="admin-stats__kpi-label">{label}</h2>
      <p className="admin-stats__kpi-value">{value}</p>
      <DeltaLine comparison={comparison} previousLabel={previousLabel} />
      {detail ? (
        <p className="muted small admin-stats__kpi-detail">{detail}</p>
      ) : null}
      <MiniCompareChart
        current={current}
        previous={previous}
        currentName={currentName}
        previousName={previousName}
        labels={labels}
      />
    </article>
  )
}

function RankCard({
  title,
  children,
  wide,
}: {
  title: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <article
      className={`panel admin-stats__rank-card${
        wide ? ' admin-stats__rank-card--wide' : ''
      }`}
    >
      <h2 className="admin-stats__section-title">{title}</h2>
      {children}
    </article>
  )
}

function EmptyRank({ label }: { label: string }) {
  return <p className="muted small admin-stats__rank-empty">{label}</p>
}

function TopProductsTable({
  rows,
  imageById,
}: {
  rows: ProductSalesRow[]
  imageById: Map<string, string>
}) {
  if (rows.length === 0) {
    return <EmptyRank label="Niciun produs vândut în perioada selectată." />
  }
  return (
    <div className="table-wrap">
      <table className="data-table admin-stats__rank-table">
        <thead>
          <tr>
            <th scope="col">Produs</th>
            <th scope="col" className="admin-stats__num">
              Qty
            </th>
            <th scope="col" className="admin-stats__num">
              Venituri
            </th>
            <th scope="col" className="admin-stats__num">
              Profit
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row) => (
            <tr key={row.productId}>
              <td>
                <span className="ah-stat-product">
                  <span className="ah-stat-thumb" aria-hidden="true">
                    {imageById.get(row.productId) ? (
                      <ProductImage
                        src={imageById.get(row.productId)}
                        alt=""
                        loading="lazy"
                        placeholderClassName="ah-stat-thumb-placeholder"
                        placeholderLabel="—"
                      />
                    ) : (
                      <span className="ah-stat-thumb-placeholder">—</span>
                    )}
                  </span>
                  <div>
                    <span className="cell-title">{row.productName}</span>
                    {row.productSku ? (
                      <span className="cell-sku">{row.productSku}</span>
                    ) : null}
                  </div>
                </span>
              </td>
              <td className="admin-stats__num">
                <strong>{row.quantitySold}</strong>
              </td>
              <td className="admin-stats__num">{formatRon(row.revenue)}</td>
              <td
                className={`admin-stats__num${
                  row.profit < 0 ? ' admin-stats__profit--neg' : ''
                }`}
              >
                {formatRon(row.profit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExtrasTable({ rows }: { rows: ProductSalesRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="muted small">
        Nu există extras (addon / transport) în perioada selectată.
      </p>
    )
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Denumire</th>
            <th scope="col" className="admin-stats__num">
              Cantitate
            </th>
            <th scope="col" className="admin-stats__num">
              Încasări totale
            </th>
            <th scope="col" className="admin-stats__num">
              Profit
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.productId}>
              <td>
                <span className="cell-title">{row.productName}</span>
                {row.productSku ? (
                  <span className="cell-sku">{row.productSku}</span>
                ) : null}
              </td>
              <td className="admin-stats__num">{row.quantitySold}</td>
              <td className="admin-stats__num">{formatRon(row.revenue)}</td>
              <td
                className={`admin-stats__num${
                  row.profit < 0 ? ' admin-stats__profit--neg' : ''
                }`}
              >
                {formatRon(row.profit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TimelineTable({
  rows,
  bucket,
  onSelectDay,
}: {
  rows: SeriesPoint[]
  bucket: 'hour' | 'day'
  onSelectDay?: (key: string) => void
}) {
  if (rows.length === 0) return null
  const title = bucket === 'hour' ? 'Pe ore' : 'Pe zile'
  const hasReturns = rows.some((row) => row.returnedCount > 0)
  return (
    <article className="panel admin-stats__rank-card">
      <h2 className="admin-stats__section-title">{title}</h2>
      <div className="table-wrap">
        <table className="data-table admin-stats__rank-table">
          <thead>
            <tr>
              <th scope="col">{bucket === 'hour' ? 'Oră' : 'Zi'}</th>
              <th scope="col" className="admin-stats__num">
                Comenzi
              </th>
              {hasReturns ? (
                <th scope="col" className="admin-stats__num">
                  Retururi
                </th>
              ) : null}
              <th scope="col" className="admin-stats__num">
                Venituri
              </th>
              <th scope="col" className="admin-stats__num">
                Valoare medie
              </th>
              <th scope="col" className="admin-stats__num">
                Profit
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  {bucket === 'day' && onSelectDay ? (
                    <button
                      type="button"
                      className="admin-stats__day-link"
                      onClick={() => onSelectDay(row.key)}
                    >
                      {formatDayTableLabel(row.key)}
                    </button>
                  ) : (
                    row.label
                  )}
                </td>
                <td className="admin-stats__num">{row.orderCount}</td>
                {hasReturns ? (
                  <td className="admin-stats__num">
                    {row.returnedCount > 0
                      ? `${row.returnedCount} (−${formatRon(row.returnedRevenue)})`
                      : '—'}
                  </td>
                ) : null}
                <td className="admin-stats__num">{formatRon(row.revenue)}</td>
                <td className="admin-stats__num">
                  {row.orderCount > 0 ? formatRon(row.aov) : '—'}
                </td>
                <td
                  className={`admin-stats__num${
                    row.profit < 0 ? ' admin-stats__profit--neg' : ''
                  }`}
                >
                  {formatRon(row.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function seriesValues(
  points: SeriesPoint[],
  pick: (point: SeriesPoint) => number | null,
): Array<number | null> {
  return points.map(pick)
}

/** Bara cu ← → / preset / De la / Până la + textul de comparație. */
export function StatsRangeToolbar({ state }: { state: StatsRangeState }) {
  const { range, preset, now, applyRange, onPresetChange, setCustomBounds } = state
  return (
    <section className="panel admin-stats__toolbar" aria-label="Perioadă statistici">
      <div className="admin-stats__toolbar-main">
        <div className="admin-stats__nav">
          <button
            type="button"
            className="btn secondary"
            aria-label="Intervalul anterior"
            onClick={() => applyRange(shiftStatsRange(range, -1, now))}
          >
            ←
          </button>
          <button
            type="button"
            className="btn secondary"
            aria-label="Intervalul următor"
            disabled={!range.canGoNext}
            onClick={() => applyRange(shiftStatsRange(range, 1, now))}
          >
            →
          </button>
        </div>
        <label className="field admin-stats__preset">
          <span className="sr-only">Perioadă</span>
          <select
            value={preset}
            onChange={(e) => onPresetChange(e.target.value as DateRangePreset)}
            aria-label="Filtru perioadă"
          >
            {STATS_PRESET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field admin-stats__date">
          <span>De la</span>
          <input
            type="date"
            value={range.startKey}
            max={toLocalDateKey(now)}
            onChange={(e) => setCustomBounds(e.target.value, range.inclusiveEndKey)}
          />
        </label>
        <label className="field admin-stats__date">
          <span>Până la</span>
          <input
            type="date"
            value={range.inclusiveEndKey}
            min={range.startKey}
            max={toLocalDateKey(now)}
            onChange={(e) => setCustomBounds(range.startKey, e.target.value)}
          />
        </label>
      </div>
      <p className="muted small admin-stats__compare">
        <strong>{range.label}</strong>
        {' · '}
        comparat cu {range.previousLabel}
      </p>
    </section>
  )
}

type AdminStatsDashboardProps = {
  /** Comenzi deja încărcate de pagina părinte (evită un al doilea fetch). */
  orders?: Order[]
  ordersLoading?: boolean
  ordersError?: string | null
  onReloadOrders?: () => Promise<void> | void
  /** Filtru de perioadă controlat de părinte; bara nu se mai afișează intern. */
  rangeState?: StatsRangeState
}

export function AdminStatsDashboard({
  orders: externalOrders,
  ordersLoading,
  ordersError,
  onReloadOrders,
  rangeState,
}: AdminStatsDashboardProps = {}) {
  const external = externalOrders !== undefined
  const ownRange = useStatsRange()
  const { range, now, applyRange } = rangeState ?? ownRange
  const { products } = useProducts()
  const imageById = useMemo(() => {
    const map = new Map<string, string>()
    for (const product of products) {
      const url = primaryImageUrl(product)
      if (url) map.set(product.id, url)
    }
    return map
  }, [products])
  const [internalOrders, setOrders] = useState<Order[]>([])
  const [internalLoading, setLoading] = useState(!external && isOrdersApiEnabled())
  const [internalError, setError] = useState<string | null>(null)
  const orders = external ? externalOrders : internalOrders
  const loading = external ? Boolean(ordersLoading) : internalLoading
  const error = external ? (ordersError ?? null) : internalError
  const [backfillBusy, setBackfillBusy] = useState(false)
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null)
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [prevExpensesTotal, setPrevExpensesTotal] = useState(0)
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [expensesError, setExpensesError] = useState<string | null>(null)

  const reloadOrders = () => {
    if (external) return onReloadOrders?.()
    if (!isOrdersApiEnabled()) return
    setLoading(true)
    setError(null)
    return fetchOrders()
      .then((loaded) => {
        setOrders(loaded)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut încărca comenzile pentru statistici.',
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    if (external) return
    if (!isOrdersApiEnabled()) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchOrders()
      .then((loaded) => {
        if (cancelled) return
        setOrders(loaded)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut încărca comenzile pentru statistici.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [external])

  const monthKey = useMemo(() => statsRangeMonthKey(range), [range])

  const dashboard = useMemo(
    () => buildDashboardStats(orders, products, range),
    [orders, products, range],
  )

  useEffect(() => {
    if (!monthKey || !isExpenseLinesApiEnabled()) {
      setExpensesTotal(0)
      setPrevExpensesTotal(0)
      setExpensesError(null)
      return
    }

    let cancelled = false
    setExpensesLoading(true)
    setExpensesError(null)
    const prevKey = shiftMonthKey(monthKey, -1)

    void Promise.all([
      fetchMonthExpenseLines(monthKey),
      fetchMonthExpenseLines(prevKey),
    ])
      .then(([current, previous]) => {
        if (cancelled) return
        setExpensesTotal(current.total)
        setPrevExpensesTotal(previous.total)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setExpensesTotal(0)
        setPrevExpensesTotal(0)
        setExpensesError(
          err instanceof Error
            ? err.message
            : 'Nu am putut încărca cheltuielile lunare.',
        )
      })
      .finally(() => {
        if (!cancelled) setExpensesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [monthKey])

  const chartLabels = dashboard.series.map((point) => point.label)

  const currentName =
    range.dayCount === 1
      ? formatRoDate(range.calendarStart)
      : `${formatRoDate(range.calendarStart)} – ${formatRoDate(
          new Date(range.calendarEndExclusive.getTime() - 1),
        )}`
  const previousName = range.previousLabel

  const onBackfillCourierCosts = () => {
    if (backfillBusy) return
    setBackfillBusy(true)
    setBackfillMessage(null)
    void backfillCourierCosts(100)
      .then((result) => {
        setBackfillMessage(
          `Recalculat ${result.updated} comenzi (${result.failed} eșuate, ${result.processed} procesate).`,
        )
        return reloadOrders()
      })
      .catch((err: unknown) => {
        setBackfillMessage(
          err instanceof Error
            ? err.message
            : 'Nu am putut recalcula costurile DPD.',
        )
      })
      .finally(() => {
        setBackfillBusy(false)
      })
  }

  const k = dashboard.current
  const p = dashboard.previous
  const profitAfterExpenses = k.profit - expensesTotal
  const prevProfitAfterExpenses = p.profit - prevExpensesTotal

  return (
    <section className="admin-home__stats" aria-labelledby="admin-stats-heading">
      <div className="admin-home__stats-head">
        <h2 id="admin-stats-heading" className="admin-home__stats-title">
          Statistici vânzări
        </h2>
        <p className="muted admin-home__stats-lead">
          Comenzi, venituri și profit pe zi, comparat cu perioada anterioară.
          Veniturile și profitul scad comenzile refuzate și returnate. Profitul
          folosește prețul de achiziție din gestiune și costul curier DPD (când
          există AWB). Pentru o lună calendaristică poți adăuga cheltuieli
          Facebook, consumabile și consultanță — se scad din profit.
        </p>
        <div className="admin-stats__toolbar">
          <button
            type="button"
            className="btn secondary"
            disabled={backfillBusy || loading}
            onClick={onBackfillCourierCosts}
          >
            {backfillBusy ? 'Recalculez costuri DPD…' : 'Recalculează costuri DPD'}
          </button>
          {backfillMessage ? (
            <p className="muted small">{backfillMessage}</p>
          ) : null}
        </div>
      </div>
      {!isApiEnabled() || !isOrdersApiEnabled() ? (
        <section className="panel panel--form">
          <p className="muted">
            Statisticile sunt disponibile când aplicația folosește API-ul de pe
            server.
          </p>
        </section>
      ) : (
        <>
          {loading ? (
            <section className="panel panel--form">
              <p className="muted">Se încarcă statisticile…</p>
            </section>
          ) : null}

          {error ? (
            <p className="app-status app-status--error" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && !error ? (
            <div className="admin-stats">
              {rangeState ? null : <StatsRangeToolbar state={ownRange} />}

              <section className="admin-stats__kpis" aria-label="Indicatori">
                <KpiCard
                  label="Produse / comandă"
                  value={formatStatNumber(k.avgItemsPerOrder, 2)}
                  comparison={compareMetric(
                    k.avgItemsPerOrder,
                    p.avgItemsPerOrder,
                  )}
                  previousLabel={formatStatNumber(p.avgItemsPerOrder, 2)}
                />
                <KpiCard
                  label="Venit transport (client)"
                  value={formatRon(k.shippingRevenue)}
                  comparison={compareMetric(k.shippingRevenue, p.shippingRevenue)}
                  previousLabel={formatRon(p.shippingRevenue)}
                  detail="Transport + addon-uri (total − produse)"
                />
                <KpiCard
                  label="Cost curier DPD"
                  value={formatRon(k.courierCostTotal)}
                  comparison={compareMetric(k.courierCostTotal, p.courierCostTotal, true)}
                  previousLabel={formatRon(p.courierCostTotal)}
                />
                <KpiCard
                  label="Marjă transport"
                  value={formatRon(k.shippingMargin)}
                  comparison={compareMetric(k.shippingMargin, p.shippingMargin)}
                  previousLabel={formatRon(p.shippingMargin)}
                />
                <KpiCard
                  label="Rată de retur"
                  value={formatPercent(k.returnRate)}
                  comparison={compareMetric(k.returnRate, p.returnRate, true)}
                  previousLabel={formatPercent(p.returnRate)}
                  detail={`Livrate ${formatStatNumber(k.deliveredCount, 0)} · Refuzate + returnate ${formatStatNumber(k.returnedCount, 0)}`}
                />
                <KpiCard
                  label="Rată anulare comenzi"
                  value={formatPercent(k.cancelRate)}
                  comparison={compareMetric(k.cancelRate, p.cancelRate, true)}
                  previousLabel={formatPercent(p.cancelRate)}
                />
                <KpiCard
                  label="Timp mediu de expediere"
                  value={formatHours(k.avgShipHours)}
                  comparison={compareMetric(
                    k.avgShipHours ?? 0,
                    p.avgShipHours ?? 0,
                    true,
                  )}
                  previousLabel={formatHours(p.avgShipHours)}
                />
                <article className="panel admin-stats__kpi">
                  <h2 className="admin-stats__kpi-label">Metodă de plată</h2>
                  <p className="admin-stats__kpi-value admin-stats__kpi-value--split">
                    {k.orderCount === 0
                      ? '—'
                      : `${formatPercent(k.cardCount / k.orderCount)} card`}
                  </p>
                  <p className="muted small admin-stats__delta">
                    Card {k.cardCount} · Ramburs {k.codCount}
                  </p>
                </article>
              </section>

              <section
                className="admin-stats__charts"
                aria-label="Evoluție vânzări"
              >
                <ChartCard
                  label="Număr de comenzi"
                  value={formatStatNumber(k.orderCount, 0)}
                  comparison={compareMetric(k.orderCount, p.orderCount)}
                  previousLabel={formatStatNumber(p.orderCount, 0)}
                  current={seriesValues(dashboard.series, (row) => row.orderCount)}
                  previous={seriesValues(
                    dashboard.previousSeries,
                    (row) => row.orderCount,
                  )}
                  currentName={currentName}
                  previousName={previousName}
                  labels={chartLabels}
                />
                <ChartCard
                  label="Valoare medie comandă"
                  value={k.orderCount > 0 ? formatRon(k.aov) : '—'}
                  comparison={compareMetric(k.aov, p.aov)}
                  previousLabel={formatRon(p.aov)}
                  current={seriesValues(dashboard.series, (row) =>
                    row.orderCount > 0 ? row.aov : null,
                  )}
                  previous={seriesValues(dashboard.previousSeries, (row) =>
                    row.orderCount > 0 ? row.aov : null,
                  )}
                  currentName={currentName}
                  previousName={previousName}
                  labels={chartLabels}
                />
                <ChartCard
                  label="Venituri"
                  value={formatRon(k.revenue)}
                  comparison={compareMetric(k.revenue, p.revenue)}
                  previousLabel={formatRon(p.revenue)}
                  detail={
                    k.returnedCount > 0
                      ? `− ${formatRon(k.returnedRevenue)} din ${formatStatNumber(k.returnedCount, 0)} comenzi plasate în perioadă, refuzate/returnate`
                      : undefined
                  }
                  current={seriesValues(dashboard.series, (row) => row.revenue)}
                  previous={seriesValues(
                    dashboard.previousSeries,
                    (row) => row.revenue,
                  )}
                  currentName={currentName}
                  previousName={previousName}
                  labels={chartLabels}
                />
                <ChartCard
                  label="Profit"
                  value={formatRon(
                    monthKey ? profitAfterExpenses : k.profit,
                  )}
                  comparison={compareMetric(
                    monthKey ? profitAfterExpenses : k.profit,
                    monthKey ? prevProfitAfterExpenses : p.profit,
                  )}
                  previousLabel={formatRon(
                    monthKey ? prevProfitAfterExpenses : p.profit,
                  )}
                  detail={
                    [
                      k.returnedCount > 0
                        ? `${formatStatNumber(k.returnedCount, 0)} retururi (ziua comenzii)`
                        : null,
                      k.courierCostTotal > 0
                        ? `inclusiv ${formatRon(k.courierCostTotal)} cost DPD`
                        : null,
                      monthKey && expensesTotal > 0
                        ? `− ${formatRon(expensesTotal)} cheltuieli lunare`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                  current={seriesValues(dashboard.series, (row) => row.profit)}
                  previous={seriesValues(
                    dashboard.previousSeries,
                    (row) => row.profit,
                  )}
                  currentName={currentName}
                  previousName={previousName}
                  labels={chartLabels}
                />
              </section>

              {monthKey ? (
                <article
                  className="panel admin-stats__expenses"
                  aria-label="Cheltuieli lunare"
                >
                  <div className="admin-stats__expenses-head">
                    <h2 className="admin-stats__section-title">
                      Cheltuieli — {formatMonthKeyLabel(monthKey)}
                    </h2>
                    <p className="muted small">
                      Cheltuieli manuale fără TVA (salvate în Profitabilitate
                      lunară). Total:{' '}
                      {expensesLoading ? '…' : formatRon(expensesTotal)}.
                    </p>
                  </div>
                  <p>
                    <Link
                      to="/admin/statistici-lunare"
                      className="btn secondary"
                    >
                      Editează cheltuielile lunii
                    </Link>
                  </p>
                  {expensesError ? (
                    <p className="app-status app-status--error" role="alert">
                      {expensesError}
                    </p>
                  ) : null}
                </article>
              ) : null}

              <section
                className="admin-stats__ranks"
                aria-label="Clasamente"
              >
                <RankCard title="Cele mai vândute produse" wide>
                  <TopProductsTable rows={dashboard.products} imageById={imageById} />
                </RankCard>
              </section>

              <TimelineTable
                rows={
                  range.bucket === 'day'
                    ? [...dashboard.dailyOrHourly].reverse()
                    : dashboard.dailyOrHourly
                }
                bucket={range.bucket}
                onSelectDay={(key) => applyRange(rangeForDay(key, now))}
              />

              <article className="panel admin-stats__rank-card">
                <h2 className="admin-stats__section-title">
                  Extra (surpriză, transport, addon-uri)
                </h2>
                <ExtrasTable rows={dashboard.extras} />
              </article>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
