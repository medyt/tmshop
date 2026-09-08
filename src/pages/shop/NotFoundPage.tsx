import { Navigate } from 'react-router-dom'

/** Orice rută / produs inexistent → catalog (evită dead-end 404). */
export function NotFoundPage() {
  return <Navigate to="/#catalog" replace />
}
