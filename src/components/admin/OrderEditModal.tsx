import { useEffect, useState } from 'react'
import { formatRon } from '../../lib/shopCatalog'
import {
  customerNotesWithoutCarrier,
  getDeliveryCarrierLabel,
} from '../../lib/shippingCarriers'
import { issueOrderAwb, updateOrderStatus } from '../../lib/ordersApi'
import type { Order, OrderStatus } from '../../types/order'
import { OrderStatusBadge } from './OrdersTable'

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'new', label: 'Nouă' },
  { value: 'confirmed', label: 'Confirmată' },
  { value: 'processing', label: 'În procesare' },
  { value: 'shipped', label: 'Expediată' },
  { value: 'delivered', label: 'Livrată' },
  { value: 'cancelled', label: 'Anulată' },
]

type Props = {
  order: Order
  onClose: () => void
  onUpdated: (order: Order) => void
}

export function OrderEditModal({ order, onClose, onUpdated }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const handleStatusChange = (status: OrderStatus) => {
    if (busy || status === order.status) return
    setBusy(true)
    setError(null)
    setMessage(null)
    void updateOrderStatus(order.id, status)
      .then((updated) => {
        onUpdated(updated)
        setMessage('Status actualizat.')
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut actualiza statusul.',
        )
      })
      .finally(() => setBusy(false))
  }

  const handleIssueAwb = () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    void issueOrderAwb(order.id)
      .then((updated) => {
        onUpdated(updated)
        setMessage('AWB generat.')
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Nu am putut genera AWB-ul.',
        )
      })
      .finally(() => setBusy(false))
  }

  const notes = customerNotesWithoutCarrier(order.customerNotes)

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal-panel panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Comanda ${order.id}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-panel__body">
          <div className="product-form__title-row">
            <div>
              <h2 className="product-form__title">Comanda {order.id}</h2>
              <p className="muted small" style={{ margin: '0.2rem 0 0' }}>
                {new Date(order.createdAt).toLocaleString('ro-RO')}
              </p>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Închide"
            >
              ✕
            </button>
          </div>

          <div className="order-edit__grid">
            <section className="order-edit__card">
              <h3>Status comandă</h3>
              <div className="order-edit__status-row">
                <OrderStatusBadge status={order.status} />
              </div>
              <label className="field">
                <span>Schimbă statusul</span>
                <select
                  className="orders-list__status-select"
                  value={order.status}
                  disabled={busy}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as OrderStatus)
                  }
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="order-edit__awb">
                {order.awbNumber ? (
                  <p className="muted small">
                    AWB: <strong>{order.awbNumber}</strong>
                  </p>
                ) : (
                  <p className="muted small">Niciun AWB generat încă.</p>
                )}
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy}
                  onClick={handleIssueAwb}
                >
                  {order.awbNumber ? 'Regenerează AWB' : 'Generează AWB'}
                </button>
              </div>

              {error ? (
                <p className="app-status app-status--error" role="alert">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="order-edit__ok" role="status">
                  {message}
                </p>
              ) : null}
            </section>

            <section className="order-edit__card">
              <h3>Client &amp; livrare</h3>
              <dl className="order-edit__dl">
                <dt>Nume</dt>
                <dd>{order.customerName}</dd>
                <dt>Telefon</dt>
                <dd>{order.customerPhone}</dd>
                {order.customerEmail ? (
                  <>
                    <dt>Email</dt>
                    <dd>{order.customerEmail}</dd>
                  </>
                ) : null}
                <dt>Adresă</dt>
                <dd>{order.customerAddress}</dd>
                {order.deliveryCarrier ? (
                  <>
                    <dt>Curier</dt>
                    <dd>{getDeliveryCarrierLabel(order.deliveryCarrier)}</dd>
                  </>
                ) : null}
                <dt>Plată</dt>
                <dd>
                  {order.paymentMethod === 'card'
                    ? 'Card online'
                    : 'Ramburs'}
                  {order.paymentStatus
                    ? ` · ${order.paymentStatus === 'paid' ? 'plătit' : 'în așteptare'}`
                    : ''}
                </dd>
                {notes ? (
                  <>
                    <dt>Observații</dt>
                    <dd>{notes}</dd>
                  </>
                ) : null}
              </dl>
            </section>
          </div>

          <section className="order-edit__card order-edit__products">
            <h3>Produse</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Produs</th>
                  <th scope="col">Cant.</th>
                  <th scope="col">Preț</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={`${order.id}-${item.productId}`}>
                    <td>
                      <span className="cell-title">{item.productName}</span>
                      {item.productSku ? (
                        <span className="cell-sku">{item.productSku}</span>
                      ) : null}
                    </td>
                    <td>{item.quantity}</td>
                    <td className="cell-nowrap">{formatRon(item.unitPrice)}</td>
                    <td className="cell-nowrap">{formatRon(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="order-edit__total-label">
                    Total comandă
                  </td>
                  <td className="cell-nowrap">
                    <strong>{formatRon(order.totalAmount)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        </div>
      </div>
    </div>
  )
}
