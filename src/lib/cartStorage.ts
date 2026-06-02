export type StoredCartItem = {
  productId: string
  quantity: number
}

const KEY = 'shoptop-cart-v1'

export function loadCartItems(): StoredCartItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const items: StoredCartItem[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      if (typeof record.productId !== 'string' || !record.productId.trim()) {
        continue
      }
      const quantity =
        typeof record.quantity === 'number'
          ? record.quantity
          : Number(record.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) continue
      items.push({
        productId: record.productId.trim(),
        quantity: Math.floor(quantity),
      })
    }
    return items
  } catch {
    return []
  }
}

export function saveCartItems(items: StoredCartItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items))
}
