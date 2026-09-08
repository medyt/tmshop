import { useEffect, useMemo, useRef, useState } from 'react'
import type { Product } from '../../types/product'
import { productMarginPercent, productProfit } from '../../lib/productMath'
import { extraImageCount, primaryImageUrl } from '../../lib/productImages'
import { productPagePath } from '../../lib/shopProductRoutes'
import {
  formatRon,
  isListedInShop,
  isVirtualProduct,
  productCompareAtPrice,
} from '../../lib/shopCatalog'
import { SITE_LEGAL } from '../../lib/siteLegal'
import { EMPTY_SALES, type ProductSales, type ProductSalesMap } from '../../lib/productSales'
import { ProductImage } from '../ProductImage'
import './ProductList.css'

export type ProductListSort =
  | 'name'
  | 'stock'
  | 'sale'
  | 'profit'
  | 'markup'
  | 'sales30'

type Props = {
  products: Product[]
  /** null = încă se încarcă; undefined în map = 0 vânzări */
  sales: ProductSalesMap | null
  salesError: string | null
  onOpen: (id: string) => void
  onDuplicate: (product: Product) => void
  onDelete: (product: Product) => void
}

const SORT_OPTIONS: Array<{ value: ProductListSort; label: string }> = [
  { value: 'name', label: 'Nume' },
  { value: 'sales30', label: 'Vânzări 30 zile' },
  { value: 'stock', label: 'Stoc' },
  { value: 'sale', label: 'Preț vânzare' },
  { value: 'profit', label: 'Profit' },
  { value: 'markup', label: 'Adaos' },
]

function markupPercent(p: Product): number | null {
  if (!(p.purchasePrice > 0)) return null
  return (productProfit(p) / p.purchasePrice) * 100
}

function pct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${Math.round(value)} %`
}

function stockTone(qty: number): 'out' | 'low' | 'ok' {
  if (qty <= 0) return 'out'
  if (qty <= 5) return 'low'
  return 'ok'
}

function sortProducts(
  list: Product[],
  key: ProductListSort,
  dir: 1 | -1,
  sales: ProductSalesMap | null,
): Product[] {
  const num = (p: Product): number => {
    switch (key) {
      case 'stock':
        return p.stockQty ?? 0
      case 'sale':
        return p.salePrice
      case 'profit':
        return productProfit(p)
      case 'markup':
        return markupPercent(p) ?? -Infinity
      case 'sales30':
        return sales?.[p.id]?.d30.orders ?? 0
      default:
        return 0
    }
  }
  return [...list].sort((a, b) => {
    if (key === 'name') return a.name.localeCompare(b.name, 'ro') * dir
    const diff = (num(a) - num(b)) * dir
    return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ro')
  })
}

/** Meniu „⋯” per produs: se închide la click în afară sau Escape. */
function RowMenu({
  product,
  onOpen,
  onDuplicate,
  onDelete,
  onCopied,
}: {
  product: Product
  onOpen: () => void
  onDuplicate: () => void
  onDelete: () => void
  onCopied: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const listed = isListedInShop(product)
  const publicUrl = `${SITE_LEGAL.siteUrl}${productPagePath(product)}`

  return (
    <div className="pl-menu" ref={ref}>
      <button
        type="button"
        className="pl-menu__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Acțiuni pentru ${product.name}`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open ? (
        <div className="pl-menu__list" role="menu">
          <button type="button" role="menuitem" className="pl-menu__item" onClick={() => { setOpen(false); onOpen() }}>
            Editează
          </button>
          {listed ? (
            <a
              role="menuitem"
              className="pl-menu__item"
              href={productPagePath(product)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              Vezi în magazin ↗
            </a>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="pl-menu__item"
            onClick={() => {
              setOpen(false)
              void navigator.clipboard?.writeText(publicUrl).then(onCopied)
            }}
          >
            Copiază linkul
          </button>
          <button type="button" role="menuitem" className="pl-menu__item" onClick={() => { setOpen(false); onDuplicate() }}>
            Duplică
          </button>
          <div className="pl-menu__sep" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="pl-menu__item pl-menu__item--danger"
            onClick={() => { setOpen(false); onDelete() }}
          >
            Șterge
          </button>
        </div>
      ) : null}
    </div>
  )
}

function SalesStrip({ sales, loading }: { sales: ProductSales; loading: boolean }) {
  const windows: Array<{ key: keyof ProductSales; label: string }> = [
    { key: 'd7', label: '7 zile' },
    { key: 'd30', label: '30 zile' },
    { key: 'd90', label: '90 zile' },
  ]
  return (
    <div className="pl-sales" aria-label="Comenzi recente">
      <span className="pl-sales__title">Comenzi</span>
      {windows.map(({ key, label }) => {
        const w = sales[key]
        return (
          <span
            key={key}
            className={`pl-sales__tile${!loading && w.orders > 0 ? ' pl-sales__tile--active' : ''}`}
            title={loading ? 'Se încarcă…' : `${w.orders} comenzi · ${w.units} bucăți în ultimele ${label}`}
          >
            <span className="pl-sales__label">{label}</span>
            <strong className="pl-sales__value">{loading ? '…' : w.orders}</strong>
            {!loading && w.units !== w.orders ? (
              <span className="pl-sales__units">{w.units} buc</span>
            ) : null}
          </span>
        )
      })}
    </div>
  )
}

export function ProductList({
  products,
  sales,
  salesError,
  onOpen,
  onDuplicate,
  onDelete,
}: Props) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<ProductListSort>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.ean ?? '').toLowerCase().includes(q),
    )
  }, [products, query])

  const sorted = useMemo(
    () => sortProducts(filtered, sortKey, sortDir, sales),
    [filtered, sortKey, sortDir, sales],
  )

  const totals = useMemo(() => {
    const t = { d7: 0, d30: 0, d90: 0, hidden: 0, outOfStock: 0 }
    for (const p of products) {
      const s = sales?.[p.id]
      if (s) {
        t.d7 += s.d7.orders
        t.d30 += s.d30.orders
        t.d90 += s.d90.orders
      }
      if (!isListedInShop(p)) t.hidden++
      else if ((p.stockQty ?? 0) <= 0) t.outOfStock++
    }
    return t
  }, [products, sales])

  if (products.length === 0) {
    return (
      <div className="pl-empty">
        <strong>Niciun produs încă.</strong> Apasă „Adaugă produs” ca să creezi primul.
      </div>
    )
  }

  const salesLoading = sales === null && !salesError

  return (
    <div className="pl">
      <div className="pl-summary" aria-label="Rezumat catalog">
        <div className="pl-summary__item">
          <span>Produse</span>
          <strong>{products.length}</strong>
        </div>
        <div className="pl-summary__item">
          <span>Ascunse / fără stoc</span>
          <strong>
            {totals.hidden} / {totals.outOfStock}
          </strong>
        </div>
        <div className="pl-summary__item pl-summary__item--accent">
          <span>Comenzi 7 zile</span>
          <strong>{salesLoading ? '…' : totals.d7}</strong>
        </div>
        <div className="pl-summary__item pl-summary__item--accent">
          <span>Comenzi 30 zile</span>
          <strong>{salesLoading ? '…' : totals.d30}</strong>
        </div>
        <div className="pl-summary__item pl-summary__item--accent">
          <span>Comenzi 90 zile</span>
          <strong>{salesLoading ? '…' : totals.d90}</strong>
        </div>
      </div>

      {salesError ? (
        <p className="pl-note pl-note--warn" role="status">
          Vânzările nu s-au putut încărca: {salesError}
        </p>
      ) : null}
      {copied ? (
        <p className="pl-note" role="status">
          Link copiat.
        </p>
      ) : null}

      <div className="pl-toolbar">
        <label className="pl-search">
          <span className="sr-only">Caută produs</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="20" y1="20" x2="16.5" y2="16.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută după nume, SKU sau EAN…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className="pl-sort">
          <label className="sr-only" htmlFor="pl-sort-select">
            Sortează
          </label>
          <select
            id="pl-sort-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as ProductListSort)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="pl-sort__dir"
            onClick={() => setSortDir((d) => (d === 1 ? -1 : 1))}
            title={sortDir === 1 ? 'Crescător' : 'Descrescător'}
            aria-label={sortDir === 1 ? 'Sortare crescătoare' : 'Sortare descrescătoare'}
          >
            {sortDir === 1 ? '↑' : '↓'}
          </button>
        </div>
        <span className="pl-count muted">
          {filtered.length === products.length
            ? `${products.length} produse`
            : `${filtered.length} din ${products.length}`}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="pl-empty">
          Niciun produs nu se potrivește cu „{query.trim()}”.
        </div>
      ) : (
        <ul className="pl-rows" aria-label="Lista produse">
          {sorted.map((p) => {
            const thumb = primaryImageUrl(p)
            const more = extraImageCount(p)
            const stock = p.stockQty ?? 0
            const tone = stockTone(stock)
            const profit = productProfit(p)
            const markup = markupPercent(p)
            const margin = productMarginPercent(p)
            const compareAt = productCompareAtPrice(p)
            const listed = isListedInShop(p)
            const virtual = isVirtualProduct(p)
            const s = sales?.[p.id] ?? EMPTY_SALES
            return (
              <li key={p.id} className={`pl-row${listed ? '' : ' pl-row--hidden'}`}>
                <button
                  type="button"
                  className="pl-row__thumb"
                  onClick={() => onOpen(p.id)}
                  aria-label={`Editează ${p.name}`}
                >
                  {thumb ? (
                    <ProductImage
                      src={thumb}
                      urls={p.imageUrls}
                      alt=""
                      loading="lazy"
                      placeholderClassName="pl-row__thumb-placeholder"
                      placeholderLabel="—"
                    />
                  ) : (
                    <span className="pl-row__thumb-placeholder">Fără poză</span>
                  )}
                  {more > 0 ? <span className="pl-row__thumb-more">+{more}</span> : null}
                </button>

                <div className="pl-row__main">
                  <button type="button" className="pl-row__name" onClick={() => onOpen(p.id)}>
                    {p.name}
                  </button>
                  <div className="pl-row__meta">
                    {p.sku ? <span className="pl-chip pl-chip--mono">{p.sku}</span> : <span className="pl-chip pl-chip--warn">fără SKU</span>}
                    {p.category ? <span className="pl-chip">{p.category}</span> : null}
                    {virtual ? (
                      <span className="pl-chip pl-chip--warn">addon checkout</span>
                    ) : !listed ? (
                      <span className="pl-chip pl-chip--warn">ascuns (preț 0)</span>
                    ) : null}
                  </div>
                  <SalesStrip sales={s} loading={salesLoading} />
                </div>

                <div className="pl-row__stock">
                  <span className="pl-row__label">Stoc</span>
                  <span className={`pl-stock pl-stock--${tone}`}>
                    {stock}
                    <span className="pl-stock__unit">buc</span>
                  </span>
                </div>

                <div className="pl-row__price">
                  <span className="pl-row__label">Preț vânzare</span>
                  <strong className="pl-price">{formatRon(p.salePrice)}</strong>
                  {compareAt !== null ? (
                    <span className="pl-price__compare">
                      <s>{formatRon(compareAt)}</s> −{Math.round(p.discountPercent ?? 0)}%
                    </span>
                  ) : null}
                </div>

                <div className="pl-econ" aria-label="Economie produs">
                  <div className="pl-econ__cell">
                    <span>Achiziție</span>
                    <strong>{formatRon(p.purchasePrice)}</strong>
                  </div>
                  <div className="pl-econ__cell">
                    <span>Adaos</span>
                    <strong>{pct(markup)}</strong>
                  </div>
                  <div className={`pl-econ__cell pl-econ__cell--profit${profit < 0 ? ' pl-econ__cell--bad' : ''}`}>
                    <span>Profit</span>
                    <strong>{formatRon(profit)}</strong>
                    <small>{margin === null ? '' : `marjă ${pct(margin)}`}</small>
                  </div>
                </div>

                <RowMenu
                  product={p}
                  onOpen={() => onOpen(p.id)}
                  onDuplicate={() => onDuplicate(p)}
                  onDelete={() => onDelete(p)}
                  onCopied={() => setCopied(true)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
