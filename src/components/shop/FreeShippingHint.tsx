import { formatRon } from '../../lib/shopCatalog'
import {
  amountUntilFreeShipping,
  shippingFreeThreshold,
} from '../../lib/shopShipping'

type FreeShippingHintProps = {
  subtotal: number
}

export function FreeShippingHint({ subtotal }: FreeShippingHintProps) {
  const threshold = shippingFreeThreshold()
  const remaining = amountUntilFreeShipping(subtotal)
  if (threshold <= 0 || remaining === null) return null

  const met = remaining <= 0
  const progress = met
    ? 100
    : Math.min(100, Math.max(4, Math.round((subtotal / threshold) * 100)))

  return (
    <div
      className={`shop-shipping-progress${met ? ' shop-shipping-progress--met' : ''}`}
    >
      <p className="shop-shipping-progress__text">
        {met
          ? 'Livrare gratuită deblocată pe această comandă.'
          : `Încă ${formatRon(remaining)} până la livrare gratuită (de la ${formatRon(threshold)}).`}
      </p>
      <div
        className="shop-shipping-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Progres până la livrare gratuită"
      >
        <span
          className="shop-shipping-progress__fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
