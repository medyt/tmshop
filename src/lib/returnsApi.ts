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
  /** AWB de ridicare a coletului de la client (gol = neemis). */
  returnAwbNumber?: string
  returnAwbCarrier?: ReturnAwbCarrier | ''
  returnAwbIssuedAt?: string
}

export type ReturnAwbCarrier = 'fan-courier' | 'dpd'

export type ReturnAwbResult = {
  ok: boolean
  emailSent: boolean
  emailWarning?: string
  return: ReturnRequest
}

/** Adresă (ridicare sau livrare) pentru AWB-ul de retur. */
export type ReturnAwbAddress = {
  name: string
  contact: string
  phone: string
  email: string
  county: string
  city: string
  street: string
  streetNumber: string
  addressExtra: string
  postalCode: string
  dpdSiteId: number
  dpdClientId: number
}

export type ReturnAwbDefaults = {
  pickup: ReturnAwbAddress
  delivery: ReturnAwbAddress
  /** De unde vine adresa de livrare (contul curierului / config). */
  deliverySource: string
  carrierConfigured: boolean
}

export const EMPTY_RETURN_ADDRESS: ReturnAwbAddress = {
  name: '', contact: '', phone: '', email: '', county: '', city: '', street: '',
  streetNumber: '', addressExtra: '', postalCode: '', dpdSiteId: 0, dpdClientId: 0,
}

function parseReturnAddress(raw: unknown): ReturnAwbAddress {
  const r = (raw ?? {}) as Record<string, unknown>
  const s = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : '')
  const n = (k: string) => (Number.isFinite(Number(r[k])) ? Number(r[k]) : 0)
  return {
    name: s('name'), contact: s('contact'), phone: s('phone'), email: s('email'),
    county: s('county'), city: s('city'), street: s('street'), streetNumber: s('streetNumber'),
    addressExtra: s('addressExtra'), postalCode: s('postalCode'),
    dpdSiteId: n('dpdSiteId'), dpdClientId: n('dpdClientId'),
  }
}

/** Adresele propuse înainte de emitere: client (din comandă) și punctul de lucru. */
export async function fetchReturnAwbDefaults(
  id: number,
  carrier: ReturnAwbCarrier,
): Promise<ReturnAwbDefaults> {
  const res = await apiFetch(
    `/returns.php?awbDefaults=1&id=${encodeURIComponent(String(id))}&carrier=${encodeURIComponent(carrier)}`,
    { cache: 'no-store' },
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error(await readErrorMessage(res))
  const data = (await res.json()) as Record<string, unknown>
  return {
    pickup: parseReturnAddress(data.pickup),
    delivery: parseReturnAddress(data.delivery),
    deliverySource: typeof data.deliverySource === 'string' ? data.deliverySource : '',
    carrierConfigured: Boolean(data.carrierConfigured),
  }
}

/** Creează AWB „în oglindă”: curierul ridică de la client și livrează la punctul de lucru. */
export async function issueReturnAwb(input: {
  id: number
  carrier: ReturnAwbCarrier
  notifyCustomer: boolean
  pickup?: ReturnAwbAddress
  delivery?: ReturnAwbAddress
}): Promise<ReturnAwbResult> {
  const res = await apiFetch(
    '/returns.php',
    { method: 'POST', body: JSON.stringify({ action: 'issueReturnAwb', ...input }) },
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return (await res.json()) as ReturnAwbResult
}

export async function cancelReturnAwb(id: number): Promise<ReturnAwbResult> {
  const res = await apiFetch(
    '/returns.php',
    { method: 'POST', body: JSON.stringify({ action: 'cancelReturnAwb', id }) },
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return (await res.json()) as ReturnAwbResult
}

/** Descarcă eticheta AWB de retur și o deschide într-un tab nou. */
export async function openReturnAwbLabel(id: number): Promise<void> {
  const res = await apiFetch(
    `/returns.php?printAwb=1&id=${encodeURIComponent(String(id))}`,
    { cache: 'no-store' },
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error(await readErrorMessage(res))
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
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
