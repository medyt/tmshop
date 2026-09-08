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

export async function fetchProducts(options?: {
  /** Doar admin: include description/notes (payload mare). */
  full?: boolean
}): Promise<Product[]> {
  const qs = options?.full ? '?full=1' : ''
  const res = await apiFetch(
    `/products.php${qs}`,
    { cache: 'no-store' },
    { credentials: 'include' },
  )
  return parseProductsResponse(res)
}

/** Un produs cu description completă (pagina produs / edit admin). Acceptă id sau slug. */
export async function fetchProductById(idOrSlug: string): Promise<Product> {
  const res = await apiFetch(
    `/products.php?id=${encodeURIComponent(idOrSlug)}`,
    { cache: 'no-store' },
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

export type SmartbillStockSyncResult = {
  updated: number
  unchanged: number
  missing: number
  skipped: number
  warehouse: string
}

/** Copiază stocul din gestiunea SmartBill (minus coletele încă nefacturate). */
export async function syncSmartbillStock(): Promise<SmartbillStockSyncResult> {
  const res = await apiFetch(
    '/products.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'syncSmartbillStock' }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as Partial<SmartbillStockSyncResult>
  return {
    updated: Number(data.updated) || 0,
    unchanged: Number(data.unchanged) || 0,
    missing: Number(data.missing) || 0,
    skipped: Number(data.skipped) || 0,
    warehouse: typeof data.warehouse === 'string' ? data.warehouse : '',
  }
}

/** Upload imagine produs pe server; returnează URL-ul public. */
export async function uploadProductImage(file: File): Promise<string> {
  if (!isProductsApiEnabled()) {
    throw new Error('API-ul nu este configurat (VITE_API_URL).')
  }

  // 1) Multipart — ideal pe producție (post_max_size mic).
  try {
    return await uploadProductImageMultipart(file)
  } catch (multipartError) {
    // 2) Fallback JSON comprimat — util local (proxy Vite) sau dacă multipart e blocat.
    try {
      return await uploadProductImageJson(file)
    } catch (jsonError) {
      const jsonMsg =
        jsonError instanceof Error ? jsonError.message.trim() : ''
      const multiMsg =
        multipartError instanceof Error ? multipartError.message.trim() : ''
      throw new Error(
        jsonMsg ||
          multiMsg ||
          'Nu am putut încărca imaginea pe server.',
      )
    }
  }
}

async function uploadProductImageMultipart(file: File): Promise<string> {
  const form = new FormData()
  form.append('image', file)
  const res = await apiFetch(
    '/product_upload.php',
    {
      method: 'POST',
      body: form,
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return readUploadUrl(await res.json())
}

async function uploadProductImageJson(file: File): Promise<string> {
  const dataUrl = await fileToUploadDataUrl(file)
  const res = await apiFetch(
    '/product_upload.php',
    {
      method: 'POST',
      body: JSON.stringify({ dataUrl }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return readUploadUrl(await res.json())
}

function readUploadUrl(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('Nu am primit URL-ul imaginii.')
  }
  const url = (data as { url?: unknown }).url
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Nu am primit URL-ul imaginii.')
  }
  return url.trim()
}

/** Comprimă imaginea (max ~1600px, JPEG) ca să treacă ușor de limitele upload. */
async function fileToUploadDataUrl(file: File): Promise<string> {
  const raw = await readBlobAsDataURL(file)
  if (!raw.startsWith('data:image/')) {
    throw new Error('Fișierul selectat nu este o imagine.')
  }

  // GIF-urile le păstrăm ca atare (animație); restul le re-encodăm JPEG.
  if (file.type === 'image/gif' || raw.startsWith('data:image/gif')) {
    if (raw.length > 6_500_000) {
      throw new Error('Imaginea GIF este prea mare (maxim ~5MB).')
    }
    return raw
  }

  const img = await loadImage(raw)
  const maxSide = 1600
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return raw
  }
  ctx.drawImage(img, 0, 0, width, height)

  let quality = 0.85
  let out = canvas.toDataURL('image/jpeg', quality)
  while (out.length > 6_500_000 && quality > 0.45) {
    quality -= 0.1
    out = canvas.toDataURL('image/jpeg', quality)
  }
  if (out.length > 6_500_000) {
    throw new Error('Imaginea rămâne prea mare după comprimare. Alege un fișier mai mic.')
  }
  return out
}

function readBlobAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Nu am putut citi fișierul.'))
    }
    reader.onerror = () => reject(new Error('Nu am putut citi fișierul.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Nu am putut procesa imaginea.'))
    img.src = src
  })
}
