import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShopLayout } from '../components/shop/ShopLayout'
import { useShopNotice } from '../components/shop/ShopNoticeProvider'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { trackBeginCheckout, trackPurchase } from '../lib/analytics'
import { metaCatalogId, metaContentsFromOrderItems } from '../lib/metaCatalogCsv'
import { toCheckoutApiCustomer } from '../lib/checkoutAddress'
import { getCheckoutValidationMessage } from '../lib/checkoutValidation'
import { saveOrderAccessToken } from '../lib/orderAccess'
import { createOrder, isOrdersApiEnabled, startCardPayment, redirectToCardPayment, abandonUnpaidCardOrder } from '../lib/ordersApi'
import { sanitizeRoPhoneInput } from '../lib/roPhone'
import type { PaymentMethod } from '../types/order'
import { SHOP_INFO_ROUTES, SITE_LEGAL } from '../lib/siteLegal'
import {
  getCheckoutAddons,
  loadCheckoutAddons,
  selectedCheckoutAddonIds,
  selectedCheckoutAddons,
  type CheckoutAddonDef,
  type CheckoutAddonId,
  type CheckoutAddonsSelection,
} from '../lib/checkoutAddons'
import {
  getRoCounties,
  getRoLocalities,
  loadDpdLocalities,
  loadDpdNomenclature,
  localitySelectKey,
  resolveDpdSite,
  resolveLocality,
} from '../lib/roLocalities'
import { cartLineTotal, formatRon } from '../lib/shopCatalog'
import { orderTotal, shippingCost, shippingSummaryLabel } from '../lib/shopShipping'
import { FreeShippingHint } from '../components/shop/FreeShippingHint'
import type { CheckoutCustomer } from '../types/order'
import { saveCheckoutDraft, isCheckoutDraftEmail } from '../lib/checkoutDrafts'

type CheckoutPageProps = {
  onOrderComplete?: () => void
}

const emptyCustomer: CheckoutCustomer = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  county: '',
  city: '',
  street: '',
  streetNumber: '',
  addressExtra: '',
  postalCode: '',
  notes: '',
  billingType: 'person',
  companyName: '',
  companyCui: '',
  companyRegCom: '',
}

export function CheckoutPage({ onOrderComplete }: CheckoutPageProps) {
  const navigate = useNavigate()
  const { user, isCustomer } = useAuth()
  const { lines, subtotal, clearCart } = useCart()
  const [customer, setCustomer] = useState<CheckoutCustomer>(emptyCustomer)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [checkoutAddons, setCheckoutAddons] = useState<CheckoutAddonsSelection>({})
  const [addonCatalog, setAddonCatalog] = useState<CheckoutAddonDef[]>(() =>
    getCheckoutAddons(),
  )
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Blochează dublu-trimitere înainte ca setSubmitting(true) să fie vizibil în stare. */
  const orderSubmitLockRef = useRef(false)
  const { notify } = useShopNotice()
  const [nomenReady, setNomenReady] = useState(false)
  const [nomenError, setNomenError] = useState<string | null>(null)
  const [localitiesTick, setLocalitiesTick] = useState(0)
  const [localitiesLoading, setLocalitiesLoading] = useState(false)
  const shipping = shippingCost(subtotal)
  const selectedAddons = selectedCheckoutAddons(checkoutAddons)
  const total = orderTotal(subtotal, { checkoutAddons })
  const counties = useMemo(() => getRoCounties(), [nomenReady])
  const localities = useMemo(
    () => getRoLocalities(customer.county),
    [customer.county, nomenReady, localitiesTick],
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
    const county = customer.county.trim()
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
  }, [customer.county, nomenReady])

  useEffect(() => {
    let cancelled = false
    void loadCheckoutAddons().then((addons) => {
      if (!cancelled) setAddonCatalog(addons)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const updateCustomer = <K extends keyof CheckoutCustomer>(
    key: K,
    value: CheckoutCustomer[K],
  ) => {
    setCustomer((current) => ({ ...current, [key]: value }))
  }

  const toggleCheckoutAddon = (id: CheckoutAddonId) => {
    setCheckoutAddons((current) => ({
      ...current,
      [id]: !current[id],
    }))
  }

  usePageMeta({
    title: `Checkout — ${SITE_LEGAL.brandName}`,
    description: 'Finalizează comanda cu livrare prin curier și plată ramburs sau cu cardul.',
    path: '/checkout',
    robots: 'noindex, nofollow',
  })

  useEffect(() => {
    if (lines.length === 0) return
    const contents = lines
      .map((line) => ({
        id: metaCatalogId(line.product),
        quantity: line.quantity,
      }))
      .filter((line) => line.id !== '')
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
    const fire = () => trackBeginCheckout(itemCount, subtotal, contents)
    fire()
    window.addEventListener('shoptop:cookies-all', fire)
    return () => window.removeEventListener('shoptop:cookies-all', fire)
  }, [lines, subtotal])

  useEffect(() => {
    if (!isCustomer || !user?.email) return
    setCustomer((current) =>
      current.email.trim() ? current : { ...current, email: user.email },
    )
  }, [isCustomer, user?.email])

  useEffect(() => {
    if (!isCheckoutDraftEmail(customer.email) || lines.length === 0) return
    const timer = window.setTimeout(() => {
      void saveCheckoutDraft({
        email: customer.email,
        phone: customer.phone,
        products: lines.map((line) => line.product),
      })
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [customer.email, customer.phone, lines])

  if (lines.length === 0) {
    return (
      <ShopLayout>
        <section className="shop-page">
          <div className="shop-empty-panel">
            <p className="muted">Nu ai produse în coș.</p>
            <Link className="shop-btn shop-btn--primary" to="/">
              Mergi la catalog
            </Link>
          </div>
        </section>
      </ShopLayout>
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || orderSubmitLockRef.current) return

    const validationMessage = getCheckoutValidationMessage(
      customer,
      acceptedTerms,
      paymentMethod,
    )
    if (validationMessage) {
      notify(validationMessage, 'Date incomplete')
      return
    }

    if (!isOrdersApiEnabled()) {
      setError('Comenzile online necesită API-ul configurat pe server.')
      return
    }

    orderSubmitLockRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      const order = await createOrder({
        customer: toCheckoutApiCustomer(customer),
        paymentMethod,
        checkoutAddons,
        checkoutAddonIds: selectedCheckoutAddonIds(checkoutAddons),
        giftAddon: checkoutAddons.gift === true,
        acceptedTerms: true,
        items: lines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
      })
      if (order.accessToken) {
        saveOrderAccessToken(order.id, order.accessToken)
      }

      if (paymentMethod === 'card') {
        try {
          const payment = await startCardPayment(order.id, order.accessToken)
          clearCart()
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
        metaContentsFromOrderItems(
          order.items,
          lines.map((line) => line.product),
        ),
      )
      clearCart()
      onOrderComplete?.()
      navigate(`/comanda/${order.id}`, { state: { order } })
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Nu am putut trimite comanda. Încearcă din nou.'
      setError(message)
    } finally {
      orderSubmitLockRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <ShopLayout>
      <section className="shop-page shop-page--checkout">
        <div className="shop-page__head">
          <h1 className="shop-page__title">Checkout</h1>
          <p className="shop-page__lead muted">
            Completează datele de livrare și alege metoda de plată.
          </p>
        </div>

        <div className="shop-checkout">
          <form className="shop-form" onSubmit={handleSubmit}>
            <fieldset className="shop-payment shop-checkout__billing-type">
              <legend>Facturare</legend>
              <label className="shop-payment__option">
                <input
                  type="radio"
                  name="billingType"
                  checked={customer.billingType === 'person'}
                  onChange={() => updateCustomer('billingType', 'person')}
                />
                <span>
                  <strong>Persoană fizică</strong>
                </span>
              </label>
              <label className="shop-payment__option">
                <input
                  type="radio"
                  name="billingType"
                  checked={customer.billingType === 'company'}
                  onChange={() => updateCustomer('billingType', 'company')}
                />
                <span>
                  <strong>Firmă</strong>
                </span>
              </label>
            </fieldset>

            <div className="shop-form__grid">
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
                <span>Nume</span>
                <input
                  value={customer.lastName}
                  onChange={(event) => updateCustomer('lastName', event.target.value)}
                  required
                  autoComplete="family-name"
                />
              </label>
              <label className="shop-field">
                <span>Prenume</span>
                <input
                  value={customer.firstName}
                  onChange={(event) => updateCustomer('firstName', event.target.value)}
                  required
                  autoComplete="given-name"
                />
              </label>
              {customer.billingType === 'company' ? (
                <>
                  <label className="shop-field shop-field--wide">
                    <span>Denumire firmă</span>
                    <input
                      value={customer.companyName}
                      onChange={(event) =>
                        updateCustomer('companyName', event.target.value)
                      }
                      required
                      autoComplete="organization"
                    />
                  </label>
                  <label className="shop-field">
                    <span>CUI</span>
                    <input
                      value={customer.companyCui}
                      onChange={(event) =>
                        updateCustomer('companyCui', event.target.value)
                      }
                      required
                      placeholder="ex. 54732560"
                      autoComplete="off"
                    />
                  </label>
                  <label className="shop-field">
                    <span>Reg. Com. (opțional)</span>
                    <input
                      value={customer.companyRegCom}
                      onChange={(event) =>
                        updateCustomer('companyRegCom', event.target.value)
                      }
                      autoComplete="off"
                    />
                  </label>
                </>
              ) : null}
              <label className="shop-field">
                <span>Telefon *</span>
                <input
                  value={customer.phone}
                  onChange={(event) =>
                    updateCustomer('phone', sanitizeRoPhoneInput(event.target.value))
                  }
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
              <label className="shop-field">
                <span>
                  Email{paymentMethod === 'card' ? '' : ' (opțional, în plus față de SMS)'}
                  {paymentMethod === 'card' ? ' *' : ''}
                </span>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(event) => updateCustomer('email', event.target.value)}
                  autoComplete="email"
                  required={paymentMethod === 'card'}
                />
              </label>
              <label className="shop-field">
                <span>Județ</span>
                <select
                  value={customer.county}
                  onChange={(event) => {
                    const county = event.target.value
                    setCustomer((current) => ({
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
                  value={customer.city}
                  onChange={(event) => {
                    const loc = resolveLocality(localities, event.target.value)
                    const county = customer.county
                    const cityName = loc?.name ?? event.target.value
                    // Din cache DPD: siteId real — nu mai e nevoie de resolve.
                    if (loc && loc.id > 0) {
                      setCustomer((current) => ({
                        ...current,
                        dpdSiteId: loc.id,
                        city: loc.name,
                        postalCode:
                          loc.postCode?.trim() || current.postalCode,
                      }))
                      return
                    }
                    setCustomer((current) => ({
                      ...current,
                      dpdSiteId: undefined,
                      city: cityName,
                      postalCode:
                        loc?.postCode && loc.postCode.trim()
                          ? loc.postCode.trim()
                          : current.postalCode,
                    }))
                    if (!cityName || !county) return
                    void resolveDpdSite(county, cityName)
                      .then((resolved) => {
                        setCustomer((current) => {
                          if (current.city !== cityName) return current
                          return {
                            ...current,
                            dpdSiteId: resolved.id > 0 ? resolved.id : undefined,
                            city: resolved.name,
                            postalCode:
                              resolved.postCode?.trim() || current.postalCode,
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
                  disabled={!nomenReady || !customer.county || localitiesLoading}
                  autoComplete="address-level2"
                >
                  <option value="">
                    {!nomenReady
                      ? 'Se încarcă…'
                      : localitiesLoading
                        ? 'Se încarcă localitățile…'
                        : customer.county
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
                  value={customer.street}
                  onChange={(event) => updateCustomer('street', event.target.value)}
                  required
                  autoComplete="address-line1"
                />
              </label>
              <label className="shop-field shop-field--number">
                <span>Nr.</span>
                <input
                  value={customer.streetNumber}
                  onChange={(event) =>
                    updateCustomer('streetNumber', event.target.value)
                  }
                  required
                  autoComplete="address-line2"
                />
              </label>
              <label className="shop-field shop-field--wide">
                <span>Bloc / scară / apt. (opțional)</span>
                <input
                  value={customer.addressExtra}
                  onChange={(event) =>
                    updateCustomer('addressExtra', event.target.value)
                  }
                  placeholder="ex: Bl. A, Sc. 2, Et. 3, Ap. 12"
                  autoComplete="address-line3"
                />
              </label>
              <label className="shop-field">
                <span>Cod poștal (opțional)</span>
                <input
                  value={customer.postalCode}
                  onChange={(event) =>
                    updateCustomer('postalCode', event.target.value)
                  }
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              </label>
              <label className="shop-field shop-field--wide">
                <span>Observații (opțional)</span>
                <textarea
                  value={customer.notes}
                  onChange={(event) => updateCustomer('notes', event.target.value)}
                  rows={3}
                />
              </label>
            </div>

            <div className="shop-checkout__delivery-note">
              <p>
                <strong>Livrare prin curier</strong>
                <span className="muted">
                  {' '}
                  — transport {shipping <= 0 ? 'gratuit' : formatRon(shipping)} · plată
                  ramburs sau cu cardul.
                </span>
              </p>
            </div>

            <div className="shop-checkout__bumps" aria-label="Opțiuni suplimentare">
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

            <fieldset className="shop-payment">
              <legend className="shop-payment__legend">Metodă de plată</legend>
              <label
                className={`shop-payment__option${
                  paymentMethod === 'cod' ? ' shop-payment__option--active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
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
                  name="paymentMethod"
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

            <label className="shop-field shop-field--wide shop-field--checkbox">
              <input
                type="checkbox"
                name="acceptedTerms"
                required
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
              />
              <span>
                Accept{' '}
                <Link to={SHOP_INFO_ROUTES.terms}>termenii și condițiile</Link>{' '}
                și{' '}
                <Link to={SHOP_INFO_ROUTES.privacy}>
                  politica de confidențialitate
                </Link>
                . Datele furnizate sunt folosite pentru livrarea comenzii.
              </span>
            </label>

            {error ? (
              <p className="shop-form__error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="shop-btn shop-btn--primary shop-btn--block"
              disabled={submitting}
            >
              {submitting
                ? 'Se trimite comanda…'
                : paymentMethod === 'card'
                  ? 'Continuă spre plată'
                  : 'Plasează comanda'}
            </button>
          </form>

          <aside className="shop-summary">
            <h2 className="shop-summary__title">Comanda ta</h2>
            <FreeShippingHint subtotal={subtotal} />
            <ul className="shop-summary__items">
              {lines.map((line) => (
                <li key={line.product.id} className="shop-summary__item">
                  <span>
                    {line.product.name} × {line.quantity}
                  </span>
                  <strong>
                      {formatRon(cartLineTotal(line.product, line.quantity))}
                  </strong>
                </li>
              ))}
            </ul>
            <div className="shop-summary__row">
              <span>Subtotal</span>
              <strong>{formatRon(subtotal)}</strong>
            </div>
            <div className="shop-summary__row">
              <span>Transport</span>
              <strong>{shipping <= 0 ? 'Gratuit' : formatRon(shipping)}</strong>
            </div>
            {selectedAddons.map((addon) => (
              <div key={addon.id} className="shop-summary__row">
                <span>{addon.title}</span>
                <strong>{formatRon(addon.priceRon)}</strong>
              </div>
            ))}
            <div className="shop-summary__row shop-summary__row--total">
              <span>Total</span>
              <strong>{formatRon(total)}</strong>
            </div>
            <p className="shop-summary__note muted">
              {shippingSummaryLabel(subtotal)}. Confirmarea pleacă pe SMS la
              numărul completat
              {customer.email.trim() ? ' și pe email.' : '.'}
            </p>
            <div className="shop-summary__actions">
              <Link className="shop-btn shop-btn--ghost shop-btn--block" to="/cos">
                Înapoi la coș
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </ShopLayout>
  )
}
