import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'

export type CustomerOrder = {
  id: string
  createdAt: string
  status: string
  paymentMethod: string
  paymentStatus: string
  totalAmount: number
  awbNumber: string
  deliveryCarrier: string
  courierStatus: string
  items: Array<{
    productId: string
    productName: string
    productSku: string
    quantity: number
    lineTotal: number
  }>
}

export type Customer = {
  key: string
  name: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  county: string
  countyName: string
  city: string
  street: string
  streetNumber: string
  addressExtra: string
  postalCode: string
  billingType: 'person' | 'company'
  companyName: string
  companyCui: string
  companyRegCom: string
  ordersCount: number
  countableOrders: number
  cancelledOrders: number
  returnedOrders: number
  totalSpent: number
  firstOrderAt: string
  lastOrderAt: string
  lastOrderId: string
  lastStatus: string
  lastPaymentMethod: string
  hasAccount: boolean
  accountEmail: string
  accountCreatedAt: string
  cities: string[]
  notes: string
  blacklisted: boolean
  tags: string
}

export type CustomerDetail = Customer & { orders: CustomerOrder[] }

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function parseCustomer(raw: unknown): Customer | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const key = str(r.key)
  if (!key) return null
  return {
    key,
    name: str(r.name),
    firstName: str(r.firstName),
    lastName: str(r.lastName),
    email: str(r.email),
    phone: str(r.phone),
    address: str(r.address),
    county: str(r.county),
    countyName: str(r.countyName),
    city: str(r.city),
    street: str(r.street),
    streetNumber: str(r.streetNumber),
    addressExtra: str(r.addressExtra),
    postalCode: str(r.postalCode),
    billingType: r.billingType === 'company' ? 'company' : 'person',
    companyName: str(r.companyName),
    companyCui: str(r.companyCui),
    companyRegCom: str(r.companyRegCom),
    ordersCount: num(r.ordersCount),
    countableOrders: num(r.countableOrders),
    cancelledOrders: num(r.cancelledOrders),
    returnedOrders: num(r.returnedOrders),
    totalSpent: num(r.totalSpent),
    firstOrderAt: str(r.firstOrderAt),
    lastOrderAt: str(r.lastOrderAt),
    lastOrderId: str(r.lastOrderId),
    lastStatus: str(r.lastStatus),
    lastPaymentMethod: str(r.lastPaymentMethod),
    hasAccount: Boolean(r.hasAccount),
    accountEmail: str(r.accountEmail),
    accountCreatedAt: str(r.accountCreatedAt),
    cities: Array.isArray(r.cities) ? r.cities.map(str).filter(Boolean) : [],
    notes: str(r.notes),
    blacklisted: Boolean(r.blacklisted),
    tags: str(r.tags),
  }
}

export function isCustomersApiEnabled(): boolean {
  return isApiEnabled()
}

export async function fetchCustomers(): Promise<{
  customers: Customer[]
  metaAvailable: boolean
}> {
  const res = await apiFetch('/customers.php', { cache: 'no-store' }, { credentials: 'include' })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  const data = (await res.json()) as { customers?: unknown[]; metaAvailable?: unknown }
  const customers: Customer[] = []
  for (const item of data.customers ?? []) {
    const c = parseCustomer(item)
    if (c) customers.push(c)
  }
  return { customers, metaAvailable: Boolean(data.metaAvailable) }
}

export async function fetchCustomer(key: string): Promise<CustomerDetail> {
  const res = await apiFetch(
    `/customers.php?key=${encodeURIComponent(key)}`,
    { cache: 'no-store' },
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error(await readErrorMessage(res))
  const data = (await res.json()) as Record<string, unknown>
  const customer = parseCustomer(data)
  if (!customer) throw new Error('Raspuns invalid de la server.')
  const orders: CustomerOrder[] = []
  for (const raw of Array.isArray(data.orders) ? data.orders : []) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    orders.push({
      id: str(o.id),
      createdAt: str(o.createdAt),
      status: str(o.status),
      paymentMethod: str(o.paymentMethod),
      paymentStatus: str(o.paymentStatus),
      totalAmount: num(o.totalAmount),
      awbNumber: str(o.awbNumber),
      deliveryCarrier: str(o.deliveryCarrier),
      courierStatus: str(o.courierStatus),
      items: (Array.isArray(o.items) ? o.items : []).map((it) => {
        const i = (it ?? {}) as Record<string, unknown>
        return {
          productId: str(i.productId),
          productName: str(i.productName),
          productSku: str(i.productSku),
          quantity: num(i.quantity),
          lineTotal: num(i.lineTotal),
        }
      }),
    })
  }
  return { ...customer, orders }
}

export async function updateCustomerMeta(input: {
  key: string
  notes: string
  blacklisted: boolean
  tags: string
}): Promise<void> {
  const res = await apiFetch(
    '/customers.php',
    { method: 'POST', body: JSON.stringify({ action: 'updateMeta', ...input }) },
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error(await readErrorMessage(res))
}

/** Descarcă CSV-ul (cu cookie-ul de sesiune) și declanșează salvarea. */
export async function downloadCustomersCsv(): Promise<void> {
  const res = await apiFetch('/customers.php?export=csv', { cache: 'no-store' }, { credentials: 'include' })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `clienti-shoptop-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
