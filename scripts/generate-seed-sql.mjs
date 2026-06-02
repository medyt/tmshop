import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeSeedProducts } from '../src/data/seedProducts'

function sqlString(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}

function sqlNullableString(value) {
  if (value === undefined || value.trim() === '') return 'NULL'
  return sqlString(value)
}

function sqlJson(value) {
  return sqlString(JSON.stringify(value))
}

function productInsert(product) {
  const marketObservations =
    product.marketObservations && product.marketObservations.length > 0
      ? JSON.stringify(product.marketObservations)
      : null

  return `INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  ${sqlString(product.id)},
  ${sqlString(product.name)},
  ${sqlNullableString(product.sku)},
  ${product.supplierPriceA.toFixed(2)},
  ${product.supplierPriceB.toFixed(2)},
  ${sqlString(product.costSupplier)},
  ${product.salePrice.toFixed(2)},
  ${(product.discountPercent ?? 0).toFixed(2)},
  ${Math.max(0, Math.floor(product.stockQty ?? 0))},
  ${sqlJson(product.imageUrls)},
  ${sqlNullableString(product.description)},
  ${marketObservations === null ? 'NULL' : sqlJson(product.marketObservations)},
  ${sqlNullableString(product.notes)}
);`
}

const products = mergeSeedProducts([])
const lines = [
  'USE shoptop;',
  '',
  'DELETE FROM products;',
  '',
  ...products.map((product) => productInsert(product)),
  '',
]

const root = dirname(fileURLToPath(import.meta.url))
const outputPath = join(root, '..', 'sql', 'seed-data.sql')
writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8')
process.stdout.write(`Wrote ${products.length} products to ${outputPath}\n`)

const serverLines = ['USE vbpnetmf_shoptop;', '', ...lines.slice(2)]
const serverOutputPath = join(root, '..', 'sql', 'seed-data-server.sql')
writeFileSync(serverOutputPath, `${serverLines.join('\n')}\n`, 'utf8')
process.stdout.write(`Wrote ${products.length} products to ${serverOutputPath}\n`)
