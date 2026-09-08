export const SITE_LEGAL = {
  brandName: 'ShopTop',
  siteUrl: 'https://shop-top.ro',
  contactEmail: 'tmshop366@gmail.com',
  /** Telefon public al magazinului (gol = contact doar pe email). */
  contactPhone: '',
  operatorName: 'TM SHOP SRL',
  operatorCui: '54732560',
  operatorRegCom: 'J2026033223007',
  operatorEuid: 'ROONRC.J2026033223007',
  operatorFoundedDate: '2026-05-20',
  operatorAddress:
    'Str. Stejarului nr. 15, sat Tamaseni, județul Neamț, cod poștal 617465, România',
  /** Adresa de retur (aceeași ca expeditorul de pe AWB). */
  returnAddress:
    'Sat Alexandru cel Bun, str. Iaz nr. 1, județul Iași, cod poștal 707591, România',
  /** Telefon destinatar retur pe site (gol = trimis doar pe email după validare). */
  returnPhone: '',
  supportHours: 'Luni–Vineri, 09:00–17:00',
  shippingFlatRateRon: 19.99,
  /** Livrare gratuită de la acest subtotal. 0 = dezactivat (transportul rămâne tariful fix). */
  shippingFreeOverRon: 0,
  /** Marjă minimă (vânzare − achiziție) pentru feed-ul Meta. */
  metaMinProductProfitRon: 25,
  /** Opțiune checkout: produs cadou adăugat la total (RON). Trebuie aliniat cu `SHOPTOP_GIFT_ADDON_PRICE` în `server/api/orders.php`. */
  giftAddonPriceRon: 15,
  deliveryCarriersLabel: 'curier',
  /** Termen estimativ de procesare a comenzii înainte de predarea la curier. */
  processingTime: '24–48 de ore lucrătoare',
  /** Termen estimativ de livrare prin curier, de la confirmarea comenzii. */
  deliveryEstimate: '1–3 zile lucrătoare',
  deliverySummary:
    'Livrare prin curier — 19.99 RON, în 1–3 zile lucrătoare, plată ramburs sau cu cardul.',
  returnSummary:
    'Completezi cererea de retur cu IBAN valid, validăm asocierea cu comanda, îți trimitem pe email adresa și telefonul de retur; transportul e pe cheltuiala ta (fără ramburs), iar după primirea coletului rambursăm suma totală a comenzii.',
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
