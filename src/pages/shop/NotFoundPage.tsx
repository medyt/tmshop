import { Link } from 'react-router-dom'
import { ShopLayout } from '../../components/shop/ShopLayout'
import { usePageMeta } from '../../hooks/usePageMeta'
import { SITE_LEGAL } from '../../lib/siteLegal'

export function NotFoundPage() {
  usePageMeta({
    title: `Pagina nu a fost găsită — ${SITE_LEGAL.brandName}`,
    description: 'Pagina căutată nu există sau a fost mutată.',
    robots: 'noindex, follow',
  })

  return (
    <ShopLayout>
      <section className="shop-page shop-notfound">
        <div className="shop-page__head">
          <p className="shop-notfound__code">404</p>
          <h1 className="shop-page__title">Pagina nu a fost găsită</h1>
          <p className="shop-page__lead muted">
            Linkul accesat nu mai există sau a fost mutat. Poți reveni la magazin
            pentru a căuta produsul dorit.
          </p>
        </div>
        <div className="shop-notfound__actions">
          <Link to="/" className="shop-btn shop-btn--primary">
            Înapoi la magazin
          </Link>
          <Link to="/#catalog" className="shop-btn shop-btn--ghost">
            Vezi catalogul
          </Link>
        </div>
      </section>
    </ShopLayout>
  )
}
