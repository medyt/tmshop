import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatRon } from '../../lib/shopCatalog'
import { isValidRoIban, normalizeRoIban } from '../../lib/roIban'
import {
  updateReturnRequest,
  type ReturnRequest,
  type ReturnStatus,
} from '../../lib/returnsApi'

const STATUS_OPTIONS: Array<{ value: ReturnStatus; label: string }> = [
  { value: 'nou', label: 'Nouă (de validat)' },
  { value: 'aprobat', label: 'Validată — așteaptă colet' },
  { value: 'respins', label: 'Respinsă' },
  { value: 'finalizat', label: 'Finalizată (colet + rambursare)' },
]

function itemsToFormValue(items: unknown): string {
  if (typeof items === 'string') return items
  if (Array.isArray(items)) return items.map((i) => String(i)).join(', ')
  if (items && typeof items === 'object') return JSON.stringify(items)
  return ''
}

type Props = {
  item: ReturnRequest
  onClose: () => void
  onSaved: (updated: ReturnRequest, emailWarning?: string) => void
}

export function ReturnEditModal({ item, onClose, onSaved }: Props) {
  const titleId = useId()
  const [orderId, setOrderId] = useState(item.orderId)
  const [status, setStatus] = useState<ReturnStatus>(item.status)
  const [customerName, setCustomerName] = useState(item.customerName)
  const [customerEmail, setCustomerEmail] = useState(item.customerEmail)
  const [customerPhone, setCustomerPhone] = useState(item.customerPhone ?? '')
  const [reason, setReason] = useState(item.reason)
  const [iban, setIban] = useState(item.iban ?? '')
  const [itemsText, setItemsText] = useState(itemsToFormValue(item.items))
  const [adminNotes, setAdminNotes] = useState(item.adminNotes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [busy, onClose])

  const orderExists = item.orderExists === true && item.orderId === orderId.trim()
  const orderMissingHint =
    orderId.trim() !== '' && item.orderId === orderId.trim() && item.orderExists === false

  const save = async (nextStatus: ReturnStatus, notifyCustomer = false) => {
    if (busy) return
    const normalizedIban = normalizeRoIban(iban)
    if (!normalizedIban || !isValidRoIban(normalizedIban)) {
      setError(
        'IBAN-ul pentru rambursare este obligatoriu și trebuie să fie un IBAN românesc valid.',
      )
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await updateReturnRequest({
        id: item.id,
        status: nextStatus,
        orderId: orderId.trim(),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        reason: reason.trim(),
        iban: normalizedIban,
        items: itemsText.trim(),
        adminNotes: adminNotes.trim(),
        notifyCustomer,
      })
      onSaved(result.return, result.emailWarning)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Nu am putut salva cererea de retur.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="modal-panel panel modal-panel--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-panel__body">
          <div className="product-form__title-row">
            <div>
              <h2 id={titleId} className="product-form__title">
                Cerere retur #{item.id}
              </h2>
              <p className="muted small" style={{ margin: '0.2rem 0 0' }}>
                {new Date(item.createdAt).toLocaleString('ro-RO')}
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
              <h3>Validare comandă</h3>
              <p className="muted small">
                Verifică dacă numărul din cerere corespunde unei comenzi reale.
                La statusul <strong>Validată</strong> se trimite automat email
                cu adresa de retur.
              </p>

              <label className="field">
                <span>Număr comandă</span>
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  disabled={busy}
                  autoComplete="off"
                />
              </label>

              {orderExists ? (
                <p className="order-edit__ok">
                  Comanda există
                  {typeof item.orderTotalAmount === 'number'
                    ? ` · total ${formatRon(item.orderTotalAmount)}`
                    : ''}
                  {item.orderStatus ? ` · status ${item.orderStatus}` : ''}.{' '}
                  <Link
                    to={`/admin/comenzi?tab=all&q=${encodeURIComponent(item.orderId)}`}
                  >
                    Deschide comanda
                  </Link>
                </p>
              ) : null}
              {orderMissingHint ? (
                <p className="app-status app-status--error" role="status">
                  Nu există o comandă cu acest număr. Corectează numărul înainte
                  de validare.
                </p>
              ) : null}
              {orderId.trim() !== item.orderId.trim() ? (
                <p className="muted small">
                  Ai schimbat numărul comenzii — la salvare se re-verifică
                  asocierea.
                </p>
              ) : null}

              <label className="field">
                <span>Status</span>
                <select
                  value={status}
                  disabled={busy}
                  onChange={(e) => setStatus(e.target.value as ReturnStatus)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Notițe operator</span>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  disabled={busy}
                  placeholder="Ex. verificat, colet așteptat, IBAN confirmat…"
                />
              </label>
            </section>

            <section className="order-edit__card">
              <h3>Date client</h3>
              <label className="field">
                <span>Nume</span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="field">
                <span>Email (unde se trimite adresa de retur)</span>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="field">
                <span>Telefon</span>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="field">
                <span>IBAN rambursare (obligatoriu)</span>
                <input
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  disabled={busy}
                  placeholder="RO…"
                  required
                />
              </label>
              <label className="field">
                <span>Produse returnate</span>
                <textarea
                  value={itemsText}
                  onChange={(e) => setItemsText(e.target.value)}
                  rows={2}
                  disabled={busy}
                />
              </label>
              <label className="field">
                <span>Motiv</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  disabled={busy}
                />
              </label>
            </section>
          </div>

          <p className="muted small" style={{ marginTop: '0.75rem' }}>
            Transportul de retur e plătit de client. După primirea coletului,
            rambursezi suma totală a comenzii în contul IBAN. La finalizare,
            comanda asociată trece automat pe Returnată.
          </p>

          {error ? (
            <p className="app-status app-status--error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="order-edit__actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={() => void save(status, false)}
            >
              {busy ? 'Se salvează…' : 'Salvează'}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={() => void save('aprobat', true)}
            >
              Validează &amp; trimite email
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={() => void save('respins', true)}
            >
              Respinge
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={() => void save('finalizat', true)}
            >
              Marchează finalizat
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
