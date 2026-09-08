import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'

export type ReturnStatus = 'nou' | 'aprobat' | 'respins' | 'finalizat'

export type ReturnRequestInput = {
  orderId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  reason: string
  iban: string
  items?: string
}

export type ReturnRequest = {
  id: number
  orderId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  items: unknown
  reason: string
  iban: string
  status: ReturnStatus
  adminNotes: string
  createdAt: string
  orderExists?: boolean
  orderTotalAmount?: number | null
  orderStatus?: string | null
}

export type ReturnUpdateInput = {
  id: number
  status: ReturnStatus
  orderId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  reason?: string
  iban?: string
  items?: string
  adminNotes?: string
  /** Forțează emailul clientului (ex. re-trimitere la validare). */
  notifyCustomer?: boolean
}

export type ReturnUpdateResult = {
  ok: boolean
  emailSent: boolean
  emailWarning?: string
  return: ReturnRequest
}

export function isReturnsApiEnabled(): boolean {
  return isApiEnabled()
}

export async function submitReturnRequest(
  input: ReturnRequestInput,
): Promise<void> {
  const res = await apiFetch('/returns.php', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
}

export async function fetchAdminReturns(
  status: ReturnStatus | 'all' = 'all',
): Promise<ReturnRequest[]> {
  const res = await apiFetch(
    `/returns.php?status=${status}`,
    {},
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  return data as ReturnRequest[]
}

export async function updateReturnRequest(
  input: ReturnUpdateInput,
): Promise<ReturnUpdateResult> {
  const res = await apiFetch(
    '/returns.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'update', ...input }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as ReturnUpdateResult
  return data
}

/** @deprecated Preferă updateReturnRequest pentru editare completă. */
export async function updateReturnStatus(
  id: number,
  status: ReturnStatus,
  adminNotes?: string,
): Promise<ReturnUpdateResult> {
  return updateReturnRequest({ id, status, adminNotes })
}

export async function deleteReturnRequest(id: number): Promise<void> {
  const res = await apiFetch(
    '/returns.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
}
