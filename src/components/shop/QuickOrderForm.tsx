import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ProductImage } from '../ProductImage'
import { useShopNotice } from './ShopNoticeProvider'
import { useAuth } from '../../contexts/AuthContext'
import { trackBeginCheckout, trackPurchase } from '../../lib/analytics'
import { metaCatalogId, metaContentsFromOrderItems } from '../../lib/metaCatalogCsv'
import { formatCheckoutCustomerAddress } from '../../lib/checkoutAddress'
import {
  getCheckoutAddons,
  loadCheckoutAddons,
  selectedCheckoutAddonIds,
  selectedCheckoutAddons,
  type CheckoutAddonDef,
  type CheckoutAddonId,
  type CheckoutAddonsSelection,
} from '../../lib/checkoutAddons'
import {
  getRoCounties,
  getRoCountyName,
  getRoLocalities,
  isDpdNomenclatureReady,
  loadDpdLocalities,
  loadDpdNomenclature,
  localitySelectKey,
  resolveDpdSite,
  resolveLocality,
} from '../../lib/roLocalities'
import { primaryImageUrl } from '../../lib/productImages'
import { clientStockLimit, formatRon, shopQtyUnit } from '../../lib/shopCatalog'
import { orderTotal, shippingCost } from '../../lib/shopShipping'
import { FreeShippingHint } from './FreeShippingHint'
import { saveCheckoutDraft, isCheckoutDraftEmail } from '../../lib/checkoutDrafts'
import { createOrder, isOrdersApiEnabled, redirectToCardPayment, startCardPayment, abandonUnpaidCardOrder } from '../../lib/ordersApi'
import { saveOrderAccessToken } from '../../lib/orderAccess'
import { isValidRoCui } from '../../lib/roCui'
import { isValidRoPhone, normalizeRoPhone, sanitizeRoPhoneInput } from '../../lib/roPhone'
import { SHOP_INFO_ROUTES } from '../../lib/siteLegal'
import type { BillingType, CheckoutApiCustomer, PaymentMethod } from '../../types/order'
import type { Product } from '../../types/product'

type QuickOrderFormProps = {
  product: Product
  /** Cantitatea aleasă pe pagina produsului (bundle 1/2/3). */
  quantity: number
  /** Totalul produsului pentru cantitatea aleasă (fără transport). */
  itemsTotal: number
  onOrderComplete?: () => void
}

type QuickOrderFields = {
  fullName: string
  email: string
  phone: string
  county: string
  city: string
  dpdSiteId?: number
  street: string
  streetNumber: string
  addressExtra: string
  billingType: BillingType
  companyName: string
  companyCui: string
  companyRegCom: string
}

const emptyFields: QuickOrderFields = {
  fullName: '',
  email: '',
  phone: '',
  county: '',
  city: '',
  street: '',
  streetNumber: '',
  addressExtra: '',
  billingType: 'person',
  companyName: '',
  companyCui: '',
  companyRegCom: '',
}

function validateQuickOrder(
  fields: QuickOrderFields,
  acceptedTerms: boolean,
  paymentMethod: PaymentMethod,
): string | null {
  if (!isDpdNomenclatureReady()) {
    return 'Listele de județe/localități DPD nu sunt încărcate. Reîncarcă pagina și încearcă din nou.'
  }

  const missing: string[] = []
  if (fields.fullName.trim().length < 3) missing.push('numele complet')
  if (!isValidRoPhone(fields.phone)) missing.push('telefonul (exact 10 cifre, începe cu 0)')
  if (paymentMethod === 'card') {
    const email = fields.email.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      missing.push('emailul (obligatoriu pentru plata cu cardul)')
    }
  }
  if (fields.billingType === 'company') {
    if (fields.companyName.trim().length < 2) missing.push('denumirea firmei')
    if (!isValidRoCui(fields.companyCui)) missing.push('CUI-ul firmei (valid)')
  }
  if (!fields.county.trim()) missing.push('județul')
  if (!fields.city.trim()) missing.push('localitatea')
  if (fields.street.trim().length < 2) missing.push('strada')
  if (!fields.streetNumber.trim()) missing.push('numărul')
  if (!acceptedTerms) missing.push('acceptarea termenilor și condițiilor')

  if (missing.length === 0) return null
  if (missing.length === 1) {
    return `Completează ${missing[0]} pentru a plasa comanda.`
  }
  const last = missing.pop()
  return `Completează ${missing.join(', ')} și ${last} pentru a plasa comanda.`
}

/** Împarte „Ion Popescu" în prenume + nume (best-effort, doar pentru câmpurile API). */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export function QuickOrderForm({
  product,
  quantity,
  itemsTotal,
  onOrderComplete,
}: QuickOrderFormProps) {
  const navigate = useNavigate()
  const { notify } = useShopNotice()
  const { user, isCustomer } = useAuth()
  const [fields, setFields] = useState<QuickOrderFields>(emptyFields)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [checkoutAddons, setCheckoutAddons] = useState<CheckoutAddonsSelection>({})
  const [addonCatalog, setAddonCatalog] = useState<CheckoutAddonDef[]>(() =>
    getCheckoutAddons(),
  )
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nomenReady, setNomenReady] = useState(false)
  const [nomenError, setNomenError] = useState<string | null>(null)
  const [localitiesTick, setLocalitiesTick] = useState(0)
  const [localitiesLoading, setLocalitiesLoading] = useState(false)
  const submitLockRef = useRef(false)

  const counties = useMemo(() => getRoCounties(), [nomenReady])
  const localities = useMemo(
    () => getRoLocalities(fields.county),
    [fields.county, nomenReady, localitiesTick],
  )

  const reloadNomenclature = () => {
    setNomenReady(false)
    setNomenError(null)
    void loadDpdNomenclature({ force: true })
      .then(() => {
        setNomenReady(true)
        setNomenError(null)
      })
      .catch((err: unknown) => {
        setNomenReady(false)
        setNomenError(
          err instanceof Error
            ? err.message
            : 'Nu am putut încărca localitățile DPD.',
        )
      })
  }

  useEffect(() => {
    let cancelled = false
    void loadDpdNomenclature()
      .then(() => {
        if (!cancelled) {
          setNomenReady(true)
          setNomenError(null)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setNomenReady(false)
        setNomenError(
          err instanceof Error
            ? err.message
            : 'Nu am putut încărca localitățile DPD.',
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const county = fields.county.trim()
    if (!nomenReady || !county) return
    let cancelled = false
    setLocalitiesLoading(true)
    void loadDpdLocalities(county)
      .then(() => {
        if (!cancelled) setLocalitiesTick((n) => n + 1)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setNomenError(
            err instanceof Error
              ? err.message
              : 'Nu am putut încărca localitățile pentru județ.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLocalitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fields.county, nomenReady])

  useEffect(() => {
    let cancelled = false
    void loadCheckoutAddons().then((addons) => {
      if (!cancelled) setAddonCatalog(addons)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const maxStock = clientStockLimit(product)
  const orderQty = Math.min(maxStock, Math.max(1, Math.floor(quantity)))
  const shipping = shippingCost(itemsTotal)
  const selectedAddons = selectedCheckoutAddons(checkoutAddons)
  const total = orderTotal(itemsTotal, { checkoutAddons })
  const productImage = primaryImageUrl(product)

  useEffect(() => {
    if (!isCustomer || !user?.email) return
    setFields((current) =>
      current.email.trim() ? current : { ...current, email: user.email },
    )
  }, [isCustomer, user?.email])

  useEffect(() => {
    const sku = metaCatalogId(product)
    if (!sku) return
    const fire = () =>
      trackBeginCheckout(orderQty, itemsTotal, [
        { id: sku, quantity: orderQty },
      ])
    fire()
    window.addEventListener('shoptop:cookies-all', fire)
    return () => window.removeEventListener('shoptop:cookies-all', fire)
  }, [product.id, product.sku, orderQty, itemsTotal])

  useEffect(() => {
    if (!isCheckoutDraftEmail(fields.email)) return
    const timer = window.setTimeout(() => {
      void saveCheckoutDraft({
        email: fields.email,
        phone: fields.phone,
        products: [product],
      })
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [fields.email, fields.phone, product.id, product.name, product.slug])

  const update = <K extends keyof QuickOrderFields>(key: K, value: QuickOrderFields[K]) => {
    setFields((current) => ({ ...current, [key]: value }))
  }

  const toggleCheckoutAddon = (id: CheckoutAddonId) => {
    setCheckoutAddons((current) => ({
      ...current,
      [id]: !current[id],
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || submitLockRef.current) return

    const validationMessage = validateQuickOrder(fields, acceptedTerms, paymentMethod)
    if (validationMessage) {
      setError(validationMessage)
      notify(validationMessage, 'Date incomplete')
      return
    }

    if (!isOrdersApiEnabled()) {
      setError('Comenzile online necesită API-ul configurat pe server.')
      return
    }

    submitLockRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      const { firstName, lastName } = splitName(fields.fullName)
      const countyName = fields.county ? getRoCountyName(fields.county) : ''
      const structured = {
        firstName,
        lastName,
        email: fields.email.trim(),
        phone: normalizeRoPhone(fields.phone),
        county: fields.county.trim(),
        city: fields.city.trim(),
        dpdSiteId:
          typeof fields.dpdSiteId === 'number' && fields.dpdSiteId > 0
            ? fields.dpdSiteId
            : undefined,
        street: fields.street.trim(),
        streetNumber: fields.streetNumber.trim(),
        addressExtra: fields.addressExtra.trim(),
        postalCode: '',
        notes: '',
        billingType: fields.billingType,
        companyName: fields.companyName.trim(),
        companyCui: fields.companyCui.trim(),
        companyRegCom: fields.companyRegCom.trim(),
      }
      const customer: CheckoutApiCustomer = {
        ...structured,
        name: fields.fullName.trim(),
        countyName,
        address: formatCheckoutCustomerAddress(structured),
      }

      const order = await createOrder({
        customer,
        paymentMethod,
        checkoutAddons,
        checkoutAddonIds: selectedCheckoutAddonIds(checkoutAddons),
        giftAddon: checkoutAddons.gift === true,
        acceptedTerms: true,
        items: [{ productId: product.id, quantity: orderQty }],
      })

      if (order.accessToken) {
        saveOrderAccessToken(order.id, order.accessToken)
      }

      if (paymentMethod === 'card') {
        try {
          const payment = await startCardPayment(order.id, order.accessToken)
          onOrderComplete?.()
          redirectToCardPayment(payment)
          return
        } catch (paymentErr: unknown) {
          await abandonUnpaidCardOrder(order.id, order.accessToken)
          throw paymentErr
        }
      }

      trackPurchase(
        order.id,
        order.totalAmount,
        metaContentsFromOrderItems(order.items, [product]),
      )
      onOrderComplete?.()
      navigate(`/comanda/${order.id}`, { state: { order } })
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Nu am putut trimite comanda. Încearcă din nou.'
      setError(message)
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <form className="shop-quick-order" onSubmit={handleSubmit}>
      <div className="shop-quick-order__head">
        <h2 className="shop-quick-order__title">Comandă rapidă</h2>
        <p className="shop-quick-order__lead">
          Completează datele de livrare și alege metoda de plată. Confirmarea
          ajunge pe SMS. Poți plăti ramburs la curier sau online cu cardul.
        </p>
      </div>

      <div className="shop-quick-order__product">
        <div className="shop-quick-order__thumb">
          <ProductImage
            src={productImage}
            alt={product.name || 'Produs'}
            className="shop-quick-order__thumb-img"
            placeholderClassName="shop-quick-order__thumb-img"
          />
        </div>
        <div className="shop-quick-order__product-info">
          <span className="shop-quick-order__product-name">
            {product.name || 'Produs'}
          </span>
          <span className="shop-quick-order__product-qty muted">
            {orderQty} {shopQtyUnit(product.name, orderQty, 'full')}
            {isCustomer && user?.email ? ` · ${user.email}` : ''}
          </span>
        </div>
        <strong className="shop-quick-order__product-total">
          {formatRon(itemsTotal)}
        </strong>
      </div>

      <div className="shop-quick-order__grid">
        <fieldset className="shop-payment shop-field--wide shop-quick-order__billing-type">
          <legend>Facturare</legend>
          <label className="shop-payment__option">
            <input
              type="radio"
              name="quickBillingType"
              checked={fields.billingType === 'person'}
              onChange={() => update('billingType', 'person')}
            />
            <span>
              <strong>Persoană fizică</strong>
            </span>
          </label>
          <label className="shop-payment__option">
            <input
              type="radio"
              name="quickBillingType"
              checked={fields.billingType === 'company'}
              onChange={() => update('billingType', 'company')}
            />
            <span>
              <strong>Firmă</strong>
            </span>
          </label>
        </fieldset>
        <label className="shop-field shop-field--wide">
          <span>Nume și prenume</span>
          <input
            value={fields.fullName}
            onChange={(event) => update('fullName', event.target.value)}
            required
            autoComplete="name"
            placeholder="ex: Ion Popescu"
          />
        </label>
        {fields.billingType === 'company' ? (
          <>
            <label className="shop-field shop-field--wide">
              <span>Denumire firmă</span>
              <input
                value={fields.companyName}
                onChange={(event) => update('companyName', event.target.value)}
                required
                autoComplete="organization"
              />
            </label>
            <label className="shop-field">
              <span>CUI</span>
              <input
                value={fields.companyCui}
                onChange={(event) => update('companyCui', event.target.value)}
                required
                placeholder="ex. 54732560"
                autoComplete="off"
              />
            </label>
            <label className="shop-field">
              <span>Reg. Com. (opțional)</span>
              <input
                value={fields.companyRegCom}
                onChange={(event) => update('companyRegCom', event.target.value)}
                autoComplete="off"
              />
            </label>
          </>
        ) : null}
        <label className="shop-field shop-field--wide">
          <span>Telefon *</span>
          <input
            value={fields.phone}
            onChange={(event) => update('phone', sanitizeRoPhoneInput(event.target.value))}
            required
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            minLength={10}
            pattern="0[0-9]{9}"
            title="Exact 10 cifre, începe cu 0"
            placeholder="07xxxxxxxx"
          />
          <span className="shop-field__hint muted">
            Primești confirmarea comenzii pe SMS.
          </span>
        </label>
        <label className="shop-field shop-field--wide">
          <span>
            Email{paymentMethod === 'card' ? ' *' : ' (opțional, în plus față de SMS)'}
          </span>
          <input
            type="email"
            value={fields.email}
            onChange={(event) => update('email', event.target.value)}
            autoComplete="email"
            required={paymentMethod === 'card'}
            placeholder="ex: ion@email.ro"
          />
        </label>
        {nomenError ? (
          <div className="shop-field shop-field--wide" role="alert">
            <p className="shop-form__error">
              Nu pot încărca localitățile DPD: {nomenError}
            </p>
            <button
              type="button"
              className="shop-btn shop-btn--ghost"
              onClick={reloadNomenclature}
            >
              Reîncearcă încărcarea
            </button>
          </div>
        ) : null}
        {!nomenReady && !nomenError ? (
          <p className="shop-field shop-field--wide muted">
            Se încarcă județele și localitățile din nomenclatorul DPD…
          </p>
        ) : null}
        <label className="shop-field">
          <span>Județ</span>
          <select
            value={fields.county}
            onChange={(event) => {
              const county = event.target.value
              setFields((current) => ({
                ...current,
                county,
                city: '',
                dpdSiteId: undefined,
              }))
            }}
            required
            disabled={!nomenReady}
            autoComplete="address-level1"
          >
            <option value="">
              {nomenReady ? 'Selectează județul' : 'Se încarcă…'}
            </option>
            {counties.map((county) => (
              <option key={county.code} value={county.code}>
                {county.name}
              </option>
            ))}
          </select>
        </label>
        <label className="shop-field">
          <span>Localitate</span>
          <select
            value={fields.city}
            onChange={(event) => {
              const loc = resolveLocality(localities, event.target.value)
              const county = fields.county
              const cityName = loc?.name ?? event.target.value
              if (loc && loc.id > 0) {
                setFields((current) => ({
                  ...current,
                  dpdSiteId: loc.id,
                  city: loc.name,
                }))
                return
              }
              setFields((current) => ({
                ...current,
                dpdSiteId: undefined,
                city: cityName,
              }))
              if (!cityName || !county) return
              void resolveDpdSite(county, cityName)
                .then((resolved) => {
                  setFields((current) => {
                    if (current.city !== cityName) return current
                    return {
                      ...current,
                      dpdSiteId: resolved.id > 0 ? resolved.id : undefined,
                      city: resolved.name,
                    }
                  })
                })
                .catch((err: unknown) => {
                  setError(
                    err instanceof Error
                      ? err.message
                      : 'Nu am putut valida localitatea în DPD.',
                  )
                })
            }}
            required
            disabled={!nomenReady || !fields.county || localitiesLoading}
            autoComplete="address-level2"
          >
            <option value="">
              {!nomenReady
                ? 'Se încarcă…'
                : localitiesLoading
                  ? 'Se încarcă localitățile…'
                  : fields.county
                    ? 'Selectează localitatea'
                    : 'Alege mai întâi județul'}
            </option>
            {localities.map((city) => (
              <option key={localitySelectKey(city)} value={city.name}>
                {city.name}
                {city.postCode ? ` (${city.postCode})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="shop-field shop-field--street">
          <span>Stradă</span>
          <input
            value={fields.street}
            onChange={(event) => update('street', event.target.value)}
            required
            autoComplete="address-line1"
          />
        </label>
        <label className="shop-field shop-field--number">
          <span>Nr.</span>
          <input
            value={fields.streetNumber}
            onChange={(event) => update('streetNumber', event.target.value)}
            required
            autoComplete="address-line2"
          />
        </label>
        <label className="shop-field shop-field--wide">
          <span>Bloc / scară / apt. (opțional)</span>
          <input
            value={fields.addressExtra}
            onChange={(event) => update('addressExtra', event.target.value)}
            placeholder="ex: Bl. A, Sc. 2, Et. 3, Ap. 12"
            autoComplete="address-line3"
          />
        </label>
      </div>

      <div className="shop-checkout__bumps shop-quick-order__bumps" aria-label="Opțiuni suplimentare">
        <p className="shop-checkout__bumps-title">Completează comanda</p>
        {addonCatalog.map((addon) => {
          const active = checkoutAddons[addon.id] === true
          return (
            <label
              key={addon.id}
              className={`shop-checkout__bump${
                active ? ' shop-checkout__bump--active' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggleCheckoutAddon(addon.id)}
              />
              <span className="shop-checkout__bump-body">
                <span className="shop-checkout__bump-head">
                  <strong>{addon.title}</strong>
                  <span className="shop-checkout__bump-price">
                    +{formatRon(addon.priceRon)}
                  </span>
                </span>
                <span className="shop-checkout__bump-hint muted">
                  {addon.hint}
                </span>
              </span>
            </label>
          )
        })}
      </div>

      <fieldset className="shop-payment shop-quick-order__payment">
        <legend className="shop-payment__legend">Metodă de plată</legend>
        <label
          className={`shop-payment__option${
            paymentMethod === 'cod' ? ' shop-payment__option--active' : ''
          }`}
        >
          <input
            type="radio"
            name="quickOrderPaymentMethod"
            value="cod"
            checked={paymentMethod === 'cod'}
            onChange={() => setPaymentMethod('cod')}
          />
          <span>
            <strong>Plată la livrare (ramburs)</strong>
            <span className="muted"> — plătești curierului la primire.</span>
          </span>
        </label>
        <label
          className={`shop-payment__option${
            paymentMethod === 'card' ? ' shop-payment__option--active' : ''
          }`}
        >
          <input
            type="radio"
            name="quickOrderPaymentMethod"
            value="card"
            checked={paymentMethod === 'card'}
            onChange={() => setPaymentMethod('card')}
          />
          <span>
            <strong>Card online (Netopia)</strong>
            <img
              className="shop-netopia-badge shop-netopia-badge--light"
              src="/badges/netopia.svg"
              alt="Netopia Payments - plăți online securizate"
              width="122"
              height="22"
            />
            <img
              className="shop-netopia-badge shop-netopia-badge--dark"
              src="/badges/netopia-white.svg"
              alt="Netopia Payments - plăți online securizate"
              width="122"
              height="22"
            />
            <span className="muted">
              {' '}
              — ești redirecționat securizat pentru plata cu cardul.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="shop-quick-order__summary">
        <FreeShippingHint subtotal={itemsTotal} />
        <div className="shop-quick-order__summary-row">
          <span className="shop-quick-order__summary-product">
            {product.name?.trim() || 'Produs'} × {orderQty}
          </span>
          <strong>{formatRon(itemsTotal)}</strong>
        </div>
        <div className="shop-quick-order__summary-row">
          <span>Transport</span>
          <strong>{shipping <= 0 ? 'Gratuit' : formatRon(shipping)}</strong>
        </div>
        {selectedAddons.map((addon) => (
          <div key={addon.id} className="shop-quick-order__summary-row">
            <span>{addon.title}</span>
            <strong>{formatRon(addon.priceRon)}</strong>
          </div>
        ))}
        <div className="shop-quick-order__summary-row shop-quick-order__summary-row--total">
          <span>
            {paymentMethod === 'card' ? 'Total de plată' : 'Total de plată la livrare'}
          </span>
          <strong>{formatRon(total)}</strong>
        </div>
      </div>

      <label className="shop-field shop-field--wide shop-field--checkbox shop-quick-order__terms">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          required
        />
        <span>
          Sunt de acord cu{' '}
          <Link to={SHOP_INFO_ROUTES.terms}>termenii și condițiile</Link> și{' '}
          <Link to={SHOP_INFO_ROUTES.privacy}>politica de confidențialitate</Link>.
        </span>
      </label>

      {error ? (
        <p className="shop-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="shop-btn shop-btn--primary shop-btn--block shop-quick-order__submit"
        disabled={submitting}
      >
        {submitting
          ? paymentMethod === 'card'
            ? 'Se pregătește plata…'
            : 'Se trimite comanda…'
          : paymentMethod === 'card'
            ? `Continuă spre plată · ${formatRon(total)}`
            : `Comandă acum · ${formatRon(total)}`}
      </button>
      <p className="shop-quick-order__note muted">
        {paymentMethod === 'card'
          ? 'Comandă în siguranță · fără cont · plată online prin Netopia.'
          : 'Comandă în siguranță · fără cont · plătești ramburs la primire.'}
      </p>
    </form>
  )
}
