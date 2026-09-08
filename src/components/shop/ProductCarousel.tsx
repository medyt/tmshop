import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '../ProductImage'
import { ShopProductPrice } from './ShopProductPrice'
import { primaryImageUrl } from '../../lib/productImages'
import { productPagePath } from '../../lib/shopProductRoutes'
import { displayStock, shopQtyUnit } from '../../lib/shopCatalog'
import type { Product } from '../../types/product'

type ProductCarouselProps = {
  products: Product[]
  onAddToCart?: (product: Product) => void
  ariaLabel?: string
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

export function ProductCarousel({
  products,
  onAddToCart,
  ariaLabel = 'Produse — folosește săgețile pentru a defila',
}: ProductCarouselProps) {
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

  useLayoutEffect(() => {
    updateEdges()
  }, [products, updateEdges])

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
  }, [products, updateEdges])

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

  if (products.length === 0) return null

  return (
    <div
      className="shop-bestsellers__carousel shop-carousel--boxed"
      role="region"
      aria-roledescription="carusel"
      aria-label={ariaLabel}
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
          {products.map((product) => (
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
                  <p className="shop-card__hint muted">
                    În stoc: {displayStock(product)}{' '}
                    {shopQtyUnit(product.name, displayStock(product))}
                  </p>
                  <div className="shop-card__price-row">
                    <ShopProductPrice product={product} showDiscountBadge />
                  </div>
                  {onAddToCart ? (
                    <button
                      type="button"
                      className="shop-btn shop-btn--primary shop-btn--block"
                      onClick={() => onAddToCart(product)}
                    >
                      Adaugă în coș
                    </button>
                  ) : (
                    <Link
                      className="shop-btn shop-btn--ghost shop-btn--block"
                      to={productPagePath(product)}
                    >
                      Vezi produsul
                    </Link>
                  )}
                </div>
              </article>
            </li>
          ))}
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
  )
}
