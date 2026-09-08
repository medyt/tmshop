import { useEffect, useMemo, useState } from 'react'
import { toCheckoutApiCustomer } from '../../lib/checkoutAddress'
import { isValidRoCui } from '../../lib/roCui'
import { isValidRoPhone, sanitizeRoPhoneInput } from '../../lib/roPhone'
import {
  getRoCounties,
  getRoCountyName,
  getRoLocalities,
  loadDpdLocalities,
  loadDpdNomenclature,
  localitySelectKey,
  resolveDpdSite,
  resolveLocality,
} from '../../lib/roLocalities'
import { createOrder } from '../../lib/ordersApi'
import { clientStockLimit, formatRon } from '../../lib/shopCatalog'
import { orderTotal, shippingCost } from '../../lib/shopShipping'
import type { BillingType, Order } from '../../types/order'
import type { Product } from '../../types/product'

type LineDraft = {
  key: string
  productId: string
  productName: string
  productSku?: string
  unitPrice: number
  quantity: number
}

type Props = {
  products: Product[]
  productsLoading?: boolean
  onClose: () => void
  onCreated: (order: Order) => void
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function emptyForm() {
  return {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerNotes: '',
    billingType: 'person' as BillingType,
    companyName: '',
    companyCui: '',
    companyRegCom: '',
    shipCounty: '',
    shipCity: '',
    shipStreet: '',
    shipStreetNumber: '',
    shipAddressExtra: '',
    shipPostalCode: '',
    dpdSiteId: undefined as number | undefined,
  }
}

export function OrderCreateModal({
  products,
  productsLoading = false,
  onClose,
  onCreated,
}: Props) {
  const [form, setForm] = useState(emptyForm)
  const [lines, setLines] = useState<LineDraft[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [pickQty, setPickQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nomenReady, setNomenReady] = useState(false)
  const [nomenError, setNomenError] = useState<string | null>(null)
  const [localitiesTick, setLocalitiesTick] = useState(0)
  const [localitiesLoading, setLocalitiesLoading] = useState(false)

  const counties = useMemo(() => getRoCounties(), [nomenReady])
  const localities = useMemo(
    () => getRoLocalities(form.shipCounty),
    [form.shipCounty, nomenReady, localitiesTick],
  )

  const sellableProducts = useMemo(
    () =>
      [...products]
        .filter((p) => p.stockQty == null || p.stockQty > 0)
        .sort((a, b) => a.name.localeCompare(b.name, 'ro')),
    [products],
  )

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLocaleLowerCase('ro')
    if (!q) return sellableProducts.slice(0, 40)
    return sellableProducts
      .filter((p) => {
        const hay = `${p.name} ${p.sku ?? ''} ${p.id}`.toLocaleLowerCase('ro')
        return hay.includes(q)
      })
      .slice(0, 40)
  }, [productQuery, sellableProducts])

  const itemsSubtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [lines],
  )
  const shipping = shippingCost(itemsSubtotal)
  const total = orderTotal(itemsSubtotal)

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
        if (!cancelled) {
          setNomenReady(false)
          setNomenError(
            err instanceof Error
              ? err.message
              : 'Nu am putut încărca județele/localitățile.',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const county = form.shipCounty.trim()
    if (!county || !nomenReady) return
    let cancelled = false
    setLocalitiesLoading(true)
    void loadDpdLocalities(county)
      .then(() => {
        if (!cancelled) setLocalitiesTick((n) => n + 1)
      })
      .finally(() => {
        if (!cancelled) setLocalitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [form.shipCounty, nomenReady])

  const updateForm = <K extends keyof ReturnType<typeof emptyForm>>(
    key: K,
    value: ReturnType<typeof emptyForm>[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleAddProduct = (product: Product) => {
    const max = clientStockLimit(product)
    const qty = Math.max(1, Math.min(pickQty, max > 0 ? max : pickQty))
    setError(null)
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id)
      if (existing) {
        const nextQty = Math.min(
          existing.quantity + qty,
          max > 0 ? max : existing.quantity + qty,
        )
        return current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: nextQty }
            : line,
        )
      }
      return [
        ...current,
        {
          key: `${product.id}-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          unitPrice: product.salePrice,
          quantity: qty,
        },
      ]
    })
    setProductQuery('')
    setPickQty(1)
  }

  const handleSubmit = () => {
    if (busy) return

    if (form.customerName.trim().length < 3) {
      setError('Numele clientului este obligatoriu.')
      return
    }
    if (!isValidRoPhone(form.customerPhone)) {
      setError('Telefonul trebuie să aibă exact 10 cifre și să înceapă cu 0.')
      return
    }
    if (!form.shipCounty.trim() || !form.shipCity.trim()) {
      setError('Alege județul și localitatea.')
      return
    }
    if (!form.shipStreet.trim() || !form.shipStreetNumber.trim()) {
      setError('Strada și numărul sunt obligatorii.')
      return
    }
    if (form.billingType === 'company') {
      if (form.companyName.trim().length < 2) {
        setError('Denumirea firmei este obligatorie.')
        return
      }
      if (!isValidRoCui(form.companyCui)) {
        setError('CUI-ul firmei este invalid.')
        return
      }
    }
    if (lines.length === 0) {
      setError('Adaugă cel puțin un produs.')
      return
    }

    const { firstName, lastName } = splitName(form.customerName)
    const notesParts = ['Comandă telefonică']
    if (form.customerNotes.trim()) notesParts.push(form.customerNotes.trim())

    const customer = toCheckoutApiCustomer({
      firstName,
      lastName,
      email: form.customerEmail,
      phone: form.customerPhone,
      county: form.shipCounty,
      city: form.shipCity,
      dpdSiteId: form.dpdSiteId,
      street: form.shipStreet,
      streetNumber: form.shipStreetNumber,
      addressExtra: form.shipAddressExtra,
      postalCode: form.shipPostalCode,
      notes: notesParts.join(' · '),
      billingType: form.billingType,
      companyName: form.companyName,
      companyCui: form.companyCui,
      companyRegCom: form.companyRegCom,
    })

    setBusy(true)
    setError(null)
    void createOrder({
      customer,
      paymentMethod: 'cod',
      acceptedTerms: true,
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
    })
      .then((order) => {
        onCreated(order)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut crea comanda.',
        )
      })
      .finally(() => setBusy(false))
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="modal-panel modal-panel--wide panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-create-title"
      >
        <div className="modal-panel__body">
          <div className="product-form__title-row">
            <h2 id="order-create-title" className="product-form__title">
              Adaugă comandă telefonică
            </h2>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              disabled={busy}
              aria-label="Închide"
            >
              ×
            </button>
          </div>

          <p className="muted small">
            Comandă manuală (telefon) — plată ramburs. Județ/localitate din
            nomenclatorul DPD.
            {form.shipCounty ? ` Județ: ${getRoCountyName(form.shipCounty)}.` : ''}
          </p>

          {error ? (
            <p className="app-status app-status--error" role="alert">
              {error}
            </p>
          ) : null}
          {nomenError ? (
            <p className="app-status app-status--error" role="alert">
              {nomenError}
            </p>
          ) : null}

          <div className="order-edit__grid">
            <section className="order-edit__card">
              <h3>Client &amp; livrare</h3>
              {!nomenReady && !nomenError ? (
                <p className="muted small">Se încarcă nomenclatorul DPD…</p>
              ) : null}

              <div className="order-edit__form">
                <label className="field">
                  <span>Nume client</span>
                  <input
                    value={form.customerName}
                    onChange={(e) => updateForm('customerName', e.target.value)}
                    disabled={busy}
                    autoComplete="name"
                    placeholder="Prenume Nume"
                  />
                </label>
                <label className="field">
                  <span>Telefon</span>
                  <input
                    value={form.customerPhone}
                    onChange={(e) =>
                      updateForm('customerPhone', sanitizeRoPhoneInput(e.target.value))
                    }
                    disabled={busy}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    minLength={10}
                    pattern="0[0-9]{9}"
                    title="Exact 10 cifre, începe cu 0"
                    placeholder="07xxxxxxxx"
                  />
                </label>
                <label className="field">
                  <span>Email (opțional)</span>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => updateForm('customerEmail', e.target.value)}
                    disabled={busy}
                    autoComplete="email"
                  />
                </label>

                <fieldset className="order-edit__billing">
                  <legend>Facturare</legend>
                  <label className="order-edit__radio">
                    <input
                      type="radio"
                      name="createBillingType"
                      checked={form.billingType === 'person'}
                      onChange={() => updateForm('billingType', 'person')}
                      disabled={busy}
                    />
                    Persoană fizică
                  </label>
                  <label className="order-edit__radio">
                    <input
                      type="radio"
                      name="createBillingType"
                      checked={form.billingType === 'company'}
                      onChange={() => updateForm('billingType', 'company')}
                      disabled={busy}
                    />
                    Firmă
                  </label>
                </fieldset>

                {form.billingType === 'company' ? (
                  <>
                    <label className="field">
                      <span>Denumire firmă</span>
                      <input
                        value={form.companyName}
                        onChange={(e) =>
                          updateForm('companyName', e.target.value)
                        }
                        disabled={busy}
                      />
                    </label>
                    <div className="order-edit__row2">
                      <label className="field">
                        <span>CUI</span>
                        <input
                          value={form.companyCui}
                          onChange={(e) =>
                            updateForm('companyCui', e.target.value)
                          }
                          disabled={busy}
                        />
                      </label>
                      <label className="field">
                        <span>Reg. Com. (opțional)</span>
                        <input
                          value={form.companyRegCom}
                          onChange={(e) =>
                            updateForm('companyRegCom', e.target.value)
                          }
                          disabled={busy}
                        />
                      </label>
                    </div>
                  </>
                ) : null}

                <label className="field">
                  <span>Județ (DPD)</span>
                  <select
                    value={form.shipCounty}
                    disabled={busy || !nomenReady}
                    onChange={(e) => {
                      const county = e.target.value
                      setForm((current) => ({
                        ...current,
                        shipCounty: county,
                        shipCity: '',
                        dpdSiteId: undefined,
                      }))
                    }}
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

                <label className="field">
                  <span>Localitate (DPD)</span>
                  <select
                    value={
                      form.dpdSiteId && form.dpdSiteId > 0
                        ? String(form.dpdSiteId)
                        : form.shipCity
                    }
                    disabled={
                      busy || !nomenReady || !form.shipCounty || localitiesLoading
                    }
                    onChange={(e) => {
                      const loc = resolveLocality(localities, e.target.value)
                      const county = form.shipCounty
                      const cityName = loc?.name ?? e.target.value
                      if (loc && loc.id > 0) {
                        setForm((current) => ({
                          ...current,
                          dpdSiteId: loc.id,
                          shipCity: loc.name,
                          shipPostalCode:
                            loc.postCode?.trim() || current.shipPostalCode,
                        }))
                        return
                      }
                      setForm((current) => ({
                        ...current,
                        dpdSiteId: undefined,
                        shipCity: cityName,
                        shipPostalCode:
                          loc?.postCode?.trim() || current.shipPostalCode,
                      }))
                      if (!cityName || !county) return
                      void resolveDpdSite(county, cityName)
                        .then((resolved) => {
                          setForm((current) => {
                            if (current.shipCity !== cityName) return current
                            return {
                              ...current,
                              dpdSiteId:
                                resolved.id > 0 ? resolved.id : undefined,
                              shipCity: resolved.name,
                              shipPostalCode:
                                resolved.postCode?.trim() ||
                                current.shipPostalCode,
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
                  >
                    <option value="">
                      {localitiesLoading
                        ? 'Se încarcă localitățile…'
                        : form.shipCounty
                          ? 'Selectează localitatea'
                          : 'Alege mai întâi județul'}
                    </option>
                    {localities.map((loc) => (
                      <option
                        key={localitySelectKey(loc)}
                        value={loc.id > 0 ? String(loc.id) : loc.name}
                      >
                        {loc.name}
                        {loc.postCode ? ` (${loc.postCode})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="order-edit__row-street">
                  <label className="field">
                    <span>Stradă</span>
                    <input
                      value={form.shipStreet}
                      onChange={(e) => updateForm('shipStreet', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <label className="field order-edit__nr">
                    <span>Nr.</span>
                    <input
                      value={form.shipStreetNumber}
                      onChange={(e) =>
                        updateForm('shipStreetNumber', e.target.value)
                      }
                      disabled={busy}
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Detalii adresă</span>
                  <input
                    value={form.shipAddressExtra}
                    onChange={(e) =>
                      updateForm('shipAddressExtra', e.target.value)
                    }
                    disabled={busy}
                    placeholder="bloc, scară, ap."
                  />
                </label>
                <label className="field">
                  <span>Cod poștal</span>
                  <input
                    value={form.shipPostalCode}
                    onChange={(e) =>
                      updateForm('shipPostalCode', e.target.value)
                    }
                    disabled={busy}
                  />
                </label>

                <label className="field">
                  <span>Observații (opțional)</span>
                  <textarea
                    rows={2}
                    value={form.customerNotes}
                    onChange={(e) => updateForm('customerNotes', e.target.value)}
                    disabled={busy}
                  />
                </label>
              </div>
            </section>

            <section className="order-edit__card order-edit__products">
              <h3>Produse</h3>
              {productsLoading ? (
                <p className="muted small">Se încarcă produsele…</p>
              ) : null}

              <div className="order-create__picker">
                <div className="order-create__picker-bar">
                  <label className="field order-create__picker-search">
                    <span>Caută produs</span>
                    <input
                      type="search"
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      disabled={busy || productsLoading}
                      placeholder="Nume, SKU…"
                      autoComplete="off"
                    />
                  </label>
                  <label className="field order-create__qty">
                    <span>Cant.</span>
                    <input
                      type="number"
                      min={1}
                      value={pickQty}
                      onChange={(e) =>
                        setPickQty(Math.max(1, Number(e.target.value) || 1))
                      }
                      disabled={busy}
                    />
                  </label>
                </div>

                <p className="muted small order-create__picker-hint">
                  Click pe un produs ca să-l adaugi în comandă.
                </p>

                {sellableProducts.length === 0 && !productsLoading ? (
                  <p className="muted small">Nu există produse cu stoc.</p>
                ) : (
                  <ul className="order-create__product-list" role="listbox">
                    {filteredProducts.length === 0 ? (
                      <li className="order-create__product-empty">
                        Niciun produs găsit.
                      </li>
                    ) : (
                      filteredProducts.map((p) => {
                        const inOrder = lines.some(
                          (line) => line.productId === p.id,
                        )
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              className={
                                inOrder
                                  ? 'order-create__product-btn order-create__product-btn--added'
                                  : 'order-create__product-btn'
                              }
                              disabled={busy}
                              onClick={() => handleAddProduct(p)}
                            >
                              <span className="order-create__product-name">
                                {p.name}
                              </span>
                              <span className="order-create__product-meta">
                                {p.sku ? `${p.sku} · ` : ''}
                                {formatRon(p.salePrice)}
                                {inOrder ? ' · în comandă' : ''}
                              </span>
                            </button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                )}
              </div>

              {lines.length === 0 ? (
                <p className="muted small">Niciun produs adăugat încă.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Produs</th>
                      <th scope="col">Cant.</th>
                      <th scope="col">Preț</th>
                      <th scope="col">Total</th>
                      <th scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.key}>
                        <td>
                          <span className="cell-title">{line.productName}</span>
                          {line.productSku ? (
                            <span className="cell-sku">{line.productSku}</span>
                          ) : null}
                        </td>
                        <td>
                          <input
                            className="order-create__qty-input"
                            type="number"
                            min={1}
                            value={line.quantity}
                            disabled={busy}
                            onChange={(e) => {
                              const qty = Math.max(
                                1,
                                Number(e.target.value) || 1,
                              )
                              setLines((current) =>
                                current.map((row) =>
                                  row.key === line.key
                                    ? { ...row, quantity: qty }
                                    : row,
                                ),
                              )
                            }}
                          />
                        </td>
                        <td className="cell-nowrap">
                          {formatRon(line.unitPrice)}
                        </td>
                        <td className="cell-nowrap">
                          {formatRon(line.unitPrice * line.quantity)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn danger"
                            disabled={busy}
                            onClick={() =>
                              setLines((current) =>
                                current.filter((row) => row.key !== line.key),
                              )
                            }
                          >
                            Șterge
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="order-edit__total-label">
                        Produse
                      </td>
                      <td className="cell-nowrap" colSpan={2}>
                        {formatRon(itemsSubtotal)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="order-edit__total-label">
                        Transport
                      </td>
                      <td className="cell-nowrap" colSpan={2}>
                        {formatRon(shipping)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="order-edit__total-label">
                        Total
                      </td>
                      <td className="cell-nowrap" colSpan={2}>
                        <strong>{formatRon(total)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </section>
          </div>

          <div className="order-edit__actions">
            <button
              type="button"
              className="btn secondary"
              onClick={onClose}
              disabled={busy}
            >
              Anulează
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={handleSubmit}
              disabled={busy || !nomenReady}
            >
              {busy ? 'Se creează…' : 'Creează comanda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
