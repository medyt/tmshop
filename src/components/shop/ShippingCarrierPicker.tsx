import { useState } from 'react'
import {
  DELIVERY_CARRIERS,
  type DeliveryCarrierId,
} from '../../lib/shippingCarriers'
import { formatRon } from '../../lib/shopCatalog'
import { SHIPPING_FLAT_RATE, shippingFreeThreshold } from '../../lib/shopShipping'

type ShippingCarrierPickerProps = {
  value: DeliveryCarrierId | null
  onChange: (carrier: DeliveryCarrierId) => void
}

export function ShippingCarrierPicker({
  value,
  onChange,
}: ShippingCarrierPickerProps) {
  const [failedLogos, setFailedLogos] = useState<Partial<Record<DeliveryCarrierId, true>>>(
    {},
  )

  return (
    <fieldset className="shop-carrier-picker shop-field shop-field--wide">
      <legend className="shop-carrier-picker__legend">Alege curierul</legend>
      <p className="shop-carrier-picker__hint muted">
        Transport {formatRon(SHIPPING_FLAT_RATE)}
        {shippingFreeThreshold() > 0
          ? `, gratuit de la ${formatRon(shippingFreeThreshold())}`
          : ''}{' '}
        — plată ramburs sau cu cardul.
      </p>
      <div
        className="shop-carrier-picker__options"
        role="radiogroup"
        aria-label="Curier de livrare"
      >
        {DELIVERY_CARRIERS.map((carrier) => {
          const selected = value === carrier.id
          return (
            <button
              key={carrier.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`shop-carrier-option${selected ? ' shop-carrier-option--selected' : ''}`}
              onClick={() => onChange(carrier.id)}
            >
              <span className="shop-carrier-option__logo-wrap">
                <img
                  className="shop-carrier-option__logo"
                  src={
                    failedLogos[carrier.id] && carrier.logoFallbackSrc
                      ? carrier.logoFallbackSrc
                      : carrier.logoSrc
                  }
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() =>
                    setFailedLogos((current) => ({ ...current, [carrier.id]: true }))
                  }
                />
              </span>
              <span className="shop-carrier-option__name">{carrier.name}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
