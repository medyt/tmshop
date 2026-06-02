export type DeliveryCarrierId = 'fan-courier' | 'dpd'

export type DeliveryCarrier = {
  id: DeliveryCarrierId
  name: string
  logoSrc: string
  logoFallbackSrc?: string
}

export const DELIVERY_CARRIERS: DeliveryCarrier[] = [
  {
    id: 'fan-courier',
    name: 'Fan Courier',
    logoSrc: '/images/carriers/fan-courier.svg',
  },
  {
    id: 'dpd',
    name: 'DPD',
    logoSrc: '/images/carriers/dpd.svg',
  },
]

const CARRIER_NOTE_PREFIX = 'Curier ales:'

export function getDeliveryCarrier(id: DeliveryCarrierId): DeliveryCarrier {
  const carrier = DELIVERY_CARRIERS.find((entry) => entry.id === id)
  if (!carrier) {
    throw new Error(`Unknown delivery carrier: ${id}`)
  }
  return carrier
}

export function getDeliveryCarrierLabel(id: DeliveryCarrierId): string {
  return getDeliveryCarrier(id).name
}

export function buildDeliveryCarrierNote(id: DeliveryCarrierId): string {
  return `${CARRIER_NOTE_PREFIX} ${getDeliveryCarrierLabel(id)}`
}

export function parseDeliveryCarrierFromNotes(
  notes?: string,
): DeliveryCarrierId | null {
  if (!notes?.trim()) return null

  const firstLine = notes.trim().split('\n')[0]?.trim() ?? ''
  if (firstLine === `${CARRIER_NOTE_PREFIX} Fan Courier`) return 'fan-courier'
  if (firstLine === `${CARRIER_NOTE_PREFIX} DPD`) return 'dpd'
  return null
}

export function customerNotesWithoutCarrier(notes?: string): string | undefined {
  if (!notes?.trim()) return undefined

  const carrier = parseDeliveryCarrierFromNotes(notes)
  if (!carrier) return notes.trim()

  const remainder = notes.trim().replace(/^Curier ales: [^\n]+\n?\n?/, '').trim()
  return remainder || undefined
}
