import { useId, useRef, useState } from 'react'
import {
  createEmptyProduct,
  type BundleOffer,
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
import { isProductsApiEnabled, uploadProductImage } from '../lib/productsApi'
import { ensureUploadableImage, isHeicImage } from '../lib/imageFile'
import { ProductImage } from './ProductImage'
import { RichTextEditor } from './RichTextEditor'
import { sanitizeHtml } from '../lib/richText'
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
      ean: p.ean ?? '',
      brand: p.brand ?? '',
      googleCategory: p.googleCategory ?? '',
      mpn: p.mpn ?? '',
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      discountPercent: p.discountPercent ?? 0,
      stockQty: p.stockQty ?? 0,
      imageUrls: [...p.imageUrls],
      description: p.description ?? '',
      notes: p.notes ?? '',
      bundleOffers: [...(p.bundleOffers ?? [])],
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
    ean: draft.ean?.trim() || undefined,
    brand: draft.brand?.trim() || undefined,
    googleCategory: draft.googleCategory?.trim() || undefined,
    mpn: draft.mpn?.trim() || undefined,
    purchasePrice: Number.isFinite(draft.purchasePrice)
      ? draft.purchasePrice
      : 0,
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
    description: sanitizeHtml(draft.description ?? '') || undefined,
    notes: draft.notes?.trim() || undefined,
    bundleOffers: (() => {
      const offers = (draft.bundleOffers ?? [])
        .filter((o): o is BundleOffer => !!o && typeof o === 'object')
        .map((o) => ({
          qty: o.qty,
          enabled: Boolean(o.enabled),
          mode: o.mode,
          value: typeof o.value === 'number' ? o.value : Number(o.value),
          title: typeof o.title === 'string' ? o.title.trim() : undefined,
          badge: o.badge,
        }))
        .filter((o) => (o.qty === 2 || o.qty === 3))
        .filter((o) => o.mode === 'fixed_total' || o.mode === 'percent_off')
        .filter((o) => Number.isFinite(o.value) && o.value > 0)
        .map((o) => ({
          ...o,
          value: Math.round(o.value * 100) / 100,
          title: o.title ? o.title : undefined,
          badge: o.badge === 'popular' || o.badge === 'best' ? o.badge : undefined,
        }))
        .sort((a, b) => a.qty - b.qty)
      return offers.length ? offers : undefined
    })(),
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      if (typeof r.result === 'string') resolve(r.result)
      else reject(new Error('Nu am putut citi fișierul.'))
    }
    r.onerror = () => reject(new Error('Nu am putut citi fișierul.'))
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
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageNotice, setImageNotice] = useState<string | null>(null)

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
  const bundleOffersDraft = draft.bundleOffers ?? []

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

  function getBundleOffer(qty: 2 | 3): BundleOffer {
    const existing = bundleOffersDraft.find((o) => o.qty === qty)
    if (existing) {
      return {
        qty,
        enabled: Boolean(existing.enabled),
        mode: existing.mode === 'percent_off' ? 'percent_off' : 'fixed_total',
        value: Number.isFinite(existing.value) ? existing.value : cost.salePrice * qty,
        title: existing.title,
        badge: existing.badge,
      }
    }
    return {
      qty,
      enabled: false,
      mode: 'fixed_total',
      value: Math.round(cost.salePrice * qty * 100) / 100,
    }
  }

  function patchBundleOffer(qty: 2 | 3, patch: Partial<BundleOffer>) {
    setDraft((d) => {
      const current = d.bundleOffers ?? []
      const prev = current.find((o) => o.qty === qty) ?? getBundleOffer(qty)
      const next: BundleOffer = { ...prev, ...patch, qty }
      const without = current.filter((o) => o.qty !== qty)
      return { ...d, bundleOffers: [...without, next].sort((a, b) => a.qty - b.qty) }
    })
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    // `input.files` este o listă „vie": setarea `value = ''` (ca să permitem
    // re-selectarea aceluiași fișier) o golește în browserele recente. Copiem
    // fișierele într-un array ÎNAINTE de reset, altfel `length` devine 0 și
    // handler-ul iese silențios (fără preview, fără upload, fără eroare).
    const selected = input.files ? Array.from(input.files) : []
    input.value = ''
    if (selected.length === 0 || imageBusy) return

    const images = selected.filter((f) => {
      if (f.type.startsWith('image/')) return true
      return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name)
    })
    if (!images.length) {
      setImageError(
        'Selectează fișiere imagine (JPG, PNG, WEBP, GIF sau HEIC de pe telefon).',
      )
      return
    }

    void (async () => {
      setImageBusy(true)
      setImageError(null)
      setImageNotice(null)

      const room = Math.max(0, MAX_IMAGES_PER_PRODUCT - draft.imageUrls.length)
      const batch = images.slice(0, room)
      if (batch.length === 0) {
        setImageError(`Poți adăuga maxim ${MAX_IMAGES_PER_PRODUCT} imagini.`)
        setImageBusy(false)
        return
      }

      const apiEnabled = isProductsApiEnabled()
      const failures: string[] = []
      let added = 0

      for (const file of batch) {
        // 0) HEIC/HEIF de pe telefon → convertim în JPEG (altfel nici preview-ul,
        //    nici serverul nu îl pot procesa).
        let uploadable: File
        try {
          if (isHeicImage(file)) {
            setImageNotice('Se convertește poza din HEIC…')
          }
          uploadable = await ensureUploadableImage(file)
        } catch (err: unknown) {
          failures.push(
            err instanceof Error ? err.message : 'Format imagine nesuportat.',
          )
          continue
        }

        // 1) Preview imediat (local) — ca să apară în listă pe loc.
        let preview: string
        try {
          preview = await readFileAsDataURL(uploadable)
        } catch {
          failures.push(`Nu am putut citi fișierul „${file.name}”.`)
          continue
        }

        setDraft((d) => ({
          ...d,
          imageUrls: clampImageUrls([...d.imageUrls, preview]),
        }))
        added++
        setImageNotice(
          apiEnabled ? 'Poză adăugată. Se salvează pe server…' : null,
        )

        // 2) Upload pe server și înlocuire preview → URL public.
        if (!apiEnabled) {
          continue
        }

        try {
          const serverUrl = await uploadProductImage(uploadable)
          setDraft((d) => ({
            ...d,
            imageUrls: d.imageUrls.map((url) =>
              url === preview ? serverUrl : url,
            ),
          }))
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Upload eșuat pe server.'
          failures.push(
            `${message} — verifică product_upload.php și folderul uploads/products (permisiuni 755/775).`,
          )
          // Scoatem preview-ul local — altfel la Salvare trimitem data-URL uriaș.
          setDraft((d) => ({
            ...d,
            imageUrls: d.imageUrls.filter((url) => url !== preview),
          }))
          added--
        }
      }

      if (failures.length > 0) {
        setImageError(failures[0])
        setImageNotice(null)
      } else if (added > 0) {
        setImageNotice(
          apiEnabled
            ? 'Poză salvată pe server. Apasă Salvează la produs.'
            : 'Poză adăugată. Apasă Salvează.',
        )
      }
      setImageBusy(false)
    })()
  }

  function removeAt(index: number) {
    setDraft((d) => ({
      ...d,
      imageUrls: d.imageUrls.filter((_, i) => i !== index),
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newId = mode.kind === 'edit' ? mode.product.id : crypto.randomUUID()
    onSave(normalizeProductDraft(draft, newId))
    if (mode.kind === 'new') {
      setDraft(createEmptyProduct())
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
            <li>Preț de achiziție (costul la care iei produsul).</li>
            <li>Preț de vânzare — profitul și marja se calculează automat.</li>
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
        <span>SKU (catalog Meta / facturi)</span>
        <input
          type="text"
          value={draft.sku}
          onChange={(e) =>
            setDraft((d) => ({ ...d, sku: e.target.value }))
          }
          autoComplete="off"
        />
        <p className="hint muted">
          După lansare, SKU-ul din feed nu se mai schimbă. Poți actualiza preț,
          titlu și imagini; codul rămâne fix.
        </p>
      </label>

      <fieldset className="fieldset">
        <legend>Atribute feed (Google / Meta / TikTok)</legend>
        <p className="hint muted">
          Recomandate pentru feed-urile de produse. EAN sau (brand + MPN) ajută
          la aprobarea în Google Merchant / catalogul Meta.
        </p>
        <div className="field-row">
          <label className="field">
            <span>EAN / cod de bare</span>
            <input
              type="text"
              inputMode="numeric"
              value={draft.ean}
              onChange={(e) =>
                setDraft((d) => ({ ...d, ean: e.target.value }))
              }
              autoComplete="off"
              placeholder="ex. 5901234123457"
            />
          </label>
          <label className="field">
            <span>Brand</span>
            <input
              type="text"
              value={draft.brand}
              onChange={(e) =>
                setDraft((d) => ({ ...d, brand: e.target.value }))
              }
              autoComplete="off"
            />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>MPN (cod producător)</span>
            <input
              type="text"
              value={draft.mpn}
              onChange={(e) =>
                setDraft((d) => ({ ...d, mpn: e.target.value }))
              }
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Categorie Google</span>
            <input
              type="text"
              value={draft.googleCategory}
              onChange={(e) =>
                setDraft((d) => ({ ...d, googleCategory: e.target.value }))
              }
              autoComplete="off"
              placeholder="ex. 672 sau Home & Garden > Kitchen"
            />
          </label>
        </div>
      </fieldset>

      <label className="field">
        <span>Descriere produs</span>
        <span className="field-microhint">
          Text bogat afișat pe pagina produsului: titluri, liste, linkuri,
          imagini. Folosește bara de instrumente pentru formatare.
        </span>
        <RichTextEditor
          value={draft.description ?? ''}
          onChange={(html) => setDraft((d) => ({ ...d, description: html }))}
          placeholder="Ex.: Descriere detaliată, specificații, ce include setul, garanție…"
          ariaLabel="Descriere produs"
        />
      </label>

      <label className="field">
        <span>Preț achiziție</span>
        <span className="field-microhint">
          Costul la care iei produsul de la furnizor (RON)
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          value={draft.purchasePrice}
          onChange={(e) => handleNumber('purchasePrice', e.target.value)}
        />
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

      <fieldset className="fieldset">
        <legend>Pachete (bundle) pe pagina produsului</legend>
        <p className="hint">
          Dacă activezi pachetele aici, pe pagina produsului apar opțiuni 2 / 3 bucăți
          cu preț total fix sau discount procentual.
        </p>

        {[2, 3].map((qty) => {
          const q = qty as 2 | 3
          const offer = getBundleOffer(q)
          const valueInvalid = !Number.isFinite(offer.value) || offer.value <= 0
          return (
            <div key={q} className="field">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={offer.enabled}
                  onChange={(e) => patchBundleOffer(q, { enabled: e.target.checked })}
                />
                <span>
                  Activează pachet {q} bucăți
                </span>
              </label>

              <div className="field-row" style={{ marginTop: 8 }}>
                <label className="field">
                  <span>Tip</span>
                  <select
                    value={offer.mode}
                    onChange={(e) => {
                      const mode = e.target.value === 'percent_off' ? 'percent_off' : 'fixed_total'
                      patchBundleOffer(q, {
                        mode,
                        value:
                          mode === 'percent_off'
                            ? Math.min(99, Math.max(1, Math.round(offer.value || 10)))
                            : Math.round((offer.value || cost.salePrice * q) * 100) / 100,
                      })
                    }}
                  >
                    <option value="fixed_total">Preț total (RON)</option>
                    <option value="percent_off">Discount (%)</option>
                  </select>
                </label>

                <label className="field">
                  <span>{offer.mode === 'percent_off' ? 'Discount (%)' : `Total (RON) pentru ${q} buc`}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    value={offer.value}
                    onChange={(e) => patchBundleOffer(q, { value: Number(e.target.value) })}
                  />
                </label>

                <label className="field">
                  <span>Badge (opțional)</span>
                  <select
                    value={offer.badge ?? ''}
                    onChange={(e) =>
                      patchBundleOffer(q, {
                        badge:
                          e.target.value === 'popular' || e.target.value === 'best'
                            ? (e.target.value as BundleOffer['badge'])
                            : undefined,
                      })
                    }
                  >
                    <option value="">—</option>
                    <option value="popular">popular</option>
                    <option value="best">best</option>
                  </select>
                </label>
              </div>

              <label className="field" style={{ marginTop: 8 }}>
                <span>Titlu (opțional)</span>
                <input
                  type="text"
                  placeholder={`ex. Pachet ${q} bucăți`}
                  value={offer.title ?? ''}
                  onChange={(e) => patchBundleOffer(q, { title: e.target.value })}
                />
              </label>

              {offer.enabled && valueInvalid ? (
                <p className="hint" style={{ color: '#ff6b6b' }}>
                  Completează o valoare validă (&gt; 0), altfel pachetul nu se salvează.
                </p>
              ) : null}
            </div>
          )
        })}
      </fieldset>

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
        <legend>Imagini ({draft.imageUrls.length}/{MAX_IMAGES_PER_PRODUCT})</legend>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="sr-only"
          id={`${formId}-file`}
          onChange={handleFiles}
          disabled={imageBusy || slotsLeft <= 0}
        />

        {imageError ? (
          <p className="form-error" role="alert">
            {imageError}
          </p>
        ) : null}
        {imageNotice && !imageError ? (
          <p className="form-notice" role="status">
            {imageNotice}
          </p>
        ) : null}
        {imageBusy ? (
          <p className="muted">Se încarcă imaginile…</p>
        ) : null}

        {draft.imageUrls.length > 0 ? (
          <div className="gallery-v2">
            {draft.imageUrls.map((url, index) => (
              <div
                key={`${index}-${url.slice(0, 48)}`}
                className={`gallery-v2__item${dragIndex === index ? ' gallery-v2__item--dragging' : ''}`}
                draggable
                onDragStart={(e) => {
                  const target = e.target as HTMLElement | null
                  if (target?.closest('.gallery-v2__remove')) {
                    e.preventDefault()
                    return
                  }
                  setDragIndex(index)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => setDragIndex(null)}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragIndex !== null && dragIndex !== index) {
                    setDraft((d) => {
                      const arr = [...d.imageUrls]
                      const [moved] = arr.splice(dragIndex, 1)
                      arr.splice(index, 0, moved)
                      return { ...d, imageUrls: arr }
                    })
                  }
                  setDragIndex(null)
                }}
              >
                <ProductImage
                  src={url}
                  alt=""
                  loading="eager"
                  placeholderClassName="gallery-v2__placeholder"
                />
                {index === 0 && (
                  <span className="gallery-v2__badge">1</span>
                )}
                <button
                  type="button"
                  className="gallery-v2__remove"
                  title="Elimină"
                  aria-label={`Elimină imaginea ${index + 1}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    removeAt(index)
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <span className="gallery-v2__drag-hint">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="5" r="1.5" />
                    <circle cx="15" cy="5" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="19" r="1.5" />
                    <circle cx="15" cy="19" r="1.5" />
                  </svg>
                </span>
              </div>
            ))}
            {slotsLeft > 0 && (
              <button
                type="button"
                className="gallery-v2__add"
                disabled={imageBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{imageBusy ? '…' : 'Adaugă'}</span>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="gallery-v2__empty"
            disabled={imageBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>{imageBusy ? 'Se încarcă…' : 'Încarcă imagini'}</span>
            <span className="muted">Click pentru a selecta fișiere</span>
          </button>
        )}
      </fieldset>

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
