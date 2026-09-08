/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_API_URI?: string
  readonly VITE_META_PIXEL_ID?: string
  readonly VITE_TIKTOK_PIXEL_ID?: string
  readonly VITE_GA_MEASUREMENT_ID?: string
  /** Cota TVA standard (ex. 0.21 = 21%). Default: 0.21 */
  readonly VITE_VAT_RATE?: string
  /** true = preț achiziție din gestiune include TVA. Default: true */
  readonly VITE_PURCHASE_PRICE_INCLUDES_VAT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
