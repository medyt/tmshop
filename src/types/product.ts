export type CostSupplier = 'A' | 'B' | 'lower'

/** O observație de preț găsită online (sau altă sursă); media lor = preț propus. */
export type MarketObservation = {
  price: number
  sourceUrl?: string
  /** ISO date YYYY-MM-DD */
  observedAt?: string
  note?: string
}

export type Product = {
  id: string
  name: string
  sku?: string
  supplierPriceA: number
  supplierPriceB: number
  costSupplier: CostSupplier
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
  /** Mai multe prețuri găsite pe net — în UI se afișează media ca „preț propus”. */
  marketObservations?: MarketObservation[]
  notes?: string
}

export function createEmptyProduct(): Omit<Product, 'id'> {
  return {
    name: '',
    sku: '',
    supplierPriceA: 0,
    supplierPriceB: 0,
    costSupplier: 'lower',
    salePrice: 0,
    discountPercent: 0,
    stockQty: 0,
    imageUrls: [],
    description: '',
    marketObservations: [],
    notes: '',
  }
}
