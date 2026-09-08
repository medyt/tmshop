import type { Order } from '../types/order'
import type { Product } from '../types/product'
import { isVirtualProductId } from './shopCatalog'
import { SHIPPING_FLAT_RATE } from './shopShipping'
import { orderHasFlatShipping } from './shippingEconomics'
import {
  courierCostGross,
  courierCostToNet,
  getVatSettings,
  purchaseCostToNet,
  splitGross,
  type VatSettings,
} from './vat'

export type MonthKey = string

export type ExpenseLineCategory =
  | 'salarii'
  | 'chirie'
  | 'utilitati'
  | 'facebook_ads'
  | 'consumabile'
  | 'contabilitate'
  | 'consultanta'
  | 'platforma'
  | 'alte'

export type ExpenseLine = {
  id?: number
  monthKey: MonthKey
  category: ExpenseLineCategory
  label: string
  amount: number
  sortOrder: number
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseLineCategory, string> = {
  salarii: 'Salarii',
  chirie: 'Chirie',
  utilitati: 'Utilități',
  facebook_ads: 'Facebook Ads',
  consumabile: 'Consumabile / ambalaje',
  contabilitate: 'Contabilitate',
  consultanta: 'Consultanță',
  platforma: 'Platformă / abonamente',
  alte: 'Alte cheltuieli',
}

export type GrossNetLine = {
  key: string
  label: string
  gross: number
  net: number
}

export type MonthProfitReport = {
  monthKey: MonthKey
  label: string
  vatRate: number
  purchasePriceIncludesVat: boolean
  returnedCount: number
  returnedRevenueGross: number
  autoLines: GrossNetLine[]
  productRevenueGross: number
  shippingRevenueGross: number
  addonRevenueGross: number
  totalRevenueGross: number
  totalRevenueNet: number
  productCostGross: number
  productCostNet: number
  courierCostGross: number
  courierCostNet: number
  directCostNet: number
  grossMargin: number
  grossMarginPct: number | null
  manualExpensesTotal: number
  finalProfit: number
  finalProfitPct: number | null
  expenseLines: ExpenseLine[]
}

function isRefusedOrReturnedOrder(order: Order): boolean {
  if (order.status === 'returned') return true
  if (order.returnReceived === true) return true
  const courier = (order.courierStatus ?? '').toLowerCase()
  if (!courier) return false
  return courier.includes('refuz') || courier.includes('returnat')
}

function lineTotal(item: {
  lineTotal?: number
  unitPrice?: number
  quantity?: number
}): number {
  if (typeof item.lineTotal === 'number' && Number.isFinite(item.lineTotal)) {
    return item.lineTotal
  }
  return (Number(item.unitPrice) || 0) * Math.max(0, Number(item.quantity) || 0)
}

function orderRevenueParts(order: Order): {
  product: number
  shipping: number
  addons: number
} {
  let product = 0
  let addons = 0
  for (const item of order.items) {
    const line = lineTotal(item)
    if (isVirtualProductId(item.productId, item.productSku)) {
      addons += line
    } else {
      product += line
    }
  }
  const shipping = orderHasFlatShipping(order) ? SHIPPING_FLAT_RATE : 0
  return { product, shipping, addons }
}

function orderProductCostGross(
  order: Order,
  purchasePriceByProductId: ReadonlyMap<string, number>,
): number {
  return order.items.reduce((sum, item) => {
    if (isVirtualProductId(item.productId, item.productSku)) return sum
    const qty = Math.max(0, Number(item.quantity) || 0)
    const unit = purchasePriceByProductId.get(item.productId.trim()) ?? 0
    if (!qty || !Number.isFinite(unit) || unit <= 0) return sum
    return sum + unit * qty
  }, 0)
}

function buildPurchasePriceMap(products: Product[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const product of products) {
    const id = product.id?.trim()
    if (!id) continue
    const cost = Number(product.purchasePrice)
    map.set(id, Number.isFinite(cost) && cost > 0 ? cost : 0)
  }
  return map
}

function monthRangeBounds(monthKey: MonthKey): { start: Date; end: Date } {
  const [y, m] = monthKey.split('-').map(Number)
  return {
    start: new Date(y, m - 1, 1),
    end: new Date(y, m, 1),
  }
}

function filterOrdersByRange(
  orders: Order[],
  start: Date,
  end: Date,
): Order[] {
  const from = start.getTime()
  const to = end.getTime()
  return orders.filter((order) => {
    const t = new Date(order.createdAt).getTime()
    return Number.isFinite(t) && t >= from && t < to
  })
}

export function shiftMonthKey(monthKey: MonthKey, delta: number): MonthKey {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthKeyLabel(monthKey: MonthKey): string {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
}

export function currentMonthKey(now = new Date()): MonthKey {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function buildMonthProfitReport(
  orders: Order[],
  products: Product[],
  monthKey: MonthKey,
  expenseLines: ExpenseLine[],
  settings: VatSettings = getVatSettings(),
): MonthProfitReport {
  const { start, end } = monthRangeBounds(monthKey)
  const monthOrders = filterOrdersByRange(orders, start, end)
  const purchaseMap = buildPurchasePriceMap(products)
  const rate = settings.rate

  let productRevenueGross = 0
  let shippingRevenueGross = 0
  let addonRevenueGross = 0
  let productCostGross = 0
  let courierCostGrossTotal = 0
  let courierCostNetTotal = 0
  let returnedCount = 0
  let returnedRevenueGross = 0
  let returnedProductCostGross = 0

  for (const order of monthOrders) {
    if (order.status === 'cancelled') continue
    const parts = orderRevenueParts(order)
    const cost = orderProductCostGross(order, purchaseMap)
    const isReturn = isRefusedOrReturnedOrder(order)

    if (isReturn) {
      returnedCount += 1
      returnedRevenueGross +=
        parts.product + parts.shipping + parts.addons
      returnedProductCostGross += cost
      continue
    }

    productRevenueGross += parts.product
    shippingRevenueGross += parts.shipping
    addonRevenueGross += parts.addons
    productCostGross += cost
    courierCostGrossTotal += courierCostGross(order)
    courierCostNetTotal += courierCostToNet(order, settings)
  }

  const totalRevenueGross =
    productRevenueGross + shippingRevenueGross + addonRevenueGross

  const productRev = splitGross(productRevenueGross, rate)
  const shippingRev = splitGross(shippingRevenueGross, rate)
  const addonRev = splitGross(addonRevenueGross, rate)
  const totalRevenueNet =
    productRev.net + shippingRev.net + addonRev.net

  const productCostNet = purchaseCostToNet(productCostGross, settings)
  const courierCostNet =
    courierCostNetTotal > 0
      ? courierCostNetTotal
      : splitGross(courierCostGrossTotal, rate).net

  const directCostNet = productCostNet + courierCostNet
  const grossMargin = totalRevenueNet - directCostNet
  const manualExpensesTotal = expenseLines.reduce(
    (sum, line) => sum + Math.max(0, Number(line.amount) || 0),
    0,
  )
  const finalProfit = grossMargin - manualExpensesTotal

  const autoLines: GrossNetLine[] = [
    {
      key: 'products',
      label: 'Venituri produse',
      gross: productRevenueGross,
      net: productRev.net,
    },
    {
      key: 'shipping',
      label: 'Venit transport (client)',
      gross: shippingRevenueGross,
      net: shippingRev.net,
    },
    {
      key: 'addons',
      label: 'Addon-uri (livrare prioritară, deschidere, surpriză)',
      gross: addonRevenueGross,
      net: addonRev.net,
    },
    {
      key: 'revenue_total',
      label: 'Total venituri',
      gross: totalRevenueGross,
      net: totalRevenueNet,
    },
    {
      key: 'purchase_cost',
      label: settings.purchasePriceIncludesVat
        ? 'Cost achiziție produse (cu TVA → net)'
        : 'Cost achiziție produse (fără TVA)',
      gross: productCostGross,
      net: productCostNet,
    },
    {
      key: 'courier',
      label: 'Cost curier DPD',
      gross: courierCostGrossTotal,
      net: courierCostNet,
    },
    {
      key: 'direct_cost',
      label: 'Total costuri directe',
      gross: productCostGross + courierCostGrossTotal,
      net: directCostNet,
    },
  ]

  return {
    monthKey,
    label: formatMonthKeyLabel(monthKey),
    vatRate: rate,
    purchasePriceIncludesVat: settings.purchasePriceIncludesVat,
    returnedCount,
    returnedRevenueGross,
    autoLines,
    productRevenueGross,
    shippingRevenueGross,
    addonRevenueGross,
    totalRevenueGross,
    totalRevenueNet,
    productCostGross,
    productCostNet,
    courierCostGross: courierCostGrossTotal,
    courierCostNet,
    directCostNet,
    grossMargin,
    grossMarginPct:
      totalRevenueNet > 0 ? grossMargin / totalRevenueNet : null,
    manualExpensesTotal,
    finalProfit,
    finalProfitPct:
      totalRevenueNet > 0 ? finalProfit / totalRevenueNet : null,
    expenseLines,
  }
}

export function buildMonthProfitCsv(report: MonthProfitReport): string {
  const sep = ';'
  const row = (cells: Array<string | number>) =>
    cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(sep)

  const lines: string[] = [
    row(['Luna', report.label]),
    row(['Cota TVA', `${Math.round(report.vatRate * 10000) / 100}%`]),
    row(['']),
    row(['Secțiune', 'Cu TVA (RON)', 'Fără TVA (RON)']),
  ]

  for (const line of report.autoLines) {
    lines.push(
      row([line.label, line.gross.toFixed(2), line.net.toFixed(2)]),
    )
  }

  lines.push(row(['']))
  lines.push(row(['Marjă brută', '', report.grossMargin.toFixed(2)]))
  lines.push(
    row([
      'Marjă brută %',
      '',
      report.grossMarginPct !== null
        ? `${(report.grossMarginPct * 100).toFixed(2)}%`
        : '',
    ]),
  )
  lines.push(row(['']))
  lines.push(row(['Cheltuieli manuale (fără TVA)', 'Denumire', 'Sumă']))

  for (const exp of report.expenseLines) {
    lines.push(
      row([
        EXPENSE_CATEGORY_LABELS[exp.category] ?? exp.category,
        exp.label,
        exp.amount.toFixed(2),
      ]),
    )
  }

  lines.push(row(['Total cheltuieli manuale', '', report.manualExpensesTotal.toFixed(2)]))
  lines.push(row(['']))
  lines.push(row(['PROFIT FINAL', '', report.finalProfit.toFixed(2)]))
  lines.push(
    row([
      'Profit final %',
      '',
      report.finalProfitPct !== null
        ? `${(report.finalProfitPct * 100).toFixed(2)}%`
        : '',
    ]),
  )
  lines.push(row(['Retururi (scăzute din venituri)', report.returnedCount, report.returnedRevenueGross.toFixed(2)]))

  return `\uFEFF${lines.join('\r\n')}`
}

export function legacyExpensesToLines(
  monthKey: MonthKey,
  legacy: {
    facebookAds: number
    consumables: number
    consulting: number
    salaries: number
  },
): ExpenseLine[] {
  const lines: ExpenseLine[] = []
  let sort = 0
  const push = (
    category: ExpenseLineCategory,
    label: string,
    amount: number,
  ) => {
    if (amount <= 0) return
    lines.push({ monthKey, category, label, amount, sortOrder: sort++ })
  }
  push('facebook_ads', 'Facebook Ads', legacy.facebookAds)
  push('consumabile', 'Consumabile', legacy.consumables)
  push('consultanta', 'Consultanță', legacy.consulting)
  push('salarii', 'Salarii', legacy.salaries)
  return lines
}
