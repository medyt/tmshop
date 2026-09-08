import { readCookieConsent } from './cookieConsent'
import { gaPageView, gaTrack, isGaReady, loadGaPixel } from './pixels/gaPixel'
import { isMetaReady, loadMetaPixel, metaTrack } from './pixels/metaPixel'
import {
  isTikTokReady,
  loadTikTokPixel,
  tiktokPage,
  tiktokTrack,
} from './pixels/tiktokPixel'
import type { MetaContentLine } from './metaCatalogCsv'

/*
 * Dispatcher de tracking pentru Meta Pixel, TikTok Pixel și Google Analytics 4.
 *
 * Meta: snippet-ul oficial e în index.html la build — evenimentele standard
 * (PageView, ViewContent, AddToCart, InitiateCheckout, Purchase) rulează când
 * fbq există, ca Meta Events Manager să le vadă (setup / Test Events).
 *
 * TikTok + GA4: doar după „Accept toate” (consimțământ marketing).
 *
 * PageView / ViewContent / InitiateCheckout: dedup scurt (Strict Mode +
 * re-render) — fără sessionStorage pe Purchase (acolo e deja pe orderId).
 */

const CURRENCY = 'RON'
const PURCHASE_DEDUP_PREFIX = 'shoptop-purchase-tracked:'
/** Fereastră scurtă: acoperă remount React Strict Mode, nu navigări reale. */
const NAV_DEDUP_MS = 2000

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() ?? ''
const TIKTOK_PIXEL_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID?.trim() ?? ''
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? ''

const recentNavEvents = new Map<string, number>()

function shouldSkipRecent(key: string, windowMs = NAV_DEDUP_MS): boolean {
  const now = Date.now()
  const prev = recentNavEvents.get(key)
  if (prev !== undefined && now - prev < windowMs) {
    return true
  }
  recentNavEvents.set(key, now)
  if (recentNavEvents.size > 80) {
    for (const [k, t] of recentNavEvents) {
      if (now - t > windowMs * 4) recentNavEvents.delete(k)
    }
  }
  return false
}

function consentGranted(): boolean {
  return readCookieConsent() === 'all'
}

function ensureMetaBootstrap(): void {
  if (META_PIXEL_ID) loadMetaPixel(META_PIXEL_ID)
}

/**
 * Încarcă TikTok / GA după consimțământ. Meta vine din HTML (sau fallback).
 */
export function initTracking(): void {
  ensureMetaBootstrap()
  if (!consentGranted()) return
  if (TIKTOK_PIXEL_ID) loadTikTokPixel(TIKTOK_PIXEL_ID)
  if (GA_MEASUREMENT_ID) loadGaPixel(GA_MEASUREMENT_ID)
}

function marketingReady(): boolean {
  initTracking()
  return consentGranted() && (isTikTokReady() || isGaReady())
}

function purchaseAlreadyTracked(orderId: string): boolean {
  try {
    return sessionStorage.getItem(PURCHASE_DEDUP_PREFIX + orderId) === '1'
  } catch {
    return false
  }
}

function markPurchaseTracked(orderId: string): void {
  try {
    sessionStorage.setItem(PURCHASE_DEDUP_PREFIX + orderId, '1')
  } catch {
    /* ignore */
  }
}

export function trackPageView(path: string, title: string): void {
  ensureMetaBootstrap()
  if (!shouldSkipRecent(`pv:meta:${path}`) && isMetaReady()) {
    metaTrack('PageView')
  }
  if (!consentGranted()) return
  initTracking()
  if (shouldSkipRecent(`pv:mkt:${path}`)) return
  if (isTikTokReady()) tiktokPage()
  if (isGaReady()) gaPageView(path, title)
}

function metaProductPayload(
  sku: string,
  value: number,
  quantity = 1,
): Record<string, unknown> {
  return {
    content_ids: [sku],
    content_type: 'product',
    contents: [{ id: sku, quantity, item_price: value }],
    value,
    currency: CURRENCY,
  }
}

export function trackViewContent(productId: string, value?: number): void {
  const sku = productId.trim()
  if (sku === '') return
  ensureMetaBootstrap()

  if (!shouldSkipRecent(`vc:meta:${sku}`) && isMetaReady()) {
    metaTrack(
      'ViewContent',
      value !== undefined ? metaProductPayload(sku, value, 1) : {
        content_ids: [sku],
        content_type: 'product',
      },
    )
  }

  if (!marketingReady()) return
  if (shouldSkipRecent(`vc:mkt:${sku}`)) return
  tiktokTrack('ViewContent', {
    contents: [{ content_id: sku, content_type: 'product' }],
    ...(value !== undefined ? { value, currency: CURRENCY } : {}),
  })
  gaTrack('view_item', {
    currency: CURRENCY,
    ...(value !== undefined ? { value } : {}),
    items: [{ item_id: sku }],
  })
}

export function trackAddToCart(
  productId: string,
  quantity: number,
  value?: number,
): void {
  const sku = productId.trim()
  if (sku === '') return
  const qty = Math.max(1, Math.floor(quantity) || 1)
  ensureMetaBootstrap()

  metaTrack(
    'AddToCart',
    value !== undefined
      ? metaProductPayload(sku, value, qty)
      : {
          content_ids: [sku],
          content_type: 'product',
          contents: [{ id: sku, quantity: qty }],
        },
  )

  if (!marketingReady()) return
  tiktokTrack('AddToCart', {
    contents: [
      { content_id: sku, content_type: 'product', quantity: qty },
    ],
    ...(value !== undefined ? { value, currency: CURRENCY } : {}),
  })
  gaTrack('add_to_cart', {
    currency: CURRENCY,
    ...(value !== undefined ? { value } : {}),
    items: [{ item_id: sku, quantity: qty }],
  })
}

export function trackBeginCheckout(
  itemCount: number,
  subtotal: number,
  contents?: MetaContentLine[],
): void {
  ensureMetaBootstrap()

  const lines = (contents ?? []).filter((line) => line.id.trim() !== '')
  const numItems =
    lines.length > 0
      ? lines.reduce((sum, line) => sum + Math.max(1, line.quantity), 0)
      : itemCount

  if (
    !shouldSkipRecent(`ic:meta:${numItems}:${subtotal.toFixed(2)}`) &&
    isMetaReady()
  ) {
    metaTrack('InitiateCheckout', {
      num_items: numItems,
      value: subtotal,
      currency: CURRENCY,
      content_type: 'product',
      ...(lines.length > 0
        ? {
            content_ids: lines.map((line) => line.id),
            contents: lines.map((line) => ({
              id: line.id,
              quantity: Math.max(1, line.quantity),
            })),
          }
        : {}),
    })
  }

  if (!marketingReady()) return
  if (shouldSkipRecent(`ic:mkt:${numItems}:${subtotal.toFixed(2)}`)) return
  tiktokTrack('InitiateCheckout', {
    value: subtotal,
    currency: CURRENCY,
    ...(lines.length > 0
      ? {
          contents: lines.map((line) => ({
            content_id: line.id,
            content_type: 'product',
            quantity: Math.max(1, line.quantity),
          })),
        }
      : {}),
  })
  gaTrack('begin_checkout', {
    currency: CURRENCY,
    value: subtotal,
    ...(lines.length > 0
      ? {
          items: lines.map((line) => ({
            item_id: line.id,
            quantity: Math.max(1, line.quantity),
          })),
        }
      : {}),
  })
}

/**
 * Trimite Purchase către Meta / CompletePayment către TikTok / purchase către GA4.
 * Deduplică pe orderId în sessionStorage (checkout + pagina de succes).
 */
export function trackPurchase(
  orderId: string,
  total: number,
  contentIds?: string[] | MetaContentLine[],
): void {
  if (!orderId || purchaseAlreadyTracked(orderId)) return
  ensureMetaBootstrap()

  const lines: MetaContentLine[] = []
  for (const entry of contentIds ?? []) {
    if (typeof entry === 'string') {
      const id = entry.trim()
      if (id) lines.push({ id, quantity: 1 })
      continue
    }
    const id = entry.id.trim()
    if (!id) continue
    lines.push({ id, quantity: Math.max(1, Math.floor(entry.quantity) || 1) })
  }
  const ids = lines.map((line) => line.id)
  const eventId = `purchase_${orderId}`

  markPurchaseTracked(orderId)

  metaTrack(
    'Purchase',
    {
      value: total,
      currency: CURRENCY,
      content_type: 'product',
      ...(ids.length > 0
        ? {
            content_ids: ids,
            contents: lines.map((line) => ({ id: line.id, quantity: line.quantity })),
            num_items: lines.reduce((sum, line) => sum + line.quantity, 0),
          }
        : {}),
      order_id: orderId,
    },
    eventId,
  )

  if (!marketingReady()) return

  tiktokTrack('CompletePayment', {
    value: total,
    currency: CURRENCY,
    order_id: orderId,
    ...(ids.length > 0
      ? {
          contents: lines.map((line) => ({
            content_id: line.id,
            content_type: 'product',
            quantity: line.quantity,
          })),
        }
      : {}),
  })
  gaTrack('purchase', {
    transaction_id: orderId,
    value: total,
    currency: CURRENCY,
    ...(ids.length > 0
      ? { items: lines.map((line) => ({ item_id: line.id, quantity: line.quantity })) }
      : {}),
  })
}
