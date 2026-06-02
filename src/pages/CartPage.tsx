import { Link } from 'react-router-dom'
import { ProductImage } from '../components/ProductImage'
import { ShopLayout } from '../components/shop/ShopLayout'
import { useCart } from '../contexts/CartContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { primaryImageUrl } from '../lib/productImages'
import { ShopProductPrice } from '../components/shop/ShopProductPrice'
import { formatRon } from '../lib/shopCatalog'
import { productPagePath } from '../lib/shopProductRoutes'
import {
  orderTotal,
  shippingCost,
  shippingSummaryLabel,
} from '../lib/shopShipping'
import { SITE_LEGAL } from '../lib/siteLegal'

export function CartPage() {
  const { lines, subtotal, setQuantity, removeProduct } = useCart()
  const shipping = shippingCost(subtotal)
  const total = orderTotal(subtotal)

  usePageMeta({
    title: `Coș — ${SITE_LEGAL.brandName}`,
    description: 'Verifică produsele din coș înainte de finalizarea comenzii.',
    path: '/cos',
    robots: 'noindex, nofollow',
  })

  return (
    <ShopLayout>
      <section className="shop-page">
        <div className="shop-page__head">
          <h1 className="shop-page__title">Coșul tău</h1>
          <p className="shop-page__lead muted">
            {lines.length > 0
              ? `${lines.length} ${lines.length === 1 ? 'produs' : 'produse'} în coș. Verifică cantitățile înainte de finalizare.`
              : 'Verifică produsele și cantitățile înainte de finalizare.'}
          </p>
        </div>

        {lines.length === 0 ? (
          <div className="shop-empty-panel">
            <p className="muted">Coșul este gol.</p>
            <Link className="shop-btn shop-btn--primary" to="/">
              Înapoi la catalog
            </Link>
          </div>
        ) : (
          <div className="shop-cart">
            <ul className="shop-cart__list">
              {lines.map((line) => (
                <li key={line.product.id} className="shop-cart__item">
                  <Link
                    className="shop-cart__media"
                    to={productPagePath(line.product)}
                    aria-label={`Vezi ${line.product.name || 'produsul'}`}
                  >
                    <ProductImage
                      src={primaryImageUrl(line.product)}
                      urls={line.product.imageUrls}
                      alt={line.product.name || 'Produs'}
                      className="shop-cart__img"
                      placeholderClassName="shop-cart__placeholder"
                    />
                  </Link>

                  <div className="shop-cart__body">
                    <div className="shop-cart__top">
                      <div className="shop-cart__intro">
                        <h2 className="shop-cart__name">
                          <Link
                            className="shop-cart__name-link"
                            to={productPagePath(line.product)}
                          >
                            {line.product.name || 'Fără nume'}
                          </Link>
                        </h2>
                        {line.product.sku ? (
                          <p className="shop-cart__sku muted">
                            SKU {line.product.sku}
                          </p>
                        ) : null}
                        <div className="shop-cart__unit">
                          <ShopProductPrice product={line.product} />
                          <span className="muted"> / buc.</span>
                        </div>
                      </div>

                      <p className="shop-cart__line-total">
                        {formatRon(line.product.salePrice * line.quantity)}
                      </p>
                    </div>

                    <div className="shop-cart__footer">
                      <div className="shop-qty">
                        <span className="shop-qty__label muted">Cantitate</span>
                        <div className="shop-qty__row">
                          <button
                            type="button"
                            className="shop-qty__btn"
                            aria-label="Scade cantitatea"
                            onClick={() =>
                              setQuantity(line.product.id, line.quantity - 1)
                            }
                          >
                            −
                          </button>
                          <input
                            id={`qty-${line.product.id}`}
                            className="shop-qty__input"
                            type="number"
                            min={1}
                            max={line.product.stockQty ?? 1}
                            value={line.quantity}
                            onChange={(event) =>
                              setQuantity(
                                line.product.id,
                                Number(event.target.value),
                              )
                            }
                            aria-label={`Cantitate pentru ${line.product.name || 'produs'}`}
                          />
                          <button
                            type="button"
                            className="shop-qty__btn"
                            aria-label="Crește cantitatea"
                            onClick={() =>
                              setQuantity(line.product.id, line.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="shop-cart__remove"
                        onClick={() => removeProduct(line.product.id)}
                      >
                        Elimină
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="shop-summary">
              <h2 className="shop-summary__title">Sumar comandă</h2>
              <div className="shop-summary__row">
                <span>Subtotal</span>
                <strong>{formatRon(subtotal)}</strong>
              </div>
              <div className="shop-summary__row">
                <span>Transport</span>
                <strong>{shipping <= 0 ? 'Gratuit' : formatRon(shipping)}</strong>
              </div>
              <div className="shop-summary__row shop-summary__row--total">
                <span>Total</span>
                <strong>{formatRon(total)}</strong>
              </div>
              <p className="shop-summary__note muted">
                {shippingSummaryLabel(subtotal)}. Plata se face la livrare.
              </p>
              <div className="shop-summary__actions">
                <Link className="shop-btn shop-btn--primary shop-btn--block" to="/checkout">
                  Continuă spre checkout
                </Link>
                <Link className="shop-btn shop-btn--ghost shop-btn--block" to="/">
                  Continuă cumpărăturile
                </Link>
              </div>
            </aside>
          </div>
        )}
      </section>
    </ShopLayout>
  )
}
