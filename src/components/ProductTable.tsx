import { useMemo, useState } from 'react'
import type { Product } from '../types/product'
import {
  productMarginPercent,
  productProfit,
} from '../lib/productMath'
import { extraImageCount, primaryImageUrl } from '../lib/productImages'
import { ProductImage } from './ProductImage'
import { htmlToPlainText } from '../lib/richText'

function briefDescription(text: string | undefined, max = 90): string | null {
  if (!text?.trim()) return null
  const t = htmlToPlainText(text).replace(/\s+/g, ' ').trim()
  if (!t) return null
  if (t.length <= max) return t
  return `${t.slice(0, max).trimEnd()}…`
}

export type SortKey =
  | 'name'
  | 'ean'
  | 'purchase'
  | 'sale'
  | 'stock'
  | 'profit'

type Props = {
  products: Product[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function sortProducts(list: Product[], key: SortKey, dir: 1 | -1): Product[] {
  const mul = dir
  return [...list].sort((a, b) => {
    let va: number | string = ''
    let vb: number | string = ''
    switch (key) {
      case 'name':
        va = a.name.toLowerCase()
        vb = b.name.toLowerCase()
        break
      case 'ean': {
        const aEan = a.ean?.trim() ?? ''
        const bEan = b.ean?.trim() ?? ''
        // Fără EAN rămân la final, indiferent de direcție.
        if (!aEan && !bEan) return 0
        if (!aEan) return 1
        if (!bEan) return -1
        return aEan.localeCompare(bEan, undefined, { numeric: true }) * mul
      }
      case 'purchase':
        va = a.purchasePrice
        vb = b.purchasePrice
        break
      case 'sale':
        va = a.salePrice
        vb = b.salePrice
        break
      case 'stock':
        va = a.stockQty ?? 0
        vb = b.stockQty ?? 0
        break
      case 'profit':
        va = productProfit(a)
        vb = productProfit(b)
        break
      default:
        break
    }
    if (typeof va === 'string' && typeof vb === 'string') {
      return va.localeCompare(vb) * mul
    }
    return ((va as number) - (vb as number)) * mul
  })
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: 1 | -1
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`th-sort${active ? ' th-sort--active' : ''}`}
      onClick={onClick}
    >
      {label}
      {active ? (dir === 1 ? ' ↑' : ' ↓') : ''}
    </button>
  )
}

export function ProductTable({ products, selectedId, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [nameSearch, setNameSearch] = useState('')

  const filtered = useMemo(() => {
    const q = nameSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, nameSearch])

  const sorted = useMemo(
    () => sortProducts(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1))
    } else {
      setSortKey(key)
      setSortDir(1)
    }
  }

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <p>
          <strong>Începi de la zero:</strong> nu există import — apasă
          „Adaugă produs” sus și completezi primul articol (nume, prețuri de la
          furnizori, vânzare). Repeti pentru fiecare produs în parte.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="table-toolbar">
        <label className="table-toolbar__label" htmlFor="product-name-search">
          Caută după nume
        </label>
        <input
          id="product-name-search"
          type="search"
          className="table-search-input"
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          placeholder="Introdu o parte din numele produsului…"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state empty-state--filter">
          <p>
            <strong>Niciun produs</strong> nu conține în nume „
            {nameSearch.trim()}”. Încearcă alt termen sau șterge căutarea.
          </p>
        </div>
      ) : (
        <>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col" className="th-thumb">
                Poză
              </th>
              <th scope="col">
                <SortButton
                  label="Nume"
                  active={sortKey === 'name'}
                  dir={sortDir}
                  onClick={() => toggleSort('name')}
                />
              </th>
              <th scope="col">
                <SortButton
                  label="EAN"
                  active={sortKey === 'ean'}
                  dir={sortDir}
                  onClick={() => toggleSort('ean')}
                />
              </th>
              <th scope="col">
                <SortButton
                  label="Preț achiziție"
                  active={sortKey === 'purchase'}
                  dir={sortDir}
                  onClick={() => toggleSort('purchase')}
                />
              </th>
              <th scope="col">
                <SortButton
                  label="Stoc"
                  active={sortKey === 'stock'}
                  dir={sortDir}
                  onClick={() => toggleSort('stock')}
                />
              </th>
              <th scope="col">
                <SortButton
                  label="Vânzare"
                  active={sortKey === 'sale'}
                  dir={sortDir}
                  onClick={() => toggleSort('sale')}
                />
              </th>
              <th scope="col">
                <SortButton
                  label="Profit"
                  active={sortKey === 'profit'}
                  dir={sortDir}
                  onClick={() => toggleSort('profit')}
                />
              </th>
              <th scope="col">Marjă</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const profit = productProfit(p)
              const margin = productMarginPercent(p)
              const selected = p.id === selectedId
              const thumb = primaryImageUrl(p)
              const more = extraImageCount(p)
              const descLine = briefDescription(p.description)
              return (
                <tr
                  key={p.id}
                  className={selected ? 'row-selected' : undefined}
                >
                  <td>
                    <button
                      type="button"
                      className="row-hit"
                      onClick={() => onSelect(p.id)}
                      aria-label={`Editează ${p.name}`}
                    >
                      {thumb ? (
                        <span className="cell-thumb-wrap">
                          <ProductImage
                            src={thumb}
                            urls={p.imageUrls}
                            alt=""
                            className="cell-thumb"
                            loading="eager"
                            placeholderClassName="cell-thumb-placeholder"
                            placeholderLabel="—"
                          />
                          {more > 0 ? (
                            <span
                              className="cell-thumb-more"
                              aria-label={`încă ${more} imagini`}
                            >
                              +{more}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="cell-thumb-placeholder">—</span>
                      )}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="row-hit row-hit--text"
                      onClick={() => onSelect(p.id)}
                    >
                      <span className="cell-title">{p.name}</span>
                      {p.sku ? (
                        <span className="cell-sku">{p.sku}</span>
                      ) : null}
                      {descLine ? (
                        <span className="cell-desc">{descLine}</span>
                      ) : null}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="row-hit row-hit--text"
                      onClick={() => onSelect(p.id)}
                    >
                      <span className="cell-sku">{p.ean?.trim() || '—'}</span>
                    </button>
                  </td>
                  <td>{p.purchasePrice.toFixed(2)}</td>
                  <td>{p.stockQty ?? 0}</td>
                  <td>{p.salePrice.toFixed(2)}</td>
                  <td>{profit.toFixed(2)}</td>
                  <td>
                    {margin === null ? '—' : `${margin.toFixed(1)} %`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="card-list">
        {sorted.map((p) => {
          const profit = productProfit(p)
          const margin = productMarginPercent(p)
          const selected = p.id === selectedId
          const thumb = primaryImageUrl(p)
          const more = extraImageCount(p)
          const cardDesc = briefDescription(p.description, 120)
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`product-card${selected ? ' product-card--selected' : ''}`}
                onClick={() => onSelect(p.id)}
              >
                <div className="product-card__media">
                  {thumb ? (
                    <>
                      <ProductImage
                        src={thumb}
                        urls={p.imageUrls}
                        alt=""
                        loading="eager"
                        placeholderClassName="product-card__placeholder"
                        placeholderLabel="Fără poză"
                      />
                      {more > 0 ? (
                        <span className="product-card__more">+{more}</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="product-card__placeholder">Fără poză</span>
                  )}
                </div>
                <div className="product-card__body">
                  <strong>{p.name}</strong>
                  {p.sku ? <span className="muted">{p.sku}</span> : null}
                  {p.ean?.trim() ? (
                    <span className="muted">EAN {p.ean.trim()}</span>
                  ) : null}
                  {cardDesc ? (
                    <p className="product-card__desc">{cardDesc}</p>
                  ) : null}
                  <dl className="product-card__stats">
                    <div>
                      <dt>Preț achiziție</dt>
                      <dd>{p.purchasePrice.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Stoc</dt>
                      <dd>{p.stockQty ?? 0}</dd>
                    </div>
                    <div>
                      <dt>Vânzare</dt>
                      <dd>{p.salePrice.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Profit</dt>
                      <dd>{profit.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Marjă</dt>
                      <dd>
                        {margin === null ? '—' : `${margin.toFixed(1)} %`}
                      </dd>
                    </div>
                  </dl>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
        </>
      )}
    </>
  )
}
