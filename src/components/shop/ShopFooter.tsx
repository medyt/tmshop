import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { SHOP_INFO_ROUTES, SITE_LEGAL } from '../../lib/siteLegal'

const footerColumns = [
  {
    title: 'Magazin',
    links: [
      { label: 'Catalog', to: '/#catalog' },
      { label: 'Coș', to: '/cos' },
      { label: 'Comenzile mele', to: SHOP_INFO_ROUTES.orders, requiresAuth: true },
      { label: 'Conectare', to: '/conectare', requiresGuest: true },
      { label: 'Înregistrare', to: '/inregistrare', requiresGuest: true },
    ],
  },
  {
    title: 'Informații',
    links: [
      { label: 'Livrare și plată', to: SHOP_INFO_ROUTES.delivery },
      { label: 'Retur', to: SHOP_INFO_ROUTES.returns },
      { label: 'Contact', to: SHOP_INFO_ROUTES.contact },
      { label: 'Întrebări frecvente', to: SHOP_INFO_ROUTES.faq },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Termeni și condiții', to: SHOP_INFO_ROUTES.terms },
      {
        label: 'Politica de confidențialitate',
        to: SHOP_INFO_ROUTES.privacy,
      },
      { label: 'Politica cookie', to: SHOP_INFO_ROUTES.cookies },
    ],
  },
] as const

export function ShopFooter() {
  const year = new Date().getFullYear()
  const { user, loading } = useAuth()

  return (
    <footer className="shop-footer">
      <div className="shop-footer__inner">
        <div className="shop-footer__grid">
          {footerColumns.map((column) => (
            <section key={column.title} className="shop-footer__column">
              <h2 className="shop-footer__heading">{column.title}</h2>
              <ul className="shop-footer__links">
                {column.links
                  .filter((link) => {
                    if (loading) {
                      return !('requiresAuth' in link) && !('requiresGuest' in link)
                    }
                    if ('requiresAuth' in link) return Boolean(user)
                    if ('requiresGuest' in link) return !user
                    return true
                  })
                  .map((link) => (
                  <li key={link.to}>
                    {link.to.startsWith('/#') ? (
                      <a className="shop-footer__link" href={link.to}>
                        {link.label}
                      </a>
                    ) : (
                      <Link className="shop-footer__link" to={link.to}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="shop-footer__bottom">
          <p className="shop-footer__copy muted">
            © {year} {SITE_LEGAL.brandName}
          </p>
          <div className="shop-footer__badges">
            <a
              href="https://netopia-payments.com"
              target="_blank"
              rel="noreferrer noopener"
              title="Plăți securizate prin Netopia"
            >
              <img
                className="shop-footer__badge shop-footer__badge--light"
                src="/badges/netopia.svg"
                alt="Netopia Payments - plăți online securizate"
                width="200"
                height="36"
              />
              <img
                className="shop-footer__badge shop-footer__badge--dark"
                src="/badges/netopia-white.svg"
                alt="Netopia Payments - plăți online securizate"
                width="200"
                height="36"
              />
            </a>
            <a
              href="https://anpc.ro/ce-este-sal/"
              target="_blank"
              rel="noreferrer noopener"
              title="Soluționarea Alternativă a Litigiilor - ANPC"
            >
              <img
                src="/badges/anpc-sal.png"
                alt="ANPC - Soluționarea Alternativă a Litigiilor (SAL)"
                width="250"
                height="50"
              />
            </a>
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noreferrer noopener"
              title="Soluționarea Online a Litigiilor"
            >
              <img
                src="/badges/anpc-sol.png"
                alt="Soluționarea Online a Litigiilor (SOL / ODR)"
                width="250"
                height="50"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
