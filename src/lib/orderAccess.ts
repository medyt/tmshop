const KEY_PREFIX = 'shoptop-order-token:'
const STORAGE_KEY = 'shoptop-saved-orders'
const MAX_SAVED_ORDERS = 20

export type StoredOrderAccess = {
  orderId: string
  token: string
  savedAt: string
}

function readSavedOrders(): StoredOrderAccess[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const entries: StoredOrderAccess[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      const orderId = typeof record.orderId === 'string' ? record.orderId.trim() : ''
      const token = typeof record.token === 'string' ? record.token.trim() : ''
      const savedAt =
        typeof record.savedAt === 'string' && record.savedAt.trim()
          ? record.savedAt.trim()
          : new Date(0).toISOString()
      if (!orderId || !token) continue
      entries.push({ orderId, token, savedAt })
    }
    return entries
  } catch {
    return []
  }
}

function writeSavedOrders(entries: StoredOrderAccess[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* ignore */
  }
}

export function listStoredOrderAccess(): StoredOrderAccess[] {
  return readSavedOrders().sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export function saveOrderAccessToken(orderId: string, token: string): void {
  const normalizedId = orderId.trim()
  const normalizedToken = token.trim()
  if (!normalizedId || !normalizedToken) return

  try {
    sessionStorage.setItem(`${KEY_PREFIX}${normalizedId}`, normalizedToken)
  } catch {
    /* ignore */
  }

  const nextEntry: StoredOrderAccess = {
    orderId: normalizedId,
    token: normalizedToken,
    savedAt: new Date().toISOString(),
  }
  const entries = [
    nextEntry,
    ...readSavedOrders().filter((entry) => entry.orderId !== normalizedId),
  ].slice(0, MAX_SAVED_ORDERS)
  writeSavedOrders(entries)
}

export function readOrderAccessToken(orderId: string): string | null {
  try {
    const value = sessionStorage.getItem(`${KEY_PREFIX}${orderId}`)
    if (value && value.trim()) return value.trim()
  } catch {
    /* ignore */
  }

  const stored = readSavedOrders().find((entry) => entry.orderId === orderId)
  return stored?.token ?? null
}
