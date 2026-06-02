import type { CheckoutPayload, Order, OrderStatus } from '../types/order'
import { apiFetch, readErrorMessage } from './apiClient'
import { listStoredOrderAccess } from './orderAccess'
import { isProductsApiEnabled } from './productsApi'
import { parseDeliveryCarrierFromNotes } from './shippingCarriers'

const ORDER_STATUSES: OrderStatus[] = [
  'new',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
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
  if (record.paymentMethod === 'cod' || record.paymentMethod === 'card') {
    order.paymentMethod = record.paymentMethod
  }
  if (record.paymentStatus === 'pending' || record.paymentStatus === 'paid') {
    order.paymentStatus = record.paymentStatus
  }
  if (record.deliveryCarrier === 'fan-courier' || record.deliveryCarrier === 'dpd') {
    order.deliveryCarrier = record.deliveryCarrier
  } else {
    const parsedCarrier = parseDeliveryCarrierFromNotes(order.customerNotes)
    if (parsedCarrier) {
      order.deliveryCarrier = parsedCarrier
    }
  }
  if (typeof record.awbNumber === 'string' && record.awbNumber.trim()) {
    order.awbNumber = record.awbNumber.trim()
  }
  if (typeof record.awbIssuedAt === 'string' && record.awbIssuedAt.trim()) {
    order.awbIssuedAt = record.awbIssuedAt.trim()
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
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify(payload),
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
 * Initiaza o plata cu cardul prin Netopia si returneaza URL-ul de redirect.
 */
export async function startCardPayment(
  orderId: string,
  accessToken?: string | null,
): Promise<string> {
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
  const data = (await res.json()) as { paymentUrl?: unknown }
  if (typeof data.paymentUrl !== 'string' || !data.paymentUrl.trim()) {
    throw new Error('Nu am primit linkul de plata.')
  }
  return data.paymentUrl
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await apiFetch('/orders.php', {}, { credentials: 'include' })
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

export async function issueOrderAwb(orderId: string): Promise<Order> {
  const res = await apiFetch(
    '/orders.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'issueAwb', orderId }),
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
    case 'cancelled':
      return 'Anulată'
    default:
      return 'Nouă'
  }
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
