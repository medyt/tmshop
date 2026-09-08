import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { productPagePath } from '../../lib/shopProductRoutes'
import type { AdminReview } from '../../lib/shopGrowth'

function formatReviewDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ReviewStatusBadge({ approved }: { approved: boolean }) {
  return (
    <span
      className={`review-badge${approved ? ' review-badge--approved' : ' review-badge--pending'}`}
    >
      {approved ? 'Aprobată' : 'În așteptare'}
    </span>
  )
}

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.floor(rating)))
  return (
    <span className="cell-stars" aria-label={`${r} din 5 stele`}>
      {'★'.repeat(r)}
      {'☆'.repeat(5 - r)}
    </span>
  )
}

type SortKey = 'date' | 'author' | 'product' | 'rating' | 'status'

type Props = {
  reviews: AdminReview[]
  onModerate: (id: number, action: 'approve' | 'reject' | 'delete') => void
}

function sortReviews(list: AdminReview[], key: SortKey, dir: 1 | -1): AdminReview[] {
  const mul = dir
  return [...list].sort((a, b) => {
    let va: number | string = ''
    let vb: number | string = ''
    switch (key) {
      case 'author':
        va = a.authorName.toLowerCase()
        vb = b.authorName.toLowerCase()
        break
      case 'product':
        va = a.productId.toLowerCase()
        vb = b.productId.toLowerCase()
        break
      case 'rating':
        va = a.rating
        vb = b.rating
        break
      case 'status':
        va = Number(a.approved)
        vb = Number(b.approved)
        break
      default:
        va = a.createdAt
        vb = b.createdAt
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

function productLinkRef(review: AdminReview) {
  return productPagePath({
    id: review.productId,
    name: review.productId,
    slug: '',
  })
}

export function AdminReviewsTable({ reviews, onModerate }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return reviews
    return reviews.filter((r) => {
      const haystack = `${r.id} ${r.authorName} ${r.productId} ${r.body}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [reviews, search])

  const sorted = useMemo(
    () => sortReviews(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? -1 : 1)
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="empty-state">
        <p>Nu există recenzii pentru acest filtru.</p>
      </div>
    )
  }

  return (
    <>
      <div className="table-toolbar">
        <label className="table-toolbar__label" htmlFor="admin-review-search">
          Caută recenzie
        </label>
        <input
          id="admin-review-search"
          type="search"
          className="table-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Autor, ID produs, text…"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="table-toolbar__count muted">
          {filtered.length} din {reviews.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state empty-state--filter">
          <p>
            <strong>Nicio recenzie</strong> nu corespunde căutării „{search.trim()}”.
          </p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table data-table--reviews">
              <thead>
                <tr>
                  <th scope="col">
                    <SortButton
                      label="Dată"
                      active={sortKey === 'date'}
                      dir={sortDir}
                      onClick={() => toggleSort('date')}
                    />
                  </th>
                  <th scope="col">
                    <SortButton
                      label="Autor"
                      active={sortKey === 'author'}
                      dir={sortDir}
                      onClick={() => toggleSort('author')}
                    />
                  </th>
                  <th scope="col">
                    <SortButton
                      label="Produs"
                      active={sortKey === 'product'}
                      dir={sortDir}
                      onClick={() => toggleSort('product')}
                    />
                  </th>
                  <th scope="col">
                    <SortButton
                      label="Rating"
                      active={sortKey === 'rating'}
                      dir={sortDir}
                      onClick={() => toggleSort('rating')}
                    />
                  </th>
                  <th scope="col">
                    <SortButton
                      label="Status"
                      active={sortKey === 'status'}
                      dir={sortDir}
                      onClick={() => toggleSort('status')}
                    />
                  </th>
                  <th scope="col">Recenzie</th>
                  <th scope="col">Poză</th>
                  <th scope="col" className="th-actions">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((review) => (
                  <tr key={review.id}>
                    <td className="cell-nowrap">{formatReviewDate(review.createdAt)}</td>
                    <td>
                      <span className="cell-title">{review.authorName}</span>
                    </td>
                    <td className="td-links">
                      <Link to={productLinkRef(review)}>{review.productId}</Link>
                    </td>
                    <td>
                      <Stars rating={review.rating} />
                    </td>
                    <td>
                      <ReviewStatusBadge approved={review.approved} />
                    </td>
                    <td>
                      <span className="review-table__preview" title={review.body}>
                        {review.body}
                      </span>
                    </td>
                    <td className="cell-nowrap">
                      {review.imageUrl ? (
                        <a href={review.imageUrl} target="_blank" rel="noreferrer">
                          Vezi
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-reviews__row-actions">
                        {review.approved ? (
                          <button
                            type="button"
                            className="btn secondary btn--sm"
                            onClick={() => onModerate(review.id, 'reject')}
                          >
                            Retrage
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn primary btn--sm"
                            onClick={() => onModerate(review.id, 'approve')}
                          >
                            Aprobă
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn danger btn--sm"
                          onClick={() => onModerate(review.id, 'delete')}
                        >
                          Șterge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="card-list">
            {sorted.map((review) => (
              <li key={review.id}>
                <article className="review-card">
                  {review.imageUrl ? (
                    <a
                      href={review.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="review-card__image"
                    >
                      <img src={review.imageUrl} alt="" loading="lazy" decoding="async" />
                    </a>
                  ) : null}
                  <div className="review-card__top">
                    <strong>{review.authorName}</strong>
                    <ReviewStatusBadge approved={review.approved} />
                  </div>
                  <span className="muted">{formatReviewDate(review.createdAt)}</span>
                  <div className="review-card__rating">
                    <Stars rating={review.rating} />
                  </div>
                  <span className="cell-sku">
                    Produs:{' '}
                    <Link to={productLinkRef(review)}>{review.productId}</Link>
                  </span>
                  <p className="cell-desc">{review.body}</p>
                  <div className="admin-reviews__row-actions">
                    {review.approved ? (
                      <button
                        type="button"
                        className="btn secondary btn--sm"
                        onClick={() => onModerate(review.id, 'reject')}
                      >
                        Retrage aprobarea
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn primary btn--sm"
                        onClick={() => onModerate(review.id, 'approve')}
                      >
                        Aprobă
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn danger btn--sm"
                      onClick={() => onModerate(review.id, 'delete')}
                    >
                      Șterge
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
