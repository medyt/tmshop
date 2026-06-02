import type { Product } from '../types/product'
import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'

export type ProductReview = {
  id: number
  productId: string
  authorName: string
  rating: number
  body: string
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
}): Promise<void> {
  const res = await apiFetch('/reviews.php', {
    method: 'POST',
    body: JSON.stringify(input),
  })
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
  const sameCategory = products.filter(
    (candidate) =>
      candidate.id !== product.id &&
      category &&
      candidate.category?.trim() === category,
  )
  const pool = sameCategory.length
    ? sameCategory
    : products.filter((candidate) => candidate.id !== product.id)
  return pool.slice(0, limit)
}

export function reviewAverage(reviews: ProductReview[]): number | null {
  if (!reviews.length) return null
  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  return Math.round((total / reviews.length) * 10) / 10
}
