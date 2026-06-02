type ShopStarRatingProps = {
  rating: number
  reviewCount?: number
  showValue?: boolean
  size?: 'sm' | 'md'
  label?: string
}

function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(5, value))
}

export function ShopStarRating({
  rating,
  reviewCount,
  showValue = true,
  size = 'md',
  label,
}: ShopStarRatingProps) {
  const normalized = clampRating(rating)
  const fillPercent = (normalized / 5) * 100
  const ariaLabel =
    label ??
    (reviewCount !== undefined
      ? `${normalized.toFixed(1)} din 5 stele, ${reviewCount} recenzii`
      : `${normalized.toFixed(1)} din 5 stele`)

  return (
    <div
      className={`shop-stars shop-stars--${size}`}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="shop-stars__track" aria-hidden="true">
        <div className="shop-stars__base">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={`base-${index}`} className="shop-stars__star">
              ★
            </span>
          ))}
        </div>
        <div className="shop-stars__fill" style={{ width: `${fillPercent}%` }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={`fill-${index}`} className="shop-stars__star">
              ★
            </span>
          ))}
        </div>
      </div>
      {showValue ? (
        <span className="shop-stars__value">
          {normalized.toFixed(1)}
          {reviewCount !== undefined ? (
            <span className="shop-stars__count">({reviewCount})</span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}

type ShopStarRatingInputProps = {
  value: number
  onChange: (value: number) => void
}

export function ShopStarRatingInput({ value, onChange }: ShopStarRatingInputProps) {
  const selected = Math.max(1, Math.min(5, Math.floor(value) || 5))

  return (
    <div className="shop-stars shop-stars--input" role="radiogroup" aria-label="Rating">
      {Array.from({ length: 5 }).map((_, index) => {
        const star = index + 1
        const active = star <= selected
        return (
          <button
            key={star}
            type="button"
            className={`shop-stars__button${active ? ' shop-stars__button--active' : ''}`}
            role="radio"
            aria-checked={active}
            aria-label={`${star} stele`}
            onClick={() => onChange(star)}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
