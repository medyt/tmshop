import type { Order } from '../types/order'
import { isOrderReturnReceived } from './ordersApi'
import { getDeliveryCarrierLabel } from './shippingCarriers'

export type AwbTone = 'neutral' | 'info' | 'ok' | 'warn' | 'bad'

export type AwbStatus = {
  /** Etichetă scurtă, uniformă între DPD și Fan Courier. */
  label: string
  tone: AwbTone
  /** Textul brut de la curier, dacă diferă de etichetă. */
  detail: string | null
  carrierLabel: string | null
}

/**
 * Normalizează statusul AWB (DPD / Fan Courier au texte diferite) într-o
 * etichetă scurtă: „Ridicat de curier”, „În livrare”, „Livrat”, „Refuzat”…
 */
export function describeAwbStatus(order: Order): AwbStatus | null {
  if (!order.awbNumber) return null
  const raw = (order.courierStatus ?? '').trim()
  const s = raw.toLowerCase()
  const carrierLabel = order.deliveryCarrier
    ? getDeliveryCarrierLabel(order.deliveryCarrier)
    : null

  const build = (label: string, tone: AwbTone): AwbStatus => ({
    label,
    tone,
    detail: raw && raw.toLowerCase() !== label.toLowerCase() ? raw : null,
    carrierLabel,
  })

  if (order.status === 'cancelled' || s.includes('anulat')) {
    return build('AWB anulat', 'neutral')
  }
  if (isOrderReturnReceived(order) || s.includes('returnat la expeditor') || s.includes('returnat expeditorului') || s.includes('livrat la expeditor')) {
    return build('Returnat la expeditor', 'bad')
  }
  if (s.includes('refuz')) {
    return build('Refuzat', 'bad')
  }
  if (order.status === 'returned' || s.includes('return')) {
    return build('În retur', 'bad')
  }
  if (order.status === 'delivered' || /\blivrat[aăe]?\b/.test(s)) {
    return build('Livrat', 'ok')
  }
  if (s.includes('nereu') || s.includes('amânat') || s.includes('amanat')) {
    return build('Livrare nereușită', 'warn')
  }
  if (s.includes('curs de livrare') || s.includes('din curier') || s.includes('ridicare personal')) {
    return build('În livrare', 'info')
  }
  if (
    order.status === 'shipped' ||
    s.includes('preluat') ||
    s.includes('ridicat') ||
    s.includes('tranzit') ||
    s.includes('sortat') ||
    s.includes('depozit') ||
    s.includes('expedi') ||
    s.includes('scanare') ||
    s.includes('procesat')
  ) {
    return build('Ridicat de curier', 'info')
  }
  if (raw) {
    return build(raw, 'neutral')
  }
  return build('Așteaptă ridicarea', 'neutral')
}
