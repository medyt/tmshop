import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import '../../App.css'

type AdminLayoutProps = {
  title: string
  lead?: string
  children: ReactNode
  actions?: ReactNode
}

export function AdminLayout({
  title,
  lead,
  children,
  actions,
}: AdminLayoutProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <div className="app admin-shell">
      <header className="app-header">
        <div className="app-header__titles">
          <h1>{title}</h1>
          {lead ? <p className="muted">{lead}</p> : null}
          <p className="gestiune-subnav muted">
            <Link to="/admin">← Panou admin</Link>
            <span aria-hidden> · </span>
            <Link to="/">Magazin</Link>
          </p>
        </div>
        <div className="app-header__actions">
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
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}
