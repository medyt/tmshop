import data from '../data/roLocalities.json'
import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'

export type RoCounty = {
  code: string
  name: string
  region?: string
}

export type RoLocality = {
  id: number
  name: string
  postCode?: string
  type?: string
}

type DpdNomenclature = {
  updatedAt?: string
  counties: RoCounty[]
  localitiesByCounty: Record<string, RoLocality[]>
  /** true = liste gata (județe); siteId se confirmă prin resolve DPD. */
  fromDpd: boolean
}

const localCounties = data.counties as RoCounty[]
const localLocalities = data.localitiesByCounty as Record<string, string[]>

let cachedNomenclature: DpdNomenclature | null = null
let loadPromise: Promise<DpdNomenclature> | null = null
const localityLoadPromises = new Map<string, Promise<RoLocality[]>>()
const resolveCache = new Map<string, RoLocality>()

function localNamesAsLocalities(countyCode: string): RoLocality[] {
  const key = countyCode.trim()
  const names =
    localLocalities[key] ?? localLocalities[key.toUpperCase()] ?? []
  return names.map((name, index) => ({
    // ID temporar negativ — înlocuit prin resolveDpdSite la selectare.
    id: -(index + 1),
    name,
    postCode: '',
    type: '',
  }))
}

function parseCounties(raw: unknown): RoCounty[] {
  if (!Array.isArray(raw)) return []
  const counties: RoCounty[] = []
  for (const c of raw) {
    if (!c || typeof c !== 'object') continue
    const code = String((c as RoCounty).code ?? '').trim()
    const name = String((c as RoCounty).name ?? '').trim()
    if (!code || !name) continue
    counties.push({
      code,
      name,
      region: String((c as RoCounty).region ?? name).trim(),
    })
  }
  return counties
}

function parseLocalities(raw: unknown): RoLocality[] {
  if (!Array.isArray(raw)) return []
  const parsed: RoLocality[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = Number(row.id)
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    if (!Number.isFinite(id) || id === 0 || name === '') continue
    parsed.push({
      id,
      name,
      postCode: typeof row.postCode === 'string' ? row.postCode.trim() : '',
      type: typeof row.type === 'string' ? row.type.trim() : '',
    })
  }
  return parsed
}

/**
 * Încarcă județele (API static/cache sau lista locală).
 * Localitățile din listă pot avea ID temporar; `resolveDpdSite` Confirmă ID-ul DPD.
 */
export async function loadDpdNomenclature(
  options: { force?: boolean } = {},
): Promise<DpdNomenclature> {
  if (!options.force && cachedNomenclature?.fromDpd) {
    return cachedNomenclature
  }
  if (!options.force && loadPromise) return loadPromise

  if (options.force) {
    cachedNomenclature = null
    loadPromise = null
    localityLoadPromises.clear()
    resolveCache.clear()
  }

  loadPromise = (async (): Promise<DpdNomenclature> => {
    const fallback: DpdNomenclature = {
      counties: localCounties.map((c) => ({
        ...c,
        region: c.region ?? c.name,
      })),
      localitiesByCounty: {},
      fromDpd: true,
    }

    if (!isApiEnabled()) {
      cachedNomenclature = fallback
      return fallback
    }

    try {
      const res = await apiFetch('/dpd_locations.php?action=counties', {
        cache: 'no-store',
      })
      if (!res.ok) {
        // Cont fără CSV / eroare — tot putem folosi județele locale + resolve.
        cachedNomenclature = fallback
        return fallback
      }
      const json = (await res.json()) as {
        updatedAt?: string
        counties?: unknown
      }
      const counties = parseCounties(json.counties)
      const nomen: DpdNomenclature = {
        updatedAt:
          typeof json.updatedAt === 'string' ? json.updatedAt : undefined,
        counties: counties.length > 0 ? counties : fallback.counties,
        localitiesByCounty: {},
        fromDpd: true,
      }
      cachedNomenclature = nomen
      return nomen
    } catch {
      cachedNomenclature = fallback
      return fallback
    } finally {
      loadPromise = null
    }
  })()

  return loadPromise
}

/**
 * Listează localitățile pentru județ.
 * Preferă cache CSV DPD; altfel numele din lista RO locală (ID temporar).
 */
export async function loadDpdLocalities(countyCode: string): Promise<RoLocality[]> {
  const key = countyCode.trim()
  if (!key) return []

  await loadDpdNomenclature()

  const cacheKey = key.toUpperCase()
  const existing =
    cachedNomenclature?.localitiesByCounty[key] ??
    cachedNomenclature?.localitiesByCounty[cacheKey]
  if (existing && existing.length > 0 && existing.some((l) => l.id > 0)) {
    return existing
  }

  const inflight = localityLoadPromises.get(cacheKey)
  if (inflight) return inflight

  const promise = (async (): Promise<RoLocality[]> => {
    let list: RoLocality[] = []
    if (isApiEnabled()) {
      try {
        const res = await apiFetch(
          `/dpd_locations.php?action=localities&county=${encodeURIComponent(cacheKey)}`,
          { cache: 'no-store' },
        )
        if (res.ok) {
          const json = (await res.json()) as { localities?: unknown }
          list = parseLocalities(json.localities).filter((l) => l.id > 0)
        }
      } catch {
        /* fallback local */
      }
    }
    if (list.length === 0) {
      list = localNamesAsLocalities(key)
    }
    if (!cachedNomenclature) {
      cachedNomenclature = {
        counties: localCounties,
        localitiesByCounty: {},
        fromDpd: true,
      }
    }
    cachedNomenclature.localitiesByCounty[cacheKey] = list
    cachedNomenclature.localitiesByCounty[key] = list
    return list
  })().finally(() => {
    localityLoadPromises.delete(cacheKey)
  })

  localityLoadPromises.set(cacheKey, promise)
  return promise
}

/**
 * Confirmă siteId real DPD pentru o localitate (obligatoriu înainte de comandă/AWB).
 */
export async function resolveDpdSite(
  countyCodeOrRegion: string,
  localityName: string,
): Promise<RoLocality> {
  const name = localityName.trim()
  const regionHint = countyCodeOrRegion.trim()
  if (!name) {
    throw new Error('Localitatea este obligatorie.')
  }

  const regionName =
    getRoCountyName(regionHint) !== regionHint
      ? getRoCountyName(regionHint)
      : regionHint

  const cacheKey = `${regionName.toLowerCase()}|${name.toLowerCase()}`
  const cached = resolveCache.get(cacheKey)
  if (cached && cached.id > 0) return cached

  if (!isApiEnabled()) {
    throw new Error('API-ul nu este configurat — nu pot valida localitatea în DPD.')
  }

  const params = new URLSearchParams({
    action: 'resolve',
    name,
    region: regionName,
  })
  const res = await apiFetch(`/dpd_locations.php?${params.toString()}`, {
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const json = (await res.json()) as {
    soft?: unknown
    locality?: {
      id?: unknown
      name?: unknown
      postCode?: unknown
      type?: unknown
    }
  }
  const loc = json.locality
  const id = Number(loc?.id)
  const resolvedName =
    typeof loc?.name === 'string' ? loc.name.trim() : name
  // soft: cont DPD fără Find Site — AWB folosește siteName
  if (json.soft === true || !Number.isFinite(id) || id <= 0) {
    const soft: RoLocality = {
      id: 0,
      name: resolvedName || name,
      postCode: typeof loc?.postCode === 'string' ? loc.postCode.trim() : '',
      type: typeof loc?.type === 'string' ? loc.type.trim() : '',
    }
    return soft
  }
  const resolved: RoLocality = {
    id,
    name: resolvedName,
    postCode: typeof loc?.postCode === 'string' ? loc.postCode.trim() : '',
    type: typeof loc?.type === 'string' ? loc.type.trim() : '',
  }
  resolveCache.set(cacheKey, resolved)
  return resolved
}

export function isDpdNomenclatureReady(): boolean {
  return cachedNomenclature?.fromDpd === true
}

export function getRoCounties(): RoCounty[] {
  return cachedNomenclature?.counties?.length
    ? cachedNomenclature.counties
    : localCounties
}

export function getRoLocalities(countyCode: string): RoLocality[] {
  if (!countyCode) return []
  const key = countyCode.trim()
  const fromCache =
    cachedNomenclature?.localitiesByCounty[key] ??
    cachedNomenclature?.localitiesByCounty[key.toUpperCase()]
  if (fromCache && fromCache.length > 0) return fromCache
  return localNamesAsLocalities(key)
}

export function getRoCountyName(countyCode: string): string {
  const counties = getRoCounties()
  return (
    counties.find(
      (c) =>
        c.code === countyCode ||
        c.code.toUpperCase() === countyCode.toUpperCase(),
    )?.name ?? countyCode
  )
}

export function resolveLocality(
  localities: RoLocality[],
  selectValue: string,
): RoLocality | undefined {
  const trimmed = selectValue.trim()
  if (!trimmed) return undefined

  const asId = Number(trimmed)
  if (Number.isFinite(asId) && asId !== 0) {
    const byId = localities.find((item) => item.id === asId)
    if (byId) return byId
  }

  return localities.find(
    (item) =>
      item.name === trimmed ||
      item.name.toLowerCase() === trimmed.toLowerCase(),
  )
}

/** Valoare <option>: preferă id real; altfel numele (ID temporar). */
export function localitySelectValue(loc: RoLocality): string {
  return loc.id > 0 ? String(loc.id) : loc.name
}

export function localitySelectKey(loc: RoLocality): string {
  return loc.id > 0 ? String(loc.id) : `name:${loc.name}`
}

export function hasValidDpdSiteId(siteId: number | undefined | null): boolean {
  return typeof siteId === 'number' && Number.isFinite(siteId) && siteId > 0
}
