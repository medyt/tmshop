const KEY = 'shoptop-cookie-consent-v1'
/** Cheie veche din bannerul simplu (înainte de alinierea GDPR). */
const LEGACY_KEY = 'shoptop_cookie_consent'

export type CookieConsentChoice = 'all' | 'essential'

function migrateLegacyConsent(): CookieConsentChoice | null {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy === 'accepted') {
      localStorage.setItem(KEY, 'all')
      localStorage.removeItem(LEGACY_KEY)
      return 'all'
    }
    if (legacy === 'rejected') {
      localStorage.setItem(KEY, 'essential')
      localStorage.removeItem(LEGACY_KEY)
      return 'essential'
    }
  } catch {
    /* ignore */
  }
  return null
}

export function hasCookieConsent(): boolean {
  try {
    if (localStorage.getItem(KEY) !== null) return true
    return migrateLegacyConsent() !== null
  } catch {
    return false
  }
}

export function readCookieConsent(): CookieConsentChoice | null {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'all' || value === 'essential') return value
    return migrateLegacyConsent()
  } catch {
    return null
  }
}

export function acceptAllCookies(): void {
  try {
    localStorage.setItem(KEY, 'all')
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event('shoptop:cookies-all'))
  } catch {
    /* ignore */
  }
}

export function acceptEssentialCookies(): void {
  try {
    localStorage.setItem(KEY, 'essential')
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
}
