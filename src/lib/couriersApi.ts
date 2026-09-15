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

/* ---------------------------------------------------------------------------
 * Panou curierat / rutare / tarife (courier_routing.php)
 * ------------------------------------------------------------------------- */

export type Agg = {
  n: number
  finalized: number
  inProgress: number
  delivered: number
  deliveredKnown: number
  deliveredUnknown: number
  otdBase: number
  otd: number
  lateClient: number
  lateCourier: number
  otdPct: number | null
  lateClientPct: number | null
  lateCourierPct: number | null
  returned: number
  refused: number
  returnPct: number | null
  returnAllPct: number | null
  refusedPct: number | null
  retClient: number
  retCourier: number
  retUnknown: number
  in24h: number
  in24hPct: number | null
  in24hOfFinalizedPct: number | null
  in48hPct: number | null
  nextDayPct: number | null
  buckets: [number, number, number, number]
  p50Hours: number | null
  p90Hours: number | null
  avgHours: number | null
  avgWorkingDays: number | null
  avgTransitDays: number | null
  avgCost: number | null
  costSum: number
  pickedOnTimePct: number | null
}

export type CountyCarrierAgg = {
  n: number
  otdPct: number | null
  in24hPct: number | null
  returnAllPct: number | null
  avgWorkingDays: number | null
}

export type CountyAgg = Agg & { code: string; name: string; carriers: Record<string, CountyCarrierAgg> }

export type DayAgg = {
  date: string
  n: number
  otd: number
  lateClient: number
  lateCourier: number
  inProgress: number
  unknown: number
  returned: number
}

export type CityAgg = {
  city: string
  county: string
  n: number
  otdPct: number | null
  in24hPct: number | null
  returnAllPct: number | null
  avgWorkingDays: number | null
}

export type ReturnReason = { reason: string; n: number; client: number; carriers: Record<string, number> }

export type CourierSettingFull = CourierSetting & {
  weight_min: string | number | null
  weight_max: string | number | null
  daily_limit: number | null
  services: { ramburs?: number; sambata?: number; deschidere_colet?: number }
}

export type DashboardResponse = {
  period: { days: number; from: string | null; to: string | null; carrier: string; sla: number }
  total: Agg
  carriers: Record<string, Agg>
  counties: CountyAgg[]
  countyNames: Record<string, string>
  unmappedCounty: number
  days: DayAgg[]
  cities: CityAgg[]
  returnReasons: ReturnReason[]
  courierSettings: CourierSettingFull[]
}

export async function fetchCourierDashboard(params: { days?: number; from?: string; to?: string; carrier?: string; sla?: number }): Promise<DashboardResponse> {
  const q = new URLSearchParams({ dashboard: '1', days: String(params.days ?? 30) })
  if (params.from && params.to) {
    q.set('from', params.from)
    q.set('to', params.to)
  }
  if (params.carrier && params.carrier !== 'all') q.set('carrier', params.carrier)
  if (params.sla) q.set('sla', String(params.sla))
  const res = await apiFetch(`/courier_routing.php?${q.toString()}`, { cache: 'no-store' }, { credentials: 'include' })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return (await res.json()) as DashboardResponse
}

export type RoutingResponse = {
  settings: Record<string, string>
  couriers: CourierSettingFull[]
  todayCounts: Record<string, number>
  historyRows: number
  historyByCarrier: Record<string, number>
  counties: Record<string, string>
}

export async function fetchRouting(): Promise<RoutingResponse> {
  const res = await apiFetch('/courier_routing.php?routing=1', { cache: 'no-store' }, { credentials: 'include' })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return (await res.json()) as RoutingResponse
}

async function routingPost<T>(body: Record<string, unknown>): Promise<T> {
  const res = await apiFetch('/courier_routing.php', { method: 'POST', body: JSON.stringify(body) }, { credentials: 'include' })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return (await res.json()) as T
}

export function saveRoutingSettings(settings: Record<string, string | number | boolean>): Promise<{ ok: boolean; saved: Record<string, string> }> {
  return routingPost({ action: 'saveRouting', settings })
}

export function saveCourierSettings(couriers: CourierSettingFull[]): Promise<{ ok: boolean; updated: number; couriers: CourierSettingFull[] }> {
  return routingPost({ action: 'saveCouriers', couriers })
}

export type ZoneStats = {
  level: 'localitate' | 'judet' | 'nou'
  n: number
  delivered: number
  finalized: number
  zile: number | null
  retur: number | null
  laTimp: number | null
  cost: number | null
}

export type RankRow = {
  carrier: string
  name: string
  level: number
  levelLabel: string
  priority: number
  priorityType: string
  zone: ZoneStats
  cost: number | null
  sub: { timp: number; retur: number; laTimp: number; cost: number }
  score: number
  scoreMax: number
  reasons: string[]
  disqualified: boolean
}

export type SimulateInput = {
  county: string
  city: string
  kg: number
  cod: number
  parcels: number
  saturday: boolean
  opening: boolean
}

export type SimulateResponse = {
  recommended: string | null
  ranking: RankRow[]
  costMin: number | null
  weights: { timp: number; retur: number; laTimp: number; cost: number }
  county: string
  countyName: string
  city: string
  historyRows: number
  estimates: Record<string, { total: number; net: number; vat: number; details: Record<string, number> }>
}

export function simulateRouting(input: SimulateInput): Promise<SimulateResponse> {
  return routingPost({ action: 'simulate', ...input })
}

export type BacktestResponse = {
  days: number
  n: number
  actual: Record<string, number>
  estimated: Record<string, number>
  agreementPct: number | null
  actualAvgCost: number | null
  estimatedAvgCost: number | null
  zoneLevels: Record<string, number>
  historyRows: number
}

export function backtestRouting(days: number): Promise<BacktestResponse> {
  return routingPost({ action: 'backtest', days })
}

export type RateField = { key: string; label: string; unit: string }

export type RateCarrier = {
  carrier: string
  fields: RateField[]
  values: Record<string, number | null>
  source: 'config' | 'db'
  n: number
  realN: number
  avgReal: number | null
  avgEstimate: number | null
  avgRealPaired: number | null
  avgEstimatePaired: number | null
  minReal: number | null
  maxReal: number | null
  sumReal: number
  weights: Record<string, number>
  sample: Record<string, number>
}

export type RatesResponse = { days: number; carriers: Record<string, RateCarrier> }

export async function fetchRates(days: number): Promise<RatesResponse> {
  const res = await apiFetch(`/courier_routing.php?rates=1&days=${days}`, { cache: 'no-store' }, { credentials: 'include' })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return (await res.json()) as RatesResponse
}

export function saveRates(carrier: string, rates: Record<string, number | null>, days: number): Promise<{ ok: boolean; report: RatesResponse }> {
  return routingPost({ action: 'saveRates', carrier, rates, days })
}

export const CARRIER_COLOR: Record<string, string> = { 'fan-courier': '#d61f26', dpd: '#2563eb' }

export function carrierColor(carrier: string, fallback = '#6b7280'): string {
  return CARRIER_COLOR[carrier] ?? fallback
}

/**
 * Rulează sincronizarea în buclă (câte un lot) până când nu mai rămâne nimic
 * sau până când un lot nu mai avansează (ex. curier neconfigurat). Returnează un rezumat.
 */
export async function runCourierSyncLoop(
  kind: 'sync' | 'backfill',
  onProgress?: (msg: string) => void,
): Promise<{ imported: number; synced: number; errors: number; pending: number; message: string }> {
  let imported = 0
  let synced = 0
  let errors = 0
  let pending = 0
  let lastPending = Number.POSITIVE_INFINITY
  for (let i = 0; i < 40; i++) {
    const r = i === 0 && kind === 'backfill' ? await backfillShipments() : await syncShipments(true)
    imported += r.backfill.inserted
    synced += r.sync.synced
    errors += r.sync.errors
    pending = r.sync.pending
    onProgress?.(`Se sincronizează… ${synced} actualizate, ${pending} rămase`)
    if (pending === 0 || r.sync.synced === 0 || pending >= lastPending) break
    lastPending = pending
  }
  const parts: string[] = []
  if (imported > 0) parts.push(`${imported} AWB-uri importate`)
  parts.push(`${synced} actualizate${errors ? `, ${errors} erori` : ''}`)
  if (pending > 0) parts.push(`${pending} rămase (curier neconfigurat sau tracking indisponibil)`)
  return { imported, synced, errors, pending, message: parts.join(' · ') }
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return '—'
  return `${v.toFixed(v % 1 === 0 ? 0 : digits)}%`
}
