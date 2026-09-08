/**
 * Meta (Facebook) Pixel
 * Bootstrap oficial în index.html (init + PageView).
 * Evenimentele standard (ViewContent, AddToCart, Purchase…) când fbq e disponibil.
 */

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void
      queue?: unknown[]
      loaded?: boolean
      version?: string
      push?: (...args: unknown[]) => void
    }
    _fbq?: unknown
  }
}

function ensureFbqStub(): void {
  /* eslint-disable */
  ;(function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return
    const n: any = (f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments)
    })
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    const t = b.createElement(e) as HTMLScriptElement
    t.async = true
    t.src = v
    const s = b.getElementsByTagName(e)[0]
    s.parentNode?.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */
}

export function isMetaReady(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function'
}

/**
 * Fallback dacă bootstrap-ul din index.html lipsește (dev fără env).
 * Pe producție fbq e deja din snippet-ul injectat la build.
 */
export function loadMetaPixel(pixelId: string): void {
  if (!pixelId || typeof window === 'undefined') return

  if (typeof window.fbq !== 'function') {
    ensureFbqStub()
    const fbq = window.fbq as ((...args: unknown[]) => void) | undefined
    fbq?.('init', pixelId)
    fbq?.('track', 'PageView')
  }
}

export function metaTrack(
  event: string,
  params: Record<string, unknown> = {},
  eventId?: string,
): void {
  if (typeof window === 'undefined') return

  const payload = { event, params, eventId }
  if (typeof window.fbq === 'function') {
    fireMeta(payload)
    return
  }

  pendingMetaEvents.push(payload)
  scheduleMetaFlush()
}

type PendingMetaEvent = {
  event: string
  params: Record<string, unknown>
  eventId?: string
}

const pendingMetaEvents: PendingMetaEvent[] = []
let metaFlushTimer: ReturnType<typeof window.setInterval> | null = null

function fireMeta(item: PendingMetaEvent): void {
  if (typeof window.fbq !== 'function') return
  if (item.event === 'PageView') {
    window.fbq('track', 'PageView')
    return
  }
  if (item.eventId) {
    window.fbq('track', item.event, item.params, { eventID: item.eventId })
    return
  }
  window.fbq('track', item.event, item.params)
}

function scheduleMetaFlush(): void {
  if (typeof window === 'undefined' || metaFlushTimer !== null) return
  let attempts = 0
  metaFlushTimer = window.setInterval(() => {
    attempts += 1
    if (typeof window.fbq === 'function') {
      window.clearInterval(metaFlushTimer!)
      metaFlushTimer = null
      const queued = pendingMetaEvents.splice(0, pendingMetaEvents.length)
      queued.forEach(fireMeta)
    } else if (attempts >= 40) {
      window.clearInterval(metaFlushTimer!)
      metaFlushTimer = null
    }
  }, 250)
}

function readCookieValue(name: string): string {
  if (typeof document === 'undefined') return ''
  const parts = document.cookie.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.slice(name.length + 1))
    }
  }
  return ''
}

/** Cookies _fbp/_fbc + URL curent, pentru Conversions API. */
export function readMetaClickIds(): {
  fbp: string
  fbc: string
  eventSourceUrl: string
} {
  if (typeof window === 'undefined') {
    return { fbp: '', fbc: '', eventSourceUrl: '' }
  }
  let fbc = readCookieValue('_fbc')
  if (fbc === '') {
    try {
      const fbclid = new URLSearchParams(window.location.search).get('fbclid')
      if (fbclid) {
        fbc = `fb.1.${Date.now()}.${fbclid}`
      }
    } catch {
      /* ignore */
    }
  }
  return {
    fbp: readCookieValue('_fbp'),
    fbc,
    eventSourceUrl: window.location.href,
  }
}
