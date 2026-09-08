import { useMemo, useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'
import { useProducts } from '../hooks/useProducts'
import {
  IMPORT_COLUMNS,
  buildImportPayload,
  buildImportTemplate,
  collectCountyCodes,
  importRowStatus,
  parseImportFile,
  validateImportRows,
  type ImportRow,
  type LocalityIndex,
  type ParsedImportFile,
} from '../lib/orderImport'
import { createOrder, isOrdersApiEnabled } from '../lib/ordersApi'
import { loadDpdLocalities, loadDpdNomenclature } from '../lib/roLocalities'
import { formatRon } from '../lib/shopCatalog'
import './AdminOrderImportPage.css'

type RowResult =
  | { state: 'pending' }
  | { state: 'running' }
  | { state: 'done'; orderId: string; total: number }
  | { state: 'failed'; error: string }

const CONCURRENCY = 2

export function AdminOrderImportPage() {
  const { products, loading: productsLoading } = useProducts()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedImportFile | null>(null)
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [includeWarnings, setIncludeWarnings] = useState(true)
  const [sendEmails, setSendEmails] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const [results, setResults] = useState<Map<number, RowResult>>(new Map())
  const [importing, setImporting] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [templateBusy, setTemplateBusy] = useState(false)

  const counts = useMemo(() => {
    const c = { ok: 0, warn: 0, error: 0 }
    for (const r of rows ?? []) c[importRowStatus(r)]++
    return c
  }, [rows])

  const importable = useMemo(
    () =>
      (rows ?? []).filter((r) => {
        const s = importRowStatus(r)
        return s === 'ok' || (s === 'warn' && includeWarnings)
      }),
    [rows, includeWarnings],
  )

  const done = [...results.values()].filter((r) => r.state === 'done').length
  const failed = [...results.values()].filter((r) => r.state === 'failed').length
  const finished = importing === false && results.size > 0

  async function handleFile(file: File) {
    setParsing(true)
    setParseError(null)
    setParsed(null)
    setRows(null)
    setResults(new Map())
    setFileName(file.name)
    try {
      const p = await parseImportFile(file)
      setParsed(p)
      if (p.missingRequired.length > 0 || p.rows.length === 0) {
        setRows([])
        return
      }
      // Județe + localități DPD pentru rândurile din fișier.
      await loadDpdNomenclature().catch(() => null)
      const codes = collectCountyCodes(p.rows)
      const localities: LocalityIndex = new Map()
      await Promise.all(
        codes.map(async (code) => {
          try {
            localities.set(code, await loadDpdLocalities(code))
          } catch {
            localities.set(code, [])
          }
        }),
      )
      setRows(validateImportRows(p.rows, products, localities))
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Nu am putut citi fișierul.')
    } finally {
      setParsing(false)
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDropActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  async function downloadTemplate() {
    if (templateBusy) return
    setTemplateBusy(true)
    try {
      const blob = await buildImportTemplate()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'model-import-comenzi-shoptop.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setTemplateBusy(false)
    }
  }

  async function runImport() {
    if (importing || importable.length === 0) return
    setImporting(true)
    const queue = [...importable]
    const initial = new Map<number, RowResult>()
    for (const r of queue) initial.set(r.rowNumber, { state: 'pending' })
    setResults(initial)

    const update = (rowNumber: number, result: RowResult) =>
      setResults((prev) => {
        const next = new Map(prev)
        next.set(rowNumber, result)
        return next
      })

    const worker = async () => {
      for (;;) {
        const row = queue.shift()
        if (!row) return
        update(row.rowNumber, { state: 'running' })
        try {
          const order = await createOrder(buildImportPayload(row, { suppressEmail: !sendEmails }))
          update(row.rowNumber, { state: 'done', orderId: order.id, total: order.totalAmount })
        } catch (err: unknown) {
          update(row.rowNumber, {
            state: 'failed',
            error: err instanceof Error ? err.message : 'Eroare la creare.',
          })
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    setImporting(false)
  }

  function toggleExpanded(rowNumber: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(rowNumber)) next.delete(rowNumber)
      else next.add(rowNumber)
      return next
    })
  }

  const mappedKeys = new Set(parsed?.mapping.map((m) => m.key).filter(Boolean) ?? [])
  const unknownHeaders = parsed?.mapping.filter((m) => m.header && !m.key).map((m) => m.header) ?? []

  return (
    <AdminLayout
      title="Import comenzi din Excel"
      parent={{ to: '/admin/comenzi', label: 'Comenzi' }}
      lead="Încarcă un fișier .xlsx sau .csv cu o comandă pe rând. Produsele se dau prin SKU. Rândurile cu erori nu se importă."
      actions={
        <button type="button" className="btn secondary" disabled={templateBusy} onClick={() => { void downloadTemplate() }}>
          {templateBusy ? 'Se generează…' : 'Descarcă model Excel'}
        </button>
      }
    >
      {!isOrdersApiEnabled() ? (
        <section className="panel panel--form">
          <p className="muted">Importul este disponibil când aplicația folosește API-ul de pe server.</p>
        </section>
      ) : (
        <div className="oi">
          {/* Pasul 1 */}
          <section className="panel oi-card">
            <header className="oi-card__head">
              <span className="oi-step">1</span>
              <div>
                <h2 className="oi-card__title">Fișierul</h2>
                <p className="oi-card__lead">
                  Folosește modelul din dreapta sus ca să ai antetul corect. Coloanele obligatorii:{' '}
                  {IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.label).join(', ')}.
                </p>
              </div>
            </header>
            <div
              className={`oi-drop${dropActive ? ' oi-drop--active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDropActive(true) }}
              onDragLeave={() => setDropActive(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void handleFile(f)
                }}
                disabled={parsing || importing}
              />
              <button type="button" className="oi-drop__btn" disabled={parsing || importing} onClick={() => fileInputRef.current?.click()}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M12 16V4M7 9l5-5 5 5" />
                  <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
                <strong>{parsing ? 'Se citește fișierul…' : fileName ?? 'Trage fișierul aici sau apasă pentru a-l alege'}</strong>
                <span className="muted">.xlsx, .xls sau .csv · maxim câteva sute de rânduri</span>
              </button>
            </div>
            {parseError ? <p className="app-status app-status--error" role="alert">{parseError}</p> : null}
            {productsLoading ? <p className="muted small">Se încarcă produsele pentru verificarea SKU-urilor…</p> : null}
          </section>

          {/* Pasul 2: coloane + validare */}
          {parsed ? (
            <section className="panel oi-card">
              <header className="oi-card__head">
                <span className="oi-step">2</span>
                <div>
                  <h2 className="oi-card__title">Verificare</h2>
                  <p className="oi-card__lead">
                    {parsed.rows.length} rânduri cu date · coloane recunoscute: {mappedKeys.size} din {parsed.headers.filter(Boolean).length}
                  </p>
                </div>
              </header>

              {parsed.missingRequired.length > 0 ? (
                <p className="app-status app-status--error" role="alert">
                  Lipsesc coloane obligatorii: {parsed.missingRequired.join(', ')}. Descarcă modelul și folosește antetul lui.
                </p>
              ) : null}
              {unknownHeaders.length > 0 ? (
                <p className="oi-note">
                  Coloane ignorate (nerecunoscute): {unknownHeaders.join(', ')}.
                </p>
              ) : null}

              {rows && rows.length > 0 ? (
                <>
                  <div className="oi-summary">
                    <span className="oi-pill oi-pill--ok">{counts.ok} gata de import</span>
                    <span className="oi-pill oi-pill--warn">{counts.warn} cu avertismente</span>
                    <span className="oi-pill oi-pill--error">{counts.error} cu erori (nu se importă)</span>
                    <span className="oi-pill">
                      total estimat produse: {formatRon(importable.reduce((s, r) => s + r.estimatedSubtotal, 0))}
                    </span>
                  </div>

                  <div className="table-wrap">
                    <table className="data-table oi-table">
                      <thead>
                        <tr>
                          <th scope="col">Rând</th>
                          <th scope="col">Stare</th>
                          <th scope="col">Client</th>
                          <th scope="col">Livrare</th>
                          <th scope="col">Produse</th>
                          <th scope="col">Plată</th>
                          <th scope="col">Rezultat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const status = importRowStatus(r)
                          const result = results.get(r.rowNumber)
                          const isOpen = expanded.has(r.rowNumber)
                          const messages = [...r.errors, ...r.warnings]
                          return (
                            <tr key={r.rowNumber} className={`oi-row oi-row--${status}`}>
                              <td className="oi-mono">{r.rowNumber}</td>
                              <td>
                                <button
                                  type="button"
                                  className={`oi-status oi-status--${status}`}
                                  onClick={() => toggleExpanded(r.rowNumber)}
                                  aria-expanded={isOpen}
                                  disabled={messages.length === 0}
                                >
                                  {status === 'ok' ? 'OK' : status === 'warn' ? `${r.warnings.length} avert.` : `${r.errors.length} erori`}
                                </button>
                                {isOpen && messages.length > 0 ? (
                                  <ul className="oi-messages">
                                    {r.errors.map((m, i) => <li key={`e${i}`} className="oi-messages__error">{m}</li>)}
                                    {r.warnings.map((m, i) => <li key={`w${i}`} className="oi-messages__warn">{m}</li>)}
                                  </ul>
                                ) : null}
                              </td>
                              <td>
                                <span className="oi-main">{[r.firstName, r.lastName].filter(Boolean).join(' ') || '—'}</span>
                                <span className="oi-sub">{r.phone || '—'}{r.email ? ` · ${r.email}` : ''}</span>
                                {r.billingType === 'company' ? <span className="oi-sub">Firmă: {r.companyName} · CUI {r.companyCui}</span> : null}
                              </td>
                              <td>
                                <span className="oi-main">{r.city || '—'}{r.countyName ? `, ${r.countyName}` : ''}</span>
                                <span className="oi-sub">
                                  {[r.street ? `Str. ${r.street}` : '', r.streetNumber ? `nr. ${r.streetNumber}` : '', r.addressExtra].filter(Boolean).join(', ') || '—'}
                                </span>
                                {r.dpdSiteId ? <span className="oi-sub oi-sub--ok">DPD site {r.dpdSiteId}</span> : null}
                              </td>
                              <td>
                                <ul className="oi-items">
                                  {r.items.map((it, i) => (
                                    <li key={i} className={it.product ? '' : 'oi-items__missing'}>
                                      <strong>{it.qty}×</strong> {it.product ? it.product.name : `SKU ${it.sku}?`}
                                      <code>{it.sku}</code>
                                    </li>
                                  ))}
                                  {r.addons.length > 0 ? (
                                    <li className="oi-items__addons">+ {r.addons.join(', ')}</li>
                                  ) : null}
                                </ul>
                                {r.estimatedSubtotal > 0 ? <span className="oi-sub">≈ {formatRon(r.estimatedSubtotal)} + transport</span> : null}
                              </td>
                              <td className="oi-mono">{r.payment === 'card' ? 'card' : 'ramburs'}</td>
                              <td>
                                {result?.state === 'done' ? (
                                  <Link to={`/admin/comenzi?carrier=all&tab=all&q=${encodeURIComponent(result.orderId)}`} className="oi-result oi-result--ok">
                                    #{result.orderId} · {formatRon(result.total)}
                                  </Link>
                                ) : result?.state === 'failed' ? (
                                  <span className="oi-result oi-result--error" title={result.error}>{result.error}</span>
                                ) : result?.state === 'running' ? (
                                  <span className="oi-result">se creează…</span>
                                ) : result?.state === 'pending' ? (
                                  <span className="oi-result muted">în așteptare</span>
                                ) : status === 'error' ? (
                                  <span className="oi-result muted">se sare</span>
                                ) : status === 'warn' && !includeWarnings ? (
                                  <span className="oi-result muted">exclus</span>
                                ) : null}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : rows && rows.length === 0 && parsed.missingRequired.length === 0 ? (
                <p className="muted">Fișierul nu conține rânduri cu date sub antet.</p>
              ) : null}
            </section>
          ) : null}

          {/* Pasul 3: import */}
          {rows && rows.length > 0 && parsed?.missingRequired.length === 0 ? (
            <section className="panel oi-card oi-card--sticky">
              <header className="oi-card__head">
                <span className="oi-step">3</span>
                <div>
                  <h2 className="oi-card__title">Import</h2>
                  <p className="oi-card__lead">
                    Comenzile se creează cu status „În așteptare”, plată ramburs sau card conform fișierului, iar stocul se scade ca la o comandă normală.
                  </p>
                </div>
              </header>
              <div className="oi-options">
                <label className="oi-check">
                  <input type="checkbox" checked={includeWarnings} onChange={(e) => setIncludeWarnings(e.target.checked)} disabled={importing} />
                  <span>Importă și rândurile cu avertismente ({counts.warn})</span>
                </label>
                <label className="oi-check">
                  <input type="checkbox" checked={sendEmails} onChange={(e) => setSendEmails(e.target.checked)} disabled={importing} />
                  <span>Trimite email de confirmare clienților care au email</span>
                </label>
              </div>
              <div className="oi-actions">
                {!finished ? (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={importing || importable.length === 0 || productsLoading}
                    onClick={() => { void runImport() }}
                  >
                    {importing
                      ? `Se importă… ${done + failed} / ${results.size}`
                      : `Importă ${importable.length} ${importable.length === 1 ? 'comandă' : 'comenzi'}`}
                  </button>
                ) : (
                  <>
                    <span className={`oi-pill ${failed === 0 ? 'oi-pill--ok' : 'oi-pill--warn'}`}>
                      Gata: {done} create{failed > 0 ? `, ${failed} eșuate (vezi coloana Rezultat)` : ''}
                    </span>
                    <Link to="/admin/comenzi?carrier=all&tab=waiting" className="btn primary">
                      Vezi comenzile importate →
                    </Link>
                    <button type="button" className="btn secondary" onClick={() => { setParsed(null); setRows(null); setResults(new Map()); setFileName(null) }}>
                      Alt fișier
                    </button>
                  </>
                )}
                {importing ? (
                  <progress className="oi-progress" max={results.size} value={done + failed} />
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </AdminLayout>
  )
}
