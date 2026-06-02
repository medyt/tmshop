import { useMemo, useState } from 'react'
import type { Product } from '../types/product'
import {
  productCost,
  productMarginPercent,
  productProfit,
} from '../lib/productMath'
import { extraImageCount, primaryImageUrl } from '../lib/productImages'
import { ProductImage } from './ProductImage'
import { proposedPriceAverage } from '../lib/proposedPrice'

function briefDescription(text: string | undefined, max = 90): string | null {
  if (!text?.trim()) return null
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return `${t.slice(0, max).trimEnd()}…`
}

export type SortKey =
  | 'name'
  | 'supplierA'
  | 'supplierB'
  | 'sale'
  | 'stock'
  | 'profit'
  | 'proposed'

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
      case 'supplierA':
        va = a.supplierPriceA
        vb = b.supplierPriceA
        break
      case 'supplierB':
        va = a.supplierPriceB
        vb = b.supplierPriceB
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
      case 'proposed':
        va = proposedPriceAverage(a) ?? -Infinity
        vb = proposedPriceAverage(b) ?? -Infinity
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
                  label="Elena"
                  active={sortKey === 'supplierA'}
                  dir={sortDir}
                  onClick={() => toggleSort('supplierA')}
                />
              </th>
              <th scope="col">
                <SortButton
                  label="Basel"
                  active={sortKey === 'supplierB'}
                  dir={sortDir}
                  onClick={() => toggleSort('supplierB')}
                />
              </th>
              <th scope="col">Cost</th>
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
              <th scope="col">
                <SortButton
                  label="Preț propus"
                  active={sortKey === 'proposed'}
                  dir={sortDir}
                  onClick={() => toggleSort('proposed')}
                />
              </th>
              <th scope="col">Surse online</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const profit = productProfit(p)
              const margin = productMarginPercent(p)
              const cost = productCost(p)
              const selected = p.id === selectedId
              const thumb = primaryImageUrl(p)
              const more = extraImageCount(p)
              const descLine = briefDescription(p.description)
              const propAvg = proposedPriceAverage(p)
              const obs = p.marketObservations ?? []
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
                  <td>{p.supplierPriceA.toFixed(2)}</td>
                  <td>{p.supplierPriceB.toFixed(2)}</td>
                  <td>{cost.toFixed(2)}</td>
                  <td>{p.stockQty ?? 0}</td>
                  <td>{p.salePrice.toFixed(2)}</td>
                  <td>{profit.toFixed(2)}</td>
                  <td>
                    {margin === null ? '—' : `${margin.toFixed(1)} %`}
                  </td>
                  <td>
                    {propAvg === null ? '—' : propAvg.toFixed(2)}
                  </td>
                  <td className="td-links td-obs">
                    {obs.length === 0 ? (
                      '—'
                    ) : (
                      <span className="obs-links">
                        <span className="muted small">{obs.length} prețuri · </span>
                        {obs.slice(0, 5).map((o, i) =>
                          o.sourceUrl ? (
                            <a
                              key={i}
                              href={o.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="obs-link"
                            >
                              [{i + 1}]
                            </a>
                          ) : (
                            <span key={i} className="muted small">
                              [{i + 1}]
                            </span>
                          ),
                        )}
                      </span>
                    )}
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
          const cost = productCost(p)
          const selected = p.id === selectedId
          const thumb = primaryImageUrl(p)
          const more = extraImageCount(p)
          const cardDesc = briefDescription(p.description, 120)
          const propAvg = proposedPriceAverage(p)
          const obs = p.marketObservations ?? []
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
                  {cardDesc ? (
                    <p className="product-card__desc">{cardDesc}</p>
                  ) : null}
                  <dl className="product-card__stats">
                    <div>
                      <dt>Elena</dt>
                      <dd>{p.supplierPriceA.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Basel</dt>
                      <dd>{p.supplierPriceB.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Cost</dt>
                      <dd>{cost.toFixed(2)}</dd>
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
                  {propAvg !== null ? (
                    <p className="small muted">
                      Preț propus (medie): {propAvg.toFixed(2)}
                      {obs.length ? ` · ${obs.length} observații` : ''}
                    </p>
                  ) : null}
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
