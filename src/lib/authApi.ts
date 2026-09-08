import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'
import type { User } from '../types/user'

function parseUser(value: unknown): User | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id : null
  const email = typeof record.email === 'string' ? record.email : null
  const role = record.role === 'admin' || record.role === 'customer' ? record.role : null
  if (!id || !email || !role) return null
  return { id, email, role }
}

export function isAuthApiEnabled(): boolean {
  return isApiEnabled()
}

export async function fetchCurrentUser(): Promise<User | null> {
  const res = await apiFetch('/auth.php', {}, { credentials: 'include' })
  // Compat: vechiul API răspundea 401 când nu exista sesiune.
  if (res.status === 401) return null
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data: unknown = await res.json()
  if (data === null) return null
  return parseUser(data)
}

export async function loginUser(email: string, password: string): Promise<User> {
  const res = await apiFetch(
    '/auth.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'login', email, password }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const user = parseUser(await res.json())
  if (!user) {
    throw new Error('Raspuns invalid de la server.')
  }
  return user
}

export type RegisterResult = {
  user: User
  /** True dacă serverul a predat emailul de confirmare către client. */
  confirmationEmailSent: boolean
}

export async function registerUser(
  email: string,
  password: string,
): Promise<RegisterResult> {
  const res = await apiFetch(
    '/auth.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'register', email, password }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as Record<string, unknown>
  const user = parseUser(data)
  if (!user) {
    throw new Error('Raspuns invalid de la server.')
  }
  return {
    user,
    confirmationEmailSent: data.confirmationEmailSent === true,
  }
}

export async function logoutUser(): Promise<void> {
  const res = await apiFetch(
    '/auth.php',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'logout' }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
}
