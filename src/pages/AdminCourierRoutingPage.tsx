import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { CourierNav } from '../components/admin/couriers/CourierNav'
import { Donut, Legend } from '../components/admin/couriers/charts'
import {
  backtestRouting,
  carrierColor,
  carrierLabel,
  fetchRouting,
  fmtPct,
  isCouriersApiEnabled,
  saveCourierSettings,
  saveRoutingSettings,
  simulateRouting,
  type BacktestResponse,
  type CourierSettingFull,
  type RankRow,
  type RoutingResponse,
  type SimulateInput,
  type SimulateResponse,
} from '../lib/couriersApi'
import { formatRon } from '../lib/shopCatalog'
import './AdminCourierPanels.css'

type Settings = Record<string, string>

const WEIGHTS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'pondere_timp', label: 'Timp de livrare', hint: '100 / zile lucrătoare medii' },
  { key: 'pondere_retur', label: 'Rată retur', hint: '100 − 3 × retur %' },
  { key: 'pondere_la_timp', label: 'Livrare la timp', hint: '% la timp în zonă' },
  { key: 'pondere_cost', label: 'Cost', hint: 'cel mai ieftin = 100' },
]

const OPTIONS: Array<{ key: string; label: string; hint: string; type: 'int' | 'float' | 'bool' | 'retur' }> = [
  { key: 'zile_istoric', label: 'Zile istoric', hint: 'fereastra de performanță, după data ridicării', type: 'int' },
  { key: 'min_awb_localitate', label: 'Min. AWB localitate', hint: 'sub acest număr se judecă județul', type: 'int' },
  { key: 'min_awb_judet', label: 'Min. AWB județ', hint: 'sub acest număr: „șansă nouă”', type: 'int' },
  { key: 'prag_preferat', label: 'Prag preferat (% la timp)', hint: 'preferatul câștigă doar peste prag', type: 'int' },
  { key: 'deviatie_pret', label: 'Deviație preț preferat (%)', hint: 'toleranța față de cel mai ieftin', type: 'float' },
  { key: 'deviatie_pret_fix', label: 'Deviație preț fixă (lei)', hint: 'adăugată la toleranță', type: 'float' },
  { key: 'ora_cutoff', label: 'Oră cutoff ridicare', hint: 'AWB după această oră = ridicat a doua zi', type: 'int' },
  { key: 'sync_interval_min', label: 'Sincronizare tracking (min)', hint: 'cât timp admin-ul e deschis', type: 'int' },
  { key: 'sambata_optional', label: 'Sâmbăta e opțională', hint: 'nu descalifică un curier fără livrare sâmbăta', type: 'bool' },
  { key: 'deschidere_optional', label: 'Deschiderea coletului e opțională', hint: 'nu descalifică un curier fără deschidere', type: 'bool' },
  { key: 'retur_mod', label: 'Rata retur în scor', hint: 'ca la Innoship sau cu refuzurile la livrare', type: 'retur' },
]

function levelTone(level: number): string {
  if (level === 1) return 'good'
  if (level === 2) return 'mid'
  if (level === 3) return 'warn'
  return 'bad'
}

function RankTable({ sim }: { sim: SimulateResponse }) {
  return (
    <div className="cd-scroll">
      <table className="data-table cr-rank">
        <thead>
          <tr>
            <th>#</th>
            <th>Curier</th>
            <th>Nivel</th>
            <th>Scor</th>
            <th className="cr-num">Timp</th>
            <th className="cr-num">Retur</th>
            <th className="cr-num">La timp</th>
            <th className="cr-num">Cost</th>
            <th>Zonă</th>
            <th>Motive</th>
          </tr>
        </thead>
        <tbody>
          {sim.ranking.map((r: RankRow, i) => (
            <tr key={r.carrier} className={r.carrier === sim.recommended ? 'cr-rank__rec' : r.disqualified ? 'cr-rank__disq' : ''}>
              <td>{i + 1}</td>
              <td>
                <span className="cd-dot" style={{ background: carrierColor(r.carrier) }} />
                <strong>{r.name}</strong>
                {r.carrier === sim.recommended ? <span className="cr-pill cr-pill--good">recomandat</span> : null}
              </td>
              <td>
                <span className={`cr-pill cr-pill--${levelTone(r.level)}`}>
                  {r.level} · {r.levelLabel}
                </span>
              </td>
              <td>
                <div className="cr-score">
                  <div className="cr-score__track">
                    <div className="cr-score__fill" style={{ width: `${(r.score / Math.max(1, r.scoreMax)) * 100}%`, background: carrierColor(r.carrier) }} />
                  </div>
                  <strong>
                    {r.score} / {r.scoreMax}
                  </strong>
                </div>
              </td>
              <td className="cr-num">
                <strong>{r.sub.timp}</strong>
                <small>{r.zone.zile === null ? '?' : `${r.zone.zile} zl`}</small>
              </td>
              <td className="cr-num">
                <strong>{r.sub.retur}</strong>
                <small>{r.zone.retur === null ? '?' : fmtPct(r.zone.retur)}</small>
              </td>
              <td className="cr-num">
                <strong>{r.sub.laTimp}</strong>
                <small>{r.zone.laTimp === null ? '?' : fmtPct(r.zone.laTimp)}</small>
              </td>
              <td className="cr-num">
                <strong>{r.sub.cost}</strong>
                <small>{r.cost === null ? 'fără preț' : formatRon(r.cost)}</small>
              </td>
              <td>
                <span className="cr-zone">{r.zone.level === 'nou' ? 'șansă nouă' : r.zone.level}</span>
                <small className="muted"> · {r.zone.n} AWB</small>
              </td>
              <td>
                <ul className="cr-reasons">
                  {r.reasons.map((m, j) => (
                    <li key={j}>{m}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdminCourierRoutingPage() {
  const [data, setData] = useState<RoutingResponse | null>(null)
  const [settings, setSettings] = useState<Settings>({})
  const [couriers, setCouriers] = useState<CourierSettingFull[]>([])
  const [loading, setLoading] = useState(isCouriersApiEnabled())
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sim, setSim] = useState<SimulateResponse | null>(null)
  const [simBusy, setSimBusy] = useState(false)
  const [simInput, setSimInput] = useState<SimulateInput>({ county: 'B', city: '', kg: 1, cod: 200, parcels: 1, saturday: false, opening: false })
  const [bt, setBt] = useState<BacktestResponse | null>(null)
  const [btBusy, setBtBusy] = useState(false)

  useEffect(() => {
    if (!isCouriersApiEnabled()) return
    let cancelled = false
    fetchRouting()
      .then((d) => {
        if (cancelled) return
        setData(d)
        setSettings(d.settings)
        setCouriers(d.couriers)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Nu am putut încărca setările.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const scoreMax = useMemo(() => WEIGHTS.reduce((s, w) => s + (Number(settings[w.key]) || 0), 0), [settings])

  function setSetting(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }))
  }

  function patchCourier(carrier: string, patch: Partial<CourierSettingFull>) {
    setCouriers((list) => list.map((c) => (c.carrier === carrier ? { ...c, ...patch } : c)))
  }

  function patchService(carrier: string, key: 'ramburs' | 'sambata' | 'deschidere_colet', on: boolean) {
    setCouriers((list) => list.map((c) => (c.carrier === carrier ? { ...c, services: { ...c.services, [key]: on ? 1 : 0 } } : c)))
  }

  async function saveAll() {
    if (saving) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await saveRoutingSettings(settings)
      const r = await saveCourierSettings(couriers)
      setCouriers(r.couriers)
      setNotice('Setările de rutare au fost salvate.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Salvarea a eșuat.')
    } finally {
      setSaving(false)
    }
  }

  async function runSim() {
    if (simBusy) return
    setSimBusy(true)
    setError(null)
    try {
      setSim(await simulateRouting(simInput))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Simularea a eșuat.')
    } finally {
      setSimBusy(false)
    }
  }

  async function runBacktest() {
    if (btBusy) return
    setBtBusy(true)
    setError(null)
    try {
      setBt(await backtestRouting(30))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Comparația a eșuat.')
    } finally {
      setBtBusy(false)
    }
  }

  const countyOptions = useMemo(() => Object.entries(data?.counties ?? {}).sort((a, b) => a[1].localeCompare(b[1], 'ro')), [data])

  return (
    <AdminLayout
      title="Rutare curieri"
      lead="Ponderile, curierii și pragurile după care se alege curierul unei comenzi. Simulatorul arată clasamentul pentru orice destinație."
      parent={{ to: '/admin/curieri', label: 'Curieri' }}
      actions={
        <button type="button" className="btn primary" disabled={saving || loading} onClick={() => void saveAll()}>
          {saving ? 'Se salvează…' : 'Salvează setările'}
        </button>
      }
    >
      {!isCouriersApiEnabled() ? (
        <section className="panel panel--form">
          <p className="muted">Disponibil când aplicația folosește API-ul de pe server.</p>
        </section>
      ) : (
        <div className="cr">
          <CourierNav active="rutare" />
          {error ? <p className="app-status app-status--error" role="alert">{error}</p> : null}
          {notice ? <p className="app-status app-status--ok" role="status">{notice}</p> : null}
          {loading ? (
            <p className="cd-empty">Se încarcă…</p>
          ) : (
            <>
              <div className="cr-grid">
                <section className="panel cr-panel">
                  <header className="cr-panel__head">
                    <h2>Ponderi</h2>
                    <span className="muted">
                      scor maxim <strong>{scoreMax}</strong> · nivel: preferat → normal → scump → descalificat
                    </span>
                  </header>
                  <div className="cr-weights">
                    {WEIGHTS.map((w) => {
                      const v = Number(settings[w.key]) || 0
                      return (
                        <label key={w.key} className="cr-weight">
                          <span className="cr-weight__head">
                            <span>{w.label}</span>
                            <small className="muted">{w.hint}</small>
                          </span>
                          <span className="cr-weight__ctrl">
                            <input type="range" min={0} max={100} step={5} value={v} onChange={(e) => setSetting(w.key, e.target.value)} />
                            <input type="number" min={0} max={100} value={v} onChange={(e) => setSetting(w.key, e.target.value)} />
                          </span>
                          <span className="cr-weight__bar">
                            <span style={{ width: `${scoreMax > 0 ? (v / scoreMax) * 100 : 0}%` }} />
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </section>

                <section className="panel cr-panel">
                  <header className="cr-panel__head">
                    <h2>Opțiuni</h2>
                    <span className="muted">
                      istoric folosit: {data?.historyRows ?? 0} AWB (
                      {Object.entries(data?.historyByCarrier ?? {})
                        .map(([c, n]) => `${carrierLabel(c)} ${n}`)
                        .join(', ') || 'niciunul'}
                      )
                    </span>
                  </header>
                  <div className="cr-options">
                    {OPTIONS.map((o) => (
                      <label key={o.key} className="cr-option">
                        <span className="cr-option__label">
                          {o.label}
                          <small className="muted">{o.hint}</small>
                        </span>
                        {o.type === 'bool' ? (
                          <input type="checkbox" checked={settings[o.key] === '1'} onChange={(e) => setSetting(o.key, e.target.checked ? '1' : '0')} />
                        ) : o.type === 'retur' ? (
                          <select value={settings[o.key] ?? 'innoship'} onChange={(e) => setSetting(o.key, e.target.value)}>
                            <option value="innoship">Innoship (doar returnate)</option>
                            <option value="toate">Toate (returnate + refuzate)</option>
                          </select>
                        ) : (
                          <input type="number" step={o.type === 'float' ? 0.01 : 1} min={0} value={settings[o.key] ?? ''} onChange={(e) => setSetting(o.key, e.target.value)} />
                        )}
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              <section className="panel cr-panel">
                <header className="cr-panel__head">
                  <h2>Curieri</h2>
                  <span className="muted">Termenul implicit intră în „la timp” (zile lucrătoare de la ridicare). Limita pe zi contorizează AWB-urile emise azi.</span>
                </header>
                <div className="cd-scroll">
                  <table className="data-table cr-couriers">
                    <thead>
                      <tr>
                        <th>Activ</th>
                        <th>Curier</th>
                        <th>Tip prioritate</th>
                        <th>Prioritate</th>
                        <th>Termen implicit</th>
                        <th>Greutate min</th>
                        <th>Greutate max</th>
                        <th>Limită / zi</th>
                        <th>Servicii</th>
                      </tr>
                    </thead>
                    <tbody>
                      {couriers.map((c) => (
                        <tr key={c.carrier} className={Number(c.active) === 1 ? '' : 'cr-couriers__off'}>
                          <td>
                            <input type="checkbox" checked={Number(c.active) === 1} onChange={(e) => patchCourier(c.carrier, { active: e.target.checked ? 1 : 0 })} />
                          </td>
                          <td>
                            <span className="cd-dot" style={{ background: carrierColor(c.carrier) }} />
                            <strong>{c.name}</strong>
                          </td>
                          <td>
                            <select value={c.priority_type} onChange={(e) => patchCourier(c.carrier, { priority_type: e.target.value })}>
                              <option value="preferat">Preferat</option>
                              <option value="normal">Normal</option>
                              <option value="scump">Scump</option>
                            </select>
                          </td>
                          <td>
                            <input type="number" min={1} value={c.priority} onChange={(e) => patchCourier(c.carrier, { priority: Number(e.target.value) })} />
                          </td>
                          <td>
                            <span className="cr-inline">
                              <input type="number" min={1} max={10} value={c.sla_days} onChange={(e) => patchCourier(c.carrier, { sla_days: Number(e.target.value) })} />
                              <small>zile lucr.</small>
                            </span>
                          </td>
                          <td>
                            <span className="cr-inline">
                              <input type="number" min={0} step={0.1} value={c.weight_min ?? ''} placeholder="—" onChange={(e) => patchCourier(c.carrier, { weight_min: e.target.value })} />
                              <small>kg</small>
                            </span>
                          </td>
                          <td>
                            <span className="cr-inline">
                              <input type="number" min={0} step={0.1} value={c.weight_max ?? ''} placeholder="—" onChange={(e) => patchCourier(c.carrier, { weight_max: e.target.value })} />
                              <small>kg</small>
                            </span>
                          </td>
                          <td>
                            <span className="cr-inline">
                              <input
                                type="number"
                                min={0}
                                value={c.daily_limit ?? ''}
                                placeholder="—"
                                onChange={(e) => patchCourier(c.carrier, { daily_limit: e.target.value === '' ? null : Number(e.target.value) })}
                              />
                              <small>azi {data?.todayCounts[c.carrier] ?? 0}</small>
                            </span>
                          </td>
                          <td>
                            <div className="cr-services">
                              {(
                                [
                                  ['ramburs', 'Ramburs'],
                                  ['sambata', 'Sâmbătă'],
                                  ['deschidere_colet', 'Deschidere colet'],
                                ] as Array<['ramburs' | 'sambata' | 'deschidere_colet', string]>
                              ).map(([k, label]) => (
                                <label key={k}>
                                  <input type="checkbox" checked={Number(c.services?.[k] ?? 0) === 1} onChange={(e) => patchService(c.carrier, k, e.target.checked)} />
                                  {label}
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel cr-panel">
                <header className="cr-panel__head">
                  <h2>Simulator</h2>
                  <span className="muted">Clasamentul pe care l-ar da motorul pentru o expediere, cu istoricul și setările de acum (nesalvate încă nu contează).</span>
                </header>
                <form
                  className="cr-sim"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void runSim()
                  }}
                >
                  <label>
                    <span>Județ</span>
                    <select value={simInput.county} onChange={(e) => setSimInput((s) => ({ ...s, county: e.target.value }))}>
                      {countyOptions.map(([code, name]) => (
                        <option key={code} value={code}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Localitate</span>
                    <input type="text" value={simInput.city} placeholder="opțional" onChange={(e) => setSimInput((s) => ({ ...s, city: e.target.value }))} />
                  </label>
                  <label>
                    <span>Greutate (kg)</span>
                    <input type="number" min={0.1} step={0.1} value={simInput.kg} onChange={(e) => setSimInput((s) => ({ ...s, kg: Number(e.target.value) }))} />
                  </label>
                  <label>
                    <span>Ramburs (lei)</span>
                    <input type="number" min={0} step={1} value={simInput.cod} onChange={(e) => setSimInput((s) => ({ ...s, cod: Number(e.target.value) }))} />
                  </label>
                  <label>
                    <span>Colete</span>
                    <input type="number" min={1} value={simInput.parcels} onChange={(e) => setSimInput((s) => ({ ...s, parcels: Number(e.target.value) }))} />
                  </label>
                  <label className="cr-sim__check">
                    <input type="checkbox" checked={simInput.saturday} onChange={(e) => setSimInput((s) => ({ ...s, saturday: e.target.checked }))} />
                    <span>Livrare sâmbătă</span>
                  </label>
                  <label className="cr-sim__check">
                    <input type="checkbox" checked={simInput.opening} onChange={(e) => setSimInput((s) => ({ ...s, opening: e.target.checked }))} />
                    <span>Deschidere colet</span>
                  </label>
                  <button type="submit" className="btn primary" disabled={simBusy}>
                    {simBusy ? 'Se calculează…' : 'Calculează'}
                  </button>
                </form>
                {sim ? (
                  <>
                    <p className="cr-sim__summary">
                      {sim.countyName || sim.county}
                      {sim.city ? `, ${sim.city}` : ''} · recomandat:{' '}
                      <strong>{sim.recommended ? carrierLabel(sim.recommended) : 'niciun curier eligibil'}</strong> · cel mai ieftin{' '}
                      {sim.costMin === null ? '—' : formatRon(sim.costMin)} · {sim.historyRows} AWB în istoric
                    </p>
                    <RankTable sim={sim} />
                  </>
                ) : null}
              </section>

              <section className="panel cr-panel">
                <header className="cr-panel__head">
                  <h2>Ultimele 30 de zile: real vs. estimare</h2>
                  <span className="muted">Cum ar fi alocat motorul AWB-urile din ultimele 30 de zile, față de curierul folosit efectiv.</span>
                  <button type="button" className="btn secondary" disabled={btBusy} onClick={() => void runBacktest()}>
                    {btBusy ? 'Se calculează…' : 'Rulează comparația'}
                  </button>
                </header>
                {bt ? (
                  <div className="cr-bt">
                    <div className="cr-bt__chart">
                      <h3>Real</h3>
                      <Donut
                        size={120}
                        thickness={16}
                        segments={Object.entries(bt.actual).map(([c, n]) => ({ value: n, color: carrierColor(c), label: carrierLabel(c) }))}
                        center={<strong>{bt.n}</strong>}
                      />
                      <Legend items={Object.entries(bt.actual).map(([c, n]) => ({ color: carrierColor(c), label: carrierLabel(c), value: `${n} · ${fmtPct(bt.n ? (n / bt.n) * 100 : null, 0)}` }))} />
                      <p className="muted small">cost mediu real {bt.actualAvgCost === null ? '—' : formatRon(bt.actualAvgCost)}</p>
                    </div>
                    <div className="cr-bt__chart">
                      <h3>Estimare motor</h3>
                      <Donut
                        size={120}
                        thickness={16}
                        segments={Object.entries(bt.estimated).map(([c, n]) => ({ value: n, color: carrierColor(c), label: carrierLabel(c) }))}
                        center={<strong>{bt.n}</strong>}
                      />
                      <Legend
                        items={Object.entries(bt.estimated).map(([c, n]) => ({ color: carrierColor(c), label: carrierLabel(c), value: `${n} · ${fmtPct(bt.n ? (n / bt.n) * 100 : null, 0)}` }))}
                      />
                      <p className="muted small">cost mediu estimat {bt.estimatedAvgCost === null ? '—' : formatRon(bt.estimatedAvgCost)}</p>
                    </div>
                    <div className="cr-bt__facts">
                      <div>
                        <span>Aceeași alegere</span>
                        <strong>{fmtPct(bt.agreementPct)}</strong>
                      </div>
                      <div>
                        <span>Judecat pe localitate</span>
                        <strong>{bt.zoneLevels.localitate ?? 0}</strong>
                      </div>
                      <div>
                        <span>Judecat pe județ</span>
                        <strong>{bt.zoneLevels.judet ?? 0}</strong>
                      </div>
                      <div>
                        <span>Șansă nouă</span>
                        <strong>{bt.zoneLevels.nou ?? 0}</strong>
                      </div>
                      <p className="muted small">Estimarea folosește istoricul de azi pentru toate AWB-urile (orientativ). Costul estimat vine din tarifele din contract.</p>
                    </div>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </div>
      )}
    </AdminLayout>
  )
}
