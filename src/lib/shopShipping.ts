import { formatRon } from './shopCatalog'
import { SITE_LEGAL } from './siteLegal'

export const SHIPPING_FLAT_RATE = SITE_LEGAL.shippingFlatRateRon

export function shippingCost(subtotal: number): number {
  void subtotal
  return SHIPPING_FLAT_RATE
}

export function orderTotal(subtotal: number): number {
  return subtotal + shippingCost(subtotal)
}

export function shippingSummaryLabel(subtotal?: number): string {
  void subtotal
  return `Livrare prin ${SITE_LEGAL.deliveryCarriersLabel}: ${formatRon(SHIPPING_FLAT_RATE)}`
}
