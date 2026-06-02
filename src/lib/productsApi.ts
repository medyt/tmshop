import type { Product } from '../types/product'
import { parseProductRecord } from './validateImport'
import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'

export function isProductsApiEnabled(): boolean {
  return isApiEnabled()
}

async function parseProductsResponse(res: Response): Promise<Product[]> {
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) {
    throw new Error('Raspuns invalid de la server.')
  }

  const products: Product[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const product = parseProductRecord(item as Record<string, unknown>)
    if (product) products.push(product)
  }
  return products
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await apiFetch('/products.php', {}, { credentials: 'include' })
  return parseProductsResponse(res)
}

export async function createProduct(product: Product): Promise<Product> {
  const res = await apiFetch(
    '/products.php',
    {
      method: 'POST',
      body: JSON.stringify(product),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  if (!data || typeof data !== 'object') {
    throw new Error('Raspuns invalid de la server.')
  }
  const parsed = parseProductRecord(data as Record<string, unknown>)
  if (!parsed) {
    throw new Error('Raspuns invalid de la server.')
  }
  return parsed
}

export async function updateProductRemote(product: Product): Promise<Product> {
  const res = await apiFetch(
    '/products.php',
    {
      method: 'PUT',
      body: JSON.stringify(product),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  if (!data || typeof data !== 'object') {
    throw new Error('Raspuns invalid de la server.')
  }
  const parsed = parseProductRecord(data as Record<string, unknown>)
  if (!parsed) {
    throw new Error('Raspuns invalid de la server.')
  }
  return parsed
}

export async function deleteProductRemote(id: string): Promise<void> {
  const res = await apiFetch(
    `/products.php?id=${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
}

export async function replaceAllProductsRemote(
  products: Product[],
): Promise<void> {
  const res = await apiFetch(
    '/import.php',
    {
      method: 'POST',
      body: JSON.stringify(products),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
}
