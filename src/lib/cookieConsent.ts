const KEY = 'shoptop-cookie-consent-v1'

export type CookieConsentChoice = 'all' | 'essential'

export function hasCookieConsent(): boolean {
  try {
    return localStorage.getItem(KEY) !== null
  } catch {
    return false
  }
}

export function readCookieConsent(): CookieConsentChoice | null {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'all' || value === 'essential') return value
    return null
  } catch {
    return null
  }
}

export function acceptAllCookies(): void {
  try {
    localStorage.setItem(KEY, 'all')
  } catch {
    /* ignore */
  }
}

export function acceptEssentialCookies(): void {
  try {
    localStorage.setItem(KEY, 'essential')
  } catch {
    /* ignore */
  }
}
