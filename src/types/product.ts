export type BundleOfferMode = 'fixed_total' | 'percent_off'
export type BundleOfferBadge = 'popular' | 'best'

/**
 * Oferte bundle (ex. 2/3 buc) configurabile din admin.
 * - fixed_total: `value` este prețul TOTAL pentru `qty` bucăți.
 * - percent_off: `value` este % discount aplicat la `salePrice * qty`.
 */
export type BundleOffer = {
  qty: 2 | 3
  enabled: boolean
  mode: BundleOfferMode
  value: number
  title?: string
  badge?: BundleOfferBadge
}

export type Product = {
  id: string
  name: string
  sku?: string
  /** Cod de bare GTIN/EAN — folosit la feed-urile Google/Meta/TikTok. */
  ean?: string
  /** Brand/producător — atribut recomandat pentru feed-uri. */
  brand?: string
  /** Categorie Google Product Taxonomy (ID sau cale) pentru feed Google. */
  googleCategory?: string
  /** Manufacturer Part Number — folosit când lipsește EAN-ul. */
  mpn?: string
  /** Preț de achiziție (cost) în RON — folosit la calculul profitului și marjei. */
  purchasePrice: number
  salePrice: number
  /** Procent de discount afișat în magazin; prețul final rămâne `salePrice`. */
  discountPercent?: number
  /** Slug SEO pentru URL-ul public al produsului. */
  slug?: string
  /** Categorie pentru filtrare în catalog. */
  category?: string
  /** Bucăți disponibile în inventarul intern (depozit). */
  stockQty?: number
  /** Galerie: URL-uri https sau data URL după încărcare locală (ex. 5–6 poze). */
  imageUrls: string[]
  /** Text descriptiv pentru catalogul intern (nu e site public). */
  description?: string
  notes?: string
  bundleOffers?: BundleOffer[]
}

export function createEmptyProduct(): Omit<Product, 'id'> {
  return {
    name: '',
    sku: '',
    ean: '',
    brand: '',
    googleCategory: '',
    mpn: '',
    purchasePrice: 0,
    salePrice: 0,
    discountPercent: 0,
    stockQty: 0,
    imageUrls: [],
    description: '',
    notes: '',
    bundleOffers: [],
  }
}
