import { getRoCountyName } from './roLocalities'
import { normalizeRoPhone } from './roPhone'
import type { CheckoutCustomer } from '../types/order'

/** Nume afișat / salvat: Prenume Nume */
export function formatCheckoutCustomerName(customer: CheckoutCustomer): string {
  return [customer.firstName, customer.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
}

/** Adresă structurată pentru DB / AWB / BaseLinker delivery_address. */
export function formatCheckoutCustomerAddress(customer: CheckoutCustomer): string {
  const streetLine = [
    customer.street.trim() ? `Str. ${customer.street.trim()}` : '',
    customer.streetNumber.trim() ? `nr. ${customer.streetNumber.trim()}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const extra = customer.addressExtra.trim()
  const city = customer.city.trim()
  const countyName = customer.county
    ? getRoCountyName(customer.county)
    : ''
  const postal = customer.postalCode.trim()

  const lines = [
    [streetLine, extra].filter(Boolean).join(', '),
    [city, countyName ? `jud. ${countyName}` : ''].filter(Boolean).join(', '),
    postal ? `Cod poștal: ${postal}` : '',
  ].filter(Boolean)

  return lines.join('\n')
}

/** Payload compatibil cu API (name + address compuse + câmpuri structurate). */
export function toCheckoutApiCustomer(customer: CheckoutCustomer) {
  return {
    firstName: customer.firstName.trim(),
    lastName: customer.lastName.trim(),
    name: formatCheckoutCustomerName(customer),
    email: customer.email.trim(),
    phone: normalizeRoPhone(customer.phone),
    county: customer.county.trim(),
    countyName: customer.county ? getRoCountyName(customer.county) : '',
    city: customer.city.trim(),
    dpdSiteId:
      typeof customer.dpdSiteId === 'number' && customer.dpdSiteId > 0
        ? customer.dpdSiteId
        : undefined,
    street: customer.street.trim(),
    streetNumber: customer.streetNumber.trim(),
    addressExtra: customer.addressExtra.trim(),
    postalCode: customer.postalCode.trim(),
    address: formatCheckoutCustomerAddress(customer),
    notes: customer.notes.trim(),
    billingType: customer.billingType === 'company' ? 'company' : 'person',
    companyName: customer.companyName.trim(),
    companyCui: customer.companyCui.trim(),
    companyRegCom: customer.companyRegCom.trim(),
  } satisfies import('../types/order').CheckoutApiCustomer
}
