import type { Product } from '../../types/product'
import {
  formatRon,
  hasShopDiscount,
  productCompareAtPrice,
  productDiscountPercent,
} from '../../lib/shopCatalog'

type ShopProductPriceProps = {
  product: Product
  className?: string
  showDiscountBadge?: boolean
}

export function ShopProductPrice({
  product,
  className,
  showDiscountBadge = false,
}: ShopProductPriceProps) {
  const compareAt = productCompareAtPrice(product)
  const discount = productDiscountPercent(product)

  return (
    <div className={className ?? 'shop-price'}>
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
