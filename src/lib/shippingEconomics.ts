import type { Order, OrderItem } from '../types/order'
import { SHIPPING_FLAT_RATE } from './shopShipping'

/** Tarife contract DPD (net, fără TVA) — aliniat cu config.php contract_rates. */
const DPD_RATES_NET = {
  doorToDoor: 8.7,
  cod: 1.0,
  obpd: 1.6,
} as const

const DPD_VAT_MULTIPLIER = 1.19

export function orderItemsSubtotal(order: Order): number {
  return order.items.reduce((sum, item) => {
    const line =
      typeof item.lineTotal === 'number' && Number.isFinite(item.lineTotal)
        ? item.lineTotal
        : (Number(item.unitPrice) || 0) * Math.max(0, Number(item.quantity) || 0)
    return sum + line
  }, 0)
}

/** Comanda include tariful fix de transport (19,99 RON). */
export function orderHasFlatShipping(order: Order): boolean {
  const itemsTotal = orderItemsSubtotal(order)
  const total = Number(order.totalAmount) || 0
  return total + 0.009 >= itemsTotal + SHIPPING_FLAT_RATE
}

function orderIsCod(order: Order): boolean {
  const method = order.paymentMethod === 'card' ? 'card' : 'cod'
  const status = order.paymentStatus ?? 'pending'
  return (
    method === 'cod' &&
    status !== 'paid' &&
    (Number(order.totalAmount) || 0) > 0
  )
}

function itemIsPackageOpening(item: OrderItem): boolean {
  const sku = (item.productSku ?? '').toUpperCase()
  const id = item.productId.toUpperCase()
  const name = (item.productName ?? '').toLowerCase()
  return (
    sku === 'D000' ||
    id === 'D000' ||
    id === 'SHOPTOP-PACKAGE-OPENING' ||
    name.includes('deschidere')
  )
}

export function orderHasPackageOpening(order: Order): boolean {
  return order.items.some(itemIsPackageOpening)
}

export type DpdCostParts = {
  /** Transport door-to-door + ramburs + index/TVA (fără deschidere colet). */
  shipping: number
  /** Cost DPD deschidere colet (OBPD). */
  packageOpening: number
}

function applyVat(net: number): number {
  return Math.round(net * DPD_VAT_MULTIPLIER * 100) / 100
}

function parseDpdCostDetails(details: Record<string, number>): DpdCostParts {
  const out: DpdCostParts = { shipping: 0, packageOpening: 0 }
  for (const [label, amount] of Object.entries(details)) {
    if (!Number.isFinite(amount) || amount <= 0) continue
    const key = label.toLowerCase()
    if (
      key.includes('deschidere') ||
      key.includes('obpd') ||
      key.includes('open')
    ) {
      out.packageOpening += amount
    } else {
      out.shipping += amount
    }
  }
  return out
}

function estimateContractDpdParts(order: Order): DpdCostParts {
  let shippingNet = DPD_RATES_NET.doorToDoor
  if (orderIsCod(order)) {
    shippingNet += DPD_RATES_NET.cod
  }

  let packageOpening = 0
  if (orderHasPackageOpening(order) && orderIsCod(order)) {
    packageOpening = applyVat(DPD_RATES_NET.obpd)
  }

  return {
    shipping: applyVat(shippingNet),
    packageOpening,
  }
}

/** Cost DPD alocat pe transport vs. deschidere colet (cu TVA când e din contract). */
export function orderDpdCostParts(order: Order): DpdCostParts {
  const details = order.courierCostDetails
  if (details && Object.keys(details).length > 0) {
    const parsed = parseDpdCostDetails(details)
    if (parsed.shipping + parsed.packageOpening > 0.009) {
      return parsed
    }
  }

  const total = order.courierCostTotal
  if (typeof total === 'number' && Number.isFinite(total) && total > 0) {
    const estimated = estimateContractDpdParts(order)
    if (estimated.packageOpening > 0 && total > estimated.packageOpening) {
      return {
        shipping: Math.round((total - estimated.packageOpening) * 100) / 100,
        packageOpening: estimated.packageOpening,
      }
    }
    return { shipping: total, packageOpening: 0 }
  }

  return estimateContractDpdParts(order)
}

export function packageOpeningUnitCost(order: Order, item: OrderItem): number {
  if (!itemIsPackageOpening(item)) return 0
  const parts = orderDpdCostParts(order)
  const qty = Math.max(1, Number(item.quantity) || 1)
  return Math.round((parts.packageOpening / qty) * 100) / 100
}
