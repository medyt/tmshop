import { primaryImageUrl } from './productImages'
import { htmlToPlainText } from './richText'
import {
  displayStock,
  isVirtualProduct,
  isVirtualProductId,
  productCategoryLabel,
  productCompareAtPrice,
} from './shopCatalog'
import { productPagePath } from './shopProductRoutes'
import { SHOP_INFO_ROUTES, SITE_LEGAL } from './siteLegal'
import { absoluteAssetUrl, pageUrl } from './seo'
import { meetsMetaCatalogMargin } from './productMath'
import type { Product } from '../types/product'

/** Coloanele din template-ul Meta Commerce Manager (`catalog_products.csv`). */
export const META_CATALOG_COLUMNS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
  'google_product_category',
  'fb_product_category',
  'quantity_to_sell_on_facebook',
  'sale_price',
  'sale_price_effective_date',
  'item_group_id',
  'gender',
  'color',
  'size',
  'age_group',
  'material',
  'pattern',
  'shipping',
  'shipping_weight',
  'offer_disclaimer',
  'offer_disclaimer_url',
  'video[0].url',
  'video[0].tag[0]',
  'gtin',
  'product_tags[0]',
  'product_tags[1]',
  'style[0]',
] as const

function csvField(value: string): string {
  if (value === '') return ''
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function clip(value: string, max: number): string {
  const t = value.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return t.slice(0, max).trimEnd()
}

function formatCatalogPrice(amount: number): string {
  return `${amount.toFixed(2)} RON`
}

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '')
}

/** ID din catalogul Meta = SKU exact din feed. Nu folosi id intern (A001). */
export function metaCatalogId(product: {
  id?: string
  sku?: string | null
}): string {
  return product.sku?.trim() ?? ''
}

type CatalogProduct = { id: string; sku?: string | null }

export type MetaContentLine = { id: string; quantity: number }

/**
 * SKU-uri de catalog din linia de comandă — fără add-on-uri (S000, D000…).
 * Preferă SKU-ul live din catalog (ex. X2), nu snapshot-ul vechi de pe comandă.
 */
export function metaContentsFromOrderItems(
  items: Array<{
    productId: string
    productSku?: string | null
    quantity?: number
  }>,
  catalogProducts?: CatalogProduct[],
): MetaContentLine[] {
  const liveSkuById = new Map<string, string>()
  for (const product of catalogProducts ?? []) {
    const id = product.id?.trim()
    const sku = product.sku?.trim()
    if (!id || !sku) continue
    liveSkuById.set(id, sku)
  }

  const bySku = new Map<string, number>()
  for (const item of items) {
    if (isVirtualProductId(item.productId, item.productSku)) continue
    const liveSku = liveSkuById.get(item.productId.trim())
    const sku = liveSku || metaCatalogId({ id: item.productId, sku: item.productSku })
    if (sku === '') continue
    const qty = Math.max(1, Math.floor(item.quantity ?? 1) || 1)
    bySku.set(sku, (bySku.get(sku) ?? 0) + qty)
  }

  return [...bySku.entries()].map(([id, quantity]) => ({ id, quantity }))
}

export function metaContentIdsFromOrderItems(
  items: Array<{ productId: string; productSku?: string | null }>,
  catalogProducts?: CatalogProduct[],
): string[] {
  return metaContentsFromOrderItems(items, catalogProducts).map((line) => line.id)
}

/**
 * Catalog Meta (Facebook/Instagram): header + rânduri produs.
 * `id` = SKU, același ca `content_ids` din pixel.
 * SKU-ul din feed nu se schimbă după lansare (preț/titlu/imagini da, codul nu).
 */
export function buildMetaCatalogCsv(products: Product[]): string {
  const shipping = `RO::Curier:${formatCatalogPrice(SITE_LEGAL.shippingFlatRateRon)}`
  const disclaimerUrl = pageUrl(SHOP_INFO_ROUTES.terms)
  const disclaimer = 'Prețurile includ TVA. Livrare prin curier. Se aplică termenii și condițiile din magazin.'

  const lines = [META_CATALOG_COLUMNS.join(',')]

  for (const product of products) {
    if (isVirtualProduct(product)) continue
    const title = clip(product.name ?? '', 200)
    if (!title) continue
    if (!(product.salePrice > 0)) continue
    if (!meetsMetaCatalogMargin(product, SITE_LEGAL.metaMinProductProfitRon)) continue

    const image = absoluteAssetUrl(primaryImageUrl(product))
    if (!image) continue
    const catalogId = clip(product.sku?.trim() ?? '', 100)
    if (!catalogId) continue

    // Stoc intern 0 (combo / gestiune manuală) tot se vinde — feed-ul rămâne „in stock”.
    const stock = displayStock(product)
    const compareAt = productCompareAtPrice(product)
    const description = clip(
      htmlToPlainText(product.description) || title,
      9999,
    )
    const brand = clip(product.brand?.trim() || SITE_LEGAL.brandName, 100)
    const gtin = digitsOnly(product.ean ?? '')
    const tag = clip(productCategoryLabel(product), 110)

    const row: Record<(typeof META_CATALOG_COLUMNS)[number], string> = {
      id: catalogId,
      title,
      description,
      availability: 'in stock',
      condition: 'new',
      price: formatCatalogPrice(compareAt ?? product.salePrice),
      link: pageUrl(productPagePath(product)),
      image_link: image,
      brand,
      google_product_category: product.googleCategory?.trim() ?? '',
      fb_product_category: '',
      quantity_to_sell_on_facebook: String(stock),
      sale_price: compareAt ? formatCatalogPrice(product.salePrice) : '',
      sale_price_effective_date: '',
      item_group_id: '',
      gender: '',
      color: '',
      size: '',
      age_group: '',
      material: '',
      pattern: '',
      shipping,
      shipping_weight: '',
      offer_disclaimer: disclaimer,
      offer_disclaimer_url: disclaimerUrl,
      'video[0].url': '',
      'video[0].tag[0]': '',
      gtin: gtin.length >= 8 && gtin.length <= 14 ? gtin : '',
      'product_tags[0]': tag,
      'product_tags[1]': '',
      'style[0]': '',
    }

    lines.push(META_CATALOG_COLUMNS.map((col) => csvField(row[col])).join(','))
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`
}
