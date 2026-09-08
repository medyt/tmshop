/** Cota standard TVA — default 21%, aliniată cu SmartBill. */
export type VatSettings = {
  /** Ex. 0.21 pentru 21% */
  rate: number
  /** Preț achiziție din gestiune include TVA (brut). */
  purchasePriceIncludesVat: boolean
}

function parseEnvRate(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback
  const n = Number(raw.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return fallback
  return n > 1 ? n / 100 : n
}

function parseEnvBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return fallback
  const v = raw.trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes') return true
  if (v === '0' || v === 'false' || v === 'no') return false
  return fallback
}

/** Setări TVA — configurabile prin .env (VITE_VAT_RATE, VITE_PURCHASE_PRICE_INCLUDES_VAT). */
export function getVatSettings(): VatSettings {
  return {
    rate: parseEnvRate(import.meta.env.VITE_VAT_RATE, 0.21),
    purchasePriceIncludesVat: parseEnvBool(
      import.meta.env.VITE_PURCHASE_PRICE_INCLUDES_VAT,
      true,
    ),
  }
}

/** Rotunjire doar la afișare / export. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/** Extrage baza fără TVA din sumă brută (TVA inclus). Fără rotunjire intermediară. */
export function grossToNet(gross: number, rate: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0
  if (!Number.isFinite(rate) || rate <= 0) return gross
  return gross / (1 + rate)
}

/** TVA conținut într-o sumă brută. */
export function vatFromGross(gross: number, rate: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0
  return gross - grossToNet(gross, rate)
}

/** Descompune sumă brută în net + TVA (fără rotunjire intermediară). */
export function splitGross(
  gross: number,
  rate: number,
): { gross: number; net: number; vat: number } {
  const net = grossToNet(gross, rate)
  return { gross, net, vat: gross - net }
}

/** Convertește cost achiziție la net, în funcție de setări. */
export function purchaseCostToNet(
  grossOrNet: number,
  settings: VatSettings,
): number {
  if (!Number.isFinite(grossOrNet) || grossOrNet <= 0) return 0
  if (settings.purchasePriceIncludesVat) {
    return grossToNet(grossOrNet, settings.rate)
  }
  return grossOrNet
}

/** Convertește cost DPD la net: preferă net din API, altfel / (1+rate). */
export function courierCostToNet(
  order: {
    courierCostNet?: number
    courierCostTotal?: number
  },
  settings: VatSettings,
): number {
  const net = order.courierCostNet
  if (typeof net === 'number' && Number.isFinite(net) && net > 0) return net
  const total = order.courierCostTotal
  if (typeof total === 'number' && Number.isFinite(total) && total > 0) {
    return grossToNet(total, settings.rate)
  }
  return 0
}

export function courierCostGross(order: {
  courierCostTotal?: number
  courierCostNet?: number
}): number {
  const total = order.courierCostTotal
  if (typeof total === 'number' && Number.isFinite(total) && total > 0) {
    return total
  }
  const net = order.courierCostNet
  if (typeof net === 'number' && Number.isFinite(net) && net > 0) {
    return net
  }
  return 0
}
