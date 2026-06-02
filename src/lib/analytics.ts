import { readCookieConsent } from './cookieConsent'
import { isMetaReady, loadMetaPixel, metaTrack } from './pixels/metaPixel'
import {
  isTikTokReady,
  loadTikTokPixel,
  tiktokPage,
  tiktokTrack,
} from './pixels/tiktokPixel'

/*
 * Dispatcher de tracking pentru Meta Pixel și TikTok Pixel.
 *
 * Pixelii se încarcă DOAR dacă utilizatorul a acceptat toate cookie-urile
 * ("Accept toate") — vezi Politica de cookie. Fără consimțământ, toate
 * funcțiile sunt no-op. ID-urile vin din variabilele de mediu Vite.
 */

const CURRENCY = 'RON'

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() ?? ''
const TIKTOK_PIXEL_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID?.trim() ?? ''

function consentGranted(): boolean {
  return readCookieConsent() === 'all'
}

/**
 * Încarcă pixelii dacă există consimțământ și ID-uri configurate.
 * Se apelează la pornirea aplicației și imediat după ce userul acceptă tot.
 */
export function initTracking(): void {
  if (!consentGranted()) return
  if (META_PIXEL_ID) loadMetaPixel(META_PIXEL_ID)
  if (TIKTOK_PIXEL_ID) loadTikTokPixel(TIKTOK_PIXEL_ID)
}

function ready(): boolean {
  return consentGranted() && (isMetaReady() || isTikTokReady())
}

export function trackPageView(_path: string, _title: string): void {
  if (!consentGranted()) return
  // Asigură încărcarea pixelilor dacă userul tocmai a acceptat în această sesiune.
  initTracking()
  if (isMetaReady()) metaTrack('PageView')
  if (isTikTokReady()) tiktokPage()
}

export function trackViewContent(productId: string, value?: number): void {
  if (!ready()) return
  metaTrack('ViewContent', {
    content_ids: [productId],
    content_type: 'product',
    ...(value !== undefined ? { value, currency: CURRENCY } : {}),
  })
  tiktokTrack('ViewContent', {
    contents: [{ content_id: productId, content_type: 'product' }],
    ...(value !== undefined ? { value, currency: CURRENCY } : {}),
  })
}

export function trackAddToCart(
  productId: string,
  quantity: number,
  value?: number,
): void {
  if (!ready()) return
  metaTrack('AddToCart', {
    content_ids: [productId],
    content_type: 'product',
    ...(value !== undefined ? { value, currency: CURRENCY } : {}),
  })
  tiktokTrack('AddToCart', {
    contents: [
      { content_id: productId, content_type: 'product', quantity },
    ],
    ...(value !== undefined ? { value, currency: CURRENCY } : {}),
  })
}

export function trackBeginCheckout(itemCount: number, subtotal: number): void {
  if (!ready()) return
  metaTrack('InitiateCheckout', {
    num_items: itemCount,
    value: subtotal,
    currency: CURRENCY,
  })
  tiktokTrack('InitiateCheckout', {
    value: subtotal,
    currency: CURRENCY,
  })
}

export function trackPurchase(orderId: string, total: number): void {
  if (!ready()) return
  metaTrack('Purchase', {
    value: total,
    currency: CURRENCY,
    content_type: 'product',
    order_id: orderId,
  })
  tiktokTrack('CompletePayment', {
    value: total,
    currency: CURRENCY,
    order_id: orderId,
  })
}
