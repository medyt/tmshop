/** Telefon RO: doar cifre, exact 10, începe cu 0 (ex. 07xxxxxxxx). */
export function normalizeRoPhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function isValidRoPhone(raw: string): boolean {
  const phone = normalizeRoPhone(raw)
  return phone.length === 10 && phone.startsWith('0')
}

/** Pentru input: doar cifre, maxim 10 (nu permite 11+). */
export function sanitizeRoPhoneInput(raw: string): string {
  return normalizeRoPhone(raw).slice(0, 10)
}
