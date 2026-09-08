import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '../ProductImage'
import { ShopProductPrice } from './ShopProductPrice'
import { ShopStarRating } from './ShopStarRating'
import { primaryImageUrl } from '../../lib/productImages'
import { productPagePath } from '../../lib/shopProductRoutes'
import { displayStock, shopQtyUnit } from '../../lib/shopCatalog'
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

function syncScrollEdges(el: HTMLDivElement): { canPrev: boolean; canNext: boolean } {
  const { scrollLeft, scrollWidth, clientWidth } = el
  const maxScroll = Math.max(0, scrollWidth - clientWidth)
  const eps = 2
  return {
    canPrev: scrollLeft > eps,
    canNext: scrollLeft < maxScroll - eps,
  }
}

export function ShopBestSellers({
  products,
  ratings,
  onAddToCart,
}: ShopBestSellersProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const updateEdges = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const next = syncScrollEdges(el)
    setCanPrev(next.canPrev)
    setCanNext(next.canNext)
  }, [])

  const list = useMemo(() => products.slice(0, 12), [products])

  useLayoutEffect(() => {
    updateEdges()
  }, [list, updateEdges])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    el.addEventListener('scroll', updateEdges, { passive: true })
    const ro = new ResizeObserver(() => {
      updateEdges()
    })
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', updateEdges)
      ro.disconnect()
    }
  }, [list, updateEdges])

  const scrollBy = (direction: -1 | 1) => {
    const el = viewportRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = Math.max(0, scrollWidth - clientWidth)
    const eps = 2
    if (direction === -1 && scrollLeft <= eps) return
    if (direction === 1 && scrollLeft >= maxScroll - eps) return

    const step = Math.max(260, Math.floor(el.clientWidth * 0.75))
    el.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

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
      </div>

      <div
        className="shop-bestsellers__carousel"
        role="region"
        aria-roledescription="carusel"
        aria-label="Produse recomandate — folosește săgețile pentru a defila"
      >
        <button
          type="button"
          className="shop-bestsellers__arrow shop-bestsellers__arrow--prev"
          aria-label="Produse anterioare"
          disabled={!canPrev}
          onClick={() => scrollBy(-1)}
        >
          <IconChevronLeft />
        </button>

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
                    <p className="shop-card__hint muted">
                      În stoc: {displayStock(product)}{' '}
                      {shopQtyUnit(product.name, displayStock(product))}
                    </p>
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

        <button
          type="button"
          className="shop-bestsellers__arrow shop-bestsellers__arrow--next"
          aria-label="Produse următoare"
          disabled={!canNext}
          onClick={() => scrollBy(1)}
        >
          <IconChevronRight />
        </button>
      </div>
    </section>
  )
}
