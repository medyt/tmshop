import { SITE_LEGAL } from './siteLegal'

const META_DESCRIPTION_MAX = 160

/**
 * Imagine implicită pentru partajarea pe rețele sociale (Open Graph / Twitter).
 * Recomandat: înlocuiește cu un PNG/JPG 1200x630 (`/og-cover.png`) pentru
 * compatibilitate maximă cu toate platformele și actualizează această cale.
 */
export const DEFAULT_OG_IMAGE_PATH = '/og-cover.svg'

export function truncateMetaDescription(value: string, max = META_DESCRIPTION_MAX): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1).trimEnd()}…`
}

export function pageUrl(path: string): string {
  const base = SITE_LEGAL.siteUrl.replace(/\/$/, '')
  if (!path || path === '/') return `${base}/`
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function absoluteAssetUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined
  const trimmed = value.trim()
  if (trimmed.startsWith('data:')) return undefined
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }
  return pageUrl(trimmed.startsWith('/') ? trimmed : `/${trimmed}`)
}

export function productMetaDescription(input: {
  name: string
  lead?: string
  priceRon: number
}): string {
  const lead = input.lead?.trim()
  if (lead) {
    return truncateMetaDescription(lead)
  }
  return truncateMetaDescription(
    `Cumpără ${input.name} la ${input.priceRon} RON. ${SITE_LEGAL.deliverySummary}`,
  )
}

export function buildOrganizationJsonLd() {
  return {
    '@type': 'Organization',
    name: SITE_LEGAL.operatorName,
    url: SITE_LEGAL.siteUrl,
    email: SITE_LEGAL.contactEmail,
    ...(SITE_LEGAL.contactPhone
      ? { telephone: SITE_LEGAL.contactPhone }
      : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_LEGAL.operatorAddress,
      addressCountry: 'RO',
    },
  }
}

export function buildWebsiteJsonLd() {
  return {
    '@type': 'WebSite',
    name: SITE_LEGAL.brandName,
    url: SITE_LEGAL.siteUrl,
    inLanguage: 'ro-RO',
  }
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: pageUrl(item.path),
    })),
  }
}

export function buildProductJsonLd(input: {
  name: string
  description: string
  path: string
  image?: string
  sku?: string
  priceRon: number
  inStock: boolean
  averageRating?: number | null
  reviewCount?: number
}) {
  const product: Record<string, unknown> = {
    '@type': 'Product',
    name: input.name,
    description: input.description,
    image: input.image ? [input.image] : undefined,
    sku: input.sku,
    brand: {
      '@type': 'Brand',
      name: SITE_LEGAL.brandName,
    },
    offers: {
      '@type': 'Offer',
      url: pageUrl(input.path),
      priceCurrency: 'RON',
      price: input.priceRon.toFixed(2),
      availability: input.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }

  if (
    input.averageRating !== null &&
    input.averageRating !== undefined &&
    (input.reviewCount ?? 0) > 0
  ) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: input.averageRating.toFixed(1),
      reviewCount: input.reviewCount,
      bestRating: '5',
      worstRating: '1',
    }
  }

  return product
}

export function buildJsonLdGraph(nodes: Array<Record<string, unknown>>) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes,
  }
}
