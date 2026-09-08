import { useEffect, useMemo, useState } from 'react'
import {
  clientStockLimit,
  formatRon,
  isVirtualProduct,
} from '../../lib/shopCatalog'
import { shippingCost } from '../../lib/shopShipping'
import {
  customerNotesWithoutCarrier,
  getDeliveryCarrierLabel,
  type DeliveryCarrierId,
} from '../../lib/shippingCarriers'
import {
  cancelOrderAwb,
  downloadOrderInvoicePdf,
  emitOrderInvoice,
  fetchOrderAwbPdf,
  isOrderReturnReceived,
  issueOrderAwb,
  markOrderPaymentPaid,
  markOrderReturnReceived,
  openAwbPdfBlob,
  sendOrderInvoiceEmail,
  syncOrderDpdStatus,
  updateOrderCustomer,
  updateOrderItems,
  updateOrderStatus,
} from '../../lib/ordersApi'
import {
  getRoCounties,
  getRoCountyName,
  getRoLocalities,
  hasValidDpdSiteId,
  loadDpdLocalities,
  loadDpdNomenclature,
  localitySelectKey,
  resolveDpdSite,
  resolveLocality,
} from '../../lib/roLocalities'
import { isValidRoPhone, normalizeRoPhone, sanitizeRoPhoneInput } from '../../lib/roPhone'
import type { BillingType, Order, OrderStatus, OrderTracking } from '../../types/order'
import type { Product } from '../../types/product'
import { ConfirmModal } from './ConfirmModal'
import { OrderStatusBadge } from './OrdersTable'

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'new', label: 'În așteptare' },
  { value: 'confirmed', label: 'Confirmată' },
  { value: 'processing', label: 'În procesare' },
  { value: 'shipped', label: 'Expediată' },
  { value: 'delivered', label: 'Livrată' },
  { value: 'returned', label: 'Refuzată / returnată' },
  { value: 'cancelled', label: 'Anulată' },
]

type CustomerForm = {
  customerName: string
  customerPhone: string
  customerEmail: string
  customerNotes: string
  billingType: BillingType
  companyName: string
  companyCui: string
  companyRegCom: string
  shipCounty: string
  shipCity: string
  shipStreet: string
  shipStreetNumber: string
  shipAddressExtra: string
  shipPostalCode: string
  dpdSiteId?: number
}

function formFromOrder(order: Order): CustomerForm {
  let shipCounty = order.shipCounty ?? ''
  let shipCity = order.shipCity ?? ''
  let shipStreet = order.shipStreet ?? ''
  let shipStreetNumber = order.shipStreetNumber ?? ''
  let shipAddressExtra = order.shipAddressExtra ?? ''
  let shipPostalCode = order.shipPostalCode ?? ''

  // Comenzi vechi: încearcă extragerea din adresa pe linii.
  if (!shipCity || !shipStreet) {
    const lines = order.customerAddress
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (!shipStreet && lines[0]) {
      const m = lines[0].match(
        /^Str\.\s*(.+?)\s+nr\.\s*(\S+)(?:,\s*(.*))?$/i,
      )
      if (m) {
        shipStreet = m[1].trim()
        shipStreetNumber = m[2].trim()
        if (m[3]?.trim()) shipAddressExtra = m[3].trim()
      }
    }
    if (!shipCity && lines[1]) {
      const m = lines[1].match(/^(.+?),\s*jud\.\s*(.+)$/i)
      if (m) {
        shipCity = m[1].trim()
        const countyHint = m[2].trim().toLowerCase()
        if (!shipCounty && countyHint) {
          const counties = getRoCounties()
          const match = counties.find(
            (c) =>
              c.name.toLowerCase() === countyHint ||
              c.code.toLowerCase() === countyHint,
          )
          if (match) shipCounty = match.code
        }
      }
    }
    if (!shipPostalCode) {
      const postalLine = lines.find((line) =>
        /cod\s*po[sș]tal/i.test(line),
      )
      if (postalLine) {
        const m = postalLine.match(/(\d{5,6})/)
        if (m) shipPostalCode = m[1]
      }
    }
  }

  return {
    customerName: order.customerName,
    customerPhone: normalizeRoPhone(order.customerPhone),
    customerEmail: order.customerEmail ?? '',
    customerNotes: customerNotesWithoutCarrier(order.customerNotes) ?? '',
    billingType: order.billingType === 'company' ? 'company' : 'person',
    companyName: order.companyName ?? '',
    companyCui: order.companyCui ?? '',
    companyRegCom: order.companyRegCom ?? '',
    shipCounty,
    shipCity,
    shipStreet,
    shipStreetNumber,
    shipAddressExtra,
    shipPostalCode,
    dpdSiteId: order.dpdSiteId && order.dpdSiteId > 0 ? order.dpdSiteId : undefined,
  }
}

type LineDraft = {
  key: string
  productId: string
  productName: string
  productSku?: string
  unitPrice: number
  quantity: number
}

type Props = {
  order: Order
  /** Curierul tabului activ — folosit la emiterea AWB dacă comanda nu e deja legată. */
  preferredCarrier?: DeliveryCarrierId
  products?: Product[]
  productsLoading?: boolean
  onClose: () => void
  onUpdated: (order: Order) => void
  onCancelOrder?: () => void
  onDeleteOrder?: () => void
  busy?: boolean
}

function linesFromOrder(order: Order): LineDraft[] {
  return order.items.map((item, index) => ({
    key: `${item.productId}-${index}`,
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
  }))
}

export function OrderEditModal({
  order,
  preferredCarrier = 'fan-courier',
  products = [],
  productsLoading = false,
  onClose,
  onUpdated,
  onCancelOrder,
  onDeleteOrder,
  busy: busyExternal = false,
}: Props) {
  const issueCarrier: DeliveryCarrierId =
    order.deliveryCarrier ?? preferredCarrier
  const carrierLabel = getDeliveryCarrierLabel(issueCarrier)
  const [busyLocal, setBusyLocal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState<CustomerForm>(() => formFromOrder(order))
  const [lines, setLines] = useState<LineDraft[]>(() => linesFromOrder(order))
  const [productQuery, setProductQuery] = useState('')
  const [pickQty, setPickQty] = useState(1)
  const [tracking, setTracking] = useState<OrderTracking | null>(null)
  const [nomenReady, setNomenReady] = useState(false)
  const [nomenError, setNomenError] = useState<string | null>(null)
  const [localitiesTick, setLocalitiesTick] = useState(0)
  const [localitiesLoading, setLocalitiesLoading] = useState(false)
  const [confirmCancelAwb, setConfirmCancelAwb] = useState(false)
  const [confirmMarkReturned, setConfirmMarkReturned] = useState(false)
  const busy = busyLocal || busyExternal

  const counties = useMemo(() => getRoCounties(), [nomenReady])
  const localities = useMemo(
    () => getRoLocalities(form.shipCounty),
    [form.shipCounty, nomenReady, localitiesTick],
  )

  useEffect(() => {
    setForm(formFromOrder(order))
    setLines(linesFromOrder(order))
  }, [order])

  const itemsLocked =
    order.status === 'cancelled' ||
    order.status === 'returned' ||
    Boolean(order.invoiceSeries || order.invoiceNumber)

  const sellableProducts = useMemo(
    () =>
      [...products]
        .filter((p) => {
          if (isVirtualProduct(p)) return true
          return (p.stockQty == null || p.stockQty > 0) && p.salePrice > 0
        })
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
  const draftTotal = Math.round((itemsSubtotal + shipping) * 100) / 100

  const handleAddProduct = (product: Product) => {
    if (itemsLocked || busy) return
    const max = isVirtualProduct(product)
      ? 99
      : clientStockLimit(product)
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

  const handleSaveItems = () => {
    if (busy || itemsLocked) return
    if (lines.length === 0) {
      setError('Adaugă cel puțin un produs.')
      return
    }
    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void updateOrderItems(
      order.id,
      lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    )
      .then((updated) => {
        onUpdated(updated)
        setMessage('Produsele comenzii au fost actualizate.')
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut actualiza produsele.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

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

  useEffect(() => {
    let cancelled = false
    void loadDpdNomenclature()
      .then(() => {
        if (cancelled) return
        setNomenReady(true)
        setNomenError(null)
        setForm((current) => {
          let next = { ...current }

          if (!next.shipCounty) {
            const hint = (order.shipCountyName ?? '')
              .trim()
              .toLowerCase()
            const fromAddress = order.customerAddress.match(
              /jud\.\s*([^\n,]+)/i,
            )
            const countyHint =
              hint || (fromAddress ? fromAddress[1].trim().toLowerCase() : '')
            if (countyHint) {
              const match = getRoCounties().find(
                (c) =>
                  c.name.toLowerCase() === countyHint ||
                  c.code.toLowerCase() === countyHint,
              )
              if (match) next = { ...next, shipCounty: match.code }
            }
          }
          return next
        })
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
  }, [order.customerAddress, order.shipCountyName])

  useEffect(() => {
    const county = form.shipCounty.trim()
    if (!nomenReady || !county) return
    let cancelled = false
    setLocalitiesLoading(true)
    void loadDpdLocalities(county)
      .then(() => {
        if (cancelled) return
        setLocalitiesTick((n) => n + 1)
        const cityName = form.shipCity.trim()
        if (!cityName || hasValidDpdSiteId(form.dpdSiteId)) return
        void resolveDpdSite(county, cityName)
          .then((resolved) => {
            if (cancelled) return
            setForm((current) => {
              if (
                current.shipCity.trim().toLowerCase() !==
                cityName.toLowerCase()
              ) {
                return current
              }
              return {
                ...current,
                dpdSiteId: resolved.id > 0 ? resolved.id : undefined,
                shipCity: resolved.name,
                shipPostalCode:
                  current.shipPostalCode.trim() ||
                  (resolved.postCode?.trim() ?? ''),
              }
            })
          })
          .catch(() => {
            /* user can re-select */
          })
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
  }, [form.shipCounty, nomenReady])

  const updateForm = <K extends keyof CustomerForm>(
    key: K,
    value: CustomerForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const applyOrderStatus = (status: OrderStatus) => {
    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void updateOrderStatus(order.id, status)
      .then((updated) => {
        onUpdated(updated)
        setConfirmMarkReturned(false)
        setMessage(
          status === 'cancelled'
            ? 'Comandă anulată. Stocul rezervat (dacă exista) a fost returnat.'
            : status === 'returned'
              ? 'Comanda a fost marcată ca returnată.'
              : 'Status actualizat.',
        )
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut actualiza statusul.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

  const handleStatusChange = (status: OrderStatus) => {
    if (busy || status === order.status) return
    if (status === 'returned' && order.status === 'delivered') {
      setConfirmMarkReturned(true)
      return
    }
    applyOrderStatus(status)
  }

  const handleSaveCustomer = () => {
    if (busy) return
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      setError('Numele și telefonul sunt obligatorii.')
      return
    }
    if (!isValidRoPhone(form.customerPhone)) {
      setError('Telefonul trebuie să aibă exact 10 cifre și să înceapă cu 0.')
      return
    }
    if (
      !form.shipCounty.trim() ||
      !form.shipCity.trim()
    ) {
      setError('Alege județul și localitatea.')
      return
    }
    if (!form.shipStreet.trim() || !form.shipStreetNumber.trim()) {
      setError('Strada și numărul sunt obligatorii.')
      return
    }

    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void updateOrderCustomer(order.id, {
      customerName: form.customerName.trim(),
      customerPhone: normalizeRoPhone(form.customerPhone),
      customerEmail: form.customerEmail.trim() || undefined,
      customerNotes: form.customerNotes.trim() || undefined,
      billingType: form.billingType,
      companyName: form.companyName.trim() || undefined,
      companyCui: form.companyCui.trim() || undefined,
      companyRegCom: form.companyRegCom.trim() || undefined,
      shipCounty: form.shipCounty.trim(),
      shipCountyName: getRoCountyName(form.shipCounty),
      shipCity: form.shipCity.trim(),
      shipStreet: form.shipStreet.trim(),
      shipStreetNumber: form.shipStreetNumber.trim(),
      shipAddressExtra: form.shipAddressExtra.trim() || undefined,
      shipPostalCode: form.shipPostalCode.trim() || undefined,
      dpdSiteId:
        typeof form.dpdSiteId === 'number' && form.dpdSiteId > 0
          ? form.dpdSiteId
          : 0,
    })
      .then((updated) => {
        onUpdated(updated)
        setMessage('Date client / livrare salvate.')
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut salva datele clientului.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

  const handleIssueAwb = () => {
    if (busy) return
    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void issueOrderAwb(order.id, issueCarrier)
      .then(async (updated) => {
        onUpdated(updated)
        setMessage(
          updated.awbNumber
            ? `AWB ${getDeliveryCarrierLabel(updated.deliveryCarrier ?? issueCarrier)} generat: ${updated.awbNumber}`
            : 'AWB generat.',
        )
        try {
          const pdf = await fetchOrderAwbPdf(updated.id)
          openAwbPdfBlob(pdf)
        } catch (printErr: unknown) {
          setError(
            printErr instanceof Error
              ? `AWB creat, dar printul a eșuat: ${printErr.message}`
              : 'AWB creat, dar printul PDF a eșuat.',
          )
        }
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Nu am putut genera AWB-ul.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

  const canCancelIssuedAwb =
    Boolean(order.awbNumber) &&
    order.status !== 'shipped' &&
    order.status !== 'delivered' &&
    order.status !== 'returned' &&
    order.status !== 'cancelled'

  const handleCancelAwb = () => {
    if (busy || !canCancelIssuedAwb) return
    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void cancelOrderAwb(order.id)
      .then((updated) => {
        onUpdated(updated)
        setConfirmCancelAwb(false)
        setMessage(
          'AWB anulat la curier. Comanda e deblocată — poți reemite cu alt curier.',
        )
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Nu am putut anula AWB-ul.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

  const handlePrintAwb = () => {
    if (busy || !order.awbNumber) return
    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void fetchOrderAwbPdf(order.id)
      .then((pdf) => {
        openAwbPdfBlob(pdf)
        setMessage('Etichetă DPD deschisă.')
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut descărca eticheta PDF.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

  const handleSyncDpd = () => {
    if (busy || !order.awbNumber) return
    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void syncOrderDpdStatus(order.id)
      .then((updated) => {
        onUpdated(updated)
        if (updated.tracking) setTracking(updated.tracking)
        setMessage(
          updated.statusChanged
            ? `Status actualizat din DPD: ${updated.status}${
                updated.courierStatus ? ` · ${updated.courierStatus}` : ''
              }`
            : `DPD verificat${
                updated.courierStatus ? ` · ${updated.courierStatus}` : ''
              } — fără schimbare de status.`,
        )
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut sincroniza cu DPD.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

  const handleMarkReturnReceived = () => {
    if (busy || order.status !== 'returned' || isOrderReturnReceived(order)) {
      return
    }
    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void markOrderReturnReceived(order.id)
      .then((updated) => {
        onUpdated(updated)
        setMessage('Comanda a fost marcată ca reîntorsă la magazin.')
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut marca returnarea.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

  const canMarkPaymentPaid =
    order.paymentStatus !== 'paid' &&
    order.status !== 'cancelled' &&
    order.status !== 'returned'

  const handleMarkPaymentPaid = () => {
    if (busy || !canMarkPaymentPaid) return
    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void markOrderPaymentPaid(order.id)
      .then((updated) => {
        onUpdated(updated)
        setMessage('Plata a fost marcată ca finalizată.')
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut actualiza statusul plății.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

  const hasInvoice = Boolean(order.invoiceSeries && order.invoiceNumber)

  const handleEmitInvoice = (force: boolean) => {
    if (busy) return
    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void emitOrderInvoice(order.id, force)
      .then((updated) => {
        onUpdated(updated)
        setMessage(
          force
            ? 'Factură reemisă. Dacă există email client, PDF-ul a fost trimis.'
            : 'Factură emisă. Dacă există email client, PDF-ul a fost trimis.',
        )
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Nu am putut emite factura.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

  const handleDownloadInvoice = () => {
    if (busy || !hasInvoice) return
    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void downloadOrderInvoicePdf(order.id)
      .then(() => setMessage('PDF factură descărcat.'))
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Nu am putut descărca PDF-ul.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

  const handleSendInvoiceEmail = () => {
    if (busy || !hasInvoice) return
    setBusyLocal(true)
    setError(null)
    setMessage(null)
    void sendOrderInvoiceEmail(order.id)
      .then(() => setMessage('Factura a fost trimisă pe email.'))
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut trimite factura pe email.',
        )
      })
      .finally(() => setBusyLocal(false))
  }

  return (
    <>
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !confirmCancelAwb) onClose()
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
              className="btn secondary"
              onClick={onClose}
              disabled={busy}
            >
              Închide
            </button>
          </div>

          <div className="order-edit__grid">
            <section className="order-edit__card">
              <h3>Status &amp; acțiuni</h3>
              <div className="order-edit__status-row">
                <OrderStatusBadge
                  status={order.status}
                  paymentStatus={order.paymentStatus}
                  returnReceived={isOrderReturnReceived(order)}
                />
              </div>
              <label className="field">
                <span>Schimbă statusul</span>
                <select
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
              {order.status === 'delivered' ? (
                <>
                  <p className="muted small">
                    Dacă ai primit coletul înapoi, marchează comanda ca
                    returnată. Stocul se reface și factura se storează.
                  </p>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busy}
                    onClick={() => setConfirmMarkReturned(true)}
                  >
                    Marchează returnată
                  </button>
                </>
              ) : null}

              <div className="order-edit__awb">
                <p>
                  <strong>Plată:</strong>{' '}
                  {order.paymentMethod === 'card' ? 'Card online' : 'Ramburs'}
                  {' · '}
                  {order.paymentStatus === 'paid'
                    ? 'PLATA FINALIZATA'
                    : 'PLATA IN ASTEPTARE'}
                </p>
                {canMarkPaymentPaid ? (
                  <>
                    {order.status === 'delivered' ? (
                      <p className="muted small">
                        Comanda e livrată, dar plata e încă în așteptare.
                        Marchează finalizată dacă ai recuperat banii de la
                        client.
                      </p>
                    ) : (
                      <p className="muted small">
                        Marchează plata finalizată dacă ai încasat banii
                        separat (transfer, ramburs recuperat etc.).
                      </p>
                    )}
                    <button
                      type="button"
                      className="btn primary"
                      disabled={busy}
                      onClick={handleMarkPaymentPaid}
                    >
                      Marchează plata finalizată
                    </button>
                  </>
                ) : null}
              </div>

              <div className="order-edit__awb">
                {order.awbNumber ? (
                  <>
                    <p>
                      <strong>AWB:</strong> {order.awbNumber}
                      {order.courierStatus ? (
                        <span className="muted"> · {order.courierStatus}</span>
                      ) : null}
                    </p>
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={busy}
                      onClick={handlePrintAwb}
                    >
                      Deschide etichetă PDF
                    </button>
                    {canCancelIssuedAwb ? (
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={busy}
                        onClick={() => setConfirmCancelAwb(true)}
                      >
                        Anulează AWB + deblochează
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn primary"
                      disabled={busy}
                      onClick={handleSyncDpd}
                    >
                      Actualizează din {carrierLabel}
                    </button>
                    {order.status === 'returned' &&
                    !isOrderReturnReceived(order) ? (
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={busy}
                        onClick={handleMarkReturnReceived}
                      >
                        Marchează reîntorsă
                      </button>
                    ) : null}
                    {order.status === 'returned' &&
                    isOrderReturnReceived(order) ? (
                      <p className="muted small">
                        Colet reîntors la magazin
                        {order.courierStatus
                          ? ` · ${order.courierStatus}`
                          : ''}
                      </p>
                    ) : null}
                    {tracking?.events && tracking.events.length > 0 ? (
                      <ul className="order-edit__track-events">
                        {tracking.events.slice(0, 5).map((event, index) => (
                          <li key={`${event.dateTime}-${index}`}>
                            <span className="muted small">
                              {event.dateTime}
                              {event.place ? ` · ${event.place}` : ''}
                            </span>
                            <br />
                            {event.description}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="muted">Niciun AWB generat încă.</p>
                    <button
                      type="button"
                      className="btn primary"
                      disabled={busy}
                      onClick={handleIssueAwb}
                    >
                      Generează AWB {carrierLabel}
                    </button>
                  </>
                )}
              </div>

              <div className="order-edit__awb">
                <p>
                  <strong>Factură SmartBill</strong>
                </p>
                {hasInvoice ? (
                  <p className="muted">
                    {order.invoiceSeries}/{order.invoiceNumber}
                    {order.invoiceIssuedAt
                      ? ` · ${new Date(order.invoiceIssuedAt).toLocaleString('ro-RO')}`
                      : ''}
                  </p>
                ) : (
                  <p className="muted">Nicio factură emisă încă.</p>
                )}
                {order.invoiceError ? (
                  <p className="app-status app-status--error" role="alert">
                    {order.invoiceError}
                  </p>
                ) : null}
                <div className="order-edit__actions row-actions">
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={() => handleEmitInvoice(false)}
                  >
                    {hasInvoice ? 'Reemite factură' : 'Emite factură'}
                  </button>
                  {hasInvoice ? (
                    <>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={busy}
                        onClick={handleDownloadInvoice}
                      >
                        Descarcă PDF
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={busy || !order.customerEmail}
                        onClick={handleSendInvoiceEmail}
                      >
                        Trimite pe email
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="order-edit__actions row-actions">
                {onCancelOrder && order.status !== 'cancelled' ? (
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busy}
                    onClick={onCancelOrder}
                  >
                    Anulează comanda
                  </button>
                ) : null}
                {onDeleteOrder ? (
                  <button
                    type="button"
                    className="btn danger"
                    disabled={busy}
                    onClick={onDeleteOrder}
                  >
                    Șterge comanda
                  </button>
                ) : null}
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
              {nomenError ? (
                <p className="app-status app-status--error" role="alert">
                  {nomenError}
                </p>
              ) : null}
              {!nomenReady && !nomenError ? (
                <p className="muted small">Se încarcă nomenclatorul DPD…</p>
              ) : null}
              {!hasValidDpdSiteId(form.dpdSiteId) && form.shipCity.trim() ? (
                <p className="muted small">
                  Fără site ID DPD — AWB va folosi numele localității
                  {form.shipPostalCode.trim()
                    ? ` și codul poștal ${form.shipPostalCode.trim()}`
                    : ' (completează codul poștal dacă DPD cere disambiguare)'}
                  .
                  {order.customerAddress ? (
                    <>
                      {' '}
                      Adresă veche: <em>{order.customerAddress}</em>
                    </>
                  ) : null}
                </p>
              ) : !hasValidDpdSiteId(form.dpdSiteId) ? (
                <p className="muted small">
                  Alege județul și localitatea pentru livrare.
                  {order.customerAddress ? (
                    <>
                      {' '}
                      Adresă veche: <em>{order.customerAddress}</em>
                    </>
                  ) : null}
                </p>
              ) : null}

              <div className="order-edit__form">
                <label className="field">
                  <span>Nume</span>
                  <input
                    value={form.customerName}
                    onChange={(e) => updateForm('customerName', e.target.value)}
                    disabled={busy}
                    autoComplete="name"
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
                  <span>Email</span>
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
                      name="billingType"
                      checked={form.billingType === 'person'}
                      onChange={() => updateForm('billingType', 'person')}
                      disabled={busy}
                    />
                    Persoană fizică
                  </label>
                  <label className="order-edit__radio">
                    <input
                      type="radio"
                      name="billingType"
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
                    <label className="field">
                      <span>CUI</span>
                      <input
                        value={form.companyCui}
                        onChange={(e) => updateForm('companyCui', e.target.value)}
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
                    value={form.shipCity}
                    disabled={busy || !nomenReady || !form.shipCounty || localitiesLoading}
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
                          loc?.postCode && loc.postCode.trim()
                            ? loc.postCode.trim()
                            : current.shipPostalCode,
                      }))
                      if (!cityName || !county) return
                      void resolveDpdSite(county, cityName)
                        .then((resolved) => {
                          setForm((current) => {
                            if (current.shipCity !== cityName) return current
                            return {
                              ...current,
                              dpdSiteId: resolved.id > 0 ? resolved.id : undefined,
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
                      {!nomenReady
                        ? 'Se încarcă…'
                        : localitiesLoading
                          ? 'Se încarcă localitățile…'
                          : form.shipCounty
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
                <label className="field">
                  <span>Stradă</span>
                  <input
                    value={form.shipStreet}
                    onChange={(e) => updateForm('shipStreet', e.target.value)}
                    disabled={busy}
                  />
                </label>
                <div className="order-edit__row2">
                  <label className="field">
                    <span>Nr.</span>
                    <input
                      value={form.shipStreetNumber}
                      onChange={(e) =>
                        updateForm('shipStreetNumber', e.target.value)
                      }
                      disabled={busy}
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
                </div>
                <label className="field">
                  <span>Detalii adresă (bloc, ap.)</span>
                  <input
                    value={form.shipAddressExtra}
                    onChange={(e) =>
                      updateForm('shipAddressExtra', e.target.value)
                    }
                    disabled={busy}
                  />
                </label>
                <label className="field">
                  <span>Observații</span>
                  <textarea
                    rows={2}
                    value={form.customerNotes}
                    onChange={(e) => updateForm('customerNotes', e.target.value)}
                    disabled={busy}
                  />
                </label>

                <p className="muted small">
                  Plată:{' '}
                  {order.paymentMethod === 'card' ? 'Card online' : 'Ramburs'}
                  {' · '}
                  {order.paymentStatus === 'paid'
                    ? 'PLATA FINALIZATA'
                    : 'PLATA IN ASTEPTARE'}
                </p>

                <button
                  type="button"
                  className="btn primary"
                  disabled={busy || !nomenReady}
                  onClick={handleSaveCustomer}
                >
                  Salvează datele clientului
                </button>
              </div>
            </section>
          </div>

          <section className="order-edit__card order-edit__products">
            <h3>Produse</h3>
            {itemsLocked ? (
              <p className="muted small">
                Produsele nu pot fi modificate
                {order.invoiceSeries || order.invoiceNumber
                  ? ' (comandă cu factură emisă)'
                  : ' (comandă anulată/returnată)'}
                .
              </p>
            ) : (
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
                  Click pe un produs ca să-l adaugi. Apoi salvează modificările.
                </p>
                {productsLoading ? (
                  <p className="muted small">Se încarcă produsele…</p>
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
            )}

            {lines.length === 0 ? (
              <p className="muted small">Niciun produs în comandă.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Produs</th>
                    <th scope="col">Cant.</th>
                    <th scope="col">Preț</th>
                    <th scope="col">Total</th>
                    {!itemsLocked ? <th scope="col" /> : null}
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
                        {itemsLocked ? (
                          line.quantity
                        ) : (
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
                        )}
                      </td>
                      <td>
                        {itemsLocked ? (
                          <span className="cell-nowrap">
                            {formatRon(line.unitPrice)}
                          </span>
                        ) : (
                          <input
                            className="order-create__qty-input order-edit__price-input"
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.unitPrice}
                            disabled={busy}
                            onChange={(e) => {
                              const price = Math.max(
                                0,
                                Number(e.target.value) || 0,
                              )
                              setLines((current) =>
                                current.map((row) =>
                                  row.key === line.key
                                    ? { ...row, unitPrice: price }
                                    : row,
                                ),
                              )
                            }}
                          />
                        )}
                      </td>
                      <td className="cell-nowrap">
                        {formatRon(line.unitPrice * line.quantity)}
                      </td>
                      {!itemsLocked ? (
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
                      ) : null}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={itemsLocked ? 3 : 4}
                      className="order-edit__total-label"
                    >
                      Produse
                    </td>
                    <td className="cell-nowrap">
                      {formatRon(itemsSubtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={itemsLocked ? 3 : 4}
                      className="order-edit__total-label"
                    >
                      Transport
                    </td>
                    <td className="cell-nowrap">{formatRon(shipping)}</td>
                  </tr>
                  <tr>
                    <td
                      colSpan={itemsLocked ? 3 : 4}
                      className="order-edit__total-label"
                    >
                      Total comandă
                    </td>
                    <td className="cell-nowrap">
                      <strong>{formatRon(draftTotal)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}

            {order.serviceMarginBreakdown ? (
              <div className="order-edit__economics">
                <h3 className="order-edit__section-title">Economics livrare</h3>
                <table className="data-table order-edit__economics-table">
                  <thead>
                    <tr>
                      <th scope="col">Serviciu</th>
                      <th scope="col">Venit client</th>
                      <th scope="col">Cost DPD</th>
                      <th scope="col">Marjă</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.serviceMarginBreakdown.lines
                      .filter(
                        (line) =>
                          line.revenue > 0.009 ||
                          line.cost > 0.009 ||
                          Math.abs(line.margin) > 0.009,
                      )
                      .map((line) => (
                        <tr key={line.key}>
                          <td>{line.label}</td>
                          <td className="cell-nowrap">
                            {line.revenue > 0.009 ? formatRon(line.revenue) : '—'}
                          </td>
                          <td className="cell-nowrap">
                            {line.cost > 0.009 ? formatRon(line.cost) : '—'}
                          </td>
                          <td
                            className={
                              line.margin < 0
                                ? 'cell-nowrap admin-stats__profit--neg'
                                : 'cell-nowrap'
                            }
                          >
                            {formatRon(line.margin)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>
                        <strong>Total servicii</strong>
                      </td>
                      <td className="cell-nowrap">
                        <strong>
                          {formatRon(order.serviceMarginBreakdown.totals.revenue)}
                        </strong>
                      </td>
                      <td className="cell-nowrap">
                        <strong>
                          {formatRon(order.serviceMarginBreakdown.totals.cost)}
                        </strong>
                      </td>
                      <td className="cell-nowrap">
                        <strong>
                          {formatRon(order.serviceMarginBreakdown.totals.margin)}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <p className="muted small">
                  Cost DPD:{' '}
                  {order.courierCostTotal != null && order.courierCostTotal > 0
                    ? formatRon(order.courierCostTotal)
                    : '—'}
                  {order.courierCostSource
                    ? ` · sursă ${order.courierCostSource === 'api' ? 'API DPD' : 'contract'}`
                    : ''}
                  {order.courierCostAt
                    ? ` · ${new Date(order.courierCostAt).toLocaleString('ro-RO')}`
                    : ''}
                </p>
              </div>
            ) : order.courierCostTotal != null && order.courierCostTotal > 0 ? (
              <p className="muted small order-edit__economics-summary">
                Cost curier DPD: {formatRon(order.courierCostTotal)}
                {order.courierCostSource
                  ? ` (${order.courierCostSource === 'api' ? 'API' : 'contract'})`
                  : ''}
              </p>
            ) : null}

            {!itemsLocked ? (
              <div className="order-edit__actions">
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy}
                  onClick={() => setLines(linesFromOrder(order))}
                >
                  Resetează
                </button>
                <button
                  type="button"
                  className="btn primary"
                  disabled={busy || lines.length === 0}
                  onClick={handleSaveItems}
                >
                  Salvează produsele
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
    <ConfirmModal
      open={confirmCancelAwb}
      tone="warning"
      title={`Anulezi AWB ${order.awbNumber ?? ''}?`}
      description="AWB-ul se anulează la curier dacă coletul nu a fost predat. Comanda se deblochează ca să poți reemite cu alt curier."
      confirmLabel="Anulează AWB"
      busy={busy}
      onCancel={() => {
        if (!busyLocal) setConfirmCancelAwb(false)
      }}
      onConfirm={handleCancelAwb}
    />
    <ConfirmModal
      open={confirmMarkReturned}
      tone="warning"
      title={`Marchezi comanda ${order.id} ca returnată?`}
      description="Comanda livrată trece pe Returnată. Stocul se reface, iar factura SmartBill (dacă există) se storează. Sync-ul curierului nu o mai pune înapoi pe Livrată."
      confirmLabel="Marchează returnată"
      busy={busy}
      onCancel={() => {
        if (!busyLocal) setConfirmMarkReturned(false)
      }}
      onConfirm={() => applyOrderStatus('returned')}
    />
    </>
  )
}
