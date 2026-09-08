import { apiFetch, isApiEnabled } from './apiClient'
import { productPagePath } from './shopProductRoutes'
import type { Product } from '../types/product'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isCheckoutDraftEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

export async function saveCheckoutDraft(input: {
  email: string
  phone?: string
  products: Product[]
}): Promise<void> {
  if (!isApiEnabled()) return
  const email = input.email.trim()
  if (!isCheckoutDraftEmail(email)) return
  const items = input.products.slice(0, 12).map((product) => ({
    productId: product.id,
    name: product.name || product.id,
    url: productPagePath(product),
  }))
  if (items.length === 0) return
  try {
    await apiFetch('/checkout_drafts.php', {
      method: 'POST',
      body: JSON.stringify({
        email,
        phone: input.phone?.trim() ?? '',
        items,
      }),
    })
  } catch {
    /* best-effort */
  }
}
