import type { CheckoutAddonsSelection } from '../lib/checkoutAddons'

export type OrderItem = {
  productId: string
  productName: string
  productSku?: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type ServiceMarginLine = {
  key: string
  label: string
  revenue: number
  cost: number
  margin: number
}

export type ServiceMarginBreakdown = {
  lines: ServiceMarginLine[]
  totals: {
    revenue: number
    cost: number
    margin: number
  }
  courierCostSource?: 'api' | 'contract' | null
}

export type CourierCostSource = 'api' | 'contract'

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'cancelled'

export type PaymentMethod = 'cod' | 'card'

export type PaymentStatus = 'pending' | 'paid'

export type BillingType = 'person' | 'company'

export type Order = {
  id: string
  customerName: string
  customerEmail?: string
  customerPhone: string
  customerAddress: string
  customerNotes?: string
  /** Județ (cod DPD) — pentru editare AWB */
  shipCounty?: string
  shipCountyName?: string
  shipCity?: string
  shipStreet?: string
  shipStreetNumber?: string
  shipAddressExtra?: string
  shipPostalCode?: string
  /** siteId DPD salvat la checkout / editare */
  dpdSiteId?: number
  /** Curier AWB: dpd | fan-courier (setat la emitere) */
  deliveryCarrier?: 'dpd' | 'fan-courier'
  billingType?: BillingType
  companyName?: string
  companyCui?: string
  companyRegCom?: string
  totalAmount: number
  status: OrderStatus
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  createdAt: string
  awbNumber?: string
  awbIssuedAt?: string
  dpdParcelId?: string
  courierStatus?: string
  courierStatusAt?: string
  /** Colet reîntors fizic la expeditor (cod DPD 124 / sync). */
  returnReceived?: boolean
  /** Cost total DPD (cu TVA), disponibil doar în admin. */
  courierCostTotal?: number
  courierCostNet?: number
  courierCostVat?: number
  courierCostSource?: CourierCostSource
  courierCostAt?: string
  courierCostDetails?: Record<string, number>
  /** Venit/cost/marjă pe servicii — doar admin. */
  serviceMarginBreakdown?: ServiceMarginBreakdown
  invoiceSeries?: string
  invoiceNumber?: string
  invoiceUrl?: string
  invoiceIssuedAt?: string
  invoiceError?: string
  accessToken?: string
  items: OrderItem[]
}

export type OrderTrackingEvent = {
  code: number
  description: string
  dateTime: string
  place?: string | null
}

export type OrderTracking = {
  awb?: string | null
  parcelId?: string | null
  publicUrl?: string | null
  events: OrderTrackingEvent[]
  lastStatus?: string | null
  outForDelivery: boolean
  delivered: boolean
  inTransit?: boolean
  returned?: boolean
  returnedToSender?: boolean
  error?: string | null
}

export type OrderWithTracking = Order & {
  tracking?: OrderTracking
}

export type CheckoutCustomer = {
  /** Prenume */
  firstName: string
  /** Nume de familie */
  lastName: string
  email: string
  phone: string
  /** Cod / regiune județ din nomenclatorul DPD */
  county: string
  /** Localitate din nomenclatorul DPD */
  city: string
  /** siteId DPD — folosit la emiterea AWB */
  dpdSiteId?: number
  street: string
  streetNumber: string
  /** Bloc / scară / apartament / alte detalii */
  addressExtra: string
  postalCode: string
  notes: string
  /** Facturare: persoană fizică sau firmă */
  billingType: BillingType
  companyName: string
  companyCui: string
  companyRegCom: string
}

/** Payload trimis la API — include și câmpurile compuse name/address. */
export type CheckoutApiCustomer = CheckoutCustomer & {
  name: string
  address: string
  countyName: string
}

export type CheckoutPayload = {
  customer: CheckoutApiCustomer
  paymentMethod?: PaymentMethod
  /** Linie fixă „Produs cadou” (+15 RON), doar dacă e bifat la checkout. */
  giftAddon?: boolean
  /** Extra opțiuni checkout (livrare prioritată, deschidere colet, garanție, cadou). */
  checkoutAddons?: CheckoutAddonsSelection
  /** ID-uri bifate (sursă de adevăr preferată pe server). */
  checkoutAddonIds?: import('../lib/checkoutAddons').CheckoutAddonId[]
  /** Obligatoriu true — verificat și pe server. */
  acceptedTerms: boolean
  items: Array<{ productId: string; quantity: number }>
  /** Click IDs Meta pentru Conversions API. */
  meta?: {
    fbp?: string
    fbc?: string
    eventSourceUrl?: string
  }
}
