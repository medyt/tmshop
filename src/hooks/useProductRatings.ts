import { useEffect, useMemo, useState } from 'react'
import { fetchProductReviewSummaries } from '../lib/shopGrowth'
import {
  mergeProductReviewStats,
  type ProductReviewDisplayStats,
} from '../lib/productReviewStats'

export function useProductRatings(productIds: string[]) {
  const [ratings, setRatings] = useState<
    Map<string, ProductReviewDisplayStats>
  >(() => new Map())
  const productKey = useMemo(
    () => [...new Set(productIds)].sort().join('|'),
    [productIds],
  )

  useEffect(() => {
    if (!productKey) {
      setRatings(new Map())
      return
    }

    const allowed = [...productKey.split('|')]
    setRatings(
      new Map(
        allowed.map((productId) => [
          productId,
          mergeProductReviewStats(productId, 0, null),
        ]),
      ),
    )

    let cancelled = false

    void fetchProductReviewSummaries().then((summaries) => {
      if (cancelled) return
      const byProduct = new Map(
        summaries.map((summary) => [summary.productId, summary]),
      )
      const next = new Map<string, ProductReviewDisplayStats>()
      for (const productId of allowed) {
        const summary = byProduct.get(productId)
        next.set(
          productId,
          mergeProductReviewStats(
            productId,
            summary?.reviewCount ?? 0,
            summary?.averageRating ?? null,
          ),
        )
      }
      setRatings(next)
    })

    return () => {
      cancelled = true
    }
  }, [productKey])

  return ratings
}
