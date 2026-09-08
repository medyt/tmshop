import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import '../../App.css'
import './AdminLayout.css'

type AdminLayoutProps = {
  title: string
  lead?: string
  children: ReactNode
  actions?: ReactNode
  /** Ascunde linkul „Panou admin” (ex. chiar pe pagina de start admin). */
  isHome?: boolean
  /** Nivel intermediar în breadcrumb (ex. Gestiune produse → Produs). */
  parent?: { to: string; label: string }
}

type NavItem = {
  to: string
  label: string
  icon: ReactNode
  /** Prefixe de rută care marchează elementul ca activ (pe lângă `to`). */
  match?: string[]
  end?: boolean
}

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10.5V20h14v-9.5" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 7h12l1 13H5z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8l8-4 8 4-8 4z" />
      <path d="M4 8v8l8 4 8-4V8" />
      <path d="M12 12v8" />
    </svg>
  ),
  awb: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h11v8H3z" />
      <path d="M14 11h4l3 3v2h-7" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </svg>
  ),
  reviews: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  ),
  returns: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  ),
  stats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  ),
  site: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 4H5v16h5" />
      <path d="M14 8l5 4-5 4M19 12H9" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
}

const NAV_MAIN: NavItem[] = [
  { to: '/admin', label: 'Panou', icon: ICONS.home, end: true },
  { to: '/admin/comenzi', label: 'Comenzi', icon: ICONS.orders },
  {
    to: '/admin/gestiune',
    label: 'Produse',
    icon: ICONS.products,
    match: ['/admin/produse'],
  },
  { to: '/admin/awb', label: 'AWB printare', icon: ICONS.awb },
  { to: '/admin/recenzii', label: 'Recenzii', icon: ICONS.reviews },
  { to: '/admin/retururi', label: 'Retururi', icon: ICONS.returns },
  {
    to: '/admin/statistici-lunare',
    label: 'Statistici lunare',
    icon: ICONS.stats,
    match: ['/admin/statistici'],
  },
]

export function AdminLayout({
  title,
  lead,
  children,
  actions,
  isHome = false,
  parent,
}: AdminLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const isActive = (item: NavItem): boolean => {
    const path = location.pathname
    if (item.end) return path === item.to
    if (path === item.to || path.startsWith(item.to + '/')) return true
    return (item.match ?? []).some((m) => path === m || path.startsWith(m + '/'))
  }

  return (
    <div className="admin-theme">
      <div className={`admin-frame${menuOpen ? ' admin-frame--menu-open' : ''}`}>
        <button
          type="button"
          className="admin-sidebar__backdrop"
          aria-label="Închide meniul"
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
        />
        <aside className="admin-sidebar" aria-label="Navigare admin">
          <Link to="/admin" className="admin-sidebar__brand" onClick={closeMenu}>
            <span className="admin-brand__mark">
              Shop<span>Top</span>
            </span>
            <span className="admin-brand__tag">Admin</span>
          </Link>

          <Link to="/admin/produse/nou" className="admin-sidebar__cta" onClick={closeMenu}>
            <span className="admin-sidebar__icon">{ICONS.plus}</span>
            Adaugă produs
          </Link>

          <nav className="admin-sidebar__nav">
            <span className="admin-sidebar__group">Magazin</span>
            {NAV_MAIN.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`admin-sidebar__link${isActive(item) ? ' admin-sidebar__link--active' : ''}`}
                aria-current={isActive(item) ? 'page' : undefined}
                onClick={closeMenu}
              >
                <span className="admin-sidebar__icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="admin-sidebar__footer">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-sidebar__link"
            >
              <span className="admin-sidebar__icon">{ICONS.site}</span>
              <span>Vezi site-ul ↗</span>
            </a>
            <button
              type="button"
              className="admin-sidebar__link admin-sidebar__link--btn"
              onClick={() => {
                void logout().then(() => navigate('/'))
              }}
            >
              <span className="admin-sidebar__icon">{ICONS.logout}</span>
              <span>Deconectare</span>
            </button>
            {user?.email ? (
              <span className="admin-sidebar__user" title={user.email}>
                {user.email}
              </span>
            ) : null}
          </div>
        </aside>

        <div className="admin-content">
          <div className="app admin-shell">
            <div className="admin-topbar__bar">
              <div className="admin-topbar__left">
                <button
                  type="button"
                  className="admin-menu-toggle"
                  aria-label="Deschide meniul"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
                <nav className="admin-breadcrumb admin-breadcrumb--bar" aria-label="Navigare">
                  <Link to="/admin">Panou admin</Link>
                  {parent ? (
                    <>
                      <span aria-hidden="true">/</span>
                      <Link to={parent.to}>{parent.label}</Link>
                    </>
                  ) : null}
                  {!isHome ? (
                    <>
                      <span aria-hidden="true">/</span>
                      <span className="admin-breadcrumb__current">{title}</span>
                    </>
                  ) : null}
                </nav>
              </div>
              <div className="admin-topbar__actions">{actions}</div>
            </div>
            <header className="admin-topbar">
              <div className="admin-topbar__head">
                <h1 className="admin-topbar__title">{title}</h1>
                {lead ? <p className="admin-topbar__lead">{lead}</p> : null}
              </div>
            </header>
            <main className="app-main">{children}</main>
          </div>
        </div>
      </div>
    </div>
  )
}
