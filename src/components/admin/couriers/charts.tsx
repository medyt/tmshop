import type { ReactNode } from 'react'
import { COUNTY_TILES, toneForPct } from '../../../lib/countyTiles'

/* Grafice SVG simple, fără dependențe: donut, bară orizontală, coloane stivuite, hartă de județe (tile-uri). */

export type DonutSegment = { value: number; color: string; label: string }

export function Donut({
  segments,
  size = 148,
  thickness = 18,
  center,
}: {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  center?: ReactNode
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="ch-donut" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={thickness} />
        {total > 0
          ? segments.map((s, i) => {
              const frac = Math.max(0, s.value) / total
              const len = frac * c
              const el = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                >
                  <title>
                    {s.label}: {s.value}
                  </title>
                </circle>
              )
              offset += len
              return el
            })
          : null}
      </svg>
      {center ? <div className="ch-donut__center">{center}</div> : null}
    </div>
  )
}

export function Legend({ items }: { items: Array<{ color: string; label: string; value?: string }> }) {
  return (
    <ul className="ch-legend">
      {items.map((it, i) => (
        <li key={i}>
          <span className="ch-legend__swatch" style={{ background: it.color }} />
          <span className="ch-legend__label">{it.label}</span>
          {it.value !== undefined ? <strong className="ch-legend__value">{it.value}</strong> : null}
        </li>
      ))}
    </ul>
  )
}

/** Bară orizontală 0–100 cu etichetă și valoare. */
export function HBar({
  label,
  value,
  color,
  sub,
  max = 100,
  format = (v) => `${v.toFixed(v % 1 === 0 ? 0 : 1)}%`,
}: {
  label: ReactNode
  value: number | null
  color: string
  sub?: ReactNode
  max?: number
  format?: (v: number) => string
}) {
  const w = value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="ch-hbar">
      <div className="ch-hbar__head">
        <span className="ch-hbar__label">{label}</span>
        <strong className="ch-hbar__value">{value === null ? '—' : format(value)}</strong>
      </div>
      <div className="ch-hbar__track">
        <div className="ch-hbar__fill" style={{ width: `${w}%`, background: color }} />
      </div>
      {sub ? <div className="ch-hbar__sub">{sub}</div> : null}
    </div>
  )
}

/** Bară segmentată (distribuție), segmentele proporționale cu valorile. */
export function SegmentBar({ segments, height = 12 }: { segments: DonutSegment[]; height?: number }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0)
  return (
    <div className="ch-segbar" style={{ height }}>
      {total > 0
        ? segments.map((s, i) =>
            s.value > 0 ? (
              <div key={i} className="ch-segbar__seg" style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.value}`} />
            ) : null,
          )
        : null}
    </div>
  )
}

export type StackedDay = { label: string; title?: string; parts: Array<{ value: number; color: string; label: string }> }

/** Coloane stivuite pe zile (înălțimea = numărul de AWB-uri). */
export function StackedColumns({ days, height = 150 }: { days: StackedDay[]; height?: number }) {
  const max = Math.max(1, ...days.map((d) => d.parts.reduce((s, p) => s + p.value, 0)))
  const w = Math.max(320, days.length * 18)
  const colW = w / Math.max(1, days.length)
  const bar = Math.max(4, colW - 4)
  const labelEvery = days.length > 20 ? Math.ceil(days.length / 10) : days.length > 10 ? 2 : 1
  return (
    <div className="ch-columns">
      <svg viewBox={`0 0 ${w} ${height + 22}`} width="100%" height={height + 22} preserveAspectRatio="none" role="img" aria-label="AWB-uri pe zile">
        {days.map((d, i) => {
          const total = d.parts.reduce((s, p) => s + p.value, 0)
          let y = height
          return (
            <g key={i}>
              <title>
                {d.title ?? d.label}: {total} AWB · {d.parts.filter((p) => p.value > 0).map((p) => `${p.label} ${p.value}`).join(', ')}
              </title>
              {d.parts.map((p, j) => {
                const h = (p.value / max) * height
                y -= h
                return p.value > 0 ? <rect key={j} x={i * colW + 2} y={y} width={bar} height={h} fill={p.color} rx={1} /> : null
              })}
              {i % labelEvery === 0 ? (
                <text x={i * colW + 2 + bar / 2} y={height + 16} textAnchor="middle" fontSize="10" fill="var(--muted)">
                  {d.label}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function CountyTiles({
  values,
  names,
  selected,
  onSelect,
  invert = false,
  format = (v) => `${v.toFixed(0)}%`,
}: {
  values: Record<string, { value: number | null; n: number }>
  names: Record<string, string>
  selected?: string | null
  onSelect?: (code: string) => void
  invert?: boolean
  format?: (v: number) => string
}) {
  return (
    <div className="ch-tiles" role="list">
      {Object.entries(COUNTY_TILES).map(([code, [col, row]]) => {
        const v = values[code]
        const tone = v && v.n > 0 ? toneForPct(v.value, invert) : 'none'
        return (
          <button
            key={code}
            type="button"
            role="listitem"
            className={`ch-tile ch-tile--${tone}${selected === code ? ' ch-tile--selected' : ''}`}
            style={{ gridColumn: col + 1, gridRow: row + 1 }}
            title={`${names[code] ?? code}${v && v.n > 0 ? ` · ${v.n} AWB · ${v.value === null ? 'fără date' : format(v.value)}` : ' · fără expedieri'}`}
            onClick={() => onSelect?.(code)}
          >
            <span className="ch-tile__code">{code}</span>
            <span className="ch-tile__value">{v && v.n > 0 ? (v.value === null ? '?' : format(v.value)) : ''}</span>
          </button>
        )
      })}
    </div>
  )
}
