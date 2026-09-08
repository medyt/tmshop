import type { ProductReview } from './shopGrowth'

export type ProductReviewDisplayStats = {
  averageRating: number
  reviewCount: number
}

const BASE_REVIEW_MIN = 1000
/** Interval suplimentar peste minim — fiecare produs primește un număr stabil, diferit. */
const BASE_REVIEW_SPREAD = 9000

function hashProductId(productId: string): number {
  let hash = 2166136261
  for (let i = 0; i < productId.length; i++) {
    hash ^= productId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Număr de recenzii „de bază” afișat pe produs (≥ 1000, stabil per ID). */
export function productReviewBaseCount(productId: string): number {
  const normalized = productId.trim()
  if (!normalized) return BASE_REVIEW_MIN
  return BASE_REVIEW_MIN + (hashProductId(normalized) % BASE_REVIEW_SPREAD)
}

function roundRating(value: number): number {
  return Math.round(value * 10) / 10
}

/** Combină baza (toate 5 stele) cu recenziile reale aprobate din API. */
export function mergeProductReviewStats(
  productId: string,
  realReviewCount: number,
  realAverageRating: number | null,
): ProductReviewDisplayStats {
  const baseCount = productReviewBaseCount(productId)
  const safeRealCount = Math.max(0, Math.floor(realReviewCount))
  const totalCount = baseCount + safeRealCount

  if (safeRealCount <= 0 || realAverageRating === null) {
    return { averageRating: 5, reviewCount: totalCount }
  }

  const realSum = safeRealCount * realAverageRating
  const totalSum = baseCount * 5 + realSum
  return {
    averageRating: roundRating(totalSum / totalCount),
    reviewCount: totalCount,
  }
}

/** Combină baza cu lista de recenzii reale încărcate pe pagina produsului. */
export function mergeProductReviewStatsFromReviews(
  productId: string,
  reviews: ProductReview[],
): ProductReviewDisplayStats {
  if (!reviews.length) {
    return {
      averageRating: 5,
      reviewCount: productReviewBaseCount(productId),
    }
  }
  const realSum = reviews.reduce((sum, review) => sum + review.rating, 0)
  const realAverage = realSum / reviews.length
  return mergeProductReviewStats(productId, reviews.length, realAverage)
}
