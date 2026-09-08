import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'
import { ProductImage } from '../components/ProductImage'
import { useProducts } from '../hooks/useProducts'
import {
  buildSalesBreakdown,
  filterOrdersByRange,
  isCountableOrder,
  type ProductSalesRow,
} from '../lib/adminStats'
import { fetchOrders, isOrdersApiEnabled, orderStatusLabel } from '../lib/ordersApi'
import { primaryImageUrl } from '../lib/productImages'
import { formatRon } from '../lib/shopCatalog'
import type { Order } from '../types/order'
import type { Product } from '../types/product'
import { useStatsRange } from '../hooks/useStatsRange'
import { AdminStatsDashboard, StatsRangeToolbar } from './AdminStatsPage'
import './AdminHomePage.css'

const RECENT_LIMIT = 7
const TOP_LIMIT = 7

function formatRecentTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    return `azi, ${date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function itemsCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

function Thumb({
  src,
  className,
  placeholderClassName,
}: {
  src: string | undefined
  className: string
  placeholderClassName: string
}) {
  if (!src) return <span className={placeholderClassName}>—</span>
  return (
    <ProductImage
      src={src}
      alt=""
      loading="lazy"
      className={className}
      placeholderClassName={placeholderClassName}
      placeholderLabel="—"
    />
  )
}

function RecentOrders({
  orders,
  imageById,
  loading,
}: {
  orders: Order[]
  imageById: Map<string, string>
  loading: boolean
}) {
  const recent = useMemo(
    () =>
      [...orders]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, RECENT_LIMIT),
    [orders],
  )

  return (
    <article className="panel ah-card" aria-labelledby="ah-recent-title">
      <header className="ah-card__head">
        <div>
          <h2 id="ah-recent-title" className="ah-card__title">
            Ultimele comenzi
          </h2>
          <span className="ah-card__sub">Cele mai recente {RECENT_LIMIT}, indiferent de status</span>
        </div>
        <Link to="/admin/comenzi?carrier=all&tab=all" className="ah-card__link">
          Toate comenzile →
        </Link>
      </header>
      {loading && recent.length === 0 ? (
        <p className="ah-card__empty">Se încarcă comenzile…</p>
      ) : recent.length === 0 ? (
        <p className="ah-card__empty">Nu există comenzi încă.</p>
      ) : (
        <ul className="ah-orders">
          {recent.map((order) => {
            const first = order.items[0]
            const second = order.items[1]
            const thumb1 = first ? imageById.get(first.productId) : undefined
            const thumb2 = second ? imageById.get(second.productId) : undefined
            const count = itemsCount(order)
            const productLine = order.items
              .map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.productName}` : i.productName))
              .join(', ')
            return (
              <li key={order.id}>
                <Link
                  to={`/admin/comenzi?carrier=all&tab=all&q=${encodeURIComponent(order.id)}`}
                  className="ah-order"
                >
                  <span className="ah-order__thumbs" aria-hidden="true">
                    {thumb2 ? (
                      <span className="ah-order__thumb ah-order__thumb--second">
                        <Thumb src={thumb2} className="" placeholderClassName="ah-order__thumb-placeholder" />
                      </span>
                    ) : null}
                    <span className="ah-order__thumb">
                      <Thumb src={thumb1} className="" placeholderClassName="ah-order__thumb-placeholder" />
                    </span>
                    {count > 1 ? <span className="ah-order__more">{count}</span> : null}
                  </span>
                  <span className="ah-order__main">
                    <span className="ah-order__customer">{order.customerName}</span>
                    <span className="ah-order__meta">
                      <code>#{order.id}</code> · {formatRecentTime(order.createdAt)} ·{' '}
                      {order.customerPhone}
                    </span>
                    <span className="ah-order__product" title={productLine}>
                      {productLine || 'Fără produse'}
                    </span>
                  </span>
                  <span className={`ah-order__status ah-order__status--${order.status}`}>
                    {orderStatusLabel(order.status)}
                  </span>
                  <span className="ah-order__total">
                    <strong>{formatRon(order.totalAmount)}</strong>
                    <span>
                      {order.paymentMethod === 'card' ? 'card' : 'ramburs'}
                      {order.paymentStatus === 'paid' ? ' · plătit' : ''}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}

function TopProducts({
  rows,
  productById,
  loading,
  periodLabel,
}: {
  rows: ProductSalesRow[]
  productById: Map<string, Product>
  loading: boolean
  periodLabel: string
}) {
  const top = rows.slice(0, TOP_LIMIT)
  const max = top.reduce((m, r) => Math.max(m, r.quantitySold), 0)

  return (
    <article className="panel ah-card" aria-labelledby="ah-top-title">
      <header className="ah-card__head">
        <div>
          <h2 id="ah-top-title" className="ah-card__title">
            Cele mai vândute produse
          </h2>
          <span className="ah-card__sub">{periodLabel} · fără comenzile anulate sau returnate</span>
        </div>
        <Link to="/admin/gestiune" className="ah-card__link">
          Gestiune produse →
        </Link>
      </header>
      {loading && top.length === 0 ? (
        <p className="ah-card__empty">Se calculează…</p>
      ) : top.length === 0 ? (
        <p className="ah-card__empty">Nicio vânzare în perioada selectată.</p>
      ) : (
        <ol className="ah-top">
          {top.map((row, index) => {
            const product = productById.get(row.productId)
            const thumb = product ? primaryImageUrl(product) : undefined
            const width = max > 0 ? Math.max(6, Math.round((row.quantitySold / max) * 100)) : 0
            return (
              <li key={row.productId}>
                <Link
                  to={product ? `/admin/produse/${encodeURIComponent(product.id)}` : '/admin/gestiune'}
                  className="ah-top__row"
                >
                  <span className="ah-top__rank">{index + 1}</span>
                  <span className="ah-top__thumb" aria-hidden="true">
                    <Thumb src={thumb} className="" placeholderClassName="ah-top__thumb-placeholder" />
                  </span>
                  <span className="ah-top__main">
                    <span className="ah-top__name" title={row.productName}>
                      {row.productName}
                    </span>
                    {row.productSku ? <span className="ah-top__sku">{row.productSku}</span> : null}
                    <span className="ah-top__bar" aria-hidden="true">
                      <i style={{ width: `${width}%` }} />
                    </span>
                  </span>
                  <span className="ah-top__nums">
                    <span className="ah-top__num">
                      <span>Buc</span>
                      <strong>{row.quantitySold}</strong>
                    </span>
                    <span className="ah-top__num ah-top__num--orders">
                      <span>Comenzi</span>
                      <strong>{row.orderCount}</strong>
                    </span>
                    <span className={`ah-top__num ah-top__num--profit${row.profit < 0 ? ' ah-top__num--neg' : ''}`}>
                      <span>Profit</span>
                      <strong>{formatRon(row.profit)}</strong>
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </article>
  )
}

export function AdminHomePage() {
  const { products } = useProducts()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(isOrdersApiEnabled())
  const [error, setError] = useState<string | null>(null)
  // Filtrul de perioadă e la nivel de pagină (sus): conduce topul produselor
  // și statisticile de dedesubt.
  const rangeState = useStatsRange()
  const { range } = rangeState

  // Încărcare inițială: setState doar după răspuns (nu sincron în effect).
  useEffect(() => {
    if (!isOrdersApiEnabled()) return
    let cancelled = false
    fetchOrders()
      .then((loaded) => {
        if (!cancelled) setOrders(loaded)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Nu am putut încărca comenzile.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** Reîncărcare la cerere (ex. după recalcularea costurilor DPD). */
  const loadOrders = useCallback(async () => {
    if (!isOrdersApiEnabled()) return
    setLoading(true)
    setError(null)
    try {
      setOrders(await fetchOrders())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nu am putut încărca comenzile.')
    } finally {
      setLoading(false)
    }
  }, [])

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  )
  const imageById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of products) {
      const url = primaryImageUrl(p)
      if (url) map.set(p.id, url)
    }
    return map
  }, [products])

  const topRows = useMemo(() => {
    const scoped = filterOrdersByRange(orders, range.start, range.end).filter(
      isCountableOrder,
    )
    const cost = new Map(products.map((p) => [p.id, p.purchasePrice]))
    return buildSalesBreakdown(scoped, cost).products
  }, [orders, products, range.start, range.end])

  return (
    <AdminLayout
      title="Panou admin"
      lead="Ce s-a întâmplat recent în magazin și cum merg vânzările."
      isHome
    >
      <div className="ah">
        <StatsRangeToolbar state={rangeState} />
        {error ? (
          <p className="app-status app-status--error" role="alert">
            {error}
          </p>
        ) : null}
        <section className="ah-grid" aria-label="Activitate recentă">
          <RecentOrders orders={orders} imageById={imageById} loading={loading} />
          <TopProducts
            rows={topRows}
            productById={productById}
            loading={loading}
            periodLabel={range.label}
          />
        </section>
        <AdminStatsDashboard
          orders={orders}
          ordersLoading={loading}
          ordersError={error}
          onReloadOrders={loadOrders}
          rangeState={rangeState}
        />
      </div>
    </AdminLayout>
  )
}
