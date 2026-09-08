import { clampImageUrls } from './productImages'
import { sanitizeHtml } from './richText'
import {
  createEmptyProduct,
  type BundleOffer,
  type Product,
} from '../types/product'

/**
 * Starea formularului din editorul de produs (pagină dedicată).
 * Toate câmpurile sunt string/number ca să fie legate direct la input-uri;
 * `normalizeProductDraft` produce obiectul `Product` trimis la API.
 */
export type ProductDraft = Omit<Product, 'id'> & {
  slug: string
  category: string
}

export function draftFromProduct(product: Product): ProductDraft {
  return {
    ...createEmptyProduct(),
    name: product.name,
    sku: product.sku ?? '',
    ean: product.ean ?? '',
    brand: product.brand ?? '',
    googleCategory: product.googleCategory ?? '',
    mpn: product.mpn ?? '',
    purchasePrice: product.purchasePrice,
    salePrice: product.salePrice,
    discountPercent: product.discountPercent ?? 0,
    stockQty: product.stockQty ?? 0,
    imageUrls: [...product.imageUrls],
    description: product.description ?? '',
    notes: product.notes ?? '',
    bundleOffers: (product.bundleOffers ?? []).map((o) => ({ ...o })),
    // Produsele vechi nu au slug salvat: adresa lor efectivă e derivată din
    // nume. O fixăm în draft ca să nu se schimbe când se editează titlul.
    slug: product.slug ?? slugifyProductName(product.name),
    category: product.category ?? '',
  }
}

export function emptyProductDraft(): ProductDraft {
  return { ...createEmptyProduct(), slug: '', category: '' }
}

/** Aceeași regulă ca `shoptop_slugify` din server/api/lib.php. */
export function slugifyProductName(value: string): string {
  const ascii = value
    .toLowerCase()
    .trim()
    .replace(/[ăâ]/g, 'a')
    .replace(/î/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
  return ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function normalizeBundleOffers(
  offers: BundleOffer[] | undefined,
): BundleOffer[] | undefined {
  const out = (offers ?? [])
    .filter((o): o is BundleOffer => !!o && typeof o === 'object')
    .map((o) => ({
      qty: o.qty,
      enabled: Boolean(o.enabled),
      mode: o.mode,
      value: typeof o.value === 'number' ? o.value : Number(o.value),
      title: typeof o.title === 'string' ? o.title.trim() : undefined,
      badge: o.badge,
    }))
    .filter((o) => o.qty === 2 || o.qty === 3)
    .filter((o) => o.mode === 'fixed_total' || o.mode === 'percent_off')
    .filter((o) => Number.isFinite(o.value) && o.value > 0)
    .map((o) => ({
      ...o,
      value: Math.round(o.value * 100) / 100,
      title: o.title ? o.title : undefined,
      badge: o.badge === 'popular' || o.badge === 'best' ? o.badge : undefined,
    }))
    .sort((a, b) => a.qty - b.qty)
  return out.length ? out : undefined
}

export function normalizeProductDraft(draft: ProductDraft, id: string): Product {
  const discount = draft.discountPercent ?? 0
  const stock = draft.stockQty ?? 0
  const slug = slugifyProductName(draft.slug || draft.name)
  return {
    id,
    name: draft.name.trim() || 'Fără nume',
    sku: draft.sku?.trim() || undefined,
    ean: draft.ean?.trim() || undefined,
    brand: draft.brand?.trim() || undefined,
    googleCategory: draft.googleCategory?.trim() || undefined,
    mpn: draft.mpn?.trim() || undefined,
    purchasePrice: Number.isFinite(draft.purchasePrice) ? draft.purchasePrice : 0,
    salePrice: Number.isFinite(draft.salePrice) ? draft.salePrice : 0,
    discountPercent:
      Number.isFinite(discount) && discount > 0
        ? Math.min(99, Math.max(0, Math.round(discount * 100) / 100))
        : 0,
    stockQty: Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0,
    imageUrls: clampImageUrls(draft.imageUrls),
    description: sanitizeHtml(draft.description ?? '') || undefined,
    notes: draft.notes?.trim() || undefined,
    bundleOffers: normalizeBundleOffers(draft.bundleOffers),
    slug: slug || undefined,
    category: draft.category.trim() || undefined,
  }
}

/** Cheie stabilă pentru detectarea modificărilor nesalvate. */
export function productDraftFingerprint(draft: ProductDraft): string {
  return JSON.stringify(normalizeProductDraft(draft, 'fingerprint'))
}

export type ProductDraftIssue = {
  field: 'name' | 'salePrice' | 'purchasePrice' | 'stockQty' | 'images'
  message: string
}

/** Erori care blochează salvarea. */
export function validateProductDraft(draft: ProductDraft): ProductDraftIssue[] {
  const issues: ProductDraftIssue[] = []
  if (!draft.name.trim()) {
    issues.push({ field: 'name', message: 'Titlul produsului este obligatoriu.' })
  }
  if (!Number.isFinite(draft.salePrice) || draft.salePrice < 0) {
    issues.push({ field: 'salePrice', message: 'Prețul de vânzare nu poate fi negativ.' })
  }
  if (!Number.isFinite(draft.purchasePrice) || draft.purchasePrice < 0) {
    issues.push({ field: 'purchasePrice', message: 'Prețul de achiziție nu poate fi negativ.' })
  }
  if (draft.imageUrls.some((url) => url.startsWith('data:'))) {
    issues.push({
      field: 'images',
      message: 'O imagine nu s-a încărcat încă pe server. Așteaptă sau elimin-o.',
    })
  }
  return issues
}

/** Avertismente care nu blochează salvarea (afișate ca checklist). */
export function productDraftWarnings(draft: ProductDraft): string[] {
  const warnings: string[] = []
  if (draft.imageUrls.length === 0) warnings.push('Fără imagini: produsul apare cu placeholder.')
  if (!(draft.salePrice > 0)) warnings.push('Preț 0: produsul rămâne ascuns din magazin.')
  if (!draft.sku?.trim()) warnings.push('Fără SKU: lipsește din feed-ul Meta.')
  if (!draft.ean?.trim() && !(draft.brand?.trim() && draft.mpn?.trim())) {
    warnings.push('Feed Google/Meta: completează EAN sau Brand + MPN.')
  }
  if (!draft.description?.trim()) warnings.push('Fără descriere: pagina produsului va fi goală.')
  return warnings
}
