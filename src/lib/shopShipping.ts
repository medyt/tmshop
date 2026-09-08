import { formatRon } from './shopCatalog'
import { SITE_LEGAL } from './siteLegal'

import {
  checkoutAddonsTotal,
  type CheckoutAddonsSelection,
} from './checkoutAddons'

export const SHIPPING_FLAT_RATE = SITE_LEGAL.shippingFlatRateRon

export const SHIPPING_FREE_OVER = SITE_LEGAL.shippingFreeOverRon

export const GIFT_ADDON_PRICE_RON = SITE_LEGAL.giftAddonPriceRon

export function shippingFreeThreshold(): number {
  const value = SITE_LEGAL.shippingFreeOverRon
  if (!Number.isFinite(value) || value <= 0) return 0
  return value
}

export function shippingCost(subtotal: number): number {
  const threshold = shippingFreeThreshold()
  if (threshold > 0 && subtotal + 0.009 >= threshold) {
    return 0
  }
  return SHIPPING_FLAT_RATE
}

/** Cât mai lipsește până la prag. null = prag oprit. 0 = deja gratuit. */
export function amountUntilFreeShipping(subtotal: number): number | null {
  const threshold = shippingFreeThreshold()
  if (threshold <= 0) return null
  const remaining = Math.round((threshold - subtotal) * 100) / 100
  return remaining > 0 ? remaining : 0
}

export function giftAddonAmount(include: boolean): number {
  return include ? GIFT_ADDON_PRICE_RON : 0
}

export function orderTotal(
  subtotal: number,
  options?: {
    giftAddon?: boolean
    checkoutAddons?: CheckoutAddonsSelection
  },
): number {
  const addons =
    options?.checkoutAddons ??
    (options?.giftAddon ? { gift: true } : undefined)
  return (
    subtotal +
    shippingCost(subtotal) +
    checkoutAddonsTotal(addons)
  )
}

export function shippingSummaryLabel(subtotal?: number): string {
  const amount =
    typeof subtotal === 'number' ? shippingCost(subtotal) : SHIPPING_FLAT_RATE
  const threshold = shippingFreeThreshold()
  if (amount <= 0) {
    return `Livrare prin ${SITE_LEGAL.deliveryCarriersLabel}: gratuit`
  }
  if (threshold > 0) {
    return `Livrare prin ${SITE_LEGAL.deliveryCarriersLabel}: ${formatRon(SHIPPING_FLAT_RATE)} (gratuit de la ${formatRon(threshold)})`
  }
  return `Livrare prin ${SITE_LEGAL.deliveryCarriersLabel}: ${formatRon(SHIPPING_FLAT_RATE)}`
}
