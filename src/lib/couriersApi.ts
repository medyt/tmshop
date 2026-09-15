import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'

export type ShipmentStatus =
  | 'awb_emis'
  | 'ridicat'
  | 'in_tranzit'
  | 'in_livrare'
  | 'livrat'
  | 'refuzat'
  | 'retur'
  | 'anulat'

export type ShipmentEvent = {
  at: string | null
  code: number
  description: string
  place: string | null
  type: string
  customer: boolean
}

export type Shipment = {
  id: number
  kind: 'delivery' | 'return'
  orderId: string
  carrier: 'dpd' | 'fan-courier'
  awb: string
  status: ShipmentStatus
  county: string
  city: string
  weightKg: number
  codAmount: number
  createdAt: string
  awbAt: string
  pickedUpAt: string
  pickupEstimated: boolean
  deliveredAt: string
  promisedDays: number | null
  transitDays: number | null
  workingDays: number | null
  onTime: boolean | null
  pickedOnTime: boolean | null
  customerDelay: boolean
  cost: number | null
  costSource: string
  lastEvent: string
  lastEventAt: string
  lastSyncAt: string
  syncError: string
  events: ShipmentEvent[]
}

export type CarrierSummary = {
  n: number
  finalized: number
  inProgress: number
  delivered: number
  otdPct: number | null
  lateClientPct: number | null
  lateCourierPct: number | null
  returnPct: number | null
  returnAllPct: number | null
  avgWorkingDays: number | null
  avgTransitDays: number | null
  pickedOnTimePct: number | null
  avgCost: number | null
}

export type CourierSetting = {
  carrier: string
  name: string
  active: number
  color: string | null
  priority_type: string
  priority: number
  sla_days: number
}

export type SyncState = {
  lastSyncAt: string
  intervalMin: number
  pending: number
  total: number
  missingFromOrders: number
  dpdConfigured: boolean
  fanConfigured: boolean
}

export type ShipmentsResponse = {
  shipments: Shipment[]
  summary: Record<string, CarrierSummary>
  couriers: CourierSetting[]
  sync: SyncState
}

export type SyncResult = {
  ok: boolean
  backfill: { inserted: number }
  sync: { skipped: boolean; synced: number; errors: number; pending: number; lastSyncAt: string | null; reason?: string }
}

export function isCouriersApiEnabled(): boolean {
  return isApiEnabled()
}

export async function fetchShipments(params: {
  carrier?: string
  status?: string
  days?: number
  kind?: 'delivery' | 'return'
}): Promise<ShipmentsResponse> {
  const q = new URLSearchParams({ list: '1' })
  if (params.carrier) q.set('carrier', params.carrier)
  if (params.status) q.set('status', params.status)
  if (params.days !== undefined) q.set('days', String(params.days))
  if (params.kind) q.set('kind', params.kind)
  const res = await apiFetch(`/courier_shipments.php?${q.toString()}`, { cache: 'no-store' }, { credentials: 'include' })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return (await res.json()) as ShipmentsResponse
}

export async function syncShipments(force = false): Promise<SyncResult> {
  const res = await apiFetch(
    '/courier_shipments.php',
    { method: 'POST', body: JSON.stringify({ action: 'sync', force }) },
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return (await res.json()) as SyncResult
}

export async function backfillShipments(): Promise<SyncResult> {
  const res = await apiFetch(
    '/courier_shipments.php',
    { method: 'POST', body: JSON.stringify({ action: 'backfill' }) },
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return (await res.json()) as SyncResult
}

const AUTO_SYNC_KEY = 'shoptop:courier-sync:last'

/**
 * Sincronizare „în fundal” la deschiderea admin-ului: cel mult o dată la 30 min
 * per browser; serverul mai aplică propriul throttle. Nu aruncă erori.
 */
export function triggerBackgroundCourierSync(): void {
  if (!isApiEnabled()) return
  try {
    const last = Number(sessionStorage.getItem(AUTO_SYNC_KEY) ?? 0)
    if (Date.now() - last < 30 * 60_000) return
    sessionStorage.setItem(AUTO_SYNC_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
  void syncShipments(false).catch(() => undefined)
}

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  awb_emis: 'AWB emis',
  ridicat: 'Ridicat',
  in_tranzit: 'În tranzit',
  in_livrare: 'În livrare',
  livrat: 'Livrat',
  refuzat: 'Refuzat',
  retur: 'Returnat',
  anulat: 'Anulat',
}

export function carrierLabel(carrier: string): string {
  return carrier === 'dpd' ? 'DPD' : carrier === 'fan-courier' ? 'Fan Courier' : carrier
}
