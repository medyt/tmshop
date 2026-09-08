import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'
import { useProducts } from '../hooks/useProducts'
import { compareMetric, formatDeltaPct, formatPercent } from '../lib/adminStats'
import {
  emptyExpenseLine,
  fetchMonthExpenseLines,
  isExpenseLinesApiEnabled,
  saveMonthExpenseLines,
} from '../lib/monthExpenseLinesApi'
import {
  buildMonthProfitCsv,
  buildMonthProfitReport,
  currentMonthKey,
  EXPENSE_CATEGORY_LABELS,
  formatMonthKeyLabel,
  shiftMonthKey,
  type ExpenseLine,
  type ExpenseLineCategory,
  type MonthKey,
} from '../lib/monthProfitReport'
import { fetchOrders, isOrdersApiEnabled } from '../lib/ordersApi'
import { formatRon } from '../lib/shopCatalog'
import { getVatSettings, roundMoney } from '../lib/vat'
import type { Order } from '../types/order'

const EXPENSE_CATEGORIES = Object.keys(
  EXPENSE_CATEGORY_LABELS,
) as ExpenseLineCategory[]

function parseMoneyInput(raw: string): number {
  const normalized = raw.replace(/\s/g, '').replace(',', '.')
  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}

function formatRonDisplay(value: number): string {
  return formatRon(roundMoney(value))
}

export function AdminMonthlyStatsPage() {
  const { products } = useProducts()
  const vatSettings = useMemo(() => getVatSettings(), [])
  const [monthKey, setMonthKey] = useState<MonthKey>(() => currentMonthKey())
  const [orders, setOrders] = useState<Order[]>([])
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([])
  const [loading, setLoading] = useState(isOrdersApiEnabled())
  const [linesLoading, setLinesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOrdersApiEnabled()) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchOrders()
      .then((data) => {
        if (!cancelled) setOrders(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Nu am putut încărca comenzile.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isExpenseLinesApiEnabled()) {
      setExpenseLines([])
      return
    }
    let cancelled = false
    setLinesLoading(true)
    void fetchMonthExpenseLines(monthKey)
      .then((data) => {
        if (!cancelled) {
          setExpenseLines(data.lines)
          setSaved(false)
        }
      })
      .catch(() => {
        if (!cancelled) setExpenseLines([])
      })
      .finally(() => {
        if (!cancelled) setLinesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [monthKey])

  const report = useMemo(
    () =>
      buildMonthProfitReport(orders, products, monthKey, expenseLines, vatSettings),
    [orders, products, monthKey, expenseLines, vatSettings],
  )

  const prevMonthKey = shiftMonthKey(monthKey, -1)
  const prevReport = useMemo(
    () =>
      buildMonthProfitReport(orders, products, prevMonthKey, [], vatSettings),
    [orders, products, prevMonthKey, vatSettings],
  )

  const profitComparison = compareMetric(
    report.finalProfit,
    prevReport.finalProfit,
  )

  const updateLine = useCallback(
    (index: number, patch: Partial<ExpenseLine>) => {
      setExpenseLines((lines) =>
        lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
      )
      setSaved(false)
    },
    [],
  )

  const addLine = () => {
    setExpenseLines((lines) => [
      ...lines,
      emptyExpenseLine(monthKey, lines.length),
    ])
    setSaved(false)
  }

  const removeLine = (index: number) => {
    setExpenseLines((lines) => lines.filter((_, i) => i !== index))
    setSaved(false)
  }

  const onSave = async () => {
    if (!isExpenseLinesApiEnabled()) return
    setSaving(true)
    setError(null)
    try {
      const savedLines = await saveMonthExpenseLines({
        monthKey,
        lines: expenseLines.map((line, index) => ({
          ...line,
          amount: parseMoneyInput(String(line.amount)),
          sortOrder: index,
        })),
      })
      setExpenseLines(savedLines.lines)
      setSaved(true)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Nu am putut salva cheltuielile.',
      )
    } finally {
      setSaving(false)
    }
  }

  const onExportCsv = () => {
    const csv = buildMonthProfitCsv(report)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profitabilitate-${monthKey}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const vatPctLabel = `${Math.round(vatSettings.rate * 10000) / 100}%`

  return (
    <AdminLayout
      title="Profitabilitate lunară"
      lead={`Toate sumele de profit sunt fără TVA · Cota TVA: ${vatPctLabel} · Cheltuielile manuale se introduc fără TVA`}
      actions={
        <div className="admin-monthly-report__year-nav">
          <button
            type="button"
            className="btn secondary"
            onClick={() => setMonthKey((k) => shiftMonthKey(k, -1))}
            aria-label="Luna anterioară"
          >
            ←
          </button>
          <span className="admin-monthly-report__year">
            {formatMonthKeyLabel(monthKey)}
          </span>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setMonthKey((k) => shiftMonthKey(k, 1))}
            aria-label="Luna următoare"
          >
            →
          </button>
          <button type="button" className="btn secondary" onClick={onExportCsv}>
            Export CSV
          </button>
        </div>
      }
    >
      <div className="admin-monthly-report">
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="muted">Se încarcă datele…</p>
        ) : (
          <>
            <section
              className="admin-monthly-report__kpis"
              aria-label="Rezultat lună"
            >
              <article className="panel admin-stats__kpi admin-monthly-report__kpi">
                <h2 className="admin-stats__kpi-label">PROFIT FINAL (fără TVA)</h2>
                <p
                  className={`admin-stats__kpi-value${
                    report.finalProfit < 0 ? ' admin-stats__profit--neg' : ''
                  }`}
                >
                  {formatRonDisplay(report.finalProfit)}
                </p>
                <p className="muted small admin-stats__kpi-detail">
                  {report.finalProfitPct !== null
                    ? `${formatPercent(report.finalProfitPct)} din venituri nete`
                    : '—'}
                </p>
                <p
                  className={`admin-stats__delta admin-stats__delta--${profitComparison.sentiment}`}
                >
                  <span className="admin-stats__delta-main">
                    {profitComparison.direction === 'up'
                      ? '↑'
                      : profitComparison.direction === 'down'
                        ? '↓'
                        : '→'}{' '}
                    {formatDeltaPct(
                      profitComparison.deltaPct,
                      Math.abs(profitComparison.current) > 0.0005,
                    )}
                  </span>
                  <span className="admin-stats__delta-vs">
                    vs. {formatMonthKeyLabel(prevMonthKey)} (
                    {formatRonDisplay(prevReport.finalProfit)})
                  </span>
                </p>
              </article>
              <article className="panel admin-stats__kpi admin-monthly-report__kpi">
                <h2 className="admin-stats__kpi-label">Marjă brută (fără TVA)</h2>
                <p className="admin-stats__kpi-value">
                  {formatRonDisplay(report.grossMargin)}
                </p>
                <p className="muted small admin-stats__kpi-detail">
                  {report.grossMarginPct !== null
                    ? `${formatPercent(report.grossMarginPct)} din venituri nete`
                    : '—'}
                </p>
              </article>
              <article className="panel admin-stats__kpi admin-monthly-report__kpi">
                <h2 className="admin-stats__kpi-label">Venituri nete</h2>
                <p className="admin-stats__kpi-value">
                  {formatRonDisplay(report.totalRevenueNet)}
                </p>
                <p className="muted small admin-stats__kpi-detail">
                  Brut {formatRonDisplay(report.totalRevenueGross)} ·{' '}
                  {report.returnedCount} retururi excluse (
                  {formatRonDisplay(report.returnedRevenueGross)})
                </p>
              </article>
              <article className="panel admin-stats__kpi admin-monthly-report__kpi">
                <h2 className="admin-stats__kpi-label">Cheltuieli manuale</h2>
                <p className="admin-stats__kpi-value">
                  {formatRonDisplay(report.manualExpensesTotal)}
                </p>
                <p className="muted small admin-stats__kpi-detail">
                  Introduse fără TVA · {expenseLines.length} linii
                </p>
              </article>
            </section>

            <article className="panel admin-monthly-report__table-wrap">
              <h2 className="admin-stats__section-title">
                Valori automate — cu TVA / fără TVA
              </h2>
              <div className="table-wrap">
                <table className="data-table admin-monthly-report__table admin-monthly-report__table--auto">
                  <thead>
                    <tr>
                      <th scope="col">Linie</th>
                      <th scope="col" className="admin-stats__num">
                        Cu TVA
                      </th>
                      <th scope="col" className="admin-stats__num">
                        Fără TVA
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.autoLines.map((line) => (
                      <tr key={line.key}>
                        <td>{line.label}</td>
                        <td className="admin-stats__num">
                          {formatRonDisplay(line.gross)}
                        </td>
                        <td className="admin-stats__num">
                          {formatRonDisplay(line.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel admin-monthly-report__expenses">
              <div className="admin-monthly-report__expenses-head">
                <h2 className="admin-stats__section-title">
                  Cheltuieli manuale (fără TVA)
                </h2>
                <p className="muted small">
                  Sumele se salvează per lună. Nu se aplică conversie TVA.
                </p>
              </div>
              {linesLoading ? (
                <p className="muted">Se încarcă cheltuielile…</p>
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="data-table admin-monthly-report__table">
                      <thead>
                        <tr>
                          <th scope="col">Categorie</th>
                          <th scope="col">Denumire</th>
                          <th scope="col" className="admin-stats__num">
                            Sumă (fără TVA)
                          </th>
                          <th scope="col" />
                        </tr>
                      </thead>
                      <tbody>
                        {expenseLines.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="muted">
                              Nicio linie — adaugă cheltuieli pentru această lună.
                            </td>
                          </tr>
                        ) : (
                          expenseLines.map((line, index) => (
                            <tr key={`${line.id ?? 'new'}-${index}`}>
                              <td>
                                <select
                                  className="admin-monthly-report__select"
                                  value={line.category}
                                  disabled={saving}
                                  onChange={(e) =>
                                    updateLine(index, {
                                      category: e.target
                                        .value as ExpenseLineCategory,
                                    })
                                  }
                                >
                                  {EXPENSE_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {EXPENSE_CATEGORY_LABELS[cat]}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  className="admin-monthly-report__input admin-monthly-report__input--wide"
                                  value={line.label}
                                  disabled={saving}
                                  onChange={(e) =>
                                    updateLine(index, { label: e.target.value })
                                  }
                                  placeholder="Ex. Chirie depozit"
                                />
                              </td>
                              <td className="admin-stats__num">
                                <input
                                  className="admin-monthly-report__input"
                                  inputMode="decimal"
                                  value={line.amount ? String(line.amount) : ''}
                                  disabled={saving}
                                  onChange={(e) =>
                                    updateLine(index, {
                                      amount: parseMoneyInput(e.target.value),
                                    })
                                  }
                                  placeholder="0"
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn secondary admin-monthly-report__save"
                                  disabled={saving}
                                  onClick={() => removeLine(index)}
                                >
                                  Șterge
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2}>
                            <strong>Total cheltuieli manuale</strong>
                          </td>
                          <td className="admin-stats__num">
                            <strong>
                              {formatRonDisplay(report.manualExpensesTotal)}
                            </strong>
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="admin-monthly-report__expenses-actions">
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={saving}
                      onClick={addLine}
                    >
                      + Adaugă linie
                    </button>
                    <button
                      type="button"
                      className="btn primary"
                      disabled={saving}
                      onClick={() => void onSave()}
                    >
                      {saving ? 'Se salvează…' : saved ? 'Salvat' : 'Salvează luna'}
                    </button>
                  </div>
                </>
              )}
            </article>

            <article className="panel admin-monthly-report__formula">
              <h2 className="admin-stats__section-title">Rezumat formulă</h2>
              <dl className="admin-monthly-report__formula-list">
                <div>
                  <dt>Venituri nete</dt>
                  <dd>{formatRonDisplay(report.totalRevenueNet)}</dd>
                </div>
                <div>
                  <dt>Costuri directe nete</dt>
                  <dd>{formatRonDisplay(report.directCostNet)}</dd>
                </div>
                <div>
                  <dt>Marjă brută</dt>
                  <dd>{formatRonDisplay(report.grossMargin)}</dd>
                </div>
                <div>
                  <dt>Cheltuieli manuale</dt>
                  <dd>{formatRonDisplay(report.manualExpensesTotal)}</dd>
                </div>
                <div className="admin-monthly-report__formula-final">
                  <dt>PROFIT FINAL</dt>
                  <dd
                    className={
                      report.finalProfit < 0
                        ? 'admin-stats__profit--neg'
                        : undefined
                    }
                  >
                    {formatRonDisplay(report.finalProfit)}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="panel admin-monthly-report__notes">
              <h2 className="admin-stats__section-title">Metodologie</h2>
              <ul className="muted small admin-monthly-report__notes-list">
                <li>
                  Cota TVA: <strong>{vatPctLabel}</strong> (configurabilă în
                  `.env` via `VITE_VAT_RATE=0.21`).
                </li>
                <li>
                  Venituri din comenzi și preț achiziție gestiune:{' '}
                  {report.purchasePriceIncludesVat
                    ? 'cu TVA inclus → împărțire la 1.21'
                    : 'fără TVA (nu se mai împarte)'}
                  .
                </li>
                <li>
                  Cost DPD: net din API când există, altfel cu TVA / 1.21.
                </li>
                <li>
                  Cheltuielile manuale sunt <strong>fără TVA</strong> — se iau
                  ca atare.
                </li>
                <li>
                  Retururile sunt excluse (comenzi plasate în lună, pe ziua
                  comenzii).
                </li>
                <li>
                  Statistici zilnice detaliate:{' '}
                  <Link to="/admin">panou admin</Link>.
                </li>
              </ul>
            </article>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
