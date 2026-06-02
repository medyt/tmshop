import type { Product } from '../types/product'

export function formatRon(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

export function isListedInShop(product: Product): boolean {
  return (product.stockQty ?? 0) > 0 && product.salePrice > 0
}

export function availableStock(product: Product): number {
  return Math.max(0, Math.floor(product.stockQty ?? 0))
}

export function cartLineTotal(product: Product, quantity: number): number {
  return product.salePrice * quantity
}

export function productDiscountPercent(product: Product): number {
  const value = product.discountPercent ?? 0
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(99, Math.round(value * 100) / 100)
}

export function productCompareAtPrice(product: Product): number | null {
  const discount = productDiscountPercent(product)
  if (discount <= 0 || product.salePrice <= 0) return null
  const listPrice = product.salePrice / (1 - discount / 100)
  return Math.round(listPrice * 100) / 100
}

export function hasShopDiscount(product: Product): boolean {
  return productCompareAtPrice(product) !== null
}

export function productCategoryLabel(product: Product): string {
  const value = product.category?.trim()
  if (!value || value === 'Diverse') return 'Casă și grădină'
  return value
}

export function collectProductCategories(products: Product[]): string[] {
  const categories = new Set<string>()
  for (const product of products) {
    if (!isListedInShop(product)) continue
    categories.add(productCategoryLabel(product))
  }
  return [...categories].sort((a, b) => a.localeCompare(b, 'ro'))
}
