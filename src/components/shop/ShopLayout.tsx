import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../../lib/analytics'
import '../../pages/ShopHome.css'
import { CookieConsent } from './CookieConsent'
import { ShopFooter } from './ShopFooter'
import { ShopHeader } from './ShopHeader'

type ShopLayoutProps = {
  children: ReactNode
}

export function ShopLayout({ children }: ShopLayoutProps) {
  const location = useLocation()
  const productLanding = location.pathname.startsWith('/produs/')

  useEffect(() => {
    trackPageView(location.pathname, document.title)
  }, [location.pathname])

  return (
    <div
      className={`shop shop--dark${productLanding ? ' shop--product-lp' : ''}`}
    >
      <ShopHeader />
      <main className="shop-main">{children}</main>
      <ShopFooter />
      <CookieConsent />
    </div>
  )
}
