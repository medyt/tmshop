import { useEffect, useRef, useState } from 'react'
import {
  MONTHS_RO,
  RANGE_PRESETS,
  WEEKDAYS_RO,
  addDays,
  addMonths,
  formatRange,
  parseIsoDate,
  startOfMonth,
  toIsoDate,
  type DateRange,
} from '../../../lib/dateRange'

type Draft = { from: string | null; to: string | null }

function MonthGrid({
  month,
  draft,
  hover,
  onPick,
  onHover,
}: {
  month: Date
  draft: Draft
  hover: string | null
  onPick: (iso: string) => void
  onHover: (iso: string | null) => void
}) {
  const first = startOfMonth(month)
  const offset = (first.getDay() + 6) % 7 // luni = 0
  const daysInMonth = addDays(addMonths(first, 1), -1).getDate()
  const today = toIsoDate(new Date())
  const cells: Array<string | null> = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toIsoDate(new Date(first.getFullYear(), first.getMonth(), d)))
  while (cells.length % 7 !== 0) cells.push(null)

  // Intervalul afișat: cel ales, sau previzualizarea de la primul click până la mouse.
  let lo = draft.from
  let hi = draft.to
  if (draft.from && !draft.to && hover) {
    lo = hover < draft.from ? hover : draft.from
    hi = hover < draft.from ? draft.from : hover
  }

  return (
    <div className="drp-month">
      <div className="drp-month__title">
        {MONTHS_RO[first.getMonth()]} {first.getFullYear()}
      </div>
      <div className="drp-grid">
        {WEEKDAYS_RO.map((w) => (
          <span key={w} className="drp-weekday">
            {w}
          </span>
        ))}
        {cells.map((iso, i) =>
          iso === null ? (
            <span key={`e${i}`} />
          ) : (
            <button
              key={iso}
              type="button"
              className={[
                'drp-day',
                lo && hi && iso >= lo && iso <= hi ? 'drp-day--in' : '',
                iso === draft.from || iso === draft.to ? 'drp-day--edge' : '',
                iso === today ? 'drp-day--today' : '',
                iso > today ? 'drp-day--future' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onPick(iso)}
              onMouseEnter={() => onHover(iso)}
              onMouseLeave={() => onHover(null)}
            >
              {parseIsoDate(iso).getDate()}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>({ from: value.from, to: value.to })
  const [hover, setHover] = useState<string | null>(null)
  const [view, setView] = useState<Date>(() => addMonths(startOfMonth(parseIsoDate(value.to)), -1))
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (!open) {
      setDraft({ from: value.from, to: value.to })
      setView(addMonths(startOfMonth(parseIsoDate(value.to)), -1))
    }
    setOpen((o) => !o)
  }

  function pick(iso: string) {
    if (!draft.from || draft.to) {
      setDraft({ from: iso, to: null })
      return
    }
    if (iso < draft.from) setDraft({ from: iso, to: draft.from })
    else setDraft({ from: draft.from, to: iso })
  }

  function apply() {
    if (!draft.from) return
    onChange({ from: draft.from, to: draft.to ?? draft.from })
    setOpen(false)
  }

  function applyPreset(range: DateRange) {
    setDraft({ from: range.from, to: range.to })
    setView(addMonths(startOfMonth(parseIsoDate(range.to)), -1))
  }

  const activePreset = RANGE_PRESETS.find((p) => {
    const r = p.range()
    return r.from === draft.from && r.to === draft.to
  })

  return (
    <div className="drp" ref={rootRef}>
      <button type="button" className={`drp-trigger${open ? ' drp-trigger--open' : ''}`} onClick={toggle} aria-haspopup="dialog" aria-expanded={open}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span>{formatRange(value)}</span>
      </button>
      {open ? (
        <div className="drp-pop" role="dialog" aria-label="Alege perioada">
          <ul className="drp-presets">
            {RANGE_PRESETS.map((p) => (
              <li key={p.id}>
                <button type="button" className={`drp-preset${activePreset?.id === p.id ? ' drp-preset--active' : ''}`} onClick={() => applyPreset(p.range())}>
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="drp-cal">
            <div className="drp-cal__nav">
              <button type="button" className="drp-nav" onClick={() => setView((v) => addMonths(v, -1))} aria-label="Luna anterioară">
                ‹
              </button>
              <button type="button" className="drp-nav" onClick={() => setView((v) => addMonths(v, 1))} aria-label="Luna următoare">
                ›
              </button>
            </div>
            <div className="drp-months">
              <MonthGrid month={view} draft={draft} hover={hover} onPick={pick} onHover={setHover} />
              <MonthGrid month={addMonths(view, 1)} draft={draft} hover={hover} onPick={pick} onHover={setHover} />
            </div>
            <div className="drp-foot">
              <span className="muted small">
                {!draft.from ? 'Alege data de început' : !draft.to ? 'Alege data de sfârșit' : formatRange({ from: draft.from, to: draft.to })}
              </span>
              <span className="drp-foot__actions">
                <button type="button" className="btn secondary" onClick={() => setDraft({ from: null, to: null })}>
                  Șterge
                </button>
                <button type="button" className="btn primary" disabled={!draft.from} onClick={apply}>
                  Aplică
                </button>
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
