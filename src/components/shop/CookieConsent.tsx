import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  acceptAllCookies,
  acceptEssentialCookies,
  hasCookieConsent,
} from '../../lib/cookieConsent'
import { SHOP_INFO_ROUTES } from '../../lib/siteLegal'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!hasCookieConsent())
  }, [])

  if (!visible) return null

  return (
    <div className="cookie-banner" role="dialog" aria-label="Preferințe cookie">
      <div className="cookie-banner__inner">
        <p className="cookie-banner__text">
          Folosim cookie-uri și stocare locală pentru funcționarea coșului,
          autentificare și salvarea preferinței tale. Citește{' '}
          <Link to={SHOP_INFO_ROUTES.cookies}>politica cookie</Link>.
        </p>
        <div className="cookie-banner__actions">
          <button
            type="button"
            className="shop-btn shop-btn--ghost"
            onClick={() => {
              acceptEssentialCookies()
              setVisible(false)
            }}
          >
            Doar esențiale
          </button>
          <button
            type="button"
            className="shop-btn shop-btn--primary"
            onClick={() => {
              acceptAllCookies()
              setVisible(false)
            }}
          >
            Accept toate
          </button>
        </div>
      </div>
    </div>
  )
}
