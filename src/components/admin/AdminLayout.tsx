import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import '../../App.css'

type AdminLayoutProps = {
  title: string
  lead?: string
  children: ReactNode
  actions?: ReactNode
  /** Ascunde linkul „Panou admin” (ex. chiar pe pagina de start admin). */
  isHome?: boolean
}

export function AdminLayout({
  title,
  lead,
  children,
  actions,
  isHome = false,
}: AdminLayoutProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <div className="admin-theme">
      <div className="app admin-shell">
        <div className="admin-topbar__bar">
          <Link to="/admin" className="admin-brand" aria-label="Panou admin">
            <span className="admin-brand__mark">
              Shop<span>Top</span>
            </span>
            <span className="admin-brand__tag">Admin</span>
          </Link>
          <div className="admin-topbar__actions">
            <Link to="/" className="btn secondary">
              ← Înapoi la site
            </Link>
            {actions}
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                void logout().then(() => navigate('/'))
              }}
            >
              Deconectare
            </button>
          </div>
        </div>
        <header className="admin-topbar">
          <div className="admin-topbar__head">
            {!isHome ? (
              <nav className="admin-breadcrumb" aria-label="Navigare">
                <Link to="/admin">Panou admin</Link>
                <span aria-hidden="true">/</span>
                <span>{title}</span>
              </nav>
            ) : null}
            <h1 className="admin-topbar__title">{title}</h1>
            {lead ? <p className="admin-topbar__lead">{lead}</p> : null}
          </div>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
