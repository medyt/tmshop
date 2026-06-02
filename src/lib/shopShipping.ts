import { formatRon } from './shopCatalog'
import { SITE_LEGAL } from './siteLegal'

export const SHIPPING_FLAT_RATE = SITE_LEGAL.shippingFlatRateRon

export const GIFT_ADDON_PRICE_RON = SITE_LEGAL.giftAddonPriceRon

export function shippingCost(subtotal: number): number {
  void subtotal
  return SHIPPING_FLAT_RATE
}

export function giftAddonAmount(include: boolean): number {
  return include ? GIFT_ADDON_PRICE_RON : 0
}

export function orderTotal(
  subtotal: number,
  options?: { giftAddon?: boolean },
): number {
  return (
    subtotal +
    shippingCost(subtotal) +
    giftAddonAmount(options?.giftAddon === true)
  )
}

export function shippingSummaryLabel(subtotal?: number): string {
  void subtotal
  return `Livrare prin ${SITE_LEGAL.deliveryCarriersLabel}: ${formatRon(SHIPPING_FLAT_RATE)}`
}
