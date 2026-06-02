const rawBase = import.meta.env.VITE_API_URL?.trim() ?? ''
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
    if (snippet.startsWith('<')) {
      return 'Serverul a returnat un raspuns invalid. Verifica API-ul PHP si logurile de pe server.'
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
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: options.credentials ?? 'same-origin',
  })
}
