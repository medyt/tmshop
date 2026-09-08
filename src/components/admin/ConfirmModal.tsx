import { useEffect, useId, useRef } from 'react'

export type ConfirmTone = 'danger' | 'warning' | 'default'

export type ConfirmModalProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: ConfirmTone
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Renunță',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const titleId = useId()
  const descId = useId()
  const confirmRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => confirmRef.current?.focus(), 20)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [busy, onCancel, open])

  if (!open) return null

  return (
    <div
      className="modal-backdrop confirm-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div
        className={`modal-panel panel confirm-modal confirm-modal--${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal__body">
          <div className={`confirm-modal__icon confirm-modal__icon--${tone}`} aria-hidden>
            {tone === 'danger' ? '!' : tone === 'warning' ? '?' : 'i'}
          </div>
          <div className="confirm-modal__copy">
            <h2 id={titleId} className="confirm-modal__title">
              {title}
            </h2>
            <p id={descId} className="confirm-modal__desc">
              {description}
            </p>
          </div>
        </div>
        <div className="confirm-modal__actions">
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${tone === 'danger' ? 'danger' : 'primary'}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Se procesează…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
