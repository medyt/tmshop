import type { CheckoutAddonId } from './checkoutAddons'
import { toCheckoutApiCustomer } from './checkoutAddress'
import { isValidRoCui } from './roCui'
import { getRoCounties, hasValidDpdSiteId, type RoLocality } from './roLocalities'
import { isValidRoPhone, normalizeRoPhone } from './roPhone'
import { isVirtualProduct } from './shopCatalog'
import type { CheckoutPayload } from '../types/order'
import type { Product } from '../types/product'

/* ---------------------------------------------------------------------------
 * Import comenzi din Excel / CSV.
 * Coloanele sunt recunoscute după antet (fără diacritice, fără majuscule),
 * produsele se dau prin SKU: "A022 x2; A005" (sau "2xA022", "A022*2", "A022:2").
 * ------------------------------------------------------------------------- */

export type ImportColumnKey =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'phone'
  | 'email'
  | 'county'
  | 'city'
  | 'street'
  | 'streetNumber'
  | 'addressExtra'
  | 'postalCode'
  | 'products'
  | 'payment'
  | 'billingType'
  | 'companyName'
  | 'companyCui'
  | 'companyRegCom'
  | 'notes'
  | 'packageOpening'
  | 'gift'
  | 'priorityShipping'
  | 'packageInsurance'

export type ImportColumnDef = {
  key: ImportColumnKey
  label: string
  required: boolean
  example: string
  hint: string
  aliases: string[]
}

export const IMPORT_COLUMNS: ImportColumnDef[] = [
  { key: 'firstName', label: 'Prenume', required: true, example: 'Ana', hint: 'Sau o singură coloană „Nume complet”.', aliases: ['prenume', 'first name', 'firstname'] },
  { key: 'lastName', label: 'Nume', required: true, example: 'Popescu', hint: '', aliases: ['nume', 'nume de familie', 'last name', 'lastname'] },
  { key: 'fullName', label: 'Nume complet', required: false, example: '', hint: 'Alternativă la Prenume + Nume („Ana Popescu”).', aliases: ['nume complet', 'client', 'nume client', 'name', 'full name', 'destinatar'] },
  { key: 'phone', label: 'Telefon', required: true, example: '0722000111', hint: '10 cifre, începe cu 0.', aliases: ['telefon', 'tel', 'phone', 'mobil', 'nr telefon', 'numar telefon'] },
  { key: 'email', label: 'Email', required: false, example: 'ana@exemplu.ro', hint: 'Opțional. Obligatoriu doar la plata cu cardul.', aliases: ['email', 'e-mail', 'mail', 'adresa email'] },
  { key: 'county', label: 'Județ', required: true, example: 'Iași', hint: 'Nume (Iași, Cluj) sau cod (IS, CJ). „București” pentru capitală.', aliases: ['judet', 'județ', 'jud', 'county', 'regiune', 'sector judet'] },
  { key: 'city', label: 'Localitate', required: true, example: 'Iași', hint: 'Așa cum apare în nomenclatorul DPD (sat / oraș).', aliases: ['localitate', 'oras', 'oraș', 'city', 'sat', 'comuna', 'localitatea'] },
  { key: 'street', label: 'Strada', required: true, example: 'Ștefan cel Mare', hint: 'Fără „Str.”; se adaugă automat.', aliases: ['strada', 'stradă', 'str', 'street', 'adresa', 'adresă'] },
  { key: 'streetNumber', label: 'Număr', required: true, example: '12', hint: 'Numărul străzii.', aliases: ['numar', 'număr', 'nr', 'nr.', 'number', 'numar strada', 'nr strada'] },
  { key: 'addressExtra', label: 'Detalii adresă', required: false, example: 'Bl. A2, sc. B, ap. 14', hint: 'Bloc, scară, etaj, apartament, reper.', aliases: ['detalii adresa', 'detalii', 'bloc', 'bloc scara ap', 'apartament', 'address extra', 'complement', 'observatii adresa'] },
  { key: 'postalCode', label: 'Cod poștal', required: false, example: '700001', hint: '', aliases: ['cod postal', 'cod poștal', 'postal', 'zip', 'postcode', 'cp'] },
  { key: 'products', label: 'Produse (SKU x cantitate)', required: true, example: 'A022 x2; A005', hint: 'SKU-uri separate prin „;”. Cantitatea după „x” (implicit 1).', aliases: ['produse', 'produse (sku x cantitate)', 'sku', 'skus', 'continut', 'conținut', 'continut comanda', 'products', 'items', 'articole', 'cos', 'coș'] },
  { key: 'payment', label: 'Plată', required: false, example: 'ramburs', hint: '„ramburs” (implicit) sau „card”.', aliases: ['plata', 'plată', 'metoda plata', 'metoda de plata', 'payment', 'payment method', 'tip plata'] },
  { key: 'billingType', label: 'Facturare', required: false, example: 'persoana', hint: '„persoana” (implicit) sau „firma”.', aliases: ['facturare', 'tip facturare', 'tip client', 'billing', 'billing type'] },
  { key: 'companyName', label: 'Firmă', required: false, example: '', hint: 'Obligatoriu dacă Facturare = firma.', aliases: ['firma', 'firmă', 'companie', 'company', 'denumire firma', 'societate'] },
  { key: 'companyCui', label: 'CUI', required: false, example: '', hint: 'Cu sau fără RO.', aliases: ['cui', 'cif', 'cod fiscal', 'vat', 'company cui'] },
  { key: 'companyRegCom', label: 'Reg. Com.', required: false, example: '', hint: '', aliases: ['reg com', 'reg. com.', 'nr reg com', 'registrul comertului', 'j'] },
  { key: 'notes', label: 'Observații', required: false, example: 'Sunați înainte de livrare', hint: 'Apar pe comandă și pe AWB.', aliases: ['observatii', 'observații', 'note', 'notes', 'mentiuni', 'mențiuni', 'comentarii', 'obs'] },
  { key: 'packageOpening', label: 'Deschidere colet', required: false, example: 'nu', hint: 'da / nu. Adaugă serviciul D000.', aliases: ['deschidere colet', 'deschidere', 'verificare colet', 'd000', 'obpd'] },
  { key: 'gift', label: 'Produs surpriză', required: false, example: 'nu', hint: 'da / nu. Adaugă S000.', aliases: ['produs surpriza', 'produs surpriză', 'surpriza', 'cadou', 'gift', 's000'] },
  { key: 'priorityShipping', label: 'Livrare prioritară', required: false, example: 'nu', hint: 'da / nu. Adaugă L000.', aliases: ['livrare prioritara', 'livrare prioritară', 'prioritar', 'prioritara', 'l000'] },
  { key: 'packageInsurance', label: 'Garanție extinsă', required: false, example: 'nu', hint: 'da / nu. Adaugă A000.', aliases: ['garantie extinsa', 'garanție extinsă', 'garantie', 'asigurare', 'a000'] },
]

export function foldText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function findColumnKey(header: string): ImportColumnKey | null {
  const h = foldText(header).replace(/[*:()]/g, '').trim()
  if (!h) return null
  for (const col of IMPORT_COLUMNS) {
    if (foldText(col.label) === h) return col.key
    if (col.aliases.some((a) => foldText(a) === h)) return col.key
  }
  // Potrivire parțială („telefon client”, „judet livrare”).
  for (const col of IMPORT_COLUMNS) {
    if (col.aliases.some((a) => a.length >= 4 && h.startsWith(foldText(a) + ' '))) return col.key
  }
  return null
}

export type RawImportRow = {
  /** Numărul rândului în fișier (1 = antet). */
  rowNumber: number
  values: Partial<Record<ImportColumnKey, string>>
}

export type ParsedImportFile = {
  headers: string[]
  mapping: Array<{ header: string; key: ImportColumnKey | null }>
  rows: RawImportRow[]
  missingRequired: string[]
}

type SheetJs = typeof import('xlsx')

async function loadXlsx(): Promise<SheetJs> {
  return import('xlsx')
}

function cellText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v)
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).trim()
}

/** Citește .xlsx / .xls / .csv și mapează coloanele după antet. */
export async function parseImportFile(file: File): Promise<ParsedImportFile> {
  const XLSX = await loadXlsx()
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', raw: false, codepage: 65001 })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error('Fișierul nu conține nicio foaie de calcul.')
  const sheet = wb.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' })

  // Antet = primul rând care are cel puțin 2 celule nevide.
  let headerIndex = -1
  for (let i = 0; i < Math.min(matrix.length, 10); i++) {
    const nonEmpty = (matrix[i] ?? []).filter((c) => cellText(c) !== '').length
    if (nonEmpty >= 2) {
      headerIndex = i
      break
    }
  }
  if (headerIndex < 0) throw new Error('Nu am găsit rândul de antet (coloanele) în fișier.')

  const headers = (matrix[headerIndex] ?? []).map(cellText)
  const mapping = headers.map((header) => ({ header, key: header ? findColumnKey(header) : null }))
  const mapped = new Set(mapping.map((m) => m.key).filter((k): k is ImportColumnKey => k !== null))

  const hasName = mapped.has('fullName') || (mapped.has('firstName') && mapped.has('lastName'))
  const missingRequired: string[] = []
  if (!hasName) missingRequired.push('Prenume + Nume (sau Nume complet)')
  for (const col of IMPORT_COLUMNS) {
    if (!col.required || col.key === 'firstName' || col.key === 'lastName') continue
    if (!mapped.has(col.key)) missingRequired.push(col.label)
  }

  const rows: RawImportRow[] = []
  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const line = matrix[i] ?? []
    const values: Partial<Record<ImportColumnKey, string>> = {}
    let any = false
    mapping.forEach((m, col) => {
      if (!m.key) return
      const text = cellText(line[col])
      if (text !== '') any = true
      // Prima coloană mapată pe aceeași cheie câștigă.
      if (values[m.key] === undefined || values[m.key] === '') values[m.key] = text
    })
    if (!any) continue
    rows.push({ rowNumber: i + 1, values })
  }

  return { headers, mapping, rows, missingRequired }
}

export type ImportItem = { sku: string; qty: number; product: Product | null }

export type ImportRow = {
  rowNumber: number
  firstName: string
  lastName: string
  phone: string
  email: string
  countyCode: string
  countyName: string
  city: string
  dpdSiteId: number | undefined
  street: string
  streetNumber: string
  addressExtra: string
  postalCode: string
  items: ImportItem[]
  addons: CheckoutAddonId[]
  payment: 'cod' | 'card'
  billingType: 'person' | 'company'
  companyName: string
  companyCui: string
  companyRegCom: string
  notes: string
  errors: string[]
  warnings: string[]
  /** Total estimat (produse), fără transport / addon-uri. */
  estimatedSubtotal: number
}

export function importRowStatus(row: ImportRow): 'ok' | 'warn' | 'error' {
  if (row.errors.length > 0) return 'error'
  if (row.warnings.length > 0) return 'warn'
  return 'ok'
}

function truthy(value: string | undefined): boolean {
  const v = foldText(value ?? '')
  return ['da', 'yes', 'y', '1', 'x', 'true', 'ok'].includes(v)
}

/** „A022 x2; A005; 3xA021; A010*2” → [{sku, qty}]. */
export function parseProductsCell(cell: string): { items: Array<{ sku: string; qty: number }>; errors: string[] } {
  const items: Array<{ sku: string; qty: number }> = []
  const errors: string[] = []
  const tokens = cell
    .split(/[;\n,|]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  for (const token of tokens) {
    let sku = ''
    let qty = 1
    let m = token.match(/^(\d+)\s*[x×*]\s*(.+)$/i)
    if (m) {
      qty = Number(m[1])
      sku = m[2].trim()
    } else if ((m = token.match(/^(.+?)\s*[x×*:]\s*(\d+)$/i))) {
      sku = m[1].trim()
      qty = Number(m[2])
    } else if ((m = token.match(/^(.+?)\s*\(\s*(\d+)\s*\)$/))) {
      sku = m[1].trim()
      qty = Number(m[2])
    } else {
      sku = token
    }
    if (!sku) continue
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push(`Cantitate invalidă pentru „${token}”.`)
      continue
    }
    const existing = items.find((i) => i.sku.toUpperCase() === sku.toUpperCase())
    if (existing) existing.qty += qty
    else items.push({ sku, qty })
  }
  return { items, errors }
}

export type LocalityIndex = Map<string, RoLocality[]>

function matchCounty(value: string): { code: string; name: string } | null {
  const v = foldText(value)
  if (!v) return null
  const counties = getRoCounties()
  const byCode = counties.find((c) => foldText(c.code) === v)
  if (byCode) return byCode
  const byName = counties.find((c) => foldText(c.name) === v)
  if (byName) return byName
  // „jud. Iasi”, „Iasi (IS)”, „Bucuresti sector 3”
  const cleaned = v.replace(/^(jud\.?|judet(ul)?)\s+/, '').replace(/\s*\(.*\)$/, '')
  const loose = counties.find((c) => foldText(c.name) === cleaned || cleaned.startsWith(foldText(c.name)))
  return loose ?? null
}

function matchLocality(list: RoLocality[], value: string): RoLocality | null {
  const v = foldText(value).replace(/^(sat|com\.?|comuna|oras|orasul|mun\.?|municipiul)\s+/, '')
  if (!v) return null
  const exact = list.find((l) => foldText(l.name) === v)
  if (exact) return exact
  const cleanedList = list.find(
    (l) => foldText(l.name).replace(/^(sat|com\.?|comuna|oras|mun\.?)\s+/, '') === v,
  )
  if (cleanedList) return cleanedList
  return list.find((l) => foldText(l.name).startsWith(v + ' ')) ?? null
}

/**
 * Validează rândurile brute. `localities` = localități per cod județ (încărcate
 * în prealabil de pagină), `products` = catalogul admin (pentru SKU).
 */
export function validateImportRows(
  raw: RawImportRow[],
  products: Product[],
  localities: LocalityIndex,
): ImportRow[] {
  const bySku = new Map<string, Product>()
  for (const p of products) {
    if (p.sku) bySku.set(p.sku.trim().toUpperCase(), p)
    bySku.set(p.id.trim().toUpperCase(), p)
  }
  const seenSignature = new Map<string, number>()

  return raw.map((r) => {
    const v = r.values
    const errors: string[] = []
    const warnings: string[] = []

    let firstName = (v.firstName ?? '').trim()
    let lastName = (v.lastName ?? '').trim()
    if (!firstName && !lastName && v.fullName) {
      const parts = v.fullName.trim().split(/\s+/).filter(Boolean)
      firstName = parts[0] ?? ''
      lastName = parts.slice(1).join(' ')
      if (parts.length === 1) lastName = parts[0]
    } else if (firstName && !lastName) {
      lastName = firstName
      warnings.push('Lipsește numele de familie; s-a folosit prenumele.')
    } else if (!firstName && lastName) {
      firstName = lastName
    }
    if (!firstName && !lastName) errors.push('Lipsește numele clientului.')

    const phone = normalizeRoPhone(v.phone ?? '')
    if (!phone) errors.push('Lipsește telefonul.')
    else if (!isValidRoPhone(phone)) errors.push(`Telefon invalid „${v.phone}” (10 cifre, începe cu 0).`)

    const email = (v.email ?? '').trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Email invalid „${email}”.`)

    const county = matchCounty(v.county ?? '')
    if (!county) errors.push(v.county ? `Județ necunoscut „${v.county}”.` : 'Lipsește județul.')

    const cityRaw = (v.city ?? '').trim()
    let city = cityRaw
    let dpdSiteId: number | undefined
    if (!cityRaw) errors.push('Lipsește localitatea.')
    else if (county) {
      const list = localities.get(county.code) ?? []
      const loc = matchLocality(list, cityRaw)
      if (loc) {
        city = loc.name
        dpdSiteId = hasValidDpdSiteId(loc.id) ? loc.id : undefined
      } else {
        warnings.push(`Localitatea „${cityRaw}” nu e în nomenclatorul DPD pentru ${county.name}; AWB-ul va folosi numele scris.`)
      }
    }

    const street = (v.street ?? '').trim()
    if (!street) errors.push('Lipsește strada.')
    const streetNumber = (v.streetNumber ?? '').trim()
    if (!streetNumber) errors.push('Lipsește numărul străzii.')

    const { items: skuItems, errors: productErrors } = parseProductsCell(v.products ?? '')
    errors.push(...productErrors)
    if (skuItems.length === 0) errors.push('Lipsesc produsele (SKU).')
    let estimatedSubtotal = 0
    const items: ImportItem[] = skuItems.map((it) => {
      const product = bySku.get(it.sku.toUpperCase()) ?? null
      if (!product) errors.push(`SKU necunoscut „${it.sku}”.`)
      else if (isVirtualProduct(product)) errors.push(`„${it.sku}” este un serviciu (addon), nu un produs; folosește coloanele da/nu.`)
      else {
        if (!(product.salePrice > 0)) errors.push(`„${it.sku}” are preț 0; nu poate fi comandat.`)
        if ((product.stockQty ?? 0) < it.qty) errors.push(`Stoc insuficient pentru „${it.sku}”: ${product.stockQty ?? 0} disponibile, ${it.qty} cerute.`)
        estimatedSubtotal += product.salePrice * it.qty
      }
      return { sku: it.sku, qty: it.qty, product }
    })

    const paymentRaw = foldText(v.payment ?? '')
    const payment: 'cod' | 'card' = ['card', 'online', 'netopia', 'cardul'].includes(paymentRaw) ? 'card' : 'cod'
    if (payment === 'card') {
      if (!email) errors.push('Plata cu cardul cere email.')
      warnings.push('Plată card: comanda rămâne „neplătită” până când clientul plătește din linkul comenzii.')
    }

    const billingRaw = foldText(v.billingType ?? '')
    const billingType: 'person' | 'company' = ['firma', 'company', 'pj', 'persoana juridica', 'juridica'].includes(billingRaw) ? 'company' : 'person'
    const companyName = (v.companyName ?? '').trim()
    const companyCui = (v.companyCui ?? '').trim()
    const companyRegCom = (v.companyRegCom ?? '').trim()
    if (billingType === 'company') {
      if (!companyName) errors.push('Facturare pe firmă: lipsește denumirea firmei.')
      if (!companyCui || !isValidRoCui(companyCui)) errors.push(`CUI invalid „${companyCui}”.`)
    } else if (companyName || companyCui) {
      warnings.push('Ai completat firmă/CUI dar Facturare nu este „firma”; se facturează pe persoană fizică.')
    }

    const addons: CheckoutAddonId[] = []
    if (truthy(v.packageOpening)) addons.push('packageOpening')
    if (truthy(v.gift)) addons.push('gift')
    if (truthy(v.priorityShipping)) addons.push('priorityShipping')
    if (truthy(v.packageInsurance)) addons.push('packageInsurance')

    const signature = `${phone}|${skuItems.map((i) => `${i.sku.toUpperCase()}x${i.qty}`).sort().join(',')}`
    const dupOf = seenSignature.get(signature)
    if (dupOf !== undefined && phone) warnings.push(`Pare duplicat al rândului ${dupOf} (același telefon și produse).`)
    else seenSignature.set(signature, r.rowNumber)

    return {
      rowNumber: r.rowNumber,
      firstName,
      lastName,
      phone,
      email,
      countyCode: county?.code ?? '',
      countyName: county?.name ?? (v.county ?? '').trim(),
      city,
      dpdSiteId,
      street,
      streetNumber,
      addressExtra: (v.addressExtra ?? '').trim(),
      postalCode: (v.postalCode ?? '').trim(),
      items,
      addons,
      payment,
      billingType,
      companyName,
      companyCui,
      companyRegCom,
      notes: (v.notes ?? '').trim(),
      errors,
      warnings,
      estimatedSubtotal,
    }
  })
}

/** Județele distincte din rânduri (pentru preîncărcarea localităților). */
export function collectCountyCodes(raw: RawImportRow[]): string[] {
  const codes = new Set<string>()
  for (const r of raw) {
    const c = matchCounty(r.values.county ?? '')
    if (c) codes.add(c.code)
  }
  return [...codes]
}

export function buildImportPayload(row: ImportRow, options: { suppressEmail: boolean }): CheckoutPayload {
  const notesParts = ['Import Excel']
  if (row.notes) notesParts.push(row.notes)
  const customer = toCheckoutApiCustomer({
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    county: row.countyCode,
    city: row.city,
    dpdSiteId: row.dpdSiteId,
    street: row.street,
    streetNumber: row.streetNumber,
    addressExtra: row.addressExtra,
    postalCode: row.postalCode,
    notes: notesParts.join(' · '),
    billingType: row.billingType,
    companyName: row.companyName,
    companyCui: row.companyCui,
    companyRegCom: row.companyRegCom,
  })
  return {
    customer,
    paymentMethod: row.payment,
    acceptedTerms: true,
    items: row.items
      .filter((i) => i.product)
      .map((i) => ({ productId: i.product!.id, quantity: i.qty })),
    checkoutAddonIds: row.addons,
    suppressEmail: options.suppressEmail,
  }
}

/** Model .xlsx cu antetul corect și un rând exemplu. */
export async function buildImportTemplate(): Promise<Blob> {
  const XLSX = await loadXlsx()
  const cols = IMPORT_COLUMNS.filter((c) => c.key !== 'fullName')
  const header = cols.map((c) => c.label + (c.required ? ' *' : ''))
  const example = cols.map((c) => c.example)
  const hints = cols.map((c) => c.hint)
  const ws = XLSX.utils.aoa_to_sheet([header, example])
  ws['!cols'] = cols.map((c) => ({ wch: Math.max(14, c.label.length + 4) }))
  const wsHelp = XLSX.utils.aoa_to_sheet([
    ['Coloană', 'Obligatoriu', 'Explicație'],
    ...cols.map((c, i) => [c.label, c.required ? 'da' : 'nu', hints[i]]),
    [],
    ['Produse', '', 'Format: SKU x cantitate, separate prin „;”. Ex.: A022 x2; A005. Fără cantitate = 1 bucată.'],
    ['Plată', '', 'ramburs (implicit) sau card. La card, comanda se creează neplătită și clientul plătește din link.'],
    ['Județ', '', 'Nume sau cod: Iași / IS, Cluj / CJ, București / B.'],
  ])
  wsHelp['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 90 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Comenzi')
  XLSX.utils.book_append_sheet(wb, wsHelp, 'Instructiuni')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
