import type { CostSupplier, Product } from '../types/product'

export function supplierCost(
  a: number,
  b: number,
  which: CostSupplier,
): number {
  if (which === 'A') return a
  if (which === 'B') return b
  return Math.min(a, b)
}

export function productCost(p: Product): number {
  return supplierCost(p.supplierPriceA, p.supplierPriceB, p.costSupplier)
}

export function productProfit(p: Product): number {
  return p.salePrice - productCost(p)
}

export function productMarginPercent(p: Product): number | null {
  if (p.salePrice <= 0) return null
  return (productProfit(p) / p.salePrice) * 100
}
