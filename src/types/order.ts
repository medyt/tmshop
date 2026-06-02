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
  items: Array<{ productId: string; quantity: number }>
}
