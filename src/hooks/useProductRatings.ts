import { useEffect, useMemo, useState } from 'react'
import {
  fetchProductReviewSummaries,
  type ProductReviewSummary,
} from '../lib/shopGrowth'

export function useProductRatings(productIds: string[]) {
  const [ratings, setRatings] = useState<Map<string, ProductReviewSummary>>(
    () => new Map(),
  )
  const productKey = useMemo(
    () => [...new Set(productIds)].sort().join('|'),
    [productIds],
  )

  useEffect(() => {
    if (!productKey) {
      setRatings(new Map())
      return
    }

    const allowed = new Set(productKey.split('|'))
    let cancelled = false

    void fetchProductReviewSummaries().then((summaries) => {
      if (cancelled) return
      const next = new Map<string, ProductReviewSummary>()
      for (const summary of summaries) {
        if (allowed.has(summary.productId)) {
          next.set(summary.productId, summary)
        }
      }
      setRatings(next)
    })

    return () => {
      cancelled = true
    }
  }, [productKey])

  return ratings
}
