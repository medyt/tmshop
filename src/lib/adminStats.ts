import type { Order, PaymentMethod } from '../types/order'
import type { Product } from '../types/product'
import {
  isVirtualProductId,
} from './shopCatalog'
import { SHIPPING_FLAT_RATE } from './shopShipping'
import {
  orderDpdCostParts,
  orderHasFlatShipping,
  orderItemsSubtotal,
  packageOpeningUnitCost,
} from './shippingEconomics'

function isRefusedOrReturnedOrder(order: Order): boolean {
  if (order.status === 'returned') return true
  if (order.returnReceived === true) return true
  const courier = (order.courierStatus ?? '').toLowerCase()
  if (!courier) return false
  return courier.includes('refuz') || courier.includes('returnat')
}

export type MonthKey = string // YYYY-MM
export type DateKey = string // YYYY-MM-DD

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'month'
  | 'last_month'
  | 'custom'

export type ProductSalesRow = {
  productId: string
  productName: string
  productSku?: string
  quantitySold: number
  revenue: number
  /** Cost estimat = purchasePrice actual din catalog × cantitate. */
  cost: number
  /** Profit = încasări − cost. */
  profit: number
  orderCount: number
}

export type SalesPeriodSummary = {
  orderCount: number
  unitsSold: number
  revenue: number
  cost: number
  profit: number
  productCount: number
}

export type SalesBreakdown = {
  products: ProductSalesRow[]
  extras: ProductSalesRow[]
}

export type PeriodKpis = {
  /** Comenzi vândute (fără anulate / returnate). */
  orderCount: number
  /** Toate comenzile create în interval (inclusiv anulate / returnate). */
  allOrderCount: number
  /** Suma totalAmount (ce a plătit clientul). */
  revenue: number
  aov: number
  avgItemsPerOrder: number
  cost: number
  profit: number
  /** Venit transport + addon-uri încasat de la client (total − produse). */
  shippingRevenue: number
  /** Cost total DPD (cu TVA) pe comenzile cu AWB. */
  courierCostTotal: number
  /** Marjă servicii livrare = shippingRevenue − courierCostTotal. */
  shippingMargin: number
  deliveredCount: number
  returnedCount: number
  /** Valoarea comenzilor refuzate + returnate (scăzută din venituri). */
  returnedRevenue: number
  /** Costul de achiziție al comenzilor refuzate + returnate (scăzut din profit). */
  returnedCost: number
  cancelledCount: number
  cancelRate: number
  /** Refuzate + returnate / (livrate + refuzate + returnate). */
  returnRate: number
  /** Ore medii până la AWB; null dacă nu există expedieri. */
  avgShipHours: number | null
  shippedCount: number
  codCount: number
  cardCount: number
  codRevenue: number
  cardRevenue: number
}

export type SeriesPoint = {
  key: string
  label: string
  orderCount: number
  revenue: number
  aov: number
  profit: number
  avgShipHours: number | null
  /** Retururi/refuzuri înregistrate în ziua respectivă. */
  returnedCount: number
  returnedRevenue: number
}

export type MetricComparison = {
  current: number
  previous: number
  deltaPct: number | null
  direction: 'up' | 'down' | 'flat'
  sentiment: 'good' | 'bad' | 'neutral'
}

export type ResolvedStatsRange = {
  preset: DateRangePreset
  /** Filtru comenzi: început inclusiv. */
  start: Date
  /** Filtru comenzi: sfârșit exclusiv. */
  end: Date
  calendarStart: Date
  calendarEndExclusive: Date
  startKey: DateKey
  inclusiveEndKey: DateKey
  label: string
  previousStart: Date
  previousEnd: Date
  previousLabel: string
  bucket: 'hour' | 'day'
  dayCount: number
  isPartialToday: boolean
  canGoNext: boolean
}

export type DashboardStats = {
  range: ResolvedStatsRange
  current: PeriodKpis
  previous: PeriodKpis
  series: SeriesPoint[]
  previousSeries: SeriesPoint[]
  dailyOrHourly: SeriesPoint[]
  products: ProductSalesRow[]
  extras: ProductSalesRow[]
}

export const STATS_PRESET_OPTIONS: ReadonlyArray<{
  value: DateRangePreset
  label: string
}> = [
  { value: 'today', label: 'Astăzi' },
  { value: 'yesterday', label: 'Ieri' },
  { value: '7d', label: 'Ultimele 7 zile' },
  { value: '30d', label: 'Ultimele 30 de zile' },
  { value: 'month', label: 'Luna aceasta' },
  { value: 'last_month', label: 'Luna trecută' },
  { value: 'custom', label: 'Interval personalizat' },
]

const MONTH_NAMES_RO = [
  'Ianuarie',
  'Februarie',
  'Martie',
  'Aprilie',
  'Mai',
  'Iunie',
  'Iulie',
  'August',
  'Septembrie',
  'Octombrie',
  'Noiembrie',
  'Decembrie',
] as const

const MONTH_SHORT_RO = [
  'Ian',
  'Feb',
  'Mar',
  'Apr',
  'Mai',
  'Iun',
  'Iul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const WEEKDAY_SHORT_RO = [
  'Dum',
  'Lun',
  'Mar',
  'Mie',
  'Joi',
  'Vin',
  'Sâm',
] as const

const MS_HOUR = 3_600_000
const MAX_SHIP_HOURS = 24 * 30

/** Rând sintetic pentru taxa de livrare (nu e linie în order_items). */
export const SHIPPING_STATS_ID = '__shipping__'

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setDate(next.getDate() + days)
  return next
}

export function toLocalDateKey(date: Date): DateKey {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseLocalDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim())
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (toLocalDateKey(date) !== key.trim()) return null
  return date
}

export function formatRoDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}.${m}.${date.getFullYear()}`
}

export function formatRoTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

export function formatDayTableLabel(key: DateKey): string {
  const date = parseLocalDateKey(key)
  if (!date) return key
  return `${WEEKDAY_SHORT_RO[date.getDay()]} ${formatRoDate(date)}`
}

/** Dacă intervalul e o lună calendaristică (completă sau „luna aceasta/trecută”), returnează YYYY-MM. */
export function statsRangeMonthKey(range: ResolvedStatsRange): MonthKey | null {
  if (range.preset === 'month' || range.preset === 'last_month') {
    const start = range.calendarStart
    const month = String(start.getMonth() + 1).padStart(2, '0')
    return `${start.getFullYear()}-${month}`
  }

  const start = range.calendarStart
  const endInclusive = new Date(range.calendarEndExclusive.getTime() - 1)
  if (
    start.getFullYear() !== endInclusive.getFullYear() ||
    start.getMonth() !== endInclusive.getMonth() ||
    start.getDate() !== 1
  ) {
    return null
  }
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  if (endInclusive.getDate() !== lastDay) return null
  const month = String(start.getMonth() + 1).padStart(2, '0')
  return `${start.getFullYear()}-${month}`
}

export function shiftMonthKey(monthKey: MonthKey, deltaMonths: number): MonthKey {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1 + deltaMonths, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthKeyLabel(monthKey: MonthKey): string {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function formatShortDay(date: Date): string {
  return `${date.getDate()} ${MONTH_SHORT_RO[date.getMonth()]}`
}

function diffLocalDays(start: Date, endExclusive: Date): number {
  const a = startOfLocalDay(start).getTime()
  const b = startOfLocalDay(endExclusive).getTime()
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

function sameInstant(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime()
}

function rangeLabel(start: Date, endExclusive: Date): string {
  const last = addLocalDays(startOfLocalDay(endExclusive), -1)
  const startDay = startOfLocalDay(start)
  if (toLocalDateKey(startDay) === toLocalDateKey(last)) {
    return formatRoDate(startDay)
  }
  return `${formatRoDate(startDay)} – ${formatRoDate(last)}`
}

export function orderMonthKey(createdAt: string): MonthKey | null {
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatMonthLabel(key: MonthKey): string {
  const [ys, ms] = key.split('-')
  const y = Number(ys)
  const m = Number(ms)
  if (!y || !m || m < 1 || m > 12) return key
  return `${MONTH_NAMES_RO[m - 1]} ${y}`
}

export function currentMonthKey(now = new Date()): MonthKey {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function isCountableOrder(order: Order): boolean {
  if (order.status === 'cancelled') return false
  return !isRefusedOrReturnedOrder(order)
}

/** Luni disponibile din comenzi (descrescător). */
export function listOrderMonthKeys(orders: Order[]): MonthKey[] {
  const keys = new Set<MonthKey>()
  for (const order of orders) {
    if (!isCountableOrder(order)) continue
    const key = orderMonthKey(order.createdAt)
    if (key) keys.add(key)
  }
  return [...keys].sort((a, b) => b.localeCompare(a))
}

export function filterOrdersByMonth(
  orders: Order[],
  monthKey: MonthKey | 'all',
): Order[] {
  return orders.filter((order) => {
    if (!isCountableOrder(order)) return false
    if (monthKey === 'all') return true
    return orderMonthKey(order.createdAt) === monthKey
  })
}

export function filterOrdersByRange(
  orders: Order[],
  start: Date,
  end: Date,
): Order[] {
  const from = start.getTime()
  const to = end.getTime()
  return orders.filter((order) => {
    const t = new Date(order.createdAt).getTime()
    return Number.isFinite(t) && t >= from && t < to
  })
}

function emptyKpis(): PeriodKpis {
  return {
    orderCount: 0,
    allOrderCount: 0,
    revenue: 0,
    aov: 0,
    avgItemsPerOrder: 0,
    cost: 0,
    profit: 0,
    shippingRevenue: 0,
    courierCostTotal: 0,
    shippingMargin: 0,
    deliveredCount: 0,
    returnedCount: 0,
    returnedRevenue: 0,
    returnedCost: 0,
    cancelledCount: 0,
    cancelRate: 0,
    returnRate: 0,
    avgShipHours: null,
    shippedCount: 0,
    codCount: 0,
    cardCount: 0,
    codRevenue: 0,
    cardRevenue: 0,
  }
}

function paymentOf(order: Order): PaymentMethod {
  return order.paymentMethod === 'card' ? 'card' : 'cod'
}

function productUnits(order: Order): number {
  return order.items.reduce((sum, item) => {
    if (isVirtualProductId(item.productId, item.productSku)) return sum
    return sum + Math.max(0, Number(item.quantity) || 0)
  }, 0)
}

function orderProductCost(
  order: Order,
  purchasePriceByProductId: ReadonlyMap<string, number>,
): number {
  return order.items.reduce((sum, item) => {
    if (isVirtualProductId(item.productId, item.productSku)) return sum
    const qty = Math.max(0, Number(item.quantity) || 0)
    const unit = purchasePriceByProductId.get(item.productId.trim()) ?? 0
    if (!qty || !Number.isFinite(unit) || unit <= 0) return sum
    return sum + unit * qty
  }, 0)
}

function shipHoursOf(order: Order): number | null {
  if (!order.awbIssuedAt) return null
  const created = new Date(order.createdAt).getTime()
  const shipped = new Date(order.awbIssuedAt).getTime()
  if (!Number.isFinite(created) || !Number.isFinite(shipped)) return null
  const hours = (shipped - created) / MS_HOUR
  if (hours < 0 || hours > MAX_SHIP_HOURS) return null
  return hours
}

function orderCourierCost(order: Order): number {
  const value = order.courierCostTotal
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0
  }
  return Math.round(value * 100) / 100
}

function finalizeKpis(acc: PeriodKpis & { shipHoursSum: number }): PeriodKpis {
  const { shipHoursSum, ...kpis } = acc
  kpis.revenue -= kpis.returnedRevenue
  kpis.cost -= kpis.returnedCost
  kpis.aov = kpis.orderCount > 0 ? kpis.revenue / kpis.orderCount : 0
  kpis.avgItemsPerOrder =
    kpis.orderCount > 0 ? kpis.avgItemsPerOrder / kpis.orderCount : 0
  kpis.shippingMargin = kpis.shippingRevenue - kpis.courierCostTotal
  kpis.profit = kpis.revenue - kpis.cost - kpis.courierCostTotal
  kpis.cancelRate =
    kpis.allOrderCount > 0 ? kpis.cancelledCount / kpis.allOrderCount : 0
  const completedCount = kpis.deliveredCount + kpis.returnedCount
  kpis.returnRate =
    completedCount > 0 ? kpis.returnedCount / completedCount : 0
  kpis.avgShipHours =
    kpis.shippedCount > 0 ? shipHoursSum / kpis.shippedCount : null
  return kpis
}

function sortSalesRows(rows: ProductSalesRow[]): ProductSalesRow[] {
  return [...rows].sort((a, b) => {
    if (b.quantitySold !== a.quantitySold) {
      return b.quantitySold - a.quantitySold
    }
    return b.revenue - a.revenue
  })
}

function finalizeRows(
  map: Map<string, ProductSalesRow & { orderIds: Set<string> }>,
): ProductSalesRow[] {
  return sortSalesRows(
    [...map.values()].map(({ orderIds, ...rest }) => ({
      ...rest,
      profit: rest.revenue - rest.cost,
      orderCount: orderIds.size,
    })),
  )
}

function accumulateItem(
  map: Map<string, ProductSalesRow & { orderIds: Set<string> }>,
  orderId: string,
  item: {
    productId: string
    productName?: string
    productSku?: string
    quantity: number
    unitPrice: number
    lineTotal: number
  },
  unitCost: number,
): void {
  const id = item.productId.trim()
  const qty = Math.max(0, Number(item.quantity) || 0)
  if (!id || qty <= 0) return

  const lineRevenue =
    typeof item.lineTotal === 'number' && Number.isFinite(item.lineTotal)
      ? item.lineTotal
      : (Number(item.unitPrice) || 0) * qty
  const lineCost =
    Number.isFinite(unitCost) && unitCost > 0 ? unitCost * qty : 0

  let row = map.get(id)
  if (!row) {
    row = {
      productId: id,
      productName: item.productName?.trim() || id,
      productSku: item.productSku,
      quantitySold: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      orderCount: 0,
      orderIds: new Set(),
    }
    map.set(id, row)
  }
  row.quantitySold += qty
  row.revenue += lineRevenue
  row.cost += lineCost
  row.orderIds.add(orderId)
  if (item.productName?.trim()) {
    row.productName = item.productName.trim()
  }
  if (!row.productSku && item.productSku) {
    row.productSku = item.productSku
  }
}

/**
 * Estimare transport pe comandă: total − suma liniilor.
 * Fallback la tariful flat dacă diferența e 0 dar există total.
 */
function estimateOrderShipping(order: Order): number {
  const itemsTotal = orderItemsSubtotal(order)
  const diff = Number(order.totalAmount) - itemsTotal
  if (Number.isFinite(diff) && diff > 0.009) {
    return Math.round(diff * 100) / 100
  }
  if (
    Number.isFinite(order.totalAmount) &&
    order.totalAmount + 0.009 >= itemsTotal + SHIPPING_FLAT_RATE
  ) {
    return SHIPPING_FLAT_RATE
  }
  return 0
}

/**
 * Top produse + extras (addon-uri checkout + transport), separate.
 */
export function buildSalesBreakdown(
  orders: Order[],
  purchasePriceByProductId: ReadonlyMap<string, number> = new Map(),
): SalesBreakdown {
  const products = new Map<
    string,
    ProductSalesRow & { orderIds: Set<string> }
  >()
  const extras = new Map<
    string,
    ProductSalesRow & { orderIds: Set<string> }
  >()

  for (const order of orders) {
    const dpdCosts = orderDpdCostParts(order)

    for (const item of order.items) {
      const id = item.productId?.trim()
      if (!id) continue
      const isVirtual = isVirtualProductId(id, item.productSku)
      const unitCost = isVirtual
        ? packageOpeningUnitCost(order, item)
        : (purchasePriceByProductId.get(id) ?? 0)
      const target = isVirtual ? extras : products
      accumulateItem(target, order.id, item, unitCost)
    }

    if (orderHasFlatShipping(order)) {
      accumulateItem(
        extras,
        order.id,
        {
          productId: SHIPPING_STATS_ID,
          productName: 'Transport (livrare curier)',
          productSku: 'SHIPPING',
          quantity: 1,
          unitPrice: SHIPPING_FLAT_RATE,
          lineTotal: SHIPPING_FLAT_RATE,
        },
        dpdCosts.shipping,
      )
    }
  }

  return {
    products: finalizeRows(products),
    extras: finalizeRows(extras),
  }
}

/** @deprecated Folosește buildSalesBreakdown().products */
export function buildTopSoldProducts(
  orders: Order[],
  purchasePriceByProductId: ReadonlyMap<string, number> = new Map(),
): ProductSalesRow[] {
  return buildSalesBreakdown(orders, purchasePriceByProductId).products
}

export function summarizeSales(
  orders: Order[],
  rows: ProductSalesRow[],
): SalesPeriodSummary {
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
  const cost = rows.reduce((sum, row) => sum + row.cost, 0)
  return {
    orderCount: orders.length,
    unitsSold: rows.reduce((sum, row) => sum + row.quantitySold, 0),
    revenue,
    cost,
    profit: revenue - cost,
    productCount: rows.length,
  }
}

export function compareMetric(
  current: number,
  previous: number,
  lowerIsBetter = false,
): MetricComparison {
  const epsilon = 0.0005
  let direction: 'up' | 'down' | 'flat' = 'flat'
  if (current > previous + epsilon) direction = 'up'
  else if (current < previous - epsilon) direction = 'down'

  let deltaPct: number | null = null
  if (previous > epsilon) {
    deltaPct = ((current - previous) / previous) * 100
  } else if (Math.abs(current) <= epsilon) {
    deltaPct = 0
  }

  let sentiment: 'good' | 'bad' | 'neutral' = 'neutral'
  if (direction === 'flat') {
    sentiment = 'neutral'
  } else if (lowerIsBetter) {
    sentiment = direction === 'down' ? 'good' : 'bad'
  } else {
    sentiment = direction === 'up' ? 'good' : 'bad'
  }

  return { current, previous, deltaPct, direction, sentiment }
}

export function formatDeltaPct(deltaPct: number | null, hasCurrent: boolean): string {
  if (deltaPct === null) return hasCurrent ? 'nou' : '—'
  const abs = Math.abs(deltaPct)
  const formatted = new Intl.NumberFormat('ro-RO', {
    maximumFractionDigits: abs >= 100 ? 0 : abs >= 10 ? 1 : 2,
  }).format(abs)
  if (deltaPct > 0.0005) return `+${formatted}%`
  if (deltaPct < -0.0005) return `−${formatted}%`
  return '0%'
}

export function formatHours(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  if (value >= 48) {
    const days = value / 24
    return `${new Intl.NumberFormat('ro-RO', {
      maximumFractionDigits: 2,
    }).format(days)} zile`
  }
  return `${new Intl.NumberFormat('ro-RO', {
    maximumFractionDigits: 1,
  }).format(value)} h`
}

export function formatStatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('ro-RO', {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(value) ? 0 : Math.min(digits, 2),
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('ro-RO', {
    maximumFractionDigits: 2,
  }).format(value * 100)}%`
}

function defaultCustomRange(now: Date): { start: DateKey; end: DateKey } {
  const today = startOfLocalDay(now)
  return {
    start: toLocalDateKey(addLocalDays(today, -6)),
    end: toLocalDateKey(today),
  }
}

function calendarRangeForPreset(
  preset: Exclude<DateRangePreset, 'custom'>,
  now: Date,
): { start: Date; endExclusive: Date } {
  const today = startOfLocalDay(now)
  const tomorrow = addLocalDays(today, 1)
  switch (preset) {
    case 'today':
      return { start: today, endExclusive: tomorrow }
    case 'yesterday':
      return { start: addLocalDays(today, -1), endExclusive: today }
    case '7d':
      return { start: addLocalDays(today, -6), endExclusive: tomorrow }
    case '30d':
      return { start: addLocalDays(today, -29), endExclusive: tomorrow }
    case 'month':
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        endExclusive: tomorrow,
      }
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const endExclusive = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start, endExclusive }
    }
  }
}

function previousForPreset(
  preset: DateRangePreset,
  calendarStart: Date,
  calendarEndExclusive: Date,
  queryEnd: Date,
  now: Date,
): { start: Date; end: Date } {
  if (preset === 'today') {
    return {
      start: addLocalDays(calendarStart, -1),
      end: addLocalDays(queryEnd, -1),
    }
  }
  if (preset === 'month') {
    const y = calendarStart.getFullYear()
    const m = calendarStart.getMonth()
    const previousStart = new Date(y, m - 1, 1)
    const dayOfMonth = now.getDate()
    const lastPrev = new Date(y, m, 0).getDate()
    const prevEndDay = Math.min(dayOfMonth, lastPrev)
    return {
      start: previousStart,
      end: addLocalDays(new Date(y, m - 1, prevEndDay), 1),
    }
  }
  if (preset === 'last_month') {
    return {
      start: new Date(
        calendarStart.getFullYear(),
        calendarStart.getMonth() - 1,
        1,
      ),
      end: calendarStart,
    }
  }
  const days = diffLocalDays(calendarStart, calendarEndExclusive)
  return {
    start: addLocalDays(calendarStart, -days),
    end: calendarStart,
  }
}

function previousLabelFor(
  preset: DateRangePreset,
  previousStart: Date,
  previousEnd: Date,
  isPartialToday: boolean,
): string {
  if (preset === 'today' && isPartialToday) {
    return `ieri, ${formatRoDate(previousStart)} până la ${formatRoTime(previousEnd)}`
  }
  if (preset === 'month') {
    return rangeLabel(previousStart, previousEnd)
  }
  return rangeLabel(previousStart, previousEnd)
}

function currentLabelFor(
  preset: DateRangePreset,
  calendarStart: Date,
  calendarEndExclusive: Date,
  isPartialToday: boolean,
  now: Date,
): string {
  const span = rangeLabel(calendarStart, calendarEndExclusive)
  switch (preset) {
    case 'today':
      return isPartialToday
        ? `Astăzi, ${span} (până la ${formatRoTime(now)})`
        : `Astăzi, ${span}`
    case 'yesterday':
      return `Ieri, ${span}`
    case '7d':
      return `7 zile, ${span}`
    case '30d':
      return `30 zile, ${span}`
    case 'month':
      return `${MONTH_NAMES_RO[calendarStart.getMonth()]} ${calendarStart.getFullYear()}`
    case 'last_month':
      return `${MONTH_NAMES_RO[calendarStart.getMonth()]} ${calendarStart.getFullYear()}`
    default:
      return span
  }
}

export function resolveStatsRange(
  preset: DateRangePreset,
  customStartKey: string,
  customEndKey: string,
  now = new Date(),
): ResolvedStatsRange {
  const today = startOfLocalDay(now)
  const tomorrow = addLocalDays(today, 1)

  let calendarStart: Date
  let calendarEndExclusive: Date
  let resolvedPreset = preset

  if (preset === 'custom') {
    let start = parseLocalDateKey(customStartKey)
    let inclusiveEnd = parseLocalDateKey(customEndKey)
    if (!start || !inclusiveEnd) {
      const fallback = defaultCustomRange(now)
      start = parseLocalDateKey(fallback.start) ?? today
      inclusiveEnd = parseLocalDateKey(fallback.end) ?? today
    }
    if (start.getTime() > inclusiveEnd.getTime()) {
      const swap = start
      start = inclusiveEnd
      inclusiveEnd = swap
    }
    if (start.getTime() > today.getTime()) start = today
    if (inclusiveEnd.getTime() > today.getTime()) inclusiveEnd = today
    calendarStart = start
    calendarEndExclusive = addLocalDays(inclusiveEnd, 1)
    resolvedPreset = matchPreset(calendarStart, calendarEndExclusive, now)
  } else {
    const cal = calendarRangeForPreset(preset, now)
    calendarStart = cal.start
    calendarEndExclusive = cal.endExclusive
  }

  const dayCount = Math.max(
    1,
    diffLocalDays(calendarStart, calendarEndExclusive),
  )
  const lastDay = addLocalDays(calendarEndExclusive, -1)
  const isPartialToday =
    dayCount === 1 && toLocalDateKey(lastDay) === toLocalDateKey(today)

  const queryStart = calendarStart
  const queryEnd = isPartialToday ? now : calendarEndExclusive

  const previous = previousForPreset(
    resolvedPreset,
    calendarStart,
    calendarEndExclusive,
    queryEnd,
    now,
  )

  const startKey = toLocalDateKey(calendarStart)
  const inclusiveEndKey = toLocalDateKey(lastDay)

  const canGoNext = calendarEndExclusive.getTime() < tomorrow.getTime()

  return {
    preset: resolvedPreset,
    start: queryStart,
    end: queryEnd,
    calendarStart,
    calendarEndExclusive,
    startKey,
    inclusiveEndKey,
    label: currentLabelFor(
      resolvedPreset,
      calendarStart,
      calendarEndExclusive,
      isPartialToday,
      now,
    ),
    previousStart: previous.start,
    previousEnd: previous.end,
    previousLabel: previousLabelFor(
      resolvedPreset,
      previous.start,
      previous.end,
      isPartialToday,
    ),
    bucket: dayCount === 1 ? 'hour' : 'day',
    dayCount,
    isPartialToday,
    canGoNext,
  }
}

export function matchPreset(
  calendarStart: Date,
  calendarEndExclusive: Date,
  now = new Date(),
): DateRangePreset {
  const presets: Array<Exclude<DateRangePreset, 'custom'>> = [
    'today',
    'yesterday',
    '7d',
    '30d',
    'month',
    'last_month',
  ]
  for (const preset of presets) {
    const cal = calendarRangeForPreset(preset, now)
    if (
      sameInstant(cal.start, calendarStart) &&
      sameInstant(cal.endExclusive, calendarEndExclusive)
    ) {
      return preset
    }
  }
  return 'custom'
}

export function rangeForDay(
  dayKey: DateKey,
  now = new Date(),
): { preset: DateRangePreset; customStart: DateKey; customEnd: DateKey } {
  const day = parseLocalDateKey(dayKey) ?? startOfLocalDay(now)
  const today = startOfLocalDay(now)
  const tomorrow = addLocalDays(today, 1)
  const start = day.getTime() > today.getTime() ? today : day
  const endExclusive = addLocalDays(start, 1)
  const clampedEnd =
    endExclusive.getTime() > tomorrow.getTime() ? tomorrow : endExclusive
  const preset = matchPreset(start, clampedEnd, now)
  return {
    preset,
    customStart: toLocalDateKey(start),
    customEnd: toLocalDateKey(addLocalDays(clampedEnd, -1)),
  }
}

export function shiftStatsRange(
  range: ResolvedStatsRange,
  direction: -1 | 1,
  now = new Date(),
): { preset: DateRangePreset; customStart: DateKey; customEnd: DateKey } {
  const days = range.dayCount
  let nextStart = addLocalDays(range.calendarStart, direction * days)
  let nextEndExclusive = addLocalDays(range.calendarEndExclusive, direction * days)
  const today = startOfLocalDay(now)
  const tomorrow = addLocalDays(today, 1)
  if (nextEndExclusive.getTime() > tomorrow.getTime()) {
    nextEndExclusive = tomorrow
    nextStart = addLocalDays(nextEndExclusive, -days)
  }
  if (nextStart.getTime() > today.getTime()) {
    nextStart = today
    nextEndExclusive = tomorrow
  }
  const inclusiveEnd = addLocalDays(nextEndExclusive, -1)
  const preset = matchPreset(nextStart, nextEndExclusive, now)
  return {
    preset,
    customStart: toLocalDateKey(nextStart),
    customEnd: toLocalDateKey(inclusiveEnd),
  }
}

function hourKeys(range: ResolvedStatsRange): string[] {
  const lastHour = range.isPartialToday ? range.end.getHours() : 23
  return Array.from({ length: lastHour + 1 }, (_, hour) =>
    String(hour).padStart(2, '0'),
  )
}

function dayKeys(start: Date, endExclusive: Date): DateKey[] {
  const keys: DateKey[] = []
  let cursor = startOfLocalDay(start)
  const end = startOfLocalDay(endExclusive)
  while (cursor.getTime() < end.getTime()) {
    keys.push(toLocalDateKey(cursor))
    cursor = addLocalDays(cursor, 1)
  }
  return keys
}

function bucketKeyForDate(date: Date, bucket: 'hour' | 'day'): string | null {
  if (Number.isNaN(date.getTime())) return null
  if (bucket === 'hour') {
    return String(date.getHours()).padStart(2, '0')
  }
  return toLocalDateKey(date)
}

function bucketKeyFor(createdAt: string, bucket: 'hour' | 'day'): string | null {
  return bucketKeyForDate(new Date(createdAt), bucket)
}

function seriesLabel(key: string, bucket: 'hour' | 'day'): string {
  if (bucket === 'hour') {
    const hour = Number(key)
    return formatHourLabel(Number.isFinite(hour) ? hour : 0)
  }
  const date = parseLocalDateKey(key)
  return date ? formatShortDay(date) : key
}

function emptySeriesPoint(key: string, bucket: 'hour' | 'day'): SeriesPoint {
  return {
    key,
    label: seriesLabel(key, bucket),
    orderCount: 0,
    revenue: 0,
    aov: 0,
    profit: 0,
    avgShipHours: null,
    returnedCount: 0,
    returnedRevenue: 0,
  }
}

type BucketAcc = SeriesPoint & {
  cost: number
  shipHoursSum: number
  shippedCount: number
  returnRevenue: number
  returnCost: number
}

function emptyBucket(key: string, bucket: 'hour' | 'day'): BucketAcc {
  return {
    ...emptySeriesPoint(key, bucket),
    cost: 0,
    shipHoursSum: 0,
    shippedCount: 0,
    returnRevenue: 0,
    returnCost: 0,
  }
}

function finalizeSeriesPoint(acc: BucketAcc): SeriesPoint {
  const netRevenue = acc.revenue - acc.returnRevenue
  const netCost = acc.cost - acc.returnCost
  return {
    key: acc.key,
    label: acc.label,
    orderCount: acc.orderCount,
    revenue: netRevenue,
    aov: acc.orderCount > 0 ? netRevenue / acc.orderCount : 0,
    profit: netRevenue - netCost,
    avgShipHours:
      acc.shippedCount > 0 ? acc.shipHoursSum / acc.shippedCount : null,
    returnedCount: acc.returnedCount,
    returnedRevenue: acc.returnRevenue,
  }
}

function exclusiveDayEnd(end: Date): Date {
  const start = startOfLocalDay(end)
  if (end.getTime() === start.getTime()) return start
  return addLocalDays(start, 1)
}

function analyzePeriod(
  orders: Order[],
  purchasePriceByProductId: ReadonlyMap<string, number>,
  bucketKeys: string[],
  bucket: 'hour' | 'day',
): {
  kpis: PeriodKpis
  breakdown: SalesBreakdown
  series: SeriesPoint[]
} {
  const acc: PeriodKpis & { shipHoursSum: number } = {
    ...emptyKpis(),
    shipHoursSum: 0,
  }
  const buckets = new Map<string, BucketAcc>()
  for (const key of bucketKeys) {
    buckets.set(key, emptyBucket(key, bucket))
  }

  const countable: Order[] = []

  for (const order of orders) {
    acc.allOrderCount += 1
    const isReturn = isRefusedOrReturnedOrder(order)
    if (order.status === 'delivered') acc.deliveredCount += 1
    if (isReturn) acc.returnedCount += 1
    if (order.status === 'cancelled') {
      acc.cancelledCount += 1
      continue
    }

    const total = Number(order.totalAmount) || 0
    const cost = orderProductCost(order, purchasePriceByProductId)

    // Brute: comenzi plasate în interval, fără anulate.
    acc.revenue += total
    acc.cost += cost

    const shipping = estimateOrderShipping(order)
    const courierCost = orderCourierCost(order)
    const hours = shipHoursOf(order)
    const pay = paymentOf(order)

    if (isReturn) {
      acc.returnedRevenue += total
      acc.returnedCost += cost
    } else {
      countable.push(order)
      acc.orderCount += 1
      acc.avgItemsPerOrder += productUnits(order)
      acc.shippingRevenue += shipping
      acc.courierCostTotal += courierCost
      if (pay === 'card') {
        acc.cardCount += 1
        acc.cardRevenue += total
      } else {
        acc.codCount += 1
        acc.codRevenue += total
      }
      if (hours !== null) {
        acc.shipHoursSum += hours
        acc.shippedCount += 1
      }
    }

    const key = bucketKeyFor(order.createdAt, bucket)
    const bucketAcc = key ? buckets.get(key) : undefined
    if (bucketAcc) {
      bucketAcc.orderCount += 1
      bucketAcc.revenue += total
      bucketAcc.cost += cost
      if (isReturn) {
        bucketAcc.returnedCount += 1
        bucketAcc.returnRevenue += total
        bucketAcc.returnCost += cost
      } else if (hours !== null) {
        bucketAcc.shipHoursSum += hours
        bucketAcc.shippedCount += 1
      }
    }
  }

  return {
    kpis: finalizeKpis(acc),
    breakdown: buildSalesBreakdown(countable, purchasePriceByProductId),
    series: bucketKeys.map((key) =>
      finalizeSeriesPoint(buckets.get(key) ?? emptyBucket(key, bucket)),
    ),
  }
}

export function buildDashboardStats(
  orders: Order[],
  products: Product[],
  range: ResolvedStatsRange,
): DashboardStats {
  const purchasePriceByProductId = new Map<string, number>()
  for (const product of products) {
    const id = product.id?.trim()
    if (!id) continue
    const cost = Number(product.purchasePrice)
    purchasePriceByProductId.set(
      id,
      Number.isFinite(cost) && cost > 0 ? cost : 0,
    )
  }

  const currentKeys =
    range.bucket === 'hour'
      ? hourKeys(range)
      : dayKeys(range.calendarStart, range.calendarEndExclusive)
  const previousKeys =
    range.bucket === 'hour'
      ? hourKeys(range)
      : dayKeys(range.previousStart, exclusiveDayEnd(range.previousEnd))

  const currentOrders = filterOrdersByRange(orders, range.start, range.end)
  const previousOrders = filterOrdersByRange(
    orders,
    range.previousStart,
    range.previousEnd,
  )

  const current = analyzePeriod(
    currentOrders,
    purchasePriceByProductId,
    currentKeys,
    range.bucket,
  )
  const previous = analyzePeriod(
    previousOrders,
    purchasePriceByProductId,
    previousKeys,
    range.bucket,
  )

  return {
    range,
    current: current.kpis,
    previous: previous.kpis,
    series: current.series,
    previousSeries: previous.series,
    dailyOrHourly: current.series,
    products: current.breakdown.products,
    extras: current.breakdown.extras,
  }
}
