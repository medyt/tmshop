function readApiBaseFromEnv(): string {
  const url = import.meta.env.VITE_API_URL?.trim() ?? ''
  if (url !== '') return url
  // Fallback: typo frecvent în .env (URI în loc de URL) — Vite nu definește VITE_API_URI implicit.
  const uriTypo = (import.meta.env as Record<string, string | undefined>)
    .VITE_API_URI
  return typeof uriTypo === 'string' ? uriTypo.trim() : ''
}

const rawBase = readApiBaseFromEnv()
const API_BASE = rawBase.replace(/\/$/, '')

export function isApiEnabled(): boolean {
  return API_BASE.length > 0
}

export function getApiBase(): string {
  return API_BASE
}

export async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text()
  if (!text.trim()) {
    return `Cererea a esuat (${res.status}).`
  }

  try {
    const data = JSON.parse(text) as { error?: unknown }
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error
    }
  } catch {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 180)
    const looksLikeHtml =
      snippet.startsWith('<') ||
      /<!DOCTYPE|<html[\s>]/i.test(text.slice(0, 400))
    if (looksLikeHtml) {
      if (res.status === 503) {
        return 'Serverul API este temporar indisponibil (503). De obicei e limită de resurse pe hosting (LiteSpeed) la încărcarea listelor mari de comenzi — reîncearcă peste câteva secunde.'
      }
      return 'Serverul a returnat un raspuns invalid (probabil HTML, nu JSON). Verifică calea către API-ul PHP (/shoptop-api), că VITE_API_URL e setat corect, și logurile de pe server.'
    }
    return snippet || `Cererea a esuat (${res.status}).`
  }

  return `Cererea a esuat (${res.status}).`
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  options: { credentials?: RequestCredentials } = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: options.credentials ?? 'same-origin',
  })
}
