import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeSeedProducts } from '../src/data/seedProducts.ts'

function escapeTs(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function splitHighlights(text) {
  return splitSentences(text)
    .map((part) => part.replace(/\.$/, ''))
    .filter((part) => part.length > 12 && part.length < 180)
    .slice(1, 8)
}

const MANUAL_OVERRIDES = {
  'seed-magic-mop-360-basel': {
    lead: 'Set mop rotativ 360° cu cuvă din inox, coadă telescopică și 4 rezerve microfibră, pentru curățare rapidă fără să atingi apa murdară.',
    highlights: [
      'Cuvă rotativă din inox pentru stoarcere eficientă prin centrifugă',
      'Coadă telescopică reglabilă cu sistem de blocare',
      '4 rezerve din microfibră super-absorbante, lavabile',
      'Cap mop rotativ 360° pentru colțuri și spații greu accesibile',
      'Perie pentru rosturi și covoare inclusă în set',
      'Potrivit pentru gresie, parchet, laminat și suprafețe interioare',
    ],
    specs: [
      { label: 'Cod produs', value: 'MOP-MAGIC-360-INOX' },
      { label: 'Cuvă', value: 'Inox, stoarcere prin rotire' },
      { label: 'Rezerve', value: '4 buc. microfibră' },
      { label: 'Accesorii', value: 'Perie rosturi, coadă telescopică' },
    ],
    paragraphs: [
      'Setul include găleată cu compartimente pentru spălare și stoarcere, mop cu talpă și coadă metalică, patru rezerve lavabile și perie pentru zone dificile.',
      'Mopul absoarbe eficient praful, firele de păr și petele, iar excesul de apă se elimină rapid prin mecanismul rotativ al cuvii.',
      'Ideal pentru întreținerea zilnică a locuinței; urmați instrucțiunile de pe ambalaj și supravegheați copiii în apropierea apei.',
    ],
  },
  'seed-inflatable-pool-family-basel': {
    lead: 'Piscină gonflabilă dreptunghiulară 200×120×40 cm, cu 2 inele albastru/alb, pentru relaxare și joacă în grădină sau curte.',
    highlights: [
      'Dimensiuni 200×120×40 cm, formă dreptunghiulară stabilă',
      '2 inele gonflabile din PVC rezistent, margini moi',
      'Ușor de umflat, golit și depozitat după utilizare',
      'Potrivită pentru copii și adulți în aer liber',
      'Material PVC durabil, potrivit pentru vară',
      'Supraveghere adultă recomandată în timpul utilizării',
    ],
    specs: [
      { label: 'Cod produs', value: 'POOL-GONFL-200X120-BASEL' },
      { label: 'Dimensiuni', value: '200×120×40 cm' },
      { label: 'Material', value: 'PVC' },
      { label: 'Inele', value: '2 buc., albastru/alb' },
    ],
    paragraphs: [
      'Piscina oferă suficient spațiu pentru joacă și răcorire în zilele călduroase, fiind ușor de instalat pe o suprafață plană.',
      'După utilizare se poate goli, curăța și plia pentru depozitare compactă.',
      'Verificați integritatea produsului înainte de umflare și respectați recomandările de siguranță de pe ambalaj.',
    ],
  },
}

function buildContent(product) {
  const raw = (product.description?.trim() || product.name || '').replace(/\s+/g, ' ')
  const sentences = splitSentences(raw)
  const lead = sentences[0] ?? product.name
  const paragraphs =
    sentences.length > 1 ? sentences.slice(1, 4) : [raw || product.name]
  const highlights = splitHighlights(raw)
  const specs = []

  if (product.sku) {
    specs.push({ label: 'Cod produs', value: product.sku })
  }

  specs.push({ label: 'Denumire', value: product.name })

  if (product.marketObservations?.[0]?.sourceUrl) {
    specs.push({
      label: 'Referință listare',
      value: 'Model comparabil cu listările din piața online',
    })
  }

  return { lead, highlights, specs, paragraphs }
}

const products = mergeSeedProducts([])
const entries = products.map((product) => ({
  id: product.id,
  content: MANUAL_OVERRIDES[product.id] ?? buildContent(product),
}))

const lines = [
  "import type { Product } from '../types/product'",
  '',
  'export type ShopProductPageContent = {',
  '  lead: string',
  '  highlights: string[]',
  '  specs: { label: string; value: string }[]',
  '  paragraphs: string[]',
  '}',
  '',
  'const SHOP_PRODUCT_CONTENT: Record<string, ShopProductPageContent> = {',
]

for (const entry of entries) {
  lines.push(`  '${escapeTs(entry.id)}': {`)
  lines.push(`    lead: '${escapeTs(entry.content.lead)}',`)
  lines.push('    highlights: [')
  for (const item of entry.content.highlights) {
    lines.push(`      '${escapeTs(item)}',`)
  }
  lines.push('    ],')
  lines.push('    specs: [')
  for (const spec of entry.content.specs) {
    lines.push(
      `      { label: '${escapeTs(spec.label)}', value: '${escapeTs(spec.value)}' },`,
    )
  }
  lines.push('    ],')
  lines.push('    paragraphs: [')
  for (const paragraph of entry.content.paragraphs) {
    lines.push(`      '${escapeTs(paragraph)}',`)
  }
  lines.push('    ],')
  lines.push('  },')
}

lines.push('}', '')
lines.push('function buildFallback(product: Product): ShopProductPageContent {')
lines.push('  const raw = (product.description?.trim() || product.name || \'\').replace(/\\s+/g, \' \')')
lines.push('  const sentences = raw.split(/(?<=[.!?])\\s+/).filter(Boolean)')
lines.push('  const lead = sentences[0] ?? product.name')
lines.push('  const paragraphs = sentences.length > 1 ? sentences.slice(1, 4) : [raw || product.name]')
lines.push('  const highlights = paragraphs')
lines.push('    .flatMap((part) => part.split(/[,;]\\s+/))')
lines.push('    .map((part) => part.trim().replace(/\\.$/, \'\'))')
lines.push('    .filter((part) => part.length > 12)')
lines.push('    .slice(0, 6)')
lines.push('  const specs: ShopProductPageContent[\'specs\'] = []')
lines.push('  if (product.sku) {')
lines.push('    specs.push({ label: \'Cod produs\', value: product.sku })')
lines.push('  }')
lines.push('  specs.push({ label: \'Denumire\', value: product.name })')
lines.push('  return { lead, highlights, specs, paragraphs }')
lines.push('}', '')
lines.push('export function getShopProductPageContent(product: Product): ShopProductPageContent {')
lines.push('  return SHOP_PRODUCT_CONTENT[product.id] ?? buildFallback(product)')
lines.push('}', '')

const root = dirname(fileURLToPath(import.meta.url))
const outputPath = join(root, '..', 'src', 'data', 'shopProductContent.ts')
writeFileSync(outputPath, lines.join('\n'), 'utf8')
process.stdout.write(`Wrote ${entries.length} product pages to ${outputPath}\n`)
