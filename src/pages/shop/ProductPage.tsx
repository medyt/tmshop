import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'

import { ProductImage } from '../../components/ProductImage'
import { ProductCarousel } from '../../components/shop/ProductCarousel'
import { QuickOrderForm } from '../../components/shop/QuickOrderForm'
import { ShopLayout } from '../../components/shop/ShopLayout'
import { ShopTrustBar } from '../../components/shop/ShopTrustBar'
import { NotFoundPage } from './NotFoundPage'
import {
  ShopStarRating,
  ShopStarRatingInput,
} from '../../components/shop/ShopStarRating'
import { useShopNotice } from '../../components/shop/ShopNoticeProvider'
import { useCart } from '../../contexts/CartContext'
import { getShopProductPageContent } from '../../data/shopProductContent'
import { usePageMeta } from '../../hooks/usePageMeta'
import { trackAddToCart, trackViewContent } from '../../lib/analytics'
import { metaCatalogId } from '../../lib/metaCatalogCsv'
import { primaryImageUrl, normalizeImageUrl } from '../../lib/productImages'
import {
  sanitizeHtml,
  looksLikeHtml,
  htmlToBlocks,
  htmlToPlainText,
  isLandingDescription,
} from '../../lib/richText'
import {
  findListedProduct,
  productPagePath,
  productSlug,
} from '../../lib/shopProductRoutes'
import {
  cartLineTotal,
  clientStockLimit,
  defaultBundleQty,
  displayStock,
  bundleOfferForQty,
  bundleTotalPrice,
  formatRon,
  isListedInShop,
  isPromotionalPackName,
  isViewableInShop,
  productCompareAtPrice,
  savingsPercent,
  shopPerUnitLabel,
  shopQtyUnit,
} from '../../lib/shopCatalog'
import { isApiEnabled } from '../../lib/apiClient'
import { fetchProductById, isProductsApiEnabled } from '../../lib/productsApi'
import { mergeProductReviewStatsFromReviews } from '../../lib/productReviewStats'
import {
  fetchProductReviews,
  uploadProductReviewImage,
  relatedProducts,
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
import { BUNDLE_QTYS, type BundleQty, type Product } from '../../types/product'

import '../ShopHome.css'

function stockUrgencyBarPercent(stock: number): number {
  if (stock <= 0) return 0
  if (stock <= 2) return 22
  if (stock <= 5) return 38
  if (stock <= 12) return 55
  if (stock <= 25) return 72
  return 88
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return days > 0 ? `${days}z ${hh}h ${mm}m ${ss}s` : `${hh}h ${mm}m ${ss}s`
}

type ProductPageProps = {
  products: Product[]
}

export function ProductPage({ products }: ProductPageProps) {
  const { productId = '' } = useParams()
  const location = useLocation()
  const { addProduct, lines: cartLines, setQuantity } = useCart()
  const { notify } = useShopNotice()
  const listedFromCatalog = findListedProduct(products, productId)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [detailStatus, setDetailStatus] = useState<'idle' | 'loading' | 'ready' | 'missing'>(
    () => (isProductsApiEnabled() ? 'loading' : 'idle'),
  )
  const product = detailProduct ?? listedFromCatalog
  const ctaRef = useRef<HTMLButtonElement | null>(null)
  const quickOrderRef = useRef<HTMLElement | null>(null)
  const [stickyCta, setStickyCta] = useState(false)
  const [bundleQty, setBundleQty] = useState<1 | BundleQty>(1)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewAuthor, setReviewAuthor] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')
  const [reviewImageFile, setReviewImageFile] = useState<File | null>(null)
  const [reviewMessage, setReviewMessage] = useState<string | null>(null)
  const listedProduct =
    product && isViewableInShop(product) ? product : null
  const productContent = useMemo(
    () => (listedProduct ? getShopProductPageContent(listedProduct) : null),
    [listedProduct],
  )
  const productPath = listedProduct ? productPagePath(listedProduct) : undefined
  const productImage = listedProduct
    ? absoluteAssetUrl(primaryImageUrl(listedProduct))
    : undefined
  const reviewStats = useMemo(
    () =>
      listedProduct
        ? mergeProductReviewStatsFromReviews(listedProduct.id, reviews)
        : null,
    [listedProduct, reviews],
  )
  const averageRating = reviewStats?.averageRating ?? null
  const displayReviewCount = reviewStats?.reviewCount ?? 0
  const productDescription = listedProduct
    ? productMetaDescription({
        name: listedProduct.name,
        lead: htmlToPlainText(listedProduct.description),
        priceRon: listedProduct.salePrice,
      })
    : undefined
  const productJsonLd = useMemo(() => {
    if (!listedProduct || !productPath) return undefined
    const description = productMetaDescription({
      name: listedProduct.name,
      lead: htmlToPlainText(listedProduct.description),
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
        inStock: true,
        averageRating,
        reviewCount: displayReviewCount,
      }),
    ])
  }, [
    averageRating,
    displayReviewCount,
    listedProduct,
    productImage,
    productPath,
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

  // Încărcare directă pe slug/id — nu așteptăm tot catalogul.
  useEffect(() => {
    setDetailProduct(null)
    setSelectedImage(null)

    if (!productId || !isProductsApiEnabled()) {
      setDetailStatus('idle')
      return
    }

    let cancelled = false
    setDetailStatus('loading')
    void fetchProductById(productId)
      .then((full) => {
        if (cancelled) return
        setDetailProduct(full)
        setDetailStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setDetailStatus('missing')
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  // Fallback: catalogul s-a încărcat după ce detaliul a eșuat (sau API off).
  useEffect(() => {
    if (detailProduct || !listedFromCatalog) return
    if (detailStatus === 'missing' || detailStatus === 'idle') {
      setDetailStatus('ready')
    }
  }, [detailProduct, listedFromCatalog, detailStatus])

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

  useEffect(() => {
    if (!listedProduct) return
    const fire = () =>
      trackViewContent(metaCatalogId(listedProduct), listedProduct.salePrice)
    fire()
    window.addEventListener('shoptop:cookies-all', fire)
    return () => window.removeEventListener('shoptop:cookies-all', fire)
  }, [listedProduct?.id, listedProduct?.sku, listedProduct?.salePrice])

  const stockPreview = listedProduct ? displayStock(listedProduct) : 0

  const bundleOptions = useMemo(() => {
    if (!listedProduct) return []
    type BundleOption = {
      qty: 1 | BundleQty
      title: string
      badge?: 'popular' | 'best'
      total: number
      /** Prețul de listă tăiat (antetul de preț de deasupra opțiunilor). */
      compareAtTotal: number | null
      /** Cât ar costa aceeași cantitate la prețul unui singur pachet. */
      singlesTotal: number
    }
    const compareAtUnit = productCompareAtPrice(listedProduct)
    const out: BundleOption[] = [
      {
        qty: 1,
        title: isPromotionalPackName(listedProduct.name) ? '1 pachet' : '1 bucată',
        total: listedProduct.salePrice,
        compareAtTotal: compareAtUnit,
        singlesTotal: listedProduct.salePrice,
      },
    ]
    for (const qty of BUNDLE_QTYS) {
      const offer = bundleOfferForQty(listedProduct, qty)
      const total = bundleTotalPrice(listedProduct, qty)
      if (!offer || total === null) continue
      out.push({
        qty,
        title:
          offer.title?.trim() ||
          (isPromotionalPackName(listedProduct.name)
            ? `${qty} pachete`
            : `Pachet ${qty} bucăți`),
        badge: offer.badge,
        total,
        compareAtTotal: compareAtUnit !== null ? compareAtUnit * qty : null,
        singlesTotal: Math.round(listedProduct.salePrice * qty * 100) / 100,
      })
    }
    return out
  }, [listedProduct])

  useEffect(() => {
    if (!listedProduct) return
    setBundleQty(defaultBundleQty(listedProduct))
  }, [listedProduct?.id])

  const selectedBundle = bundleOptions.find((o) => o.qty === bundleQty) ?? bundleOptions[0]
  const selectedTotal = selectedBundle?.total ?? (listedProduct?.salePrice ?? 0)
  // La 2+ pachete antetul arată aceeași reducere ca rândul ales (față de prețul unui pachet).
  const selectedCompareAt =
    selectedBundle && selectedBundle.qty > 1
      ? selectedBundle.singlesTotal
      : (selectedBundle?.compareAtTotal ?? null)
  const selectedPerUnit = bundleQty > 0 ? Math.round((selectedTotal / bundleQty) * 100) / 100 : selectedTotal
  const selectedSavePct =
    selectedCompareAt !== null
      ? savingsPercent(selectedCompareAt, selectedTotal)
      : null
  const selectedSaveRon =
    selectedCompareAt !== null && selectedCompareAt > selectedTotal
      ? selectedCompareAt - selectedTotal
      : null

  useEffect(() => {
    if (stockPreview <= 0) {
      setStickyCta(false)
      return
    }
    const el = ctaRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyCta(!entry.isIntersecting)
      },
      { threshold: 0.2 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [stockPreview])

  const PROMO_START_MS = 2 * 60 * 60 * 1000 + 38 * 60 * 1000 // 02:38:00
  const promoKey = `shoptop:pdp:promoEndsAt:${productId}`
  const promoEndsAtMs = useMemo(() => {
    const now = Date.now()
    try {
      const raw = window.localStorage.getItem(promoKey)
      const stored = raw ? Number(raw) : NaN
      if (Number.isFinite(stored) && stored > now) return stored
      const next = now + PROMO_START_MS
      window.localStorage.setItem(promoKey, String(next))
      return next
    } catch {
      return now + PROMO_START_MS
    }
  }, [promoKey])
  const [nowMs, setNowMs] = useState(() => Date.now())
  const promoRemainingMs = promoEndsAtMs - nowMs
  const promoActive = promoRemainingMs > 0

  useEffect(() => {
    if (!promoActive) return
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [promoActive, promoEndsAtMs])

  if (!product || !isViewableInShop(product) || !productContent) {
    const waitingForDetail =
      detailStatus === 'loading' ||
      (isProductsApiEnabled() &&
        detailStatus !== 'missing' &&
        detailStatus !== 'ready' &&
        products.length === 0)
    if (waitingForDetail) {
      return (
        <ShopLayout>
          <section className="shop-page shop-page--product-loading" aria-busy="true">
            <div className="shop-product-skeleton" aria-hidden="true">
              <div className="shop-product-skeleton__media" />
              <div className="shop-product-skeleton__body">
                <div className="shop-product-skeleton__line shop-product-skeleton__line--title" />
                <div className="shop-product-skeleton__line" />
                <div className="shop-product-skeleton__line shop-product-skeleton__line--short" />
              </div>
            </div>
            <span className="sr-only">Se încarcă produsul…</span>
          </section>
        </ShopLayout>
      )
    }
    return <NotFoundPage />
  }

  // Adresă veche (produs redenumit) sau acces după id: trimitem la adresa
  // canonică, păstrând parametrii de tracking (fbclid, utm_*).
  if (decodeURIComponent(productId) !== productSlug(product)) {
    return (
      <Navigate to={`${productPagePath(product)}${location.search}`} replace />
    )
  }

  const content = productContent
  const stock = stockPreview
  const cartHasItems = cartLines.length > 0
  const stockBarPct = stockUrgencyBarPercent(stock)
  const galleryUrls = listedProduct
    ? listedProduct.imageUrls.filter((url) => url.trim().length > 0)
    : []
  const heroImage = listedProduct
    ? selectedImage ?? primaryImageUrl(listedProduct)
    : ''
  const activeImage = heroImage ? normalizeImageUrl(heroImage) : ''
  const similar = listedProduct
    ? relatedProducts(
        listedProduct,
        products.filter(isListedInShop),
        Number.POSITIVE_INFINITY,
      )
    : []
  const rawDescription = listedProduct?.description?.trim() ?? ''
  const descriptionBlocks = rawDescription ? htmlToBlocks(rawDescription) : []
  const descriptionIsHtml = looksLikeHtml(rawDescription)
  const descriptionIsLanding = isLandingDescription(rawDescription)

  const applySelectedQtyToCart = () => {
    const requestedQty = Math.floor(bundleQty)
    const maxStock = clientStockLimit(product)
    const nextQty = Math.min(maxStock, Math.max(1, requestedQty))
    if (requestedQty > maxStock && maxStock > 0) {
      notify(
        `Stoc disponibil: ${maxStock} ${shopQtyUnit(product.name, maxStock)}. Am ajustat cantitatea.`,
        'Cantitate',
      )
    }

    const existing = cartLines.find((l) => l.product.id === product.id)
    if (!existing) {
      const result = addProduct(product, nextQty)
      if (!result) {
        notify(
          'Produsul nu poate fi adăugat în coș (lipsește stoc sau nu este disponibil).',
          'Coș',
        )
        return
      }
      notify(
        `${product.name || 'Produsul'} — ${result.quantityInCart} ${shopQtyUnit(product.name, result.quantityInCart)} în coș.`,
        'Adăugat în coș',
        { label: 'Vezi coșul', to: '/cos' },
      )
      return
    }

    setQuantity(product.id, nextQty)
    const addedQty = nextQty - existing.quantity
    const catalogId = metaCatalogId(product)
    if (catalogId && addedQty > 0) {
      trackAddToCart(catalogId, addedQty, cartLineTotal(product, addedQty))
    }
    if (nextQty === existing.quantity) {
      notify(
        `${product.name || 'Produsul'} — ai deja ${nextQty} ${shopQtyUnit(product.name, nextQty)} în coș.`,
        'Coș',
        { label: 'Vezi coșul', to: '/cos' },
      )
    } else {
      notify(
        `${product.name || 'Produsul'} — cantitate actualizată: ${nextQty} ${shopQtyUnit(product.name, nextQty)}.`,
        'Coș',
        { label: 'Vezi coșul', to: '/cos' },
      )
    }
  }

  const handleAddToCart = () => applySelectedQtyToCart()

  /** Derulează la formularul de comandă rapidă (fără checkout). */
  const handleBuyNow = () => {
    const el =
      quickOrderRef.current ?? document.getElementById('comanda-rapida')
    if (!el) return

    const header = document.querySelector('.shop-header')
    const headerH =
      header instanceof HTMLElement ? header.getBoundingClientRect().height : 0
    const top =
      el.getBoundingClientRect().top + window.scrollY - headerH - 12
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })

    if (window.location.hash !== '#comanda-rapida') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#comanda-rapida`)
    }

    window.setTimeout(() => {
      const firstField = el.querySelector<HTMLInputElement | HTMLSelectElement>(
        'input:not([type="checkbox"]):not([type="hidden"]), select',
      )
      firstField?.focus({ preventScroll: true })
    }, 450)
  }

  const handleAddSimilar = (item: Product) => {
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
      { label: 'Vezi coșul', to: '/cos' },
    )
  }

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReviewMessage(null)
    if (!isApiEnabled()) {
      setReviewMessage(
        'API-ul nu este configurat (VITE_API_URL). La dezvoltare locală setează în .env de exemplu VITE_API_URL=/shoptop-api și pornește PHP pe același host ca proxy-ul Vite.',
      )
      return
    }
    try {
      const imageUrl = reviewImageFile
        ? await uploadProductReviewImage(reviewImageFile)
        : undefined
      await submitProductReview({
        productId: product.id,
        authorName: reviewAuthor.trim(),
        rating: reviewRating,
        body: reviewBody.trim(),
        imageUrl,
      })
      setReviewAuthor('')
      setReviewBody('')
      setReviewRating(5)
      setReviewImageFile(null)
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
            {product.sku ? (
              <p className="shop-product__sku shop-product__sku--lp">
                SKU {product.sku}
              </p>
            ) : null}
            <h1 className="shop-product__title shop-product__title--lp">
              {product.name || 'Produs'}
            </h1>

            {stock > 0 && stock <= 5 ? (
              <p className="shop-product__urgency" role="status">
                Stoc limitat — mai sunt doar{' '}
                <strong>
                  {stock} {shopQtyUnit(product.name, stock, 'full')}
                </strong>
                .
              </p>
            ) : null}
            {promoActive ? (
              <p className="shop-product__promo-timer" role="status">
                Promo în sesiunea ta: mai ai{' '}
                <strong>{formatCountdown(promoRemainingMs ?? 0)}</strong>
              </p>
            ) : null}

            <div className="shop-product__price-row shop-product__price-row--lp">
              <div className="shop-bundle-price">
                {selectedCompareAt !== null && selectedCompareAt > selectedTotal ? (
                  <span className="shop-bundle-price__was">
                    {formatRon(selectedCompareAt)}
                  </span>
                ) : null}
                <span className="shop-bundle-price__now">
                  {formatRon(selectedTotal)}
                </span>
                {selectedSaveRon !== null ? (
                  <span className="shop-bundle-price__save">
                    {selectedSavePct !== null
                      ? `−${selectedSavePct}% · Economisești ${formatRon(selectedSaveRon)}`
                      : `Economisești ${formatRon(selectedSaveRon)}`}
                  </span>
                ) : null}
              </div>
            </div>
            {bundleQty > 1 ? (
              <p className="shop-bundle-price__meta muted">
                Total pentru {bundleQty} {shopQtyUnit(product.name, bundleQty, 'full')}{' '}
                · {formatRon(selectedPerUnit)} {shopPerUnitLabel(product.name)}
              </p>
            ) : null}
            <p className="shop-product__price-note">
              Preț cu TVA inclus · Plată ramburs sau cu cardul
            </p>

            <div className="shop-product__reviews-top">
              {averageRating !== null ? (
                <>
                  <ShopStarRating
                    rating={averageRating}
                    reviewCount={displayReviewCount}
                    showValue={false}
                    size="md"
                  />
                  <span className="shop-product__reviews-score" aria-hidden>
                    <strong>{averageRating.toFixed(1)}</strong>
                    <span className="shop-product__reviews-muted">/5</span>
                    <span className="shop-product__reviews-sep">·</span>
                    <strong className="shop-product__reviews-count">
                      {displayReviewCount.toLocaleString('ro-RO')}
                    </strong>
                    <span className="shop-product__reviews-muted"> recenzii</span>
                  </span>
                </>
              ) : null}
              {displayReviewCount >= 3 ? (
                <span className="shop-product__reviews-pill">
                  Recomandat de clienți
                </span>
              ) : null}
            </div>

            {bundleOptions.length > 1 ? (
              <div className="shop-bundle" aria-label="Alege pachetul">
                {bundleOptions.map((opt) => {
                  const disabled = stock > 0 ? opt.qty > stock : true
                  const active = opt.qty === bundleQty
                  // Reducerea din rând se raportează la prețul unui singur pachet
                  // (ex. 2 pachete = încă 10%), nu la prețul de listă tăiat.
                  const was = opt.qty > 1 ? opt.singlesTotal : null
                  const save = was !== null && was > opt.total ? was - opt.total : null
                  const savePct =
                    was !== null ? savingsPercent(was, opt.total) : null
                  return (
                    <label
                      key={opt.qty}
                      className={`shop-bundle__option${active ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
                    >
                      <input
                        type="radio"
                        name="bundleQty"
                        value={opt.qty}
                        checked={active}
                        disabled={disabled}
                        onChange={() => setBundleQty(opt.qty)}
                      />
                      <span className="shop-bundle__main">
                        <span className="shop-bundle__title">
                          {opt.title}
                          {opt.badge ? (
                            <span className={`shop-bundle__badge shop-bundle__badge--${opt.badge}`}>
                              {opt.badge === 'best' ? 'Best deal' : 'Popular'}
                            </span>
                          ) : null}
                          {savePct !== null ? (
                            <span className="shop-bundle__pct">−{savePct}%</span>
                          ) : null}
                        </span>
                        {active && opt.qty > 1 && save !== null ? (
                          <span className="shop-bundle__sub muted">
                            Economisești {formatRon(save)}
                          </span>
                        ) : null}
                      </span>
                      <span className="shop-bundle__price">
                        <span className="shop-bundle__price-now">{formatRon(opt.total)}</span>
                        {was !== null && was > opt.total ? (
                          <span className="shop-bundle__price-was">{formatRon(was)}</span>
                        ) : null}
                      </span>
                    </label>
                  )
                })}
              </div>
            ) : null}

            {stock > 0 ? (
              <div className="shop-product__stock-block">
                <div className="shop-product__stock-row">
                  <span className="shop-product__stock-label">
                    Disponibilitate în depozit
                  </span>
                  <span className="shop-product__stock-qty">
                    max. {stock} în coș
                  </span>
                </div>
                <div
                  className="shop-product__stock-bar"
                  role="progressbar"
                  aria-valuenow={stockBarPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Indicativ stoc aproximativ ${stockBarPct}%`}
                >
                  <span
                    className="shop-product__stock-bar-fill"
                    style={{ width: `${stockBarPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="shop-product__stock-muted">Stoc epuizat</p>
            )}

            <button
              type="button"
              className="shop-btn shop-btn--primary shop-btn--block shop-product__cta-lp"
              ref={ctaRef}
              disabled={stock <= 0}
              onClick={handleBuyNow}
            >
              Comandă acum
            </button>
            <p className="shop-product__cta-sub">
              Plătești la curier, când primești coletul
            </p>
            <a
              className="shop-product__call"
              href={`tel:${SITE_LEGAL.contactPhone.replace(/\s+/g, '')}`}
            >
              Sau comandă la telefon:{' '}
              <strong className="shop-product__call-number">
                {SITE_LEGAL.returnPhone}
              </strong>
            </a>
            <button
              type="button"
              className="shop-btn shop-btn--ghost shop-btn--block shop-product__checkout-btn"
              disabled={stock <= 0}
              onClick={handleAddToCart}
            >
              Adaugă în coș
            </button>

            {/* Linkurile de coș apar doar când există ceva în coș — altfel duc la pagini goale. */}
            {cartHasItems ? (
              <div className="shop-product__cart-links">
                <Link className="shop-product__cart-link" to="/cos">
                  Vezi coșul ({cartLines.reduce((n, l) => n + l.quantity, 0)})
                </Link>
                <span className="shop-product__cart-sep" aria-hidden>
                  |
                </span>
                <Link
                  className="shop-product__cart-link shop-product__cart-link--strong"
                  to="/checkout"
                >
                  Finalizează comanda
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="shop-product__details">
          {rawDescription ? (
            <section
              className={`shop-product__panel${descriptionIsLanding ? ' shop-product__panel--landing' : ''}`}
              aria-labelledby="product-description"
            >
              <h2
                id="product-description"
                className={descriptionIsLanding ? 'sr-only' : undefined}
              >
                Descriere
              </h2>
              {descriptionIsHtml ? (
                <div
                  className="shop-rich"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(rawDescription),
                  }}
                />
              ) : (
                descriptionBlocks.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))
              )}
            </section>
          ) : null}

          {stock > 0 ? (
            <section
              id="comanda-rapida"
              ref={quickOrderRef}
              className="shop-product__panel shop-product__quick-order-panel"
            >
              <QuickOrderForm
                product={product}
                quantity={bundleQty}
                itemsTotal={selectedTotal}
              />
            </section>
          ) : null}

          {content.specs.length > 0 && !descriptionIsLanding ? (
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

          <section
            className="shop-product__panel"
            id="product-reviews"
            aria-labelledby="product-reviews-heading"
          >
            <h2 id="product-reviews-heading">Recenzii</h2>
            {reviews.length === 0 ? (
              <p className="muted">Încă nu există recenzii aprobate.</p>
            ) : (
              <ul className="shop-reviews">
                {reviews.map((review) => (
                  <li key={review.id} className="shop-reviews__item">
                    {review.imageUrl ? (
                      <div className="shop-reviews__media">
                        <img
                          src={review.imageUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ) : null}
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
                <span>Poză (opțional)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setReviewImageFile(event.target.files?.[0] ?? null)
                  }
                />
              </label>
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
              <ProductCarousel
                products={similar}
                onAddToCart={handleAddSimilar}
                ariaLabel="Produse similare — folosește săgețile pentru a defila"
              />
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

        <div className="shop-product__trust shop-product__trust--bottom">
          <ShopTrustBar />
        </div>

        {stock > 0 && typeof document !== 'undefined'
          ? createPortal(
              <div className="shop-sticky-cta-root shop--light shop--product-lp">
                <div
                  className={`shop-product__sticky-cta${stickyCta ? ' show' : ''}`}
                  role="region"
                  aria-label="Comandă rapidă"
                >
                  <div className="shop-product__sticky-price" aria-hidden>
                    <span className="shop-bundle-sticky__now">
                      {formatRon(selectedTotal)}
                    </span>
                    {bundleQty > 1 ? (
                      <span className="shop-bundle-sticky__meta muted">
                        · {bundleQty} {shopQtyUnit(product.name, bundleQty)}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="shop-btn shop-btn--primary shop-product__sticky-btn"
                    onClick={handleBuyNow}
                  >
                    Comandă acum
                  </button>
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    </ShopLayout>
  )
}
