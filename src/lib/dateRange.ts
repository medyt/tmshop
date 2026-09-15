/** Interval de date (inclusiv), în format ISO local `YYYY-MM-DD`. */
export type DateRange = { from: string; to: string }

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

export function formatRoDate(iso: string): string {
  const d = parseIsoDate(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

export function formatRange(r: DateRange): string {
  return r.from === r.to ? formatRoDate(r.from) : `${formatRoDate(r.from)} – ${formatRoDate(r.to)}`
}

export const MONTHS_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
]

export const WEEKDAYS_RO = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du']

export type RangePreset = { id: string; label: string; range: () => DateRange }

export const RANGE_PRESETS: RangePreset[] = [
  { id: 'today', label: 'Azi', range: () => ({ from: toIsoDate(new Date()), to: toIsoDate(new Date()) }) },
  { id: 'yesterday', label: 'Ieri', range: () => ({ from: toIsoDate(addDays(new Date(), -1)), to: toIsoDate(addDays(new Date(), -1)) }) },
  { id: 'last7', label: 'Ultimele 7 zile', range: () => ({ from: toIsoDate(addDays(new Date(), -6)), to: toIsoDate(new Date()) }) },
  { id: 'last30', label: 'Ultimele 30 zile', range: () => ({ from: toIsoDate(addDays(new Date(), -29)), to: toIsoDate(new Date()) }) },
  { id: 'month', label: 'Luna aceasta', range: () => ({ from: toIsoDate(startOfMonth(new Date())), to: toIsoDate(new Date()) }) },
  {
    id: 'prevMonth',
    label: 'Luna trecută',
    range: () => {
      const first = addMonths(startOfMonth(new Date()), -1)
      return { from: toIsoDate(first), to: toIsoDate(addDays(addMonths(first, 1), -1)) }
    },
  },
  { id: 'year', label: 'Anul acesta', range: () => ({ from: toIsoDate(new Date(new Date().getFullYear(), 0, 1)), to: toIsoDate(new Date()) }) },
]

export function defaultRange(): DateRange {
  return RANGE_PRESETS[3].range()
}

/** Numărul de zile din interval (inclusiv). */
export function rangeDays(r: DateRange): number {
  const a = parseIsoDate(r.from).getTime()
  const b = parseIsoDate(r.to).getTime()
  return Math.round((b - a) / 86_400_000) + 1
}
