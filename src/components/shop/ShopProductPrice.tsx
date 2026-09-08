import type { Product } from '../../types/product'
import {
  formatRon,
  hasShopDiscount,
  productCompareAtPrice,
  productDiscountPercent,
  savingsPercent,
} from '../../lib/shopCatalog'

type ShopProductPriceProps = {
  product: Product
  className?: string
  showDiscountBadge?: boolean
  /** Preț mare roșu + oferta RON (pagină produs LP). */
  variant?: 'default' | 'promo'
}

export function ShopProductPrice({
  product,
  className,
  showDiscountBadge = false,
  variant = 'default',
}: ShopProductPriceProps) {
  const compareAt = productCompareAtPrice(product)
  const discount = productDiscountPercent(product)
  const saveRon =
    compareAt !== null && product.salePrice > 0
      ? Math.round((compareAt - product.salePrice) * 100) / 100
      : null
  const savePct =
    compareAt !== null
      ? savingsPercent(compareAt, product.salePrice)
      : discount > 0
        ? Math.round(discount)
        : null
  const rootClass = [
    className ?? 'shop-price',
    variant === 'promo' ? 'shop-price--promo' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (variant === 'promo') {
    return (
      <div className={rootClass}>
        <span className="shop-price__sale">{formatRon(product.salePrice)}</span>
        {compareAt !== null ? (
          <span className="shop-price__compare">{formatRon(compareAt)}</span>
        ) : null}
        {showDiscountBadge && hasShopDiscount(product) && savePct !== null ? (
          <span className="shop-price__badge shop-price__badge--pct">
            −{savePct}%
            {saveRon !== null && saveRon > 0
              ? ` · Economisești ${formatRon(saveRon)}`
              : ''}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div className={rootClass}>
      {compareAt !== null ? (
        <span className="shop-price__compare">{formatRon(compareAt)}</span>
      ) : null}
      <span className="shop-price__sale">{formatRon(product.salePrice)}</span>
      {showDiscountBadge && hasShopDiscount(product) ? (
        <span className="shop-price__badge">-{discount}%</span>
      ) : null}
    </div>
  )
}
