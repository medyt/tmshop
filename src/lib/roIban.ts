/** Normalizează IBAN: fără spații, majuscule. */
export function normalizeRoIban(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

/**
 * Validare IBAN românesc (RO + 24 caractere) cu checksum MOD-97 (ISO 13616).
 */
export function isValidRoIban(raw: string): boolean {
  const iban = normalizeRoIban(raw)
  if (!/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(iban)) return false

  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let expanded = ''
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0)
    if (code >= 65 && code <= 90) {
      expanded += String(code - 55)
    } else {
      expanded += ch
    }
  }

  let remainder = 0
  for (const digit of expanded) {
    remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder === 1
}
