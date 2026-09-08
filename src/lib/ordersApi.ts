import type {
  CheckoutPayload,
  Order,
  OrderStatus,
  OrderTracking,
  OrderTrackingEvent,
  OrderWithTracking,
  BillingType,
  PaymentStatus,
} from '../types/order'
import { apiFetch, readErrorMessage } from './apiClient'
import { listStoredOrderAccess } from './orderAccess'
import { isProductsApiEnabled } from './productsApi'
import { readMetaClickIds } from './pixels/metaPixel'

const ORDER_STATUSES: OrderStatus[] = [
  'new',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'returned',
  'cancelled',
]

function parseOrderStatus(value: unknown): OrderStatus {
  if (typeof value === 'string' && ORDER_STATUSES.includes(value as OrderStatus)) {
    return value as OrderStatus
  }
  return 'new'
}

function parseOrderItem(value: unknown): Order['items'][number] | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const productId =
    typeof record.productId === 'string' ? record.productId : null
  const productName =
    typeof record.productName === 'string' ? record.productName : null
  const unitPrice =
    typeof record.unitPrice === 'number'
      ? record.unitPrice
      : Number(record.unitPrice)
  const quantity =
    typeof record.quantity === 'number'
      ? record.quantity
      : Number(record.quantity)
  const lineTotal =
    typeof record.lineTotal === 'number'
      ? record.lineTotal
      : Number(record.lineTotal)

  if (
    !productId ||
    !productName ||
    !Number.isFinite(unitPrice) ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(lineTotal)
  ) {
    return null
  }

  const item: Order['items'][number] = {
    productId,
    productName,
    unitPrice,
    quantity: Math.floor(quantity),
    lineTotal,
  }
  if (typeof record.productSku === 'string' && record.productSku.trim()) {
    item.productSku = record.productSku.trim()
  }
  return item
}

function parseOrder(value: unknown): Order | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id : null
  const customerName =
    typeof record.customerName === 'string' ? record.customerName : null
  const customerPhone =
    typeof record.customerPhone === 'string' ? record.customerPhone : null
  const customerAddress =
    typeof record.customerAddress === 'string' ? record.customerAddress : null
  const totalAmount =
    typeof record.totalAmount === 'number'
      ? record.totalAmount
      : Number(record.totalAmount)
  const createdAt =
    typeof record.createdAt === 'string' ? record.createdAt : null
  const itemsRaw = record.items

  if (
    !id ||
    !customerName ||
    !customerPhone ||
    !customerAddress ||
    !Number.isFinite(totalAmount) ||
    !createdAt ||
    !Array.isArray(itemsRaw)
  ) {
    return null
  }

  const items: Order['items'] = []
  for (const item of itemsRaw) {
    const parsed = parseOrderItem(item)
    if (parsed) items.push(parsed)
  }
  if (!items.length) return null

  const order: Order = {
    id,
    customerName,
    customerPhone,
    customerAddress,
    totalAmount,
    status: parseOrderStatus(record.status),
    createdAt,
    items,
  }
  if (typeof record.customerEmail === 'string' && record.customerEmail.trim()) {
    order.customerEmail = record.customerEmail.trim()
  }
  if (typeof record.customerNotes === 'string' && record.customerNotes.trim()) {
    order.customerNotes = record.customerNotes.trim()
  }
  if (typeof record.shipCounty === 'string' && record.shipCounty.trim()) {
    order.shipCounty = record.shipCounty.trim()
  }
  if (typeof record.shipCountyName === 'string' && record.shipCountyName.trim()) {
    order.shipCountyName = record.shipCountyName.trim()
  }
  if (typeof record.shipCity === 'string' && record.shipCity.trim()) {
    order.shipCity = record.shipCity.trim()
  }
  if (typeof record.shipStreet === 'string' && record.shipStreet.trim()) {
    order.shipStreet = record.shipStreet.trim()
  }
  if (typeof record.shipStreetNumber === 'string' && record.shipStreetNumber.trim()) {
    order.shipStreetNumber = record.shipStreetNumber.trim()
  }
  if (typeof record.shipAddressExtra === 'string' && record.shipAddressExtra.trim()) {
    order.shipAddressExtra = record.shipAddressExtra.trim()
  }
  if (typeof record.shipPostalCode === 'string' && record.shipPostalCode.trim()) {
    order.shipPostalCode = record.shipPostalCode.trim()
  }
  if (typeof record.dpdSiteId === 'number' && record.dpdSiteId > 0) {
    order.dpdSiteId = record.dpdSiteId
  } else if (typeof record.dpdSiteId === 'string') {
    const siteId = Number(record.dpdSiteId)
    if (Number.isFinite(siteId) && siteId > 0) order.dpdSiteId = siteId
  }
  if (record.paymentMethod === 'cod' || record.paymentMethod === 'card') {
    order.paymentMethod = record.paymentMethod
  }
  if (record.paymentStatus === 'pending' || record.paymentStatus === 'paid') {
    order.paymentStatus = record.paymentStatus
  }
  if (typeof record.awbNumber === 'string' && record.awbNumber.trim()) {
    order.awbNumber = record.awbNumber.trim()
  }
  if (typeof record.awbIssuedAt === 'string' && record.awbIssuedAt.trim()) {
    order.awbIssuedAt = record.awbIssuedAt.trim()
  }
  if (typeof record.dpdParcelId === 'string' && record.dpdParcelId.trim()) {
    order.dpdParcelId = record.dpdParcelId.trim()
  }
  if (record.deliveryCarrier === 'dpd' || record.deliveryCarrier === 'fan-courier') {
    order.deliveryCarrier = record.deliveryCarrier
  }
  if (typeof record.courierStatus === 'string' && record.courierStatus.trim()) {
    order.courierStatus = record.courierStatus.trim()
  }
  if (typeof record.courierStatusAt === 'string' && record.courierStatusAt.trim()) {
    order.courierStatusAt = record.courierStatusAt.trim()
  }
  if (record.returnReceived === true || record.returnReceived === 1) {
    order.returnReceived = true
  } else if (record.returnReceived === false || record.returnReceived === 0) {
    order.returnReceived = false
  } else if (order.courierStatus) {
    const cs = order.courierStatus.toLowerCase()
    if (
      cs.includes('returnat la expeditor') ||
      cs.includes('returnat expeditorului')
    ) {
      order.returnReceived = true
    }
  }
  if (record.billingType === 'person' || record.billingType === 'company') {
    order.billingType = record.billingType
  }
  if (typeof record.companyName === 'string' && record.companyName.trim()) {
    order.companyName = record.companyName.trim()
  }
  if (typeof record.companyCui === 'string' && record.companyCui.trim()) {
    order.companyCui = record.companyCui.trim()
  }
  if (typeof record.companyRegCom === 'string' && record.companyRegCom.trim()) {
    order.companyRegCom = record.companyRegCom.trim()
  }
  if (typeof record.invoiceSeries === 'string' && record.invoiceSeries.trim()) {
    order.invoiceSeries = record.invoiceSeries.trim()
  }
  if (typeof record.invoiceNumber === 'string' && record.invoiceNumber.trim()) {
    order.invoiceNumber = record.invoiceNumber.trim()
  }
  if (typeof record.invoiceUrl === 'string' && record.invoiceUrl.trim()) {
    order.invoiceUrl = record.invoiceUrl.trim()
  }
  if (typeof record.invoiceIssuedAt === 'string' && record.invoiceIssuedAt.trim()) {
    order.invoiceIssuedAt = record.invoiceIssuedAt.trim()
  }
  if (typeof record.invoiceError === 'string' && record.invoiceError.trim()) {
    order.invoiceError = record.invoiceError.trim()
  }
  if (typeof record.courierCostTotal === 'number' && Number.isFinite(record.courierCostTotal)) {
    order.courierCostTotal = record.courierCostTotal
  }
  if (typeof record.courierCostNet === 'number' && Number.isFinite(record.courierCostNet)) {
    order.courierCostNet = record.courierCostNet
  }
  if (typeof record.courierCostVat === 'number' && Number.isFinite(record.courierCostVat)) {
    order.courierCostVat = record.courierCostVat
  }
  if (record.courierCostSource === 'api' || record.courierCostSource === 'contract') {
    order.courierCostSource = record.courierCostSource
  }
  if (typeof record.courierCostAt === 'string' && record.courierCostAt.trim()) {
    order.courierCostAt = record.courierCostAt.trim()
  }
  if (record.courierCostDetails && typeof record.courierCostDetails === 'object') {
    const details: Record<string, number> = {}
    for (const [key, value] of Object.entries(
      record.courierCostDetails as Record<string, unknown>,
    )) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        details[key] = value
      }
    }
    if (Object.keys(details).length > 0) {
      order.courierCostDetails = details
    }
  }
  if (record.serviceMarginBreakdown && typeof record.serviceMarginBreakdown === 'object') {
    const raw = record.serviceMarginBreakdown as Record<string, unknown>
    const linesRaw = raw.lines
    const totalsRaw = raw.totals
    if (Array.isArray(linesRaw) && totalsRaw && typeof totalsRaw === 'object') {
      const lines = linesRaw
        .map((line) => {
          if (!line || typeof line !== 'object') return null
          const row = line as Record<string, unknown>
          const key = typeof row.key === 'string' ? row.key : ''
          const label = typeof row.label === 'string' ? row.label : key
          const revenue = Number(row.revenue)
          const cost = Number(row.cost)
          const margin = Number(row.margin)
          if (!key || !Number.isFinite(revenue) || !Number.isFinite(cost) || !Number.isFinite(margin)) {
            return null
          }
          return { key, label, revenue, cost, margin }
        })
        .filter((line): line is NonNullable<typeof line> => line !== null)
      const totals = totalsRaw as Record<string, unknown>
      const revenue = Number(totals.revenue)
      const cost = Number(totals.cost)
      const margin = Number(totals.margin)
      if (
        lines.length > 0 &&
        Number.isFinite(revenue) &&
        Number.isFinite(cost) &&
        Number.isFinite(margin)
      ) {
        order.serviceMarginBreakdown = {
          lines,
          totals: { revenue, cost, margin },
          courierCostSource:
            raw.courierCostSource === 'api' || raw.courierCostSource === 'contract'
              ? raw.courierCostSource
              : null,
        }
      }
    }
  }
  if (typeof record.accessToken === 'string' && record.accessToken.trim()) {
    order.accessToken = record.accessToken.trim()
  }
  return order
}

export function isOrdersApiEnabled(): boolean {
  return isProductsApiEnabled()
}

export async function createOrder(payload: CheckoutPayload): Promise<Order> {
  const clickIds = readMetaClickIds()
  const meta = {
    fbp: payload.meta?.fbp || clickIds.fbp,
    fbc: payload.meta?.fbc || clickIds.fbc,
    eventSourceUrl: payload.meta?.eventSourceUrl || clickIds.eventSourceUrl,
  }
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ ...payload, meta }),
    },
    { credentials: 'include' },
  )
  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text) as unknown
  } catch {
    throw new Error(
      res.ok
        ? 'Raspuns invalid de la server la plasarea comenzii.'
        : await readErrorMessage(
            new Response(text, {
              status: res.status,
              statusText: res.statusText,
            }),
          ),
    )
  }

  if (!res.ok) {
    const record = data as { error?: unknown }
    if (typeof record.error === 'string' && record.error.trim()) {
      throw new Error(record.error)
    }
    throw new Error(`Cererea a esuat (${res.status}).`)
  }

  const order = parseOrder(data)
  if (!order) {
    throw new Error('Raspuns invalid de la server.')
  }
  return order
}

/**
 * Initiaza o plata cu cardul prin Netopia (form POST criptat) si redirecteaza clientul.
 */
export type CardPaymentStart = {
  paymentUrl: string
  method?: 'GET' | 'POST'
  fields?: Record<string, string>
}

export async function startCardPayment(
  orderId: string,
  accessToken?: string | null,
): Promise<CardPaymentStart> {
  const res = await apiFetch(
    '/payment_netopia_start.php',
    {
      method: 'POST',
      body: JSON.stringify({ orderId, token: accessToken ?? '' }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as {
    paymentUrl?: unknown
    method?: unknown
    fields?: unknown
  }
  if (typeof data.paymentUrl !== 'string' || !data.paymentUrl.trim()) {
    throw new Error('Nu am primit linkul de plata.')
  }

  const fields: Record<string, string> = {}
  if (data.fields && typeof data.fields === 'object') {
    for (const [key, value] of Object.entries(data.fields as Record<string, unknown>)) {
      if (typeof value === 'string') fields[key] = value
    }
  }

  return {
    paymentUrl: data.paymentUrl,
    method: data.method === 'GET' ? 'GET' : 'POST',
    fields,
  }
}

/** Trimite browserul spre Netopia (POST form sau redirect GET). */
export function redirectToCardPayment(start: CardPaymentStart): void {
  if (start.method === 'POST' && start.fields && Object.keys(start.fields).length > 0) {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = start.paymentUrl
    form.style.display = 'none'
    for (const [name, value] of Object.entries(start.fields)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    }
    document.body.appendChild(form)
    form.submit()
    return
  }
  window.location.href = start.paymentUrl
}

/** Mărimea unui lot la încărcarea listei admin (max pe request pe server). */
const ORDERS_PAGE_SIZE = 1000

async function fetchOrdersPage(offset: number, limit: number): Promise<{
  orders: Order[]
  rawCount: number
}> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  const res = await apiFetch(
    `/orders.php?${params.toString()}`,
    {},
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) {
    throw new Error('Raspuns invalid de la server.')
  }

  const orders: Order[] = []
  for (const item of data) {
    const order = parseOrder(item)
    if (order) orders.push(order)
  }
  return { orders, rawCount: data.length }
}

/**
 * Încarcă toate comenzile admin, pe loturi (offset/limit), fără plafon total.
 */
export async function fetchOrders(): Promise<Order[]> {
  const all: Order[] = []
  let offset = 0

  for (;;) {
    const page = await fetchOrdersPage(offset, ORDERS_PAGE_SIZE)
    all.push(...page.orders)
    if (page.rawCount < ORDERS_PAGE_SIZE) break
    offset += page.rawCount
  }

  return all
}

export async function fetchMyOrders(): Promise<Order[]> {
  const res = await apiFetch(
    '/orders.php?mine=1',
    {},
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) {
    throw new Error('Raspuns invalid de la server.')
  }

  const orders: Order[] = []
  for (const item of data) {
    const order = parseOrder(item)
    if (order) orders.push(order)
  }
  return orders
}

export async function fetchOrder(
  orderId: string,
  accessToken?: string | null,
): Promise<Order | null> {
  const token = accessToken?.trim()
  const query = token
    ? `id=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`
    : `id=${encodeURIComponent(orderId)}`
  const res = await apiFetch(`/orders.php?${query}`, {}, { credentials: 'include' })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  return parseOrder(data)
}

function parseTrackingEvent(value: unknown): OrderTrackingEvent | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const code =
    typeof record.code === 'number' ? record.code : Number(record.code)
  const description =
    typeof record.description === 'string' ? record.description.trim() : ''
  const dateTime =
    typeof record.dateTime === 'string' ? record.dateTime.trim() : ''
  if (!Number.isFinite(code) || !description) return null
  const event: OrderTrackingEvent = {
    code,
    description,
    dateTime,
  }
  if (typeof record.place === 'string' && record.place.trim()) {
    event.place = record.place.trim()
  }
  return event
}

function parseTracking(value: unknown): OrderTracking | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const events: OrderTrackingEvent[] = []
  if (Array.isArray(record.events)) {
    for (const item of record.events) {
      const parsed = parseTrackingEvent(item)
      if (parsed) events.push(parsed)
    }
  }
  return {
    awb: typeof record.awb === 'string' ? record.awb : null,
    parcelId: typeof record.parcelId === 'string' ? record.parcelId : null,
    publicUrl: typeof record.publicUrl === 'string' ? record.publicUrl : null,
    events,
    lastStatus:
      typeof record.lastStatus === 'string' ? record.lastStatus : null,
    outForDelivery: record.outForDelivery === true,
    delivered: record.delivered === true,
    inTransit: record.inTransit === true,
    returned: record.returned === true,
    returnedToSender: record.returnedToSender === true,
    error: typeof record.error === 'string' ? record.error : null,
  }
}

/** Încarcă comanda + tracking DPD (sincronizează statusul dacă e cazul). */
export async function fetchOrderTracking(
  orderId: string,
  accessToken?: string | null,
): Promise<OrderWithTracking | null> {
  const token = accessToken?.trim()
  const parts = [
    `id=${encodeURIComponent(orderId)}`,
    'track=1',
  ]
  if (token) {
    parts.push(`token=${encodeURIComponent(token)}`)
  }
  const res = await apiFetch(
    `/orders.php?${parts.join('&')}`,
    {},
    { credentials: 'include' },
  )
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  const order = parseOrder(data)
  if (!order) return null

  const record =
    data && typeof data === 'object'
      ? (data as Record<string, unknown>)
      : null
  const result: OrderWithTracking = { ...order }
  if (record) {
    const tracking = parseTracking(record.tracking)
    if (tracking) result.tracking = tracking
  }
  return result
}

export type SyncOrderDpdResult = OrderWithTracking & {
  statusChanged?: boolean
}

export async function syncOrderDpdStatus(
  orderId: string,
): Promise<SyncOrderDpdResult> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'syncDpdStatus', orderId }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  const order = parseOrder(data)
  if (!order) {
    throw new Error('Raspuns invalid de la server.')
  }

  const record =
    data && typeof data === 'object'
      ? (data as Record<string, unknown>)
      : null
  const result: SyncOrderDpdResult = { ...order }
  if (record) {
    const tracking = parseTracking(record.tracking)
    if (tracking) result.tracking = tracking
    if (record.statusChanged === true) result.statusChanged = true
  }
  return result
}

/** Colet refuzat care a ajuns înapoi la magazin (DPD 124 / flag). */
export function isOrderReturnReceived(order: Order): boolean {
  if (order.returnReceived === true) return true
  if (order.returnReceived === false) return false
  const cs = (order.courierStatus ?? '').toLowerCase()
  return (
    cs.includes('returnat la expeditor') ||
    cs.includes('returnat expeditorului')
  )
}

export async function markOrderReturnReceived(orderId: string): Promise<Order> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'markReturnReceived', orderId }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const order = parseOrder(await res.json())
  if (!order) {
    throw new Error('Raspuns invalid de la server.')
  }
  return order
}

export async function issueOrderAwb(
  orderId: string,
  carrier?: 'dpd' | 'fan-courier',
): Promise<Order> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'issueAwb',
        orderId,
        ...(carrier ? { carrier } : {}),
      }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  const order = parseOrder(data)
  if (!order) {
    throw new Error('Raspuns invalid de la server.')
  }
  return order
}

export async function cancelOrderAwb(orderId: string): Promise<Order> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'cancelAwb',
        orderId,
      }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const order = parseOrder(await res.json())
  if (!order) {
    throw new Error('Raspuns invalid de la server.')
  }
  return order
}

export type BulkOrderActionResult = {
  orders: Order[]
  errors: Array<{ orderId: string; error: string }>
}

function parseBulkOrderActionResult(data: unknown): BulkOrderActionResult {
  // Răspuns greșit tipic: redirect POST→GET întoarce lista de comenzi (array),
  // nu { orders, errors } — atunci statusul nu s-a schimbat pe server.
  if (Array.isArray(data)) {
    throw new Error(
      'Răspuns invalid de la API (listă în loc de rezultat bulk). Verifică că orders.php e la zi pe server și că VITE_API_URL nu face redirect.',
    )
  }

  const record =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  if (!record || !Array.isArray(record.orders)) {
    throw new Error(
      'Răspuns invalid de la API pentru acțiunea bulk. Urcă server/api/orders.php actualizat (acțiune bulkUpdateStatus / bulkIssueAwb).',
    )
  }

  const orders: Order[] = []
  let skipped = 0
  for (const item of record.orders) {
    const order = parseOrder(item)
    if (order) orders.push(order)
    else skipped += 1
  }

  const errors: BulkOrderActionResult['errors'] = []
  if (Array.isArray(record.errors)) {
    for (const item of record.errors) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const orderIdRaw = row.orderId
      const orderId =
        typeof orderIdRaw === 'string'
          ? orderIdRaw.trim()
          : typeof orderIdRaw === 'number' && Number.isFinite(orderIdRaw)
            ? String(orderIdRaw)
            : ''
      const error = typeof row.error === 'string' ? row.error.trim() : ''
      if (orderId && error) errors.push({ orderId, error })
    }
  }

  if (orders.length === 0 && errors.length === 0) {
    throw new Error(
      skipped > 0
        ? 'Serverul a răspuns, dar comenzile nu au putut fi citite. Reîncarcă pagina.'
        : 'Nicio comandă nu a fost actualizată. Verifică stocul produselor sau încearcă din Editează.',
    )
  }

  return { orders, errors }
}

export async function bulkUpdateOrderStatus(
  orderIds: string[],
  status: OrderStatus,
): Promise<BulkOrderActionResult> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'bulkUpdateStatus',
        orderIds,
        status,
      }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return parseBulkOrderActionResult(await res.json())
}

export async function bulkIssueOrderAwb(
  orderIds: string[],
  carrier?: 'dpd' | 'fan-courier',
): Promise<BulkOrderActionResult> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'bulkIssueAwb',
        orderIds,
        ...(carrier ? { carrier } : {}),
      }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return parseBulkOrderActionResult(await res.json())
}

export async function bulkCancelOrderAwb(
  orderIds: string[],
): Promise<BulkOrderActionResult> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'bulkCancelAwb',
        orderIds,
      }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return parseBulkOrderActionResult(await res.json())
}

export type BackfillCourierCostsResult = {
  processed: number
  updated: number
  failed: number
  skipped: number
  errors: string[]
}

export async function backfillCourierCosts(
  limit = 50,
): Promise<BackfillCourierCostsResult> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'backfillCourierCosts', limit }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as unknown
  if (!data || typeof data !== 'object') {
    throw new Error('Răspuns invalid de la API pentru backfill costuri DPD.')
  }
  const record = data as Record<string, unknown>
  return {
    processed: Number(record.processed) || 0,
    updated: Number(record.updated) || 0,
    failed: Number(record.failed) || 0,
    skipped: Number(record.skipped) || 0,
    errors: Array.isArray(record.errors)
      ? record.errors.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

export type BulkSyncDpdResult = BulkOrderActionResult & {
  statusChanged: number
  unchanged: number
  synced: number
}

export async function bulkSyncOrderDpdStatus(
  orderIds?: string[],
): Promise<BulkSyncDpdResult> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'bulkSyncDpdStatus',
        ...(orderIds && orderIds.length > 0 ? { orderIds } : {}),
      }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  if (Array.isArray(data)) {
    throw new Error(
      'Răspuns invalid de la API (listă în loc de rezultat bulk). Verifică orders.php pe server.',
    )
  }
  const record =
    data && typeof data === 'object'
      ? (data as Record<string, unknown>)
      : null
  if (!record || !Array.isArray(record.orders) || !Array.isArray(record.errors)) {
    throw new Error(
      'Răspuns invalid de la API pentru sync DPD. Urcă server/api/orders.php actualizat.',
    )
  }

  const orders: Order[] = []
  for (const item of record.orders) {
    const order = parseOrder(item)
    if (order) orders.push(order)
  }
  const errors: BulkOrderActionResult['errors'] = []
  for (const item of record.errors) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const orderId =
      typeof row.orderId === 'string' ? row.orderId.trim() : ''
    const error = typeof row.error === 'string' ? row.error.trim() : ''
    if (orderId && error) errors.push({ orderId, error })
  }
  const num = (key: string) => {
    const v = record[key]
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  }
  return {
    orders,
    errors,
    statusChanged: num('statusChanged'),
    unchanged: num('unchanged'),
    synced: num('synced'),
  }
}

async function readAwbPrintBlob(res: Response): Promise<Blob> {
  const contentType = res.headers.get('Content-Type') ?? ''
  if (contentType.includes('text/html')) {
    return res.blob()
  }
  if (!contentType.includes('application/pdf')) {
    const buf = await res.arrayBuffer()
    const head = new Uint8Array(buf.slice(0, 5))
    const isPdf =
      head.length >= 4 &&
      head[0] === 0x25 &&
      head[1] === 0x50 &&
      head[2] === 0x44 &&
      head[3] === 0x46
    const headText = new TextDecoder().decode(head)
    const isHtml = headText.trimStart().startsWith('<')
    if (isHtml) {
      return new Blob([buf], { type: 'text/html; charset=utf-8' })
    }
    if (!isPdf) {
      const text = new TextDecoder().decode(buf)
      try {
        const data = JSON.parse(text) as { error?: unknown }
        if (typeof data.error === 'string' && data.error.trim()) {
          throw new Error(data.error)
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.message !== 'Unexpected end of JSON input'
        ) {
          throw err
        }
      }
      throw new Error('Serverul nu a returnat o etichetă AWB validă.')
    }
    return new Blob([buf], { type: 'application/pdf' })
  }
  return res.blob()
}

export async function fetchOrderAwbPdf(orderId: string): Promise<Blob> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'printAwb', orderId }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return readAwbPrintBlob(res)
}

export async function bulkPrintOrderAwbPdf(orderIds: string[]): Promise<Blob> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'bulkPrintAwb', orderIds }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return readAwbPrintBlob(res)
}

/** Deschide eticheta (PDF DPD sau HTML Fan termic) într-un tab nou. */
export function openAwbPdfBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) {
    const a = document.createElement('a')
    a.href = url
    a.download = blob.type.includes('html') ? 'awb-fan.html' : 'awb.pdf'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<Order> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'updateStatus', orderId, status }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  const order = parseOrder(data)
  if (!order) {
    throw new Error('Raspuns invalid de la server.')
  }
  return order
}

export async function markOrderPaymentPaid(orderId: string): Promise<Order> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'markPaymentPaid', orderId }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  const order = parseOrder(data)
  if (!order) {
    throw new Error('Raspuns invalid de la server.')
  }
  return order
}

export async function abandonUnpaidCardOrder(
  orderId: string,
  accessToken?: string | null,
): Promise<void> {
  try {
    await apiFetch(
      '/orders.php',
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'abandonUnpaidCard',
          orderId,
          token: accessToken ?? '',
        }),
      },
      { credentials: 'include' },
    )
  } catch {
    /* best-effort: draft-ul dispare la IPN eșuat sau la cleanup */
  }
}

export type UpdateOrderCustomerPayload = {
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerNotes?: string
  billingType?: BillingType
  companyName?: string
  companyCui?: string
  companyRegCom?: string
  shipCounty: string
  shipCountyName: string
  shipCity: string
  shipStreet: string
  shipStreetNumber: string
  shipAddressExtra?: string
  shipPostalCode?: string
  dpdSiteId: number
}

export async function updateOrderCustomer(
  orderId: string,
  payload: UpdateOrderCustomerPayload,
): Promise<Order> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateCustomer',
        orderId,
        ...payload,
      }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  const order = parseOrder(data)
  if (!order) {
    throw new Error('Raspuns invalid de la server.')
  }
  return order
}

export type UpdateOrderItemPayload = {
  productId: string
  quantity: number
  /** Opțional: preț unitar forțat (altfel din catalog / bundle). */
  unitPrice?: number
}

export async function updateOrderItems(
  orderId: string,
  items: UpdateOrderItemPayload[],
): Promise<Order> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateItems',
        orderId,
        items,
      }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const data = (await res.json()) as unknown
  const order = parseOrder(data)
  if (!order) {
    throw new Error('Raspuns invalid de la server.')
  }
  return order
}

export async function cancelOrder(orderId: string): Promise<Order> {
  return updateOrderStatus(orderId, 'cancelled')
}

export async function deleteOrder(orderId: string): Promise<void> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteOrder', orderId }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
}

export async function emitOrderInvoice(
  orderId: string,
  force = false,
): Promise<Order> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'emitInvoice', orderId, force }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as unknown
  const order = parseOrder(data)
  if (!order) {
    throw new Error('Raspuns invalid de la server.')
  }
  return order
}

export async function sendOrderInvoiceEmail(orderId: string): Promise<void> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'sendInvoiceEmail', orderId }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
}

export async function downloadOrderInvoicePdf(orderId: string): Promise<void> {
  const res = await apiFetch(
    `/orders.php?invoicePdf=1&id=${encodeURIComponent(orderId)}`,
    {},
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `factura-${orderId}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmată'
    case 'processing':
      return 'În procesare'
    case 'shipped':
      return 'Expediată'
    case 'delivered':
      return 'Livrată'
    case 'returned':
      return 'Refuzată / returnată'
    case 'cancelled':
      return 'Anulată'
    default:
      return 'În așteptare'
  }
}

/** Etichetă evidențiată pentru statusul comenzii (admin). */
export function orderStatusBanner(status: OrderStatus): string {
  switch (status) {
    case 'confirmed':
      return 'COMANDA CONFIRMATA'
    case 'processing':
      return 'COMANDA IN PROCESARE'
    case 'shipped':
      return 'COMANDA EXPEDIATA'
    case 'delivered':
      return 'COMANDA LIVRATA'
    case 'returned':
      return 'COMANDA REFUZATA'
    case 'cancelled':
      return 'COMANDA ANULATA'
    default:
      return 'COMANDA IN ASTEPTARE'
  }
}

/** Etichetă evidențiată pentru statusul plății. */
export function paymentStatusBanner(
  paymentStatus?: PaymentStatus | null,
): string {
  return paymentStatus === 'paid' ? 'PLATA FINALIZATA' : 'PLATA IN ASTEPTARE'
}

export function sortOrdersByDate(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function mergeOrdersById(...groups: Order[][]): Order[] {
  const byId = new Map<string, Order>()
  for (const group of groups) {
    for (const order of group) {
      byId.set(order.id, order)
    }
  }
  return sortOrdersByDate([...byId.values()])
}

export async function fetchGuestOrdersFromStorage(): Promise<Order[]> {
  if (!isOrdersApiEnabled()) return []

  const entries = listStoredOrderAccess()
  const orders: Order[] = []
  for (const entry of entries) {
    try {
      const order = await fetchOrder(entry.orderId, entry.token)
      if (order) orders.push(order)
    } catch {
      /* ignore inaccessible saved orders */
    }
  }
  return orders
}
