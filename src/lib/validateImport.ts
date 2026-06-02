import { clampImageUrls, normalizeImageUrl } from './productImages'
import type {
  CostSupplier,
  MarketObservation,
  Product,
} from '../types/product'

function isCostSupplier(x: unknown): x is CostSupplier {
  return x === 'A' || x === 'B' || x === 'lower'
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

function parseMarketObservations(
  o: Record<string, unknown>,
): MarketObservation[] | undefined {
  if (Array.isArray(o.marketObservations)) {
    const out: MarketObservation[] = []
    for (const item of o.marketObservations) {
      if (!item || typeof item !== 'object') continue
      const r = item as Record<string, unknown>
      const price =
        typeof r.price === 'number' ? r.price : Number(r.price)
      if (!Number.isFinite(price)) continue
      out.push({
        price,
        sourceUrl:
          typeof r.sourceUrl === 'string' ? r.sourceUrl : undefined,
        observedAt:
          typeof r.observedAt === 'string' ? r.observedAt : undefined,
        note: typeof r.note === 'string' ? r.note : undefined,
      })
    }
    return out.length ? out : undefined
  }

  let legacyPrice: number | undefined
  if (o.marketPrice !== undefined && o.marketPrice !== null) {
    const m =
      typeof o.marketPrice === 'number'
        ? o.marketPrice
        : Number(o.marketPrice)
    if (Number.isFinite(m)) legacyPrice = m
  }
  if (legacyPrice !== undefined) {
    return [
      {
        price: legacyPrice,
        sourceUrl:
          typeof o.marketSourceUrl === 'string'
            ? o.marketSourceUrl
            : undefined,
        observedAt:
          typeof o.marketObservedAt === 'string'
            ? o.marketObservedAt
            : undefined,
      },
    ]
  }
  return undefined
}

/** Folosit la import JSON și la încărcare din localStorage (inclus migrare `imageUrl`). */
export function parseProductRecord(o: Record<string, unknown>): Product | null {
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null
  const supplierPriceA =
    typeof o.supplierPriceA === 'number'
      ? o.supplierPriceA
      : o.supplierPriceA === undefined
        ? 0
        : Number(o.supplierPriceA)
  const supplierPriceB =
    typeof o.supplierPriceB === 'number'
      ? o.supplierPriceB
      : o.supplierPriceB === undefined
        ? 0
        : Number(o.supplierPriceB)
  const salePrice =
    typeof o.salePrice === 'number' ? o.salePrice : Number(o.salePrice)
  if (
    !Number.isFinite(supplierPriceA) ||
    !Number.isFinite(supplierPriceB) ||
    !Number.isFinite(salePrice)
  )
    return null
  const costSupplier = isCostSupplier(o.costSupplier)
    ? o.costSupplier
    : 'lower'

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
    supplierPriceA,
    supplierPriceB,
    costSupplier,
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
    marketObservations: parseMarketObservations(o),
    notes: typeof o.notes === 'string' ? o.notes : undefined,
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
