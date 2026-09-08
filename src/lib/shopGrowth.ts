import type { Product } from '../types/product'
import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'

export type ProductReview = {
  id: number
  productId: string
  authorName: string
  rating: number
  body: string
  imageUrl?: string | null
  createdAt: string
}

export type ProductReviewSummary = {
  productId: string
  averageRating: number
  reviewCount: number
}

export async function fetchProductReviewSummaries(): Promise<ProductReviewSummary[]> {
  if (!isApiEnabled()) return []
  const res = await apiFetch('/reviews.php?summary=1')
  if (!res.ok) return []
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  const summaries: ProductReviewSummary[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const productId =
      typeof record.productId === 'string' ? record.productId : null
    const averageRating =
      typeof record.averageRating === 'number'
        ? record.averageRating
        : Number(record.averageRating)
    const reviewCount =
      typeof record.reviewCount === 'number'
        ? record.reviewCount
        : Number(record.reviewCount)
    if (
      !productId ||
      !Number.isFinite(averageRating) ||
      !Number.isFinite(reviewCount) ||
      reviewCount <= 0
    ) {
      continue
    }
    summaries.push({
      productId,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: Math.max(1, Math.floor(reviewCount)),
    })
  }
  return summaries
}

export async function fetchProductReviews(
  productId: string,
): Promise<ProductReview[]> {
  if (!isApiEnabled()) return []
  const res = await apiFetch(
    `/reviews.php?productId=${encodeURIComponent(productId)}`,
  )
  if (!res.ok) {
    return []
  }
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  const reviews: ProductReview[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const id = typeof record.id === 'number' ? record.id : Number(record.id)
    const authorName =
      typeof record.authorName === 'string' ? record.authorName : null
    const body = typeof record.body === 'string' ? record.body : null
    const imageUrl =
      typeof record.imageUrl === 'string'
        ? record.imageUrl
        : record.imageUrl === null
          ? null
          : undefined
    const rating =
      typeof record.rating === 'number' ? record.rating : Number(record.rating)
    const createdAt =
      typeof record.createdAt === 'string' ? record.createdAt : null
    if (
      !Number.isFinite(id) ||
      !authorName ||
      !body ||
      !Number.isFinite(rating) ||
      !createdAt
    ) {
      continue
    }
    reviews.push({
      id,
      productId,
      authorName,
      body,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      rating: Math.max(1, Math.min(5, Math.floor(rating))),
      createdAt,
    })
  }
  return reviews
}

export async function submitProductReview(input: {
  productId: string
  authorName: string
  rating: number
  body: string
  imageUrl?: string
}): Promise<void> {
  const res = await apiFetch('/reviews.php', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
}

export async function uploadProductReviewImage(file: File): Promise<string> {
  if (!isApiEnabled()) {
    throw new Error('API-ul nu este configurat (VITE_API_URL).')
  }
  const form = new FormData()
  form.append('image', file)
  const res = await apiFetch('/review_upload.php', {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as { url?: unknown }
  if (typeof data.url !== 'string' || !data.url.trim()) {
    throw new Error('Nu am primit URL-ul imaginii.')
  }
  return data.url.trim()
}

export type AdminReview = ProductReview & { approved: boolean }

export type AdminReviewStatus = 'pending' | 'approved' | 'all'

export async function fetchAdminReviews(
  status: AdminReviewStatus = 'pending',
): Promise<AdminReview[]> {
  const res = await apiFetch(
    `/reviews.php?admin=1&status=${status}`,
    {},
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  const reviews: AdminReview[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const id = typeof record.id === 'number' ? record.id : Number(record.id)
    const productId =
      typeof record.productId === 'string' ? record.productId : null
    const authorName =
      typeof record.authorName === 'string' ? record.authorName : null
    const reviewBody = typeof record.body === 'string' ? record.body : null
    const imageUrl =
      typeof record.imageUrl === 'string'
        ? record.imageUrl
        : record.imageUrl === null
          ? null
          : undefined
    const rating =
      typeof record.rating === 'number' ? record.rating : Number(record.rating)
    const createdAt =
      typeof record.createdAt === 'string' ? record.createdAt : null
    if (
      !Number.isFinite(id) ||
      !productId ||
      !authorName ||
      !reviewBody ||
      !Number.isFinite(rating) ||
      !createdAt
    ) {
      continue
    }
    reviews.push({
      id,
      productId,
      authorName,
      body: reviewBody,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      rating: Math.max(1, Math.min(5, Math.floor(rating))),
      createdAt,
      approved: record.approved === true,
    })
  }
  return reviews
}

export async function moderateReview(
  id: number,
  action: 'approve' | 'reject' | 'delete',
): Promise<void> {
  const res = await apiFetch(
    '/reviews.php',
    {
      method: 'POST',
      body: JSON.stringify({ action, id }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
}

export function relatedProducts(
  product: Product,
  products: Product[],
  limit = 4,
): Product[] {
  const category = product.category?.trim()
  const others = products.filter((candidate) => candidate.id !== product.id)
  const sameCategory = others.filter(
    (candidate) => category && candidate.category?.trim() === category,
  )
  const rest = others.filter(
    (candidate) => !category || candidate.category?.trim() !== category,
  )
  // Aceeași categorie primele (relevanță), apoi restul catalogului.
  const pool = [...sameCategory, ...rest]
  return pool.slice(0, limit)
}

/** Upsell coș: produse din aceeași categorie ca linia principală, fără cele deja în coș. */
export function cartUpsellProducts(
  cartProducts: Product[],
  catalog: Product[],
  limit = 3,
): Product[] {
  if (cartProducts.length === 0) return []
  const inCart = new Set(cartProducts.map((product) => product.id))
  const pool = catalog.filter((product) => !inCart.has(product.id))
  const seen = new Set<string>()
  const out: Product[] = []
  for (const seed of cartProducts) {
    for (const candidate of relatedProducts(seed, pool, limit + cartProducts.length)) {
      if (seen.has(candidate.id)) continue
      seen.add(candidate.id)
      out.push(candidate)
      if (out.length >= limit) return out
    }
  }
  return out
}

export function reviewAverage(reviews: ProductReview[]): number | null {
  if (!reviews.length) return null
  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  return Math.round((total / reviews.length) * 10) / 10
}
