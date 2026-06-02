import { formatRon } from '../../lib/shopCatalog'
import { AWB_SERVICE_LABEL, AWB_SHIPPER } from '../../lib/awb'
import {
  customerNotesWithoutCarrier,
  getDeliveryCarrierLabel,
} from '../../lib/shippingCarriers'
import type { Order } from '../../types/order'
import './AwbPrintSheet.css'

type AwbPrintSheetProps = {
  order: Order
}

function formatOrderDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ro-RO')
}

export function AwbPrintSheet({ order }: AwbPrintSheetProps) {
  const awbNumber = order.awbNumber ?? order.id
  const carrierLabel = order.deliveryCarrier
    ? getDeliveryCarrierLabel(order.deliveryCarrier)
    : null
  const cleanNotes = customerNotesWithoutCarrier(order.customerNotes)
  const isCod = order.paymentMethod !== 'card'

  return (
    <section className="awb-print" aria-label={`AWB ${awbNumber}`}>
      <header className="awb-print__header">
        <div>
          <p className="awb-print__eyebrow">ShopTop · AWB</p>
          <h1 className="awb-print__awb">{awbNumber}</h1>
          <p className="awb-print__meta">Comandă {order.id}</p>
          <p className="awb-print__meta">{formatOrderDate(order.createdAt)}</p>
        </div>
        <div className="awb-print__service">
          {carrierLabel ? (
            <p className="awb-print__carrier">{carrierLabel}</p>
          ) : null}
          <p>{AWB_SERVICE_LABEL}</p>
          <p>
            Ramburs:{' '}
            <strong>{isCod ? formatRon(order.totalAmount) : '0,00 RON'}</strong>
          </p>
          {!isCod ? (
            <p className="awb-print__paid">Plătit online</p>
          ) : null}
        </div>
      </header>

      <div className="awb-print__grid">
        <article className="awb-print__card">
          <h2>Expeditor</h2>
          <p>{AWB_SHIPPER.name}</p>
          {AWB_SHIPPER.phone ? <p>{AWB_SHIPPER.phone}</p> : null}
          <p>{AWB_SHIPPER.address}</p>
          <p>{AWB_SHIPPER.website}</p>
        </article>

        <article className="awb-print__card">
          <h2>Destinatar</h2>
          <p>{order.customerName}</p>
          <p>{order.customerPhone}</p>
          {order.customerEmail ? <p>{order.customerEmail}</p> : null}
          <p>{order.customerAddress}</p>
          {cleanNotes ? (
            <p className="awb-print__notes">Observații: {cleanNotes}</p>
          ) : null}
        </article>
      </div>

      <article className="awb-print__card awb-print__card--wide">
        <h2>Conținut colet</h2>
        <ul className="awb-print__items">
          {order.items.map((item) => (
            <li key={`${order.id}-${item.productId}`}>
              <span>{item.productName}</span>
              <span>
                {item.quantity} × {formatRon(item.unitPrice)}
              </span>
            </li>
          ))}
        </ul>
        <p className="awb-print__total">
          Total comandă: <strong>{formatRon(order.totalAmount)}</strong>
        </p>
      </article>
    </section>
  )
}
