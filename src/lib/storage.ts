import type { Product } from '../types/product'
import { parseProductRecord } from './validateImport'

const KEY = 'shoptop-products-v1'

export function loadProducts(): Product[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    const products: Product[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const p = parseProductRecord(item as Record<string, unknown>)
      if (p) products.push(p)
    }
    return products
  } catch {
    return null
  }
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem(KEY, JSON.stringify(products))
}

export const STORAGE_KEY = KEY
