import type { Product } from '../types/product'

export function productCost(p: Product): number {
  return Number.isFinite(p.purchasePrice) ? p.purchasePrice : 0
}

export function productProfit(p: Product): number {
  return p.salePrice - productCost(p)
}

/** Feed Meta: dacă avem cost, păstrăm doar SKU-urile cu marjă >= prag. Fără cost, nu excludem. */
export function meetsMetaCatalogMargin(p: Product, minProfit: number): boolean {
  if (!(minProfit > 0)) return true
  if (!(p.purchasePrice > 0)) return true
  return productProfit(p) + 0.009 >= minProfit
}

export function productMarginPercent(p: Product): number | null {
  if (p.salePrice <= 0) return null
  return (productProfit(p) / p.salePrice) * 100
}
