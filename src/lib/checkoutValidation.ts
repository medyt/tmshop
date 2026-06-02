import type { CheckoutCustomer } from '../types/order'
import type { DeliveryCarrierId } from './shippingCarriers'

export function getCheckoutValidationMessage(
  customer: CheckoutCustomer,
  acceptedTerms: boolean,
  deliveryCarrier: DeliveryCarrierId | null,
): string | null {
  const missing: string[] = []

  if (customer.name.trim().length <= 1) {
    missing.push('numele complet')
  }

  if (customer.phone.trim().length < 6) {
    missing.push('telefonul')
  }

  if (customer.address.trim().length <= 5) {
    missing.push('adresa de livrare')
  }

  if (!deliveryCarrier) {
    missing.push('curierul de livrare')
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
