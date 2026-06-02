import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { SHOP_INFO_ROUTES } from '../../lib/siteLegal'
import { ShopAnnouncementBar } from './ShopAnnouncementBar'
import { ShopLogo } from './ShopLogo'

export function ShopHeader() {
  const { itemCount } = useCart()
  const { user, loading, isAdmin, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.hash])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `shop-nav__link${isActive ? ' shop-nav__link--active' : ''}`

  return (
    <header className="shop-header">
      <ShopAnnouncementBar />
      <div className="shop-header__inner">
        <Link to="/" className="shop-logo" aria-label="ShopTop, pagina principală">
          <ShopLogo />
        </Link>
        <button
          type="button"
          className="shop-nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="shop-primary-nav"
          aria-label={menuOpen ? 'Închide meniul' : 'Deschide meniul'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="shop-nav-toggle__bar" aria-hidden="true" />
          <span className="shop-nav-toggle__bar" aria-hidden="true" />
          <span className="shop-nav-toggle__bar" aria-hidden="true" />
        </button>
        <nav
          id="shop-primary-nav"
          className={`shop-nav${menuOpen ? ' shop-nav--open' : ''}`}
          aria-label="Principal"
        >
          <a className="shop-nav__link" href="/#catalog">
            Catalog
          </a>
          {!loading && isAdmin ? (
            <NavLink className={linkClass} to="/admin">
              Admin
            </NavLink>
          ) : null}
          <NavLink className={linkClass} to="/cos">
            Coș{itemCount > 0 ? ` (${itemCount})` : ''}
          </NavLink>
          {!loading && user ? (
            <NavLink className={linkClass} to={SHOP_INFO_ROUTES.orders}>
              Comenzile mele
            </NavLink>
          ) : null}
          {loading ? null : user ? (
            <button
              type="button"
              className="shop-nav__link shop-nav__button"
              onClick={() => void logout()}
            >
              Deconectare
            </button>
          ) : (
            <>
              <Link className="shop-nav__link" to="/conectare">
                Conectare
              </Link>
              <Link className="shop-nav__link" to="/inregistrare">
                Înregistrare
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
