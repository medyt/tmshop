export type OrderItem = {
  productId: string
  productName: string
  productSku?: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type PaymentMethod = 'cod' | 'card'

export type PaymentStatus = 'pending' | 'paid'

export type Order = {
  id: string
  customerName: string
  customerEmail?: string
  customerPhone: string
  customerAddress: string
  customerNotes?: string
  deliveryCarrier?: 'fan-courier' | 'dpd'
  totalAmount: number
  status: OrderStatus
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  createdAt: string
  awbNumber?: string
  awbIssuedAt?: string
  accessToken?: string
  items: OrderItem[]
}

export type CheckoutCustomer = {
  name: string
  email: string
  phone: string
  address: string
  notes: string
}

export type CheckoutPayload = {
  customer: CheckoutCustomer
  deliveryCarrier: 'fan-courier' | 'dpd'
  paymentMethod?: PaymentMethod
  /** Linie fixă „Produs cadou” (+15 RON), doar dacă e bifat la checkout. */
  giftAddon?: boolean
  items: Array<{ productId: string; quantity: number }>
}
