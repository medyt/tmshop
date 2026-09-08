import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'

/** Vânzări per produs pe ferestre de timp (comenzi distincte + bucăți). */
export type SalesWindow = { orders: number; units: number }

export type ProductSales = {
  d7: SalesWindow
  d30: SalesWindow
  d90: SalesWindow
}

export type ProductSalesMap = Record<string, ProductSales>

export const EMPTY_SALES: ProductSales = {
  d7: { orders: 0, units: 0 },
  d30: { orders: 0, units: 0 },
  d90: { orders: 0, units: 0 },
}

function toWindow(raw: unknown): SalesWindow {
  const r = (raw ?? {}) as { orders?: unknown; units?: unknown }
  return {
    orders: Math.max(0, Number(r.orders) || 0),
    units: Math.max(0, Number(r.units) || 0),
  }
}

/**
 * Agregat pe server (products.php?sales=1): comenzi din ultimele 7/30/90 zile,
 * fără cele anulate / returnate / neplătite cu cardul.
 */
export async function fetchProductSales(): Promise<ProductSalesMap> {
  if (!isApiEnabled()) return {}
  const res = await apiFetch(
    '/products.php?sales=1',
    { cache: 'no-store' },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as unknown
  if (!data || typeof data !== 'object') return {}
  const out: ProductSalesMap = {}
  for (const [id, value] of Object.entries(data as Record<string, unknown>)) {
    const v = (value ?? {}) as { d7?: unknown; d30?: unknown; d90?: unknown }
    out[id] = { d7: toWindow(v.d7), d30: toWindow(v.d30), d90: toWindow(v.d90) }
  }
  return out
}
