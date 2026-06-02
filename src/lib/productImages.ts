import type { Product } from '../types/product'

/** Limită practică (localStorage); poți folosi până la ~5–6 poze confortabil. */
export const MAX_IMAGES_PER_PRODUCT = 12

/** Normalizează lista de imagini la salvare / afișare. */
export function clampImageUrls(urls: string[]): string[] {
  return urls
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, MAX_IMAGES_PER_PRODUCT)
}

/** Directorul static pentru pozele produselor din `public/images/`. */
export const STATIC_PRODUCT_IMAGE_DIR = '/images/'

/** Normalizează URL-ul pentru afișare pe site HTTPS. */
export function normalizeImageUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('data:')) return trimmed
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice('http://'.length)}`
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (trimmed.startsWith('/seed-')) {
    return `${STATIC_PRODUCT_IMAGE_DIR}${trimmed.slice(1)}`
  }
  return trimmed
}

/** Ordinea din listă, cu URL-uri locale vechi mapate în `/images/`. */
export function imageUrlCandidates(urls: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const url of clampImageUrls(urls)) {
    const normalized = normalizeImageUrl(url)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

/** Prima imagine pentru thumbnail în liste (după migrare folosește doar `imageUrls`). */
export function primaryImageUrl(p: Product): string | undefined {
  return imageUrlCandidates(p.imageUrls)[0]
}

/** Număr suplimentar față de prima (pentru badge „+N”). */
export function extraImageCount(p: Product): number {
  return Math.max(0, p.imageUrls.length - 1)
}
