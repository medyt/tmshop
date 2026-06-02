import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { ProductImage } from '../../components/ProductImage'
import { ShopLayout } from '../../components/shop/ShopLayout'
import { ShopProductPrice } from '../../components/shop/ShopProductPrice'
import {
  ShopStarRating,
  ShopStarRatingInput,
} from '../../components/shop/ShopStarRating'
import { useShopNotice } from '../../components/shop/ShopNoticeProvider'
import { useCart } from '../../contexts/CartContext'
import { getShopProductPageContent } from '../../data/shopProductContent'
import { usePageMeta } from '../../hooks/usePageMeta'
import { trackAddToCart } from '../../lib/analytics'
import { primaryImageUrl, normalizeImageUrl } from '../../lib/productImages'
import { findListedProduct, productPagePath } from '../../lib/shopProductRoutes'
import { availableStock, isListedInShop } from '../../lib/shopCatalog'
import {
  fetchProductReviews,
  relatedProducts,
  reviewAverage,
  submitProductReview,
  type ProductReview,
} from '../../lib/shopGrowth'
import { SITE_LEGAL } from '../../lib/siteLegal'
import {
  absoluteAssetUrl,
  buildBreadcrumbJsonLd,
  buildJsonLdGraph,
  buildProductJsonLd,
  productMetaDescription,
} from '../../lib/seo'
import type { Product } from '../../types/product'

import '../ShopHome.css'

type ProductPageProps = {
  products: Product[]
}

export function ProductPage({ products }: ProductPageProps) {
  const { productId = '' } = useParams()
  const { addProduct } = useCart()
  const { notify } = useShopNotice()
  const product = findListedProduct(products, productId)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewAuthor, setReviewAuthor] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')
  const [reviewMessage, setReviewMessage] = useState<string | null>(null)
  const listedProduct =
    product && isListedInShop(product) ? product : null
  const productContent = useMemo(
    () => (listedProduct ? getShopProductPageContent(listedProduct) : null),
    [listedProduct],
  )
  const productPath = listedProduct ? productPagePath(listedProduct) : undefined
  const productImage = listedProduct
    ? absoluteAssetUrl(primaryImageUrl(listedProduct))
    : undefined
  const averageRating = reviewAverage(reviews)
  const productDescription = listedProduct
    ? productMetaDescription({
        name: listedProduct.name,
        lead: productContent?.lead,
        priceRon: listedProduct.salePrice,
      })
    : undefined
  const productJsonLd = useMemo(() => {
    if (!listedProduct || !productContent || !productPath) return undefined
    const description = productMetaDescription({
      name: listedProduct.name,
      lead: productContent.lead,
      priceRon: listedProduct.salePrice,
    })
    return buildJsonLdGraph([
      buildBreadcrumbJsonLd([
        { name: 'Acasă', path: '/' },
        { name: 'Catalog', path: '/#catalog' },
        { name: listedProduct.name, path: productPath },
      ]),
      buildProductJsonLd({
        name: listedProduct.name,
        description,
        path: productPath,
        image: productImage,
        sku: listedProduct.sku,
        priceRon: listedProduct.salePrice,
        inStock: availableStock(listedProduct) > 0,
        averageRating,
        reviewCount: reviews.length,
      }),
    ])
  }, [
    averageRating,
    listedProduct,
    productContent,
    productImage,
    productPath,
    reviews.length,
  ])

  usePageMeta({
    title: listedProduct
      ? `${listedProduct.name} | ${SITE_LEGAL.brandName}`
      : `Produs — ${SITE_LEGAL.brandName}`,
    description: productDescription,
    path: productPath,
    image: productImage,
    type: listedProduct ? 'product' : 'website',
    jsonLd: productJsonLd,
  })

  useEffect(() => {
    if (!listedProduct) return
    let cancelled = false
    void fetchProductReviews(listedProduct.id).then((loaded) => {
      if (!cancelled) setReviews(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [listedProduct])

  if (!product) {
    return <Navigate to="/" replace />
  }

  if (!isListedInShop(product)) {
    return <Navigate to="/" replace />
  }

  if (!productContent) {
    return <Navigate to="/" replace />
  }

  const content = productContent
  const stock = listedProduct ? availableStock(listedProduct) : 0
  const galleryUrls = listedProduct
    ? listedProduct.imageUrls.filter((url) => url.trim().length > 0)
    : []
  const heroImage = listedProduct
    ? selectedImage ?? primaryImageUrl(listedProduct)
    : ''
  const activeImage = heroImage ? normalizeImageUrl(heroImage) : ''
  const similar = listedProduct
    ? relatedProducts(listedProduct, products.filter(isListedInShop))
    : []

  const handleAddToCart = () => {
    addProduct(product)
    trackAddToCart(product.id, 1)
    notify(`${product.name || 'Produsul'} a fost adăugat în coș.`, 'Adăugat în coș')
  }

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReviewMessage(null)
    try {
      await submitProductReview({
        productId: product.id,
        authorName: reviewAuthor.trim(),
        rating: reviewRating,
        body: reviewBody.trim(),
      })
      setReviewAuthor('')
      setReviewBody('')
      setReviewRating(5)
      setReviewMessage(
        'Recenzia a fost trimisă și va apărea după aprobare.',
      )
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Nu am putut trimite recenzia.'
      setReviewMessage(message)
    }
  }

  return (
    <ShopLayout>
      <div className="shop-product">
        <nav className="shop-product__breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Acasă</Link>
          <span aria-hidden="true">/</span>
          <Link to="/#catalog">Catalog</Link>
          <span aria-hidden="true">/</span>
          <span>{product.name || 'Produs'}</span>
        </nav>

        <div className="shop-product__hero">
          <div className="shop-product__gallery">
            <div className="shop-product__main-media">
              <ProductImage
                src={heroImage}
                alt={product.name || 'Produs'}
                className="shop-product__main-img"
                placeholderClassName="shop-product__placeholder"
                loading="eager"
              />
            </div>
            {galleryUrls.length > 1 ? (
              <ul className="shop-product__thumbs" aria-label="Imagini produs">
                {galleryUrls.map((url) => {
                  const isSelected = normalizeImageUrl(url) === activeImage
                  return (
                  <li key={url}>
                    <button
                      type="button"
                      className={`shop-product__thumb-btn${isSelected ? ' shop-product__thumb-btn--selected' : ''}`}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => setSelectedImage(url)}
                    >
                      <ProductImage
                        src={url}
                        alt=""
                        className="shop-product__thumb"
                        placeholderClassName="shop-product__thumb shop-product__placeholder"
                      />
                    </button>
                  </li>
                  )
                })}
              </ul>
            ) : null}
          </div>

          <div className="shop-product__buybox">
            <h1 className="shop-product__title">{product.name || 'Produs'}</h1>
            {product.sku ? (
              <p className="shop-product__sku muted">SKU {product.sku}</p>
            ) : null}
            {averageRating !== null ? (
              <ShopStarRating
                rating={averageRating}
                reviewCount={reviews.length}
              />
            ) : null}
            <p className="shop-product__lead">{content.lead}</p>
            <div className="shop-product__price-row">
              <ShopProductPrice product={product} showDiscountBadge />
            </div>
            <p className="shop-product__stock muted">
              {stock > 0 ? `În stoc: ${stock} buc.` : 'Stoc epuizat'}
            </p>
            <button
              type="button"
              className="shop-btn shop-btn--primary shop-btn--block"
              disabled={stock <= 0}
              onClick={handleAddToCart}
            >
              Adaugă în coș
            </button>
            <Link className="shop-btn shop-btn--ghost shop-btn--block" to="/cos">
              Vezi coșul
            </Link>
            <ul className="shop-product__highlights">
              {content.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="shop-product__details">
          <section className="shop-product__panel" aria-labelledby="product-description">
            <h2 id="product-description">Descriere</h2>
            {content.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>

          {content.specs.length > 0 ? (
            <section className="shop-product__panel" aria-labelledby="product-specs">
              <h2 id="product-specs">Specificații</h2>
              <table className="shop-product__specs">
                <tbody>
                  {content.specs.map((row) => (
                    <tr key={`${row.label}-${row.value}`}>
                      <th scope="row">{row.label}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <section className="shop-product__panel" aria-labelledby="product-reviews">
            <h2 id="product-reviews">Recenzii</h2>
            {reviews.length === 0 ? (
              <p className="muted">Încă nu există recenzii aprobate.</p>
            ) : (
              <ul className="shop-reviews">
                {reviews.map((review) => (
                  <li key={review.id} className="shop-reviews__item">
                    <div className="shop-reviews__head">
                      <strong>{review.authorName}</strong>
                      <ShopStarRating
                        rating={review.rating}
                        showValue={false}
                        size="sm"
                      />
                    </div>
                    <p>{review.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <form className="shop-form shop-reviews__form" onSubmit={handleReviewSubmit}>
              <label className="shop-field">
                <span>Nume</span>
                <input
                  value={reviewAuthor}
                  onChange={(event) => setReviewAuthor(event.target.value)}
                  required
                />
              </label>
              <div className="shop-field">
                <span>Rating</span>
                <ShopStarRatingInput
                  value={reviewRating}
                  onChange={setReviewRating}
                />
              </div>
              <label className="shop-field shop-field--wide">
                <span>Recenzie</span>
                <textarea
                  value={reviewBody}
                  onChange={(event) => setReviewBody(event.target.value)}
                  rows={4}
                  required
                />
              </label>
              {reviewMessage ? <p className="muted">{reviewMessage}</p> : null}
              <button type="submit" className="shop-btn shop-btn--primary">
                Trimite recenzia
              </button>
            </form>
          </section>

          {similar.length > 0 ? (
            <section className="shop-product__panel" aria-labelledby="product-related">
              <h2 id="product-related">Produse similare</h2>
              <ul className="shop-related">
                {similar.map((item) => (
                  <li key={item.id}>
                    <Link to={productPagePath(item)}>{item.name}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="shop-product__panel shop-product__panel--muted">
            <h2>Livrare și plată</h2>
            <p>
              {SITE_LEGAL.deliverySummary} Pentru detalii, vezi pagina{' '}
              <Link to="/livrare-si-plata">Livrare și plată</Link>.
            </p>
          </section>
        </div>
      </div>
    </ShopLayout>
  )
}
