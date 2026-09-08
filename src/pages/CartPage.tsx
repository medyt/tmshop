import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '../components/ProductImage'
import { FreeShippingHint } from '../components/shop/FreeShippingHint'
import { ProductCarousel } from '../components/shop/ProductCarousel'
import { ShopLayout } from '../components/shop/ShopLayout'
import { useShopNotice } from '../components/shop/ShopNoticeProvider'
import { useCart } from '../contexts/CartContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { useProducts } from '../hooks/useProducts'
import { primaryImageUrl } from '../lib/productImages'
import { ShopProductPrice } from '../components/shop/ShopProductPrice'
import { cartUpsellProducts } from '../lib/shopGrowth'
import { clientStockLimit, bundleUnitPrice, cartLineTotal, formatRon, isListedInShop, shopPerUnitLabel, shopQtyUnit } from '../lib/shopCatalog'
import { productPagePath } from '../lib/shopProductRoutes'
import {
  orderTotal,
  shippingCost,
  shippingSummaryLabel,
} from '../lib/shopShipping'
import { SITE_LEGAL } from '../lib/siteLegal'
import type { Product } from '../types/product'

export function CartPage() {
  const { lines, subtotal, setQuantity, removeProduct, addProduct } = useCart()
  const { products } = useProducts()
  const { notify } = useShopNotice()
  const upsell = useMemo(
    () =>
      cartUpsellProducts(
        lines.map((line) => line.product),
        products.filter(isListedInShop),
        3,
      ),
    [lines, products],
  )
  const shipping = shippingCost(subtotal)
  const total = orderTotal(subtotal)

  const handleAddUpsell = (item: Product) => {
    const result = addProduct(item, 1)
    if (!result) {
      notify(
        'Produsul nu poate fi adăugat în coș (lipsește stoc sau nu este disponibil).',
        'Coș',
      )
      return
    }
    notify(
        `${item.name || 'Produsul'} — ${result.quantityInCart} ${shopQtyUnit(item.name, result.quantityInCart)} în coș.`,
      'Adăugat în coș',
    )
  }

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
              {lines.map((line) => {
                const maxStock = clientStockLimit(line.product)
                const atMax = line.quantity >= maxStock

                const bumpQty = (delta: number) => {
                  const next = line.quantity + delta
                  if (delta > 0 && next > maxStock) {
                    notify(
                      maxStock <= 0
                        ? 'Produsul nu mai este în stoc.'
                        : `Stoc disponibil: ${maxStock} ${shopQtyUnit(line.product.name, maxStock)}. Nu poți crește cantitatea.`,
                      'Cantitate',
                    )
                    return
                  }
                  if (next < 1) return
                  setQuantity(line.product.id, next)
                }

                const handleQtyInput = (raw: number) => {
                  if (!Number.isFinite(raw)) return
                  if (raw > maxStock) {
                    notify(
                      `Stoc disponibil: ${maxStock} ${shopQtyUnit(line.product.name, maxStock)}. Cantitatea a fost ajustată.`,
                      'Cantitate',
                    )
                  }
                  setQuantity(line.product.id, raw)
                }

                return (
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
                          {bundleUnitPrice(line.product, line.quantity) !== null ? (
                            <>
                              <strong>
                                {formatRon(bundleUnitPrice(line.product, line.quantity)!)}
                              </strong>
                              <span className="muted"> {shopPerUnitLabel(line.product.name)} (bundle)</span>
                            </>
                          ) : (
                            <>
                              <ShopProductPrice product={line.product} />
                              <span className="muted"> {shopPerUnitLabel(line.product.name)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="shop-cart__line-total">
                        {formatRon(cartLineTotal(line.product, line.quantity))}
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
                            disabled={line.quantity <= 1}
                            onClick={() => bumpQty(-1)}
                          >
                            <svg
                              className="shop-qty__icon"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                d="M6 12h12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.6"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                          <input
                            id={`qty-${line.product.id}`}
                            className="shop-qty__input"
                            type="number"
                            min={1}
                            max={Math.max(1, maxStock)}
                            value={line.quantity}
                            onChange={(event) =>
                              handleQtyInput(Number(event.target.value))
                            }
                            aria-label={`Cantitate pentru ${line.product.name || 'produs'}`}
                          />
                          <button
                            type="button"
                            className="shop-qty__btn"
                            aria-label="Crește cantitatea"
                            disabled={atMax}
                            onClick={() => bumpQty(1)}
                          >
                            <svg
                              className="shop-qty__icon"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                d="M12 6v12M6 12h12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.6"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                        <p className="shop-cart__stock-hint muted">
                          Stoc disponibil: {maxStock}{' '}
                          {shopQtyUnit(line.product.name, maxStock)}
                          {atMax ? ' — cantitate maximă în coș.' : ''}
                        </p>
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
                )
              })}
            </ul>

            <aside className="shop-summary">
              <h2 className="shop-summary__title">Sumar comandă</h2>
              <FreeShippingHint subtotal={subtotal} />
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
                {shippingSummaryLabel(subtotal)}. Plata se face la livrare sau cu cardul.
              </p>
              <div className="shop-summary__actions">
                <Link className="shop-btn shop-btn--primary shop-btn--block" to="/checkout">
                  Finalizează comanda
                </Link>
                <Link className="shop-btn shop-btn--ghost shop-btn--block" to="/">
                  Continuă cumpărăturile
                </Link>
              </div>
            </aside>
          </div>
        )}

        {lines.length > 0 && upsell.length > 0 ? (
          <section
            className="shop-cart__upsell"
            aria-labelledby="cart-upsell-heading"
          >
            <h2 id="cart-upsell-heading" className="shop-cart__upsell-title">
              Completează comanda
            </h2>
            <p className="muted shop-cart__upsell-lead">
              Clienții mai adaugă și aceste produse.
            </p>
            <ProductCarousel
              products={upsell}
              onAddToCart={handleAddUpsell}
              ariaLabel="Produse recomandate pentru coș"
            />
          </section>
        ) : null}
      </section>
    </ShopLayout>
  )
}
