import { Link } from 'react-router-dom'
import { SHOP_INFO_ROUTES, SITE_LEGAL } from '../../lib/siteLegal'

function IconTruck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 14h22v16H4V14zm22 4h8l6 6v6h-14V18z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M10 38a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm20 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M2 12h2M34 22l4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconBoxCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 10h18l6 6v22H8V10z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M26 10v8h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M14 26l4 4 10-10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 18c-2 2-2 10 0 12l6 6c2 2 10 2 12 0l6-6c2-2 2-10 0-12l-6-6c-2-2-10-2-12 0l-6 6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M20 22h8M20 26h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconQuality({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 12h22v20H8V12z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="16" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M32.5 16l2.5 2.5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type TrustItem = {
  Icon: typeof IconTruck
  title: string
  body: string
  titleHref?: string
}

export function ShopTrustBar() {
  const transport = `${SITE_LEGAL.shippingFlatRateRon}`

  const items: TrustItem[] = [
    {
      Icon: IconTruck,
      title: 'Livrare RAPIDĂ',
      body: 'Direct la ușa ta în maxim 3 zile lucrătoare.',
      titleHref: SHOP_INFO_ROUTES.delivery,
    },
    {
      Icon: IconBoxCheck,
      title: 'Verificare COLET',
      body: 'Înainte de expediere, ca produsele tale să ajungă în siguranță.',
    },
    {
      Icon: IconCash,
      title: 'Plată RAMBURS',
      body: `Cost transport fix ${transport} Lei.`,
    },
    {
      Icon: IconQuality,
      title: 'Produse ATENT selectate',
      body: 'Pentru a oferi satisfacție și încredere.',
    },
  ]

  return (
    <section className="shop-trust-bar" aria-label="De ce să comanzi de la noi">
      <div className="shop-trust-bar__inner">
        <ul className="shop-trust-bar__grid">
          {items.map((item, index) => {
            const Icon = item.Icon
            return (
              <li key={index} className="shop-trust-bar__item">
                <div className="shop-trust-bar__icon-wrap" aria-hidden="true">
                  <Icon className="shop-trust-bar__icon" />
                </div>
                <div className="shop-trust-bar__text">
                  <p className="shop-trust-bar__title">
                    {item.titleHref ? (
                      <Link
                        to={item.titleHref}
                        className="shop-trust-bar__title-link"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      item.title
                    )}
                  </p>
                  <p className="shop-trust-bar__body">{item.body}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
