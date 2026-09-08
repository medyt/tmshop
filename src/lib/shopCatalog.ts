import type { Product } from '../types/product'

type BundleOffer = NonNullable<Product['bundleOffers']>[number]

export function formatRon(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

/**
 * Produse „virtuale" / addon / transport (S000, D000, A000, L000, T000 + alias-uri).
 * Nu sunt produse reale — nu trebuie afișate sau comandate în magazin.
 */
const VIRTUAL_PRODUCT_IDS = new Set([
  'S000',
  'D000',
  'A000',
  'L000',
  'T000',
  'SHOPTOP-GIFT-ADDON',
  'SHOPTOP-PACKAGE-OPENING',
  'SHOPTOP-PACKAGE-INSURANCE',
  'SHOPTOP-PRIORITY-SHIPPING',
])

export function isVirtualProductId(
  productId?: string | null,
  productSku?: string | null,
): boolean {
  const id = productId?.trim().toUpperCase() ?? ''
  const sku = productSku?.trim().toUpperCase() ?? ''
  return (
    (id !== '' && VIRTUAL_PRODUCT_IDS.has(id)) ||
    (sku !== '' && VIRTUAL_PRODUCT_IDS.has(sku))
  )
}

export function isVirtualProduct(product: Product): boolean {
  return isVirtualProductId(product.id, product.sku)
}

export function isListedInShop(product: Product): boolean {
  if (isVirtualProduct(product)) return false
  // Stoc 0 rămâne listat: combo-uri / gestiune manuală; comenzile se procesează separat.
  return product.salePrice > 0
}

/** @deprecated Folosește `isListedInShop` — același criteriu (inclusiv stoc 0). */
export function isViewableInShop(product: Product): boolean {
  return isListedInShop(product)
}

export function availableStock(product: Product): number {
  return Math.max(0, Math.floor(product.stockQty ?? 0))
}

function hashProductId(productId: string): number {
  let hash = 2166136261
  for (let i = 0; i < productId.length; i++) {
    hash ^= productId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Stoc afișat clientului (4–10, stabil per produs).
 * Chiar dacă stocul intern e 0 (combo / încă nesincronizat), permitem afișare + comandă.
 */
export function displayStock(product: Product): number {
  const real = availableStock(product)
  const id = product.id.trim()
  const fake = id ? 4 + (hashProductId(id) % 7) : 4
  if (real <= 0) return fake
  return Math.min(real, fake)
}

/** Limită coș/UI — nu depășește stocul real, dar afișează scarcity față de client. */
export function clientStockLimit(product: Product): number {
  return displayStock(product)
}

/** Ofertă 1+1 / 2+2 în titlu: se vinde ca pachet, nu ca bucată. */
export function isPromotionalPackName(name?: string | null): boolean {
  if (!name) return false
  return /\d+\s*\+\s*\d+/.test(name)
}

export function shopQtyUnit(
  name: string | null | undefined,
  count: number,
  style: 'full' | 'short' = 'short',
): string {
  const n = Math.floor(count)
  if (isPromotionalPackName(name)) {
    return n === 1 ? 'pachet' : 'pachete promoționale'
  }
  if (n === 1) return 'bucată'
  return style === 'full' ? 'bucăți' : 'buc.'
}

export function shopQtyAvailableUnit(
  name: string | null | undefined,
  count: number,
): string {
  const n = Math.floor(count)
  if (isPromotionalPackName(name)) {
    return n === 1 ? 'pachet disponibil' : 'pachete promoționale disponibile'
  }
  return n === 1 ? 'bucată disponibilă' : 'buc. disponibile'
}

export function shopPerUnitLabel(name: string | null | undefined): string {
  return isPromotionalPackName(name) ? '/ pachet' : '/ buc.'
}

export function bundleOfferForQty(
  product: Product,
  quantity: number,
): BundleOffer | null {
  const offers = product.bundleOffers ?? []
  const q = Math.floor(quantity)
  if (q !== 2 && q !== 3) return null
  const offer = offers.find((o) => o.enabled && o.qty === q)
  return offer ?? null
}

/** Implicit un singur pachet / bucată la deschiderea produsului. */
export function defaultBundleQty(_product: Product): 1 | 2 | 3 {
  return 1
}

export function bundleTotalPrice(product: Product, quantity: number): number | null {
  const offer = bundleOfferForQty(product, quantity)
  if (!offer) return null
  if (product.salePrice <= 0) return null

  const q = offer.qty
  const regular = product.salePrice * q
  const total =
    offer.mode === 'fixed_total'
      ? offer.value
      : regular * (1 - offer.value / 100)

  if (!Number.isFinite(total) || total <= 0) return null
  const rounded = Math.round(total * 100) / 100
  // Protecție: nu aplicăm „ofertă” mai scumpă decât prețul normal.
  if (rounded >= Math.round(regular * 100) / 100) return null
  return rounded
}

export function bundleUnitPrice(product: Product, quantity: number): number | null {
  const total = bundleTotalPrice(product, quantity)
  const q = Math.floor(quantity)
  if (total === null || q <= 0) return null
  return Math.round((total / q) * 100) / 100
}

export function cartLineTotal(product: Product, quantity: number): number {
  return bundleTotalPrice(product, quantity) ?? product.salePrice * quantity
}

export function productDiscountPercent(product: Product): number {
  const value = product.discountPercent ?? 0
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(99, Math.round(value * 100) / 100)
}

/** Procent economisit față de prețul tăiat (ex. bundle 2/3 buc). */
export function savingsPercent(compareAt: number, price: number): number | null {
  if (!(compareAt > 0) || !(price >= 0) || price >= compareAt) return null
  const pct = Math.round(((compareAt - price) / compareAt) * 100)
  if (!Number.isFinite(pct) || pct <= 0) return null
  return Math.min(99, pct)
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
