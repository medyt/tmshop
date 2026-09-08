/** Validare checksum CUI/CIF românesc (cu sau fără prefix RO). */
export function isValidRoCui(raw: string): boolean {
  let cui = raw.replace(/\s+/g, '').toUpperCase()
  if (cui.startsWith('RO')) cui = cui.slice(2)
  if (!/^\d{1,10}$/.test(cui)) return false
  cui = cui.replace(/^0+/, '')
  if (!cui || cui.length > 10) return false

  const control = Number(cui.slice(-1))
  const body = cui.slice(0, -1).padStart(9, '0')
  const weights = [7, 3, 1, 7, 3, 1, 7, 3, 1]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number(body[i]) * weights[i]
  }
  let mod = (sum * 10) % 11
  if (mod === 10) mod = 0
  return mod === control
}

export function normalizeRoCui(raw: string): string {
  let cui = raw.replace(/\s+/g, '').toUpperCase()
  if (cui.startsWith('RO')) cui = cui.slice(2)
  return cui.replace(/^0+/, '')
}
