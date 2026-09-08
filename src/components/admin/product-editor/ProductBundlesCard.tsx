import type { BundleOffer } from '../../../types/product'
import { formatRon } from '../../../lib/shopCatalog'

type Props = {
  salePrice: number
  offers: BundleOffer[]
  onChange: (offers: BundleOffer[]) => void
}

const QTYS: Array<2 | 3> = [2, 3]

function offerFor(offers: BundleOffer[], qty: 2 | 3, salePrice: number): BundleOffer {
  const existing = offers.find((o) => o.qty === qty)
  if (existing) {
    return {
      qty,
      enabled: Boolean(existing.enabled),
      mode: existing.mode === 'percent_off' ? 'percent_off' : 'fixed_total',
      value: Number.isFinite(existing.value) ? existing.value : salePrice * qty,
      title: existing.title,
      badge: existing.badge,
    }
  }
  return {
    qty,
    enabled: false,
    mode: 'fixed_total',
    value: Math.round(salePrice * qty * 100) / 100,
  }
}

function bundleTotal(offer: BundleOffer, salePrice: number): number | null {
  if (!(offer.value > 0)) return null
  if (offer.mode === 'fixed_total') return offer.value
  const pct = Math.min(99, Math.max(0, offer.value))
  return Math.round(salePrice * offer.qty * (1 - pct / 100) * 100) / 100
}

/** Card „Pachete”: oferte 2 / 3 bucăți afișate pe pagina produsului. */
export function ProductBundlesCard({ salePrice, offers, onChange }: Props) {
  function patch(qty: 2 | 3, patchValue: Partial<BundleOffer>) {
    const prev = offerFor(offers, qty, salePrice)
    const next: BundleOffer = { ...prev, ...patchValue, qty }
    const without = offers.filter((o) => o.qty !== qty)
    onChange([...without, next].sort((a, b) => a.qty - b.qty))
  }

  return (
    <section className="pe-card" aria-labelledby="pe-bundles-title">
      <header className="pe-card__head">
        <div>
          <h2 id="pe-bundles-title" className="pe-card__title">
            Pachete (2 / 3 bucăți)
          </h2>
          <p className="pe-card__lead">
            Opțiuni de cantitate cu preț total fix sau discount procentual, afișate
            pe pagina produsului sub preț.
          </p>
        </div>
      </header>

      <div className="pe-bundles">
        {QTYS.map((qty) => {
          const offer = offerFor(offers, qty, salePrice)
          const total = bundleTotal(offer, salePrice)
          const base = salePrice * qty
          const saving = total !== null && base > 0 ? Math.max(0, base - total) : 0
          const invalid = offer.enabled && !(offer.value > 0)
          return (
            <div
              key={qty}
              className={`pe-bundle${offer.enabled ? ' pe-bundle--on' : ''}`}
            >
              <label className="pe-switch">
                <input
                  type="checkbox"
                  checked={offer.enabled}
                  onChange={(e) => patch(qty, { enabled: e.target.checked })}
                />
                <span className="pe-switch__track" aria-hidden="true" />
                <span className="pe-switch__label">
                  Pachet {qty} bucăți
                  {offer.enabled && total !== null ? (
                    <span className="pe-bundle__summary">
                      {formatRon(total)} în loc de {formatRon(base)}
                      {saving > 0 ? ` · economie ${formatRon(saving)}` : ''}
                    </span>
                  ) : null}
                </span>
              </label>

              {offer.enabled ? (
                <div className="pe-bundle__fields">
                  <label className="field">
                    <span>Tip ofertă</span>
                    <select
                      value={offer.mode}
                      onChange={(e) => {
                        const mode =
                          e.target.value === 'percent_off' ? 'percent_off' : 'fixed_total'
                        patch(qty, {
                          mode,
                          value:
                            mode === 'percent_off'
                              ? Math.min(99, Math.max(1, Math.round(offer.value || 10)))
                              : Math.round((offer.value || salePrice * qty) * 100) / 100,
                        })
                      }}
                    >
                      <option value="fixed_total">Preț total fix (RON)</option>
                      <option value="percent_off">Discount (%)</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>
                      {offer.mode === 'percent_off' ? 'Discount (%)' : `Total pentru ${qty} buc (RON)`}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min={0}
                      value={offer.value}
                      onChange={(e) => patch(qty, { value: Number(e.target.value) })}
                      aria-invalid={invalid || undefined}
                    />
                  </label>
                  <label className="field">
                    <span>Etichetă</span>
                    <select
                      value={offer.badge ?? ''}
                      onChange={(e) =>
                        patch(qty, {
                          badge:
                            e.target.value === 'popular' || e.target.value === 'best'
                              ? (e.target.value as BundleOffer['badge'])
                              : undefined,
                        })
                      }
                    >
                      <option value="">Fără</option>
                      <option value="popular">Popular</option>
                      <option value="best">Cea mai bună ofertă</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Titlu (opțional)</span>
                    <input
                      type="text"
                      placeholder={`Pachet ${qty} bucăți`}
                      value={offer.title ?? ''}
                      onChange={(e) => patch(qty, { title: e.target.value })}
                    />
                  </label>
                  {invalid ? (
                    <p className="pe-field-error">
                      Completează o valoare mai mare decât 0, altfel pachetul nu se salvează.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
