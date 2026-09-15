/** Poziții (coloană, rând) aproximative ale județelor pe o hartă-cartogramă a României. */
export const COUNTY_TILES: Record<string, [number, number]> = {
  SM: [1, 0], MM: [2, 0], SV: [5, 0], BT: [6, 0],
  BH: [0, 1], SJ: [1, 1], BN: [3, 1], NT: [5, 1], IS: [6, 1],
  AR: [0, 2], CJ: [2, 2], MS: [3, 2], HR: [4, 2], BC: [5, 2], VS: [6, 2],
  TM: [0, 3], HD: [1, 3], AB: [2, 3], SB: [3, 3], BV: [4, 3], CV: [5, 3], VN: [6, 3], GL: [7, 3],
  CS: [0, 4], GJ: [1, 4], VL: [2, 4], AG: [3, 4], DB: [4, 4], PH: [5, 4], BZ: [6, 4], BR: [7, 4], TL: [8, 4],
  MH: [0, 5], DJ: [1, 5], OT: [2, 5], TR: [3, 5], IF: [5, 5], IL: [6, 5], CT: [8, 5],
  GR: [4, 6], B: [5, 6], CL: [6, 6],
}

/** Culoarea unui procent: ≥ 80 verde, 65–80 galben, < 65 roșu (inversat pentru rate „rele”, ex. retur). */
export function toneForPct(v: number | null, invert = false): 'good' | 'mid' | 'bad' | 'none' {
  if (v === null) return 'none'
  const x = invert ? 100 - v : v
  if (x >= 80) return 'good'
  if (x >= 65) return 'mid'
  return 'bad'
}
