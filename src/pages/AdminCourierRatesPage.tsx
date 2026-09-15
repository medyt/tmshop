import { useEffect, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { CourierNav } from '../components/admin/couriers/CourierNav'
import { SegmentBar } from '../components/admin/couriers/charts'
import { carrierColor, carrierLabel, fetchRates, isCouriersApiEnabled, saveRates, type RateCarrier, type RatesResponse } from '../lib/couriersApi'
import { formatRon } from '../lib/shopCatalog'
import './AdminCourierPanels.css'

type Draft = Record<string, string>

function toDraft(c: RateCarrier): Draft {
  const d: Draft = {}
  for (const f of c.fields) {
    const v = c.values[f.key]
    d[f.key] = v === null || v === undefined ? '' : String(v)
  }
  return d
}

function RateCard({ c, days, onSaved }: { c: RateCarrier; days: number; onSaved: (r: RatesResponse, msg: string) => void }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(c))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const diff = c.avgRealPaired !== null && c.avgEstimatePaired !== null ? c.avgRealPaired - c.avgEstimatePaired : null
  const diffPct = diff !== null && c.avgEstimatePaired ? (diff / c.avgEstimatePaired) * 100 : null

  async function save() {
    if (saving) return
    setSaving(true)
    setErr(null)
    try {
      const rates: Record<string, number | null> = {}
      for (const f of c.fields) rates[f.key] = draft[f.key] === '' ? null : Number(draft[f.key])
      const r = await saveRates(c.carrier, rates, days)
      onSaved(r.report, `Tarifele ${carrierLabel(c.carrier)} au fost salvate.`)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Salvarea a eșuat.')
    } finally {
      setSaving(false)
    }
  }

  const weightEntries = Object.entries(c.weights)
  const surcharges = c.fields
    .filter((f) => !['vat_percent', 'base_kg', 'base_under_3kg', 'door_to_door_under_3kg'].includes(f.key))
    .map((f) => ({ f, v: c.values[f.key] }))
    .filter((x) => x.v !== null && x.v !== 0)

  return (
    <article className="ct-card" style={{ borderTopColor: carrierColor(c.carrier) }}>
      <header className="ct-card__head">
        <div>
          <h2>{carrierLabel(c.carrier)}</h2>
          <span className={`cr-pill ${c.source === 'db' ? 'cr-pill--good' : 'cr-pill--mid'}`}>{c.source === 'db' ? 'tarife editate în admin' : 'tarife din config.php'}</span>
        </div>
        <div className="ct-card__stats">
          <div>
            <span>Cost real mediu</span>
            <strong>{c.avgReal === null ? '—' : formatRon(c.avgReal)}</strong>
            <small>{c.realN} AWB cu preț din API</small>
          </div>
          <div>
            <span>Estimare contract</span>
            <strong>{c.avgEstimatePaired === null ? '—' : formatRon(c.avgEstimatePaired)}</strong>
            <small>pe aceleași AWB-uri</small>
          </div>
          <div>
            <span>Diferență</span>
            <strong className={diff === null ? '' : diff > 0.5 ? 'ct-bad' : diff < -0.5 ? 'ct-good' : ''}>
              {diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)} lei`}
            </strong>
            <small>{diffPct === null ? '' : `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(0)} % față de contract`}</small>
          </div>
          <div>
            <span>Volum {days} zile</span>
            <strong>{c.n} AWB</strong>
            <small>
              {formatRon(c.sumReal)} facturat · {c.minReal === null ? '—' : formatRon(c.minReal)} – {c.maxReal === null ? '—' : formatRon(c.maxReal)}
            </small>
          </div>
        </div>
      </header>

      {surcharges.length > 0 ? (
        <div className="ct-chips">
          {surcharges.map(({ f, v }) => (
            <span key={f.key} className="ct-chip">
              {f.label}: <strong>{v}</strong> {f.unit}
            </span>
          ))}
        </div>
      ) : null}

      <div className="ct-body">
        <form
          className="ct-form"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          {c.fields.map((f) => (
            <label key={f.key} className="ct-field">
              <span>{f.label}</span>
              <span className="ct-field__ctrl">
                <input type="number" step={0.01} min={0} value={draft[f.key] ?? ''} placeholder="—" onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
                <small>{f.unit}</small>
              </span>
            </label>
          ))}
          {err ? <p className="app-status app-status--error">{err}</p> : null}
          <div className="ct-form__actions">
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Se salvează…' : 'Salvează tarifele'}
            </button>
            <span className="muted small">Fără TVA, ca în contract. TVA se adaugă o singură dată la final.</span>
          </div>
        </form>
        <div className="ct-side">
          <h3>Preț estimat cu TVA (1 colet, ramburs)</h3>
          <table className="cd-mini">
            <tbody>
              {Object.entries(c.sample).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className="cd-num">
                    <strong>{formatRon(v)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Greutăți declarate ({days} zile)</h3>
          {weightEntries.length === 0 ? (
            <p className="muted small">Fără expedieri.</p>
          ) : (
            <>
              <SegmentBar
                height={10}
                segments={weightEntries.map(([kg, n], i) => ({ value: n, color: i % 2 ? '#93c5fd' : '#2563eb', label: `≤ ${kg} kg` }))}
              />
              <p className="muted small">
                {weightEntries
                  .slice(0, 6)
                  .map(([kg, n]) => `≤ ${kg} kg: ${n}`)
                  .join(' · ')}
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

export function AdminCourierRatesPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<RatesResponse | null>(null)
  const [loading, setLoading] = useState(isCouriersApiEnabled())
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!isCouriersApiEnabled()) return
    let cancelled = false
    fetchRates(days)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Nu am putut încărca tarifele.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days])

  return (
    <AdminLayout
      title="Tarife curieri"
      lead="Tarifele din contract (fără TVA) folosite la estimarea costului, față în față cu prețul real returnat de API la emiterea AWB-ului."
      parent={{ to: '/admin/curieri', label: 'Curieri' }}
    >
      {!isCouriersApiEnabled() ? (
        <section className="panel panel--form">
          <p className="muted">Disponibil când aplicația folosește API-ul de pe server.</p>
        </section>
      ) : (
        <div className="ct">
          <CourierNav active="tarife" />
          {error ? <p className="app-status app-status--error" role="alert">{error}</p> : null}
          {notice ? <p className="app-status app-status--ok" role="status">{notice}</p> : null}
          <section className="cd-filters">
            <div className="ao-filter">
              <span className="ao-filter__label">Perioadă</span>
              <div className="ao-filter__body">
                <div className="ao-seg" role="group">
                  {[30, 90, 365].map((d) => (
                    <button key={d} type="button" className={`ao-seg__btn${days === d ? ' ao-seg__btn--active' : ''}`} onClick={() => setDays(d)}>
                      {d === 365 ? '1 an' : `${d} zile`}
                    </button>
                  ))}
                </div>
                <span className="ao-filter__summary">pentru costul real vs. estimat</span>
              </div>
            </div>
          </section>
          {loading || !data ? (
            <p className="cd-empty">Se încarcă…</p>
          ) : (
            Object.values(data.carriers).map((c) => (
              <RateCard
                key={`${c.carrier}-${days}-${c.source}`}
                c={c}
                days={days}
                onSaved={(r, msg) => {
                  setData(r)
                  setNotice(msg)
                }}
              />
            ))
          )}
        </div>
      )}
    </AdminLayout>
  )
}
