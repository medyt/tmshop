import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { initTracking, trackPageView } from '../../lib/analytics'
import {
  acceptAllCookies,
  acceptEssentialCookies,
  readCookieConsent,
} from '../../lib/cookieConsent'
import { SHOP_INFO_ROUTES } from '../../lib/siteLegal'

export function CookieConsent() {
  const location = useLocation()
  const [consent, setConsent] = useState(() => readCookieConsent())
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (consent === null) {
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [consent])

  useEffect(() => {
    if (!visible || consent !== null) return
    document.body.classList.add('cookie-banner-open')
    return () => {
      document.body.classList.remove('cookie-banner-open')
    }
  }, [visible, consent])

  if (consent !== null || !visible) return null

  const handleAcceptAll = () => {
    acceptAllCookies()
    setConsent('all')
    initTracking()
    trackPageView(location.pathname, document.title)
  }

  const handleEssential = () => {
    acceptEssentialCookies()
    setConsent('essential')
  }

  return createPortal(
    <div
      className="cookie-banner"
      role="dialog"
      aria-live="polite"
      aria-label="Preferințe cookies"
    >
      <div className="cookie-banner__content">
        <p className="cookie-banner__text">
          Folosim cookies pentru a îmbunătăți experiența ta pe site. Poți
          accepta toate cookie-urile sau doar pe cele esențiale.{' '}
          <Link to={SHOP_INFO_ROUTES.cookies} className="cookie-banner__link">
            Politica de cookies
          </Link>
        </p>
        <div className="cookie-banner__actions">
          <button
            type="button"
            className="cookie-banner__btn cookie-banner__btn--reject"
            onClick={handleEssential}
          >
            Doar esențiale
          </button>
          <button
            type="button"
            className="cookie-banner__btn cookie-banner__btn--accept"
            onClick={handleAcceptAll}
          >
            Accept toate
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
