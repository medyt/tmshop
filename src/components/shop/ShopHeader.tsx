import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { SHOP_INFO_ROUTES } from '../../lib/siteLegal'
import { ShopLogo } from './ShopLogo'

export function ShopHeader() {
  const { itemCount } = useCart()
  const { user, loading, isAdmin, logout } = useAuth()

  return (
    <header className="shop-header">
      <div className="shop-header__inner">
        <Link to="/" className="shop-logo" aria-label="ShopTop, pagina principală">
          <ShopLogo />
        </Link>
        <nav className="shop-nav" aria-label="Principal">
          <a className="shop-nav__link" href="/#catalog">
            Catalog
          </a>
          {!loading && isAdmin ? (
            <NavLink
              className={({ isActive }) =>
                `shop-nav__link${isActive ? ' shop-nav__link--active' : ''}`
              }
              to="/admin"
            >
              Admin
            </NavLink>
          ) : null}
          <NavLink
            className={({ isActive }) =>
              `shop-nav__link${isActive ? ' shop-nav__link--active' : ''}`
            }
            to="/cos"
          >
            Coș{itemCount > 0 ? ` (${itemCount})` : ''}
          </NavLink>
          {!loading && user ? (
            <NavLink
              className={({ isActive }) =>
                `shop-nav__link${isActive ? ' shop-nav__link--active' : ''}`
              }
              to={SHOP_INFO_ROUTES.orders}
            >
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
