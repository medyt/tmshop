import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type AdminRouteProps = {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <p className="app-status muted" role="status">
        Se verifică accesul la admin…
      </p>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/conectare" replace state={{ from: location.pathname }} />
  }

  return children
}
