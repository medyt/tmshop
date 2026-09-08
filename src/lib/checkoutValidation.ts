import type { CheckoutCustomer } from '../types/order'
import { isValidRoCui } from './roCui'
import { isValidRoPhone } from './roPhone'
import { isDpdNomenclatureReady } from './roLocalities'

export function getCheckoutValidationMessage(
  customer: CheckoutCustomer,
  acceptedTerms: boolean,
  paymentMethod?: 'cod' | 'card',
): string | null {
  if (!isDpdNomenclatureReady()) {
    return 'Listele de județe/localități DPD nu sunt încărcate. Reîncarcă pagina și încearcă din nou.'
  }

  const missing: string[] = []

  if (customer.lastName.trim().length < 2) {
    missing.push('numele')
  }

  if (customer.firstName.trim().length < 2) {
    missing.push('prenumele')
  }

  if (!isValidRoPhone(customer.phone)) {
    missing.push('telefonul (exact 10 cifre, începe cu 0)')
  }

  if (paymentMethod === 'card') {
    const email = customer.email.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      missing.push('emailul (obligatoriu pentru plata cu cardul)')
    }
  }

  if (customer.billingType === 'company') {
    if (customer.companyName.trim().length < 2) {
      missing.push('denumirea firmei')
    }
    if (!isValidRoCui(customer.companyCui)) {
      missing.push('CUI-ul firmei (valid)')
    }
  }

  if (!customer.county.trim()) {
    missing.push('județul')
  }

  if (!customer.city.trim()) {
    missing.push('localitatea')
  }

  if (customer.street.trim().length < 2) {
    missing.push('strada')
  }

  if (!customer.streetNumber.trim()) {
    missing.push('numărul')
  }

  if (!acceptedTerms) {
    missing.push('acceptarea termenilor și condițiilor')
  }

  if (missing.length === 0) return null

  if (missing.length === 1) {
    return `Completează ${missing[0]} înainte de a plasa comanda.`
  }

  const last = missing.pop()
  return `Completează ${missing.join(', ')} și ${last} înainte de a plasa comanda.`
}
