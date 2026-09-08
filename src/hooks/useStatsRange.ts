import { useEffect, useMemo, useState } from 'react'
import {
  resolveStatsRange,
  type DateRangePreset,
  type ResolvedStatsRange,
} from '../lib/adminStats'

/** Starea filtrului de perioadă (preset + interval custom + „acum”). */
export type StatsRangeState = {
  range: ResolvedStatsRange
  preset: DateRangePreset
  now: Date
  applyRange: (next: {
    preset: DateRangePreset
    customStart: string
    customEnd: string
  }) => void
  onPresetChange: (value: DateRangePreset) => void
  setCustomBounds: (start: string, end: string) => void
}

/**
 * Filtrul de perioadă poate fi ținut de pagina părinte (ex. Panou admin, sus
 * de tot) și transmis dashboard-ului de statistici, sau creat intern de acesta.
 */
export function useStatsRange(): StatsRangeState {
  const [now, setNow] = useState(() => new Date())
  const [preset, setPreset] = useState<DateRangePreset>('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const range = useMemo(
    () => resolveStatsRange(preset, customStart, customEnd, now),
    [preset, customStart, customEnd, now],
  )

  return {
    range,
    preset,
    now,
    applyRange: (next) => {
      setPreset(next.preset)
      setCustomStart(next.customStart)
      setCustomEnd(next.customEnd)
    },
    onPresetChange: (value) => {
      if (value === 'custom') {
        setPreset('custom')
        setCustomStart(range.startKey)
        setCustomEnd(range.inclusiveEndKey)
        return
      }
      setPreset(value)
    },
    setCustomBounds: (start, end) => {
      setPreset('custom')
      setCustomStart(start)
      setCustomEnd(end)
    },
  }
}
