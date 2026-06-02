import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '../ProductImage'
import { ShopProductPrice } from './ShopProductPrice'
import { ShopStarRating } from './ShopStarRating'
import { primaryImageUrl } from '../../lib/productImages'
import { productPagePath } from '../../lib/shopProductRoutes'
import type { Product } from '../../types/product'

type RatingEntry = {
  averageRating: number
  reviewCount: number
}

type ShopBestSellersProps = {
  products: Product[]
  ratings: Map<string, RatingEntry>
  onAddToCart: (product: Product) => void
}

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ShopBestSellers({
  products,
  ratings,
  onAddToCart,
}: ShopBestSellersProps) {
  const viewportRef = useRef<HTMLDivElement>(null)

  const scrollBy = (direction: -1 | 1) => {
    const el = viewportRef.current
    if (!el) return
    const step = Math.max(260, Math.floor(el.clientWidth * 0.75))
    el.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  const list = useMemo(() => products.slice(0, 12), [products])

  if (list.length === 0) return null

  const headingId = 'shop-bestsellers-heading'

  return (
    <section className="shop-bestsellers" aria-labelledby={headingId}>
      <div className="shop-bestsellers__head">
        <h2 id={headingId} className="shop-bestsellers__title">
          <span aria-hidden="true">🔥 </span>
          CELE MAI VÂNDUTE
          <span aria-hidden="true"> 🔥</span>
        </h2>
        <div className="shop-bestsellers__nav" role="group" aria-label="Derulează lista">
          <button
            type="button"
            className="shop-bestsellers__nav-btn"
            aria-label="Produse anterioare"
            onClick={() => scrollBy(-1)}
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            className="shop-bestsellers__nav-btn"
            aria-label="Produse următoare"
            onClick={() => scrollBy(1)}
          >
            <IconChevronRight />
          </button>
        </div>
      </div>

      <div className="shop-bestsellers__viewport" ref={viewportRef}>
        <ul className="shop-bestsellers__track">
          {list.map((product) => {
            const rating = ratings.get(product.id)
            return (
              <li key={product.id} className="shop-bestsellers__slide">
                <article className="shop-card shop-card--rail">
                  <Link className="shop-card__media" to={productPagePath(product)}>
                    <ProductImage
                      src={primaryImageUrl(product)}
                      urls={product.imageUrls}
                      alt={product.name || 'Produs'}
                      className="shop-card__img"
                      placeholderClassName="shop-card__placeholder"
                    />
                  </Link>
                  <div className="shop-card__body">
                    <h3 className="shop-card__name">
                      <Link
                        className="shop-card__name-link"
                        to={productPagePath(product)}
                      >
                        {product.name || 'Fără nume'}
                      </Link>
                    </h3>
                    {product.sku ? (
                      <p className="shop-card__sku muted">SKU {product.sku}</p>
                    ) : null}
                    {rating ? (
                      <ShopStarRating
                        size="sm"
                        rating={rating.averageRating}
                        reviewCount={rating.reviewCount}
                      />
                    ) : null}
                    <div className="shop-card__price-row">
                      <ShopProductPrice product={product} showDiscountBadge />
                    </div>
                    <button
                      type="button"
                      className="shop-btn shop-btn--primary shop-btn--block"
                      onClick={() => onAddToCart(product)}
                    >
                      Adaugă în coș
                    </button>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
