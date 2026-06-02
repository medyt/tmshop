import type { MarketObservation, Product } from '../types/product'

/** Medie aritmetică a prețurilor din observații; `null` dacă nu există date valide. */
export function proposedPriceAverage(p: Product): number | null {
  const obs = p.marketObservations
  if (!obs?.length) return null
  const prices = obs
    .map((o) => o.price)
    .filter((x) => typeof x === 'number' && Number.isFinite(x))
  if (!prices.length) return null
  return prices.reduce((a, b) => a + b, 0) / prices.length
}

export function proposedPriceAverageFromObservations(
  obs: MarketObservation[] | undefined,
): number | null {
  if (!obs?.length) return null
  const prices = obs
    .map((o) => o.price)
    .filter((x) => typeof x === 'number' && Number.isFinite(x))
  if (!prices.length) return null
  return prices.reduce((a, b) => a + b, 0) / prices.length
}
