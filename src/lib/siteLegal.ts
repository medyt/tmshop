export const SITE_LEGAL = {
  brandName: 'ShopTop',
  siteUrl: 'https://shop-top.ro',
  contactEmail: 'tmshop366@gmail.com',
  /** Telefon public al magazinului (afișat în contact, footer, AWB și JSON-LD). */
  contactPhone: '+40 757 192 613',
  operatorName: 'TM SHOP SRL',
  operatorCui: '54732560',
  operatorRegCom: 'J2026033223007',
  operatorEuid: 'ROONRC.J2026033223007',
  operatorFoundedDate: '2026-05-20',
  operatorAddress:
    'Str. Stejarului nr. 15, sat Tamaseni, județul Neamț, cod poștal 617465, România',
  supportHours: 'Luni–Vineri, 09:00–17:00',
  shippingFlatRateRon: 25,
  /** Opțiune checkout: produs cadou adăugat la total (RON). Trebuie aliniat cu `SHOPTOP_GIFT_ADDON_PRICE` în `server/api/orders.php`. */
  giftAddonPriceRon: 15,
  deliveryCarriersLabel: 'Fan Courier sau DPD',
  deliverySummary:
    'Livrare prin Fan Courier sau DPD — 25 RON, plată la livrare.',
  returnSummary:
    'Retururile se soluționează individual, în funcție de starea produsului și de termenul de la primire.',
} as const

export const SHOP_INFO_ROUTES = {
  delivery: '/livrare-si-plata',
  returns: '/retur',
  returnRequest: '/cerere-retur',
  contact: '/contact',
  faq: '/intrebari-frecvente',
  terms: '/termeni-si-conditii',
  privacy: '/politica-de-confidentialitate',
  cookies: '/politica-cookie',
  orders: '/comenzile-mele',
} as const
