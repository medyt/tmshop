import { readCookieConsent } from './cookieConsent'

type AnalyticsPayload = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>
  }
}

function canTrack(): boolean {
  return readCookieConsent() === 'all'
}

export function trackEvent(name: string, payload: AnalyticsPayload = {}): void {
  if (!canTrack()) return
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({
    event: name,
    ...payload,
  })
}

export function trackPageView(path: string, title: string): void {
  trackEvent('page_view', { page_path: path, page_title: title })
}

export function trackAddToCart(productId: string, quantity: number): void {
  trackEvent('add_to_cart', { product_id: productId, quantity })
}

export function trackBeginCheckout(itemCount: number, subtotal: number): void {
  trackEvent('begin_checkout', { item_count: itemCount, subtotal })
}

export function trackPurchase(orderId: string, total: number): void {
  trackEvent('purchase', { order_id: orderId, value: total })
}
