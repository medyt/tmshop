import { SITE_LEGAL } from '../../lib/siteLegal'

/** Host afișat în ticker (ex. shop-top.ro), fără protocol. */
function siteHost(): string {
  try {
    return new URL(SITE_LEGAL.siteUrl).hostname.replace(/^www\./, '')
  } catch {
    return 'shop-top.ro'
  }
}

function phoneDisplay(): string {
  const p = SITE_LEGAL.contactPhone.trim()
  if (!p) return ''
  // Afișare prietenoasă: +40 757 192 613 sau cum e în config
  return p.replace(/\s+/g, ' ')
}

export function ShopAnnouncementBar() {
  const host = siteHost()
  const phone = phoneDisplay()

  const segments: Array<{ icon: string; text: string }> = [
    {
      icon: '📞',
      text: phone
        ? `Comenzi telefonice! ${phone}`
        : `Comenzi telefonice — ${SITE_LEGAL.contactEmail}`,
    },
    { icon: '🎯', text: 'Prinde punctele de fidelitate' },
    { icon: '🔥', text: `Oferte zilnice pe ${host}` },
    {
      icon: '🚚',
      text: `Livrare rapidă în 24–72 h — ${SITE_LEGAL.deliveryCarriersLabel}`,
    },
    { icon: '🎁', text: 'Cadou la înregistrare' },
  ]

  const renderSegment = (ariaHidden: boolean) => (
    <ul
      className="shop-announcement__segment"
      aria-hidden={ariaHidden}
    >
      {segments.map((item, index) => (
        <li key={index} className="shop-announcement__item">
          <span className="shop-announcement__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  )

  return (
    <div
      className="shop-announcement"
      role="region"
      aria-label="Anunțuri magazin"
    >
      <div className="shop-announcement__viewport">
        <div className="shop-announcement__track">
          {renderSegment(false)}
          {renderSegment(true)}
        </div>
      </div>
    </div>
  )
}
