/**
 * Meta (Facebook) Pixel — încărcare client-side, doar cu consimțământ.
 * Se inițializează o singură dată; evenimentele standard merg prin `metaTrack`.
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

let initialized = false

export function isMetaReady(): boolean {
  return initialized && typeof window !== 'undefined' && typeof window.fbq === 'function'
}

export function loadMetaPixel(pixelId: string): void {
  if (initialized || !pixelId || typeof window === 'undefined') return
  initialized = true

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

  window.fbq?.('init', pixelId)
  window.fbq?.('track', 'PageView')
}

export function metaTrack(
  event: string,
  params: Record<string, unknown> = {},
): void {
  if (!isMetaReady()) return
  window.fbq?.('track', event, params)
}
