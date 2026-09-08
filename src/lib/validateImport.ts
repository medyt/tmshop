import { clampImageUrls, normalizeImageUrl } from './productImages'
import type {
  BundleOffer,
  BundleOfferBadge,
  BundleOfferMode,
  Product,
} from '../types/product'

function toNumberOrUndefined(x: unknown): number | undefined {
  if (x === undefined || x === null || x === '') return undefined
  const n = typeof x === 'number' ? x : Number(x)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Prețul de achiziție. Acceptă și backup-urile vechi cu `supplierPriceA/B` +
 * `costSupplier` (le mapează la un singur cost) pentru compatibilitate la import.
 */
function purchasePriceFromRecord(o: Record<string, unknown>): number | null {
  const direct = toNumberOrUndefined(o.purchasePrice)
  if (direct !== undefined) return direct

  const a = toNumberOrUndefined(o.supplierPriceA)
  const b = toNumberOrUndefined(o.supplierPriceB)
  if (a === undefined && b === undefined) return null

  const av = a ?? 0
  const bv = b ?? 0
  const which = o.costSupplier
  if (which === 'A') return av
  if (which === 'B') return bv
  // „lower” sau necunoscut: alege valoarea nenulă, altfel minimul.
  if (av > 0 && bv > 0) return Math.min(av, bv)
  return av > 0 ? av : bv
}

function imageUrlsFromRecord(o: Record<string, unknown>): string[] {
  const raw: string[] = []
  if (Array.isArray(o.imageUrls)) {
    for (const u of o.imageUrls) {
      if (typeof u === 'string' && u.trim()) raw.push(u.trim())
    }
  }
  if (
    raw.length === 0 &&
    typeof o.imageUrl === 'string' &&
    o.imageUrl.trim()
  ) {
    raw.push(o.imageUrl.trim())
  }
  return clampImageUrls(raw.map((url) => normalizeImageUrl(url)))
}

function isBundleOfferMode(x: unknown): x is BundleOfferMode {
  return x === 'fixed_total' || x === 'percent_off'
}

function isBundleOfferBadge(x: unknown): x is BundleOfferBadge {
  return x === 'popular' || x === 'best'
}

function parseBundleOffers(o: Record<string, unknown>): BundleOffer[] | undefined {
  if (!Array.isArray(o.bundleOffers)) return undefined
  const out: BundleOffer[] = []
  for (const item of o.bundleOffers) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const qtyRaw = r.qty
    const qty = typeof qtyRaw === 'number' ? qtyRaw : Number(qtyRaw)
    if (qty !== 2 && qty !== 3) continue

    if (!isBundleOfferMode(r.mode)) continue
    const valueRaw = r.value
    const value = typeof valueRaw === 'number' ? valueRaw : Number(valueRaw)
    if (!Number.isFinite(value) || value <= 0) continue

    out.push({
      qty,
      enabled: Boolean(r.enabled),
      mode: r.mode,
      value: Math.round(value * 100) / 100,
      title: typeof r.title === 'string' && r.title.trim() ? r.title.trim() : undefined,
      badge: isBundleOfferBadge(r.badge) ? r.badge : undefined,
    })
  }
  return out.length ? out : undefined
}

/** Folosit la import JSON și la încărcare din localStorage (inclus migrare `imageUrl`). */
export function parseProductRecord(o: Record<string, unknown>): Product | null {
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null
  const purchasePrice = purchasePriceFromRecord(o) ?? 0
  const salePrice =
    typeof o.salePrice === 'number' ? o.salePrice : Number(o.salePrice)
  if (!Number.isFinite(purchasePrice) || !Number.isFinite(salePrice))
    return null

  let stockQty = 0
  if (o.stockQty !== undefined && o.stockQty !== null) {
    const sq =
      typeof o.stockQty === 'number' ? o.stockQty : Number(o.stockQty)
    if (Number.isFinite(sq)) stockQty = Math.max(0, Math.floor(sq))
  }

  let discountPercent = 0
  if (o.discountPercent !== undefined && o.discountPercent !== null) {
    const discount =
      typeof o.discountPercent === 'number'
        ? o.discountPercent
        : Number(o.discountPercent)
    if (Number.isFinite(discount) && discount > 0) {
      discountPercent = Math.min(99, Math.max(0, Math.round(discount * 100) / 100))
    }
  }

  return {
    id: o.id,
    name: o.name,
    sku: typeof o.sku === 'string' ? o.sku : undefined,
    ean:
      typeof o.ean === 'string' && o.ean.trim() ? o.ean.trim() : undefined,
    brand:
      typeof o.brand === 'string' && o.brand.trim() ? o.brand.trim() : undefined,
    googleCategory:
      typeof o.googleCategory === 'string' && o.googleCategory.trim()
        ? o.googleCategory.trim()
        : undefined,
    mpn:
      typeof o.mpn === 'string' && o.mpn.trim() ? o.mpn.trim() : undefined,
    purchasePrice,
    salePrice,
    discountPercent,
    stockQty,
    imageUrls: imageUrlsFromRecord(o),
    slug: typeof o.slug === 'string' && o.slug.trim() ? o.slug.trim() : undefined,
    category:
      typeof o.category === 'string' && o.category.trim()
        ? o.category.trim()
        : undefined,
    description:
      typeof o.description === 'string' && o.description.trim()
        ? o.description.trim()
        : undefined,
    notes: typeof o.notes === 'string' ? o.notes : undefined,
    bundleOffers: parseBundleOffers(o),
  }
}

export function parseProductsJson(raw: string): Product[] | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(data)) return null
  const out: Product[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const p = parseProductRecord(item as Record<string, unknown>)
    if (p) out.push(p)
  }
  return out.length ? out : null
}
