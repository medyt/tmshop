import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ProductImage } from '../components/ProductImage'
import { ShopBestSellers } from '../components/shop/ShopBestSellers'
import { ShopLayout } from '../components/shop/ShopLayout'
import { ShopProductPrice } from '../components/shop/ShopProductPrice'
import { ShopTrustBar } from '../components/shop/ShopTrustBar'
import { ShopStarRating } from '../components/shop/ShopStarRating'
import { useShopNotice } from '../components/shop/ShopNoticeProvider'
import { useCart } from '../contexts/CartContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { useProductRatings } from '../hooks/useProductRatings'
import { primaryImageUrl } from '../lib/productImages'
import { productPagePath } from '../lib/shopProductRoutes'
import {
  buildJsonLdGraph,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
} from '../lib/seo'
import {
  collectProductCategories,
  displayStock,
  isListedInShop,
  productCategoryLabel,
  shopQtyAvailableUnit,
  shopQtyUnit,
} from '../lib/shopCatalog'
import { SITE_LEGAL } from '../lib/siteLegal'
import type { Product } from '../types/product'

type ShopHomePageProps = {
  products: Product[]
}

type CatalogSort = 'name-asc' | 'price-asc' | 'price-desc' | 'discount-desc'

export function ShopHomePage({ products }: ShopHomePageProps) {
  const { addProduct } = useCart()
  const { notify } = useShopNotice()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<CatalogSort>('name-asc')

  const homeJsonLd = useMemo(
    () =>
      buildJsonLdGraph([buildOrganizationJsonLd(), buildWebsiteJsonLd()]),
    [],
  )

  usePageMeta({
    title: `${SITE_LEGAL.brandName} — magazin online`,
    description:
      'Magazin online cu produse în stoc, livrare prin curier și plată ramburs sau cu cardul în România.',
    path: '/',
    jsonLd: homeJsonLd,
  })

  const categories = useMemo(
    () => collectProductCategories(products),
    [products],
  )

  const listedProductIds = useMemo(
    () => products.filter(isListedInShop).map((product) => product.id),
    [products],
  )
  const ratings = useProductRatings(listedProductIds)

  const featured = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    let list = products.filter(isListedInShop)

    if (category !== 'all') {
      list = list.filter(
        (product) => productCategoryLabel(product) === category,
      )
    }

    if (normalizedQuery) {
      list = list.filter((product) => {
        const haystack = `${product.name} ${product.sku ?? ''}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    }

    const sorted = [...list]
    sorted.sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.salePrice - b.salePrice
        case 'price-desc':
          return b.salePrice - a.salePrice
        case 'discount-desc':
          return (b.discountPercent ?? 0) - (a.discountPercent ?? 0)
        default:
          return (a.name || '').localeCompare(b.name || '', 'ro')
      }
    })

    return sorted
  }, [category, products, query, sort])

  /** „Cele mai vândute”: până avem statistici reale din comenzi, afișăm produse listate cu procent de reducere mare și stoc bun. */
  const bestsellerProducts = useMemo(() => {
    const list = products.filter(isListedInShop)
    const sorted = [...list]
    sorted.sort((a, b) => {
      const d = (b.discountPercent ?? 0) - (a.discountPercent ?? 0)
      if (d !== 0) return d
      const s = (b.stockQty ?? 0) - (a.stockQty ?? 0)
      if (s !== 0) return s
      return (a.name || '').localeCompare(b.name || '', 'ro')
    })
    return sorted
  }, [products])

  const handleAddToCart = (product: Product) => {
    const result = addProduct(product)
    if (!result) {
      notify(
        'Produsul nu poate fi adăugat în coș (lipsește stoc sau nu este disponibil).',
        'Coș',
      )
      return
    }
    if (result.quantityIncreased) {
      notify(
        `${product.name || 'Produsul'} — ${result.quantityInCart} ${shopQtyUnit(product.name, result.quantityInCart)} în coș.`,
        'Adăugat în coș',
        { label: 'Vezi coșul', to: '/cos' },
      )
    } else {
      notify(
        `Ai deja în coș cantitatea maximă pentru acest produs (${result.maxStock} ${shopQtyAvailableUnit(product.name, result.maxStock)} în stoc).`,
        'Coș',
        { label: 'Vezi coșul', to: '/cos' },
      )
    }
  }

  return (
    <ShopLayout>
      <section className="shop-hero">
        <div className="shop-hero__inner">
          <h1 className="shop-hero__title">Produse în stoc, gata de comandă.</h1>
          <p className="shop-hero__lead">
            Alege din catalog, adaugă în coș și finalizează comanda cu livrare
            prin curier și plată ramburs sau cu cardul.
          </p>
          <div className="shop-hero__cta">
            <a className="shop-btn shop-btn--primary" href="#catalog">
              Vezi produsele
            </a>
          </div>
        </div>
      </section>

      <ShopTrustBar />

      <section
        id="catalog"
        className="shop-catalog"
        aria-labelledby="catalog-heading"
      >
        <div className="shop-catalog__badges">
          <span className="shop-catalog__pill shop-catalog__pill--accent">
            ✓ Stoc verificat
          </span>
          <span className="shop-catalog__pill">Livrare rapidă</span>
          <span className="shop-catalog__pill">Plată sigură</span>
          <span className="shop-catalog__pill">Oferte actualizate</span>
        </div>
        <div className="shop-catalog__head">
          <h2 id="catalog-heading" className="shop-catalog__title">
            Catalog
          </h2>
          <p className="shop-catalog__count muted">
            {featured.length} {featured.length === 1 ? 'produs' : 'produse'}
          </p>
        </div>

        <div className="shop-catalog__toolbar">
          <label className="shop-field shop-catalog__search">
            <span className="sr-only">Caută în catalog</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Caută după nume sau SKU"
            />
          </label>
          <label className="shop-field shop-catalog__filter">
            <span className="sr-only">Categorie</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">Toate categoriile</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="shop-field shop-catalog__filter">
            <span className="sr-only">Sortare</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as CatalogSort)}
            >
              <option value="name-asc">Nume A–Z</option>
              <option value="price-asc">Preț crescător</option>
              <option value="price-desc">Preț descrescător</option>
              <option value="discount-desc">Procent reducere (mare → mic)</option>
            </select>
          </label>
        </div>

        {featured.length === 0 ? (
          listedProductIds.length === 0 ? (
            <p className="shop-empty muted">
              Momentan nu avem produse disponibile online. Revino curând.
            </p>
          ) : (
            <div className="shop-empty">
              <p className="muted">
                Niciun produs nu corespunde căutării sau filtrelor selectate.
              </p>
              <button
                type="button"
                className="shop-btn shop-btn--ghost"
                onClick={() => {
                  setQuery('')
                  setCategory('all')
                  setSort('name-asc')
                }}
              >
                Resetează filtrele
              </button>
            </div>
          )
        ) : (
          <ul className="shop-grid">
            {featured.map((product) => {
              const rating = ratings.get(product.id)
              return (
              <li key={product.id} className="shop-card">
                <Link className="shop-card__media" to={productPagePath(product)}>
                  <ProductImage
                    src={primaryImageUrl(product)}
                    urls={product.imageUrls}
                    alt={product.name || 'Produs'}
                    className="shop-card__img"
                    placeholderClassName="shop-card__placeholder"
                  />
                </Link>

                <div className="shop-card__body">
                  <h3 className="shop-card__name">
                    <Link
                      className="shop-card__name-link"
                      to={productPagePath(product)}
                    >
                      {product.name || 'Fără nume'}
                    </Link>
                  </h3>

                  {product.sku ? (
                    <p className="shop-card__sku muted">SKU {product.sku}</p>
                  ) : null}

                  {rating ? (
                    <ShopStarRating
                      size="sm"
                      rating={rating.averageRating}
                      reviewCount={rating.reviewCount}
                    />
                  ) : null}

                  <p className="shop-card__hint muted">
                    În stoc: {displayStock(product)}{' '}
                    {shopQtyUnit(product.name, displayStock(product))}
                  </p>

                  <div className="shop-card__price-row">
                    <ShopProductPrice product={product} showDiscountBadge />
                  </div>

                  <button
                    type="button"
                    className="shop-btn shop-btn--primary shop-btn--block"
                    onClick={() => handleAddToCart(product)}
                  >
                    Adaugă în coș
                  </button>
                </div>
              </li>
              )
            })}
          </ul>
        )}
      </section>

      <ShopBestSellers
        products={bestsellerProducts}
        ratings={ratings}
        onAddToCart={handleAddToCart}
      />
    </ShopLayout>
  )
}
