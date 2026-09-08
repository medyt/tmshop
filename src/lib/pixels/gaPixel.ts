/**
 * Google Analytics 4 (gtag.js) — încărcare client-side, doar cu consimțământ.
 * send_page_view: false la config — PageView vine din analytics.trackPageView (SPA).
 */

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let initialized = false
let measurementId = ''

export function isGaReady(): boolean {
  return (
    initialized &&
    typeof window !== 'undefined' &&
    typeof window.gtag === 'function'
  )
}

export function loadGaPixel(id: string): void {
  if (initialized || !id || typeof window === 'undefined') return
  initialized = true
  measurementId = id

  window.dataLayer = window.dataLayer || []
  // Același contract ca snippet-ul oficial: push(arguments), nu un array rest.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', id, { send_page_view: false })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  const first = document.getElementsByTagName('script')[0]
  first.parentNode?.insertBefore(script, first)
}

export function gaPageView(path: string, title: string): void {
  if (!isGaReady()) return
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_title: title,
    send_to: measurementId,
  })
}

export function gaTrack(
  event: string,
  params: Record<string, unknown> = {},
): void {
  if (!isGaReady()) return
  window.gtag?.('event', event, params)
}
