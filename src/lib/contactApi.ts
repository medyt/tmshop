import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'

export type ContactMessageInput = {
  name: string
  email: string
  subject?: string
  message: string
}

export function isContactApiEnabled(): boolean {
  return isApiEnabled()
}

export async function submitContactMessage(
  input: ContactMessageInput,
): Promise<void> {
  const res = await apiFetch('/contact.php', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
}
