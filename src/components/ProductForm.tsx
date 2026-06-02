import { useId, useRef, useState } from 'react'
import {
  createEmptyProduct,
  type CostSupplier,
  type MarketObservation,
  type Product,
} from '../types/product'
import {
  productCost,
  productMarginPercent,
  productProfit,
} from '../lib/productMath'
import {
  clampImageUrls,
  MAX_IMAGES_PER_PRODUCT,
} from '../lib/productImages'
import { ProductImage } from './ProductImage'
import { proposedPriceAverageFromObservations } from '../lib/proposedPrice'
import {
  formatRon,
  productCompareAtPrice,
  productDiscountPercent,
} from '../lib/shopCatalog'

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 50] as const

type Mode = { kind: 'new' } | { kind: 'edit'; product: Product }

function draftFromMode(mode: Mode): Omit<Product, 'id'> {
  if (mode.kind === 'edit') {
    const p = mode.product
    return {
      name: p.name,
      sku: p.sku ?? '',
      supplierPriceA: p.supplierPriceA,
      supplierPriceB: p.supplierPriceB,
      costSupplier: p.costSupplier,
      salePrice: p.salePrice,
      discountPercent: p.discountPercent ?? 0,
      stockQty: p.stockQty ?? 0,
      imageUrls: [...p.imageUrls],
      description: p.description ?? '',
      marketObservations: [...(p.marketObservations ?? [])],
      notes: p.notes ?? '',
    }
  }
  return createEmptyProduct()
}

type Props = {
  mode: Mode
  onSave: (p: Product) => void
  onDelete?: (id: string) => void
  onCancel: () => void
  /** În modal: fără blocul lung „mod de lucru” + antet cu închidere */
  variant?: 'default' | 'modal'
}

function normalizeProductDraft(
  draft: Omit<Product, 'id'>,
  id: string,
): Product {
  return {
    id,
    name: draft.name.trim() || 'Fără nume',
    sku: draft.sku?.trim() || undefined,
    supplierPriceA: Number.isFinite(draft.supplierPriceA)
      ? draft.supplierPriceA
      : 0,
    supplierPriceB: Number.isFinite(draft.supplierPriceB)
      ? draft.supplierPriceB
      : 0,
    costSupplier: draft.costSupplier,
    salePrice: Number.isFinite(draft.salePrice) ? draft.salePrice : 0,
    discountPercent: (() => {
      const value = draft.discountPercent ?? 0
      if (!Number.isFinite(value) || value <= 0) return 0
      return Math.min(99, Math.max(0, Math.round(value * 100) / 100))
    })(),
    stockQty: (() => {
      const q = draft.stockQty
      const n = typeof q === 'number' && Number.isFinite(q) ? q : 0
      return Math.max(0, Math.floor(n))
    })(),
    imageUrls: clampImageUrls(draft.imageUrls),
    description: draft.description?.trim() || undefined,
    marketObservations: (() => {
      const obs = (draft.marketObservations ?? [])
        .map((o) => ({
          price: o.price,
          sourceUrl: o.sourceUrl?.trim() || undefined,
          observedAt: o.observedAt?.trim() || undefined,
          note: o.note?.trim() || undefined,
        }))
        .filter((o) => Number.isFinite(o.price))
      return obs.length ? obs : undefined
    })(),
    notes: draft.notes?.trim() || undefined,
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      if (typeof r.result === 'string') resolve(r.result)
      else reject(new Error('read'))
    }
    r.onerror = () => reject(new Error('read'))
    r.readAsDataURL(file)
  })
}

export function ProductForm({
  mode,
  onSave,
  onDelete,
  onCancel,
  variant = 'default',
}: Props) {
  const formId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<Omit<Product, 'id'>>(() =>
    draftFromMode(mode),
  )
  const [pendingUrl, setPendingUrl] = useState('')

  const cost = normalizeProductDraft(
    draft,
    mode.kind === 'edit' ? mode.product.id : 'draft',
  )
  const costValue = productCost(cost)
  const profit = productProfit(cost)
  const margin = productMarginPercent(cost)
  const compareAtPrice = productCompareAtPrice(cost)
  const discountPercent = productDiscountPercent(cost)

  const slotsLeft = MAX_IMAGES_PER_PRODUCT - draft.imageUrls.length

  function handleNumber<K extends keyof Omit<Product, 'id'>>(
    key: K,
    value: string,
  ) {
    const n = parseFloat(value.replace(',', '.'))
    setDraft((d) => ({
      ...d,
      [key]: value === '' || Number.isNaN(n) ? 0 : n,
    }))
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    e.target.value = ''
    if (!files?.length) return
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!images.length) return

    void (async () => {
      const next = [...draft.imageUrls]
      for (const file of images) {
        if (next.length >= MAX_IMAGES_PER_PRODUCT) break
        try {
          next.push(await readFileAsDataURL(file))
        } catch {
          /* skip broken read */
        }
      }
      setDraft((d) => ({
        ...d,
        imageUrls: clampImageUrls(next),
      }))
    })()
  }

  function addPendingUrl() {
    const u = pendingUrl.trim()
    if (!u) return
    try {
      // Accept valid URLs (http / https / data from paste)
      const parsed = new URL(u)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return
      }
    } catch {
      return
    }
    setDraft((d) => {
      if (d.imageUrls.length >= MAX_IMAGES_PER_PRODUCT) return d
      const imageUrls = clampImageUrls([...d.imageUrls, u])
      return { ...d, imageUrls }
    })
    setPendingUrl('')
  }

  function removeAt(index: number) {
    setDraft((d) => ({
      ...d,
      imageUrls: d.imageUrls.filter((_, i) => i !== index),
    }))
  }

  function move(index: number, delta: -1 | 1) {
    setDraft((d) => {
      const arr = [...d.imageUrls]
      const j = index + delta
      if (j < 0 || j >= arr.length) return d
      ;[arr[index], arr[j]] = [arr[j], arr[index]]
      return { ...d, imageUrls: arr }
    })
  }

  const obsDraft = draft.marketObservations ?? []
  const proposedAvg = proposedPriceAverageFromObservations(obsDraft)

  function addMarketObservation() {
    setDraft((d) => ({
      ...d,
      marketObservations: [
        ...(d.marketObservations ?? []),
        { price: 0, sourceUrl: '', observedAt: '', note: '' },
      ],
    }))
  }

  function updateMarketObservation(
    index: number,
    patch: Partial<MarketObservation>,
  ) {
    setDraft((d) => {
      const list = [...(d.marketObservations ?? [])]
      const cur = list[index]
      if (!cur) return d
      list[index] = { ...cur, ...patch }
      return { ...d, marketObservations: list }
    })
  }

  function removeMarketObservation(index: number) {
    setDraft((d) => ({
      ...d,
      marketObservations: (d.marketObservations ?? []).filter(
        (_, i) => i !== index,
      ),
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newId = mode.kind === 'edit' ? mode.product.id : crypto.randomUUID()
    onSave(normalizeProductDraft(draft, newId))
    if (mode.kind === 'new') {
      setDraft(createEmptyProduct())
      setPendingUrl('')
    }
  }

  const titleText =
    mode.kind === 'new' ? 'Produs nou' : 'Editează produs'

  return (
    <form
      className={`product-form${variant === 'modal' ? ' product-form--modal' : ''}`}
      onSubmit={handleSubmit}
      id={formId}
      aria-labelledby={`${formId}-title`}
    >
      {variant === 'modal' ? (
        <div className="product-form__title-row">
          <h2 id={`${formId}-title`} className="product-form__title">
            {titleText}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="Închide"
          >
            ✕
          </button>
        </div>
      ) : (
        <h2 id={`${formId}-title`} className="product-form__title">
          {titleText}
        </h2>
      )}

      {variant === 'default' ? (
        <aside className="workflow-hint" aria-label="Mod de lucru">
          <p className="workflow-hint__lead">
            Nu ai un fișier de import — completezi{' '}
            <strong>manual</strong>, produs cu produs, pe măsură ce afli
            prețurile.
          </p>
          <ol className="workflow-hint__steps">
            <li>Nume produs (SKU dacă există).</li>
            <li>
              Galerie imagini: mai multe poze per produs (încărcare sau URL-uri).
            </li>
            <li>
              Prețuri Elena și Basel (introdu ce îți comunică fiecare furnizor).
            </li>
            <li>Preț de vânzare și cost folosit pentru marjă.</li>
            <li>
              Opțional: poți adăuga mai multe prețuri văzute online — aplicația
              calculează automat media ca „preț propus”.
            </li>
          </ol>
        </aside>
      ) : null}

      <label className="field">
        <span>Nume</span>
        <input
          type="text"
          value={draft.name}
          onChange={(e) =>
            setDraft((d) => ({ ...d, name: e.target.value }))
          }
          required
          autoComplete="off"
        />
      </label>

      <label className="field">
        <span>SKU (opțional)</span>
        <input
          type="text"
          value={draft.sku}
          onChange={(e) =>
            setDraft((d) => ({ ...d, sku: e.target.value }))
          }
          autoComplete="off"
        />
      </label>

      <label className="field">
        <span>Descriere (catalog intern)</span>
        <span className="field-microhint">
          Specificații, ce include setul, garanție — vizibil doar în această
          aplicație.
        </span>
        <textarea
          rows={5}
          value={draft.description}
          onChange={(e) =>
            setDraft((d) => ({ ...d, description: e.target.value }))
          }
          placeholder="Ex.: Set blender 4 în 1, 1500 W, tocător 500 ml, pahar 600 ml…"
          spellCheck={true}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Preț Elena</span>
          <span className="field-microhint">
            După ce îl afli de la Elena
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={draft.supplierPriceA}
            onChange={(e) =>
              handleNumber('supplierPriceA', e.target.value)
            }
          />
        </label>
        <label className="field">
          <span>Preț Basel</span>
          <span className="field-microhint">
            După ce îl afli de la Basel
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={draft.supplierPriceB}
            onChange={(e) =>
              handleNumber('supplierPriceB', e.target.value)
            }
          />
        </label>
      </div>

      <label className="field">
        <span>Cost folosit la profit</span>
        <select
          value={draft.costSupplier}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              costSupplier: e.target.value as CostSupplier,
            }))
          }
        >
          <option value="lower">Cel mai mic (Elena sau Basel)</option>
          <option value="A">Elena</option>
          <option value="B">Basel</option>
        </select>
      </label>

      <label className="field">
        <span>Preț vânzare</span>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          value={draft.salePrice}
          onChange={(e) => handleNumber('salePrice', e.target.value)}
        />
      </label>

      <label className="field">
        <span>Discount afișat în magazin</span>
        <select
          value={draft.discountPercent ?? 0}
          onChange={(e) => handleNumber('discountPercent', e.target.value)}
        >
          {DISCOUNT_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value === 0 ? 'Fără discount' : `${value}%`}
            </option>
          ))}
        </select>
      </label>
      {compareAtPrice !== null ? (
        <p className="hint muted">
          În magazin: {formatRon(compareAtPrice)} tăiat, {formatRon(cost.salePrice)}{' '}
          final ({discountPercent}% discount).
        </p>
      ) : null}

      <label className="field">
        <span>Stoc intern (bucăți)</span>
        <input
          type="number"
          inputMode="numeric"
          step={1}
          min={0}
          value={draft.stockQty ?? 0}
          onChange={(e) => handleNumber('stockQty', e.target.value)}
        />
      </label>

      <div className="summary-cards">
        <div className="summary-cards__item">
          <span className="muted">Cost estimat</span>
          <strong>{costValue.toFixed(2)}</strong>
        </div>
        <div className="summary-cards__item summary-cards__item--accent">
          <span className="muted">Profit</span>
          <strong>{profit.toFixed(2)}</strong>
        </div>
        <div className="summary-cards__item">
          <span className="muted">Marjă</span>
          <strong>
            {margin === null ? '—' : `${margin.toFixed(1)} %`}
          </strong>
        </div>
      </div>

      <fieldset className="fieldset">
        <legend>Imagini (galerie)</legend>
        <p className="hint">
          Poți adăuga mai multe poze per produs (ex. 5–6): încarcă din calculator
          sau lipește URL-uri (http/https). Prima poză e folosită ca miniatură în
          listă. Ordinea controlezi cu săgețile.
        </p>
        <p className="hint muted gallery-limit">
          Maximum {MAX_IMAGES_PER_PRODUCT} imagini.
          {slotsLeft <= 0
            ? ' Ai atins limita.'
            : ` Mai poți adăuga ${slotsLeft}.`}
        </p>

        <div className="gallery-toolbar">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            id={`${formId}-file`}
            onChange={handleFiles}
          />
          <button
            type="button"
            className="btn secondary"
            disabled={slotsLeft <= 0}
            onClick={() => fileInputRef.current?.click()}
          >
            Încarcă poze (una sau mai multe)
          </button>
        </div>

        <div className="field add-url-row">
          <label className="field field--grow">
            <span>Adaugă URL imagine</span>
            <input
              type="url"
              placeholder="https://..."
              value={pendingUrl}
              onChange={(e) => setPendingUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPendingUrl()
                }
              }}
            />
          </label>
          <button
            type="button"
            className="btn secondary add-url-btn"
            disabled={slotsLeft <= 0 || !pendingUrl.trim()}
            onClick={addPendingUrl}
          >
            Adaugă URL
          </button>
        </div>

        {draft.imageUrls.length > 0 ? (
          <ul className="gallery-grid">
            {draft.imageUrls.map((url, index) => (
              <li key={`${index}-${url.slice(0, 48)}`} className="gallery-item">
                <div className="gallery-item__thumb">
                  <ProductImage
                    src={url}
                    alt=""
                    loading="eager"
                    placeholderClassName="gallery-item__placeholder"
                  />
                  {index === 0 ? (
                    <span className="gallery-item__badge">Principală</span>
                  ) : null}
                </div>
                <div className="gallery-item__actions">
                  <button
                    type="button"
                    className="btn icon-btn"
                    title="Mută mai sus"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn icon-btn"
                    title="Mută mai jos"
                    disabled={index === draft.imageUrls.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn icon-btn danger-text"
                    title="Elimină"
                    onClick={() => removeAt(index)}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted gallery-empty">Nicio imagine încă.</p>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend>Prețuri găsite online (opțional)</legend>
        <p className="hint">
          Adaugă fiecare preț văzut pe magazine / comparatoare.{' '}
          <strong>Preț propus</strong> = media aritmetică a observațiilor valide.
        </p>
        <div className="summary-cards summary-cards--inline">
          <div className="summary-cards__item summary-cards__item--accent">
            <span className="muted">Preț propus (medie)</span>
            <strong>
              {proposedAvg === null ? '—' : proposedAvg.toFixed(2)}
            </strong>
          </div>
          <div className="summary-cards__item">
            <span className="muted">Observații</span>
            <strong>{obsDraft.filter((o) => Number.isFinite(o.price)).length}</strong>
          </div>
        </div>
        <button
          type="button"
          className="btn secondary market-add-btn"
          onClick={addMarketObservation}
        >
          + Adaugă observație (preț + link)
        </button>
        {obsDraft.length > 0 ? (
          <ul className="market-obs-list">
            {obsDraft.map((row, index) => (
              <li key={index} className="market-obs-row">
                <div className="field-row market-obs-grid">
                  <label className="field">
                    <span>Preț (RON)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min={0}
                      value={Number.isFinite(row.price) ? row.price : ''}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value.replace(',', '.'))
                        updateMarketObservation(index, {
                          price: e.target.value === '' || Number.isNaN(n) ? 0 : n,
                        })
                      }}
                    />
                  </label>
                  <label className="field">
                    <span>Link sursă</span>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={row.sourceUrl ?? ''}
                      onChange={(e) =>
                        updateMarketObservation(index, {
                          sourceUrl: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="field-row market-obs-grid">
                  <label className="field">
                    <span>Data</span>
                    <input
                      type="date"
                      value={row.observedAt ?? ''}
                      onChange={(e) =>
                        updateMarketObservation(index, {
                          observedAt: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Notă</span>
                    <input
                      type="text"
                      placeholder="ex. magazin"
                      value={row.note ?? ''}
                      onChange={(e) =>
                        updateMarketObservation(index, {
                          note: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="btn secondary market-remove-btn"
                  onClick={() => removeMarketObservation(index)}
                >
                  Elimină observația
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted gallery-empty">Nicio observație încă.</p>
        )}
      </fieldset>

      <label className="field">
        <span>Notițe</span>
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(e) =>
            setDraft((d) => ({ ...d, notes: e.target.value }))
          }
        />
      </label>

      <div className="form-actions">
        <button type="submit" className="btn primary">
          {mode.kind === 'new' ? 'Adaugă' : 'Salvează'}
        </button>
        <button type="button" className="btn secondary" onClick={onCancel}>
          Anulează
        </button>
        {mode.kind === 'edit' && onDelete ? (
          <button
            type="button"
            className="btn danger"
            onClick={() => onDelete(mode.product.id)}
          >
            Șterge
          </button>
        ) : null}
      </div>
    </form>
  )
}
