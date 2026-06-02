import type { Product } from '../types/product'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function productSlug(product: Pick<Product, 'id' | 'name' | 'slug'>): string {
  if (product.slug?.trim()) return product.slug.trim()
  if (product.name?.trim()) return slugify(product.name)
  return product.id
}

export function productPagePath(product: Pick<Product, 'id' | 'name' | 'slug'>): string {
  return `/produs/${encodeURIComponent(productSlug(product))}`
}

export function findListedProduct(
  products: Product[],
  productRef: string,
): Product | undefined {
  const decoded = decodeURIComponent(productRef)
  return products.find(
    (product) =>
      product.id === decoded ||
      product.slug === decoded ||
      productSlug(product) === decoded,
  )
}
