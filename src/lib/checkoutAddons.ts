import { apiFetch, isApiEnabled } from './apiClient'

export type CheckoutAddonId =
  | 'priorityShipping'
  | 'packageOpening'
  | 'packageInsurance'
  | 'gift'

export type CheckoutAddonsSelection = Partial<Record<CheckoutAddonId, boolean>>

export type CheckoutAddonDef = {
  id: CheckoutAddonId
  /** Cod SKU pe AWB / factură / BaseLinker */
  sku: string
  title: string
  priceRon: number
  hint: string
}

/**
 * Fallback-uri locale — pe producție prețurile vin din DB (`products.php?addons=1`).
 *
 * S000 = Produs surpriză
 * D000 = Deschidere colet
 * A000 = Garanție extinsă 1 an
 * L000 = Livrare prioritară
 */
const CHECKOUT_ADDONS_DEFAULTS: CheckoutAddonDef[] = [
  {
    id: 'priorityShipping',
    sku: 'L000',
    title: 'Livrare prioritară',
    priceRon: 4.99,
    hint: 'Procesare și predare la curier cu prioritate.',
  },
  {
    id: 'packageOpening',
    sku: 'D000',
    title: 'Deschidere colet',
    priceRon: 4.99,
    hint: 'Verifici conținutul coletului înainte de plată.',
  },
  {
    id: 'packageInsurance',
    sku: 'A000',
    title: 'Garanție extinsă 1 an',
    priceRon: 19.99,
    hint: 'Extinde garanția produsului cu încă 1 an.',
  },
  {
    id: 'gift',
    sku: 'S000',
    title: 'Produs surpriză',
    priceRon: 15,
    hint: 'Primești un produs surpriză în plus, inclus în colet.',
  },
]

const ADDON_IDS = new Set<string>(
  CHECKOUT_ADDONS_DEFAULTS.map((addon) => addon.id),
)

let liveAddons: CheckoutAddonDef[] | null = null
let loadPromise: Promise<CheckoutAddonDef[]> | null = null

/** Catalog curent (DB dacă e încărcat, altfel fallback). */
export function getCheckoutAddons(): CheckoutAddonDef[] {
  return liveAddons ?? CHECKOUT_ADDONS_DEFAULTS
}

/** @deprecated Folosește getCheckoutAddons() — rămâne pentru importuri existente. */
export const CHECKOUT_ADDONS: CheckoutAddonDef[] = CHECKOUT_ADDONS_DEFAULTS

function isCheckoutAddonId(value: string): value is CheckoutAddonId {
  return ADDON_IDS.has(value)
}

function mergeAddonPrices(
  remote: Array<{
    id?: unknown
    sku?: unknown
    title?: unknown
    priceRon?: unknown
  }>,
): CheckoutAddonDef[] {
  const byId = new Map<string, { title?: string; priceRon?: number; sku?: string }>()
  const bySku = new Map<string, { title?: string; priceRon?: number; sku?: string }>()

  for (const row of remote) {
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    const sku = typeof row.sku === 'string' ? row.sku.trim().toUpperCase() : ''
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    const price =
      typeof row.priceRon === 'number' && Number.isFinite(row.priceRon)
        ? row.priceRon
        : typeof row.priceRon === 'string' && row.priceRon.trim() !== ''
          ? Number(row.priceRon)
          : NaN
    const entry = {
      title: title || undefined,
      priceRon: Number.isFinite(price) && price >= 0 ? price : undefined,
      sku: sku || undefined,
    }
    if (id) byId.set(id, entry)
    if (sku) bySku.set(sku, entry)
  }

  return CHECKOUT_ADDONS_DEFAULTS.map((addon) => {
    const hit = byId.get(addon.id) ?? bySku.get(addon.sku.toUpperCase())
    if (!hit) return addon
    return {
      ...addon,
      sku: hit.sku || addon.sku,
      title: hit.title || addon.title,
      priceRon:
        hit.priceRon !== undefined ? hit.priceRon : addon.priceRon,
    }
  })
}

/** Încarcă prețurile addon din MySQL (public). Reutilizabil / idempotent. */
export async function loadCheckoutAddons(): Promise<CheckoutAddonDef[]> {
  if (liveAddons) return liveAddons
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    if (!isApiEnabled()) {
      liveAddons = CHECKOUT_ADDONS_DEFAULTS
      return liveAddons
    }
    try {
      const res = await apiFetch(
        '/products.php?addons=1',
        { cache: 'no-store' },
        { credentials: 'include' },
      )
      if (!res.ok) {
        liveAddons = CHECKOUT_ADDONS_DEFAULTS
        return liveAddons
      }
      const data = (await res.json()) as unknown
      if (!Array.isArray(data)) {
        liveAddons = CHECKOUT_ADDONS_DEFAULTS
        return liveAddons
      }
      liveAddons = mergeAddonPrices(
        data as Array<{
          id?: unknown
          sku?: unknown
          title?: unknown
          priceRon?: unknown
        }>,
      )
      return liveAddons
    } catch {
      liveAddons = CHECKOUT_ADDONS_DEFAULTS
      return liveAddons
    } finally {
      loadPromise = null
    }
  })()

  return loadPromise
}

export function checkoutAddonsTotal(
  selection: CheckoutAddonsSelection | undefined,
): number {
  if (!selection) return 0
  let total = 0
  for (const addon of getCheckoutAddons()) {
    if (selection[addon.id] === true) {
      total += addon.priceRon
    }
  }
  return Math.round(total * 100) / 100
}

export function selectedCheckoutAddons(
  selection: CheckoutAddonsSelection | undefined,
): CheckoutAddonDef[] {
  if (!selection) return []
  return getCheckoutAddons().filter((addon) => selection[addon.id] === true)
}

/** Listă explicită de ID-uri bifate — mai robustă la serializare API. */
export function selectedCheckoutAddonIds(
  selection: CheckoutAddonsSelection | undefined,
): CheckoutAddonId[] {
  return selectedCheckoutAddons(selection).map((addon) => addon.id)
}

export function resolveCheckoutAddonId(
  value: string,
): CheckoutAddonId | null {
  const key = value.trim()
  if (key === 'warranty5y') return 'packageInsurance'
  return isCheckoutAddonId(key) ? key : null
}
