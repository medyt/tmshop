/**
 * TikTok Pixel — încărcare client-side, doar cu consimțământ.
 * Se inițializează o singură dată; evenimentele standard merg prin `tiktokTrack`.
 */

declare global {
  interface Window {
    ttq?: any
    TiktokAnalyticsObject?: string
  }
}

let initialized = false

export function isTikTokReady(): boolean {
  return initialized && typeof window !== 'undefined' && Boolean(window.ttq)
}

export function loadTikTokPixel(pixelId: string): void {
  if (initialized || !pixelId || typeof window === 'undefined') return
  initialized = true

  /* eslint-disable */
  ;(function (w: any, d: Document, t: string) {
    w.TiktokAnalyticsObject = t
    const ttq: any = (w[t] = w[t] || [])
    ttq.methods = [
      'page', 'track', 'identify', 'instances', 'debug', 'on', 'off',
      'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie',
    ]
    ttq.setAndDefer = function (obj: any, method: string) {
      obj[method] = function () {
        obj.push([method].concat(Array.prototype.slice.call(arguments, 0)))
      }
    }
    for (let i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i])
    }
    ttq.instance = function (id: string) {
      const inst = ttq._i[id] || []
      for (let n = 0; n < ttq.methods.length; n++) {
        ttq.setAndDefer(inst, ttq.methods[n])
      }
      return inst
    }
    ttq.load = function (id: string, opts?: any) {
      const url = 'https://analytics.tiktok.com/i18n/pixel/events.js'
      ttq._i = ttq._i || {}
      ttq._i[id] = []
      ttq._i[id]._u = url
      ttq._t = ttq._t || {}
      ttq._t[id] = +new Date()
      ttq._o = ttq._o || {}
      ttq._o[id] = opts || {}
      const script = d.createElement('script')
      script.type = 'text/javascript'
      script.async = true
      script.src = url + '?sdkid=' + id + '&lib=' + t
      const first = d.getElementsByTagName('script')[0]
      first.parentNode?.insertBefore(script, first)
    }
    ttq.load(pixelId)
    // Page view: doar prin analytics.trackPageView (SPA) — evită dublu la init + mount.
  })(window, document, 'ttq')
  /* eslint-enable */
}

export function tiktokTrack(
  event: string,
  params: Record<string, unknown> = {},
): void {
  if (!isTikTokReady()) return
  window.ttq?.track(event, params)
}

export function tiktokPage(): void {
  if (!isTikTokReady()) return
  window.ttq?.page()
}
