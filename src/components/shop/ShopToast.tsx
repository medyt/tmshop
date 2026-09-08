import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export type ShopToastAction = {
  label: string
  to: string
}

type ShopToastProps = {
  message: string | null
  title?: string | null
  action?: ShopToastAction | null
  onDismiss: () => void
  durationMs?: number
}

export function ShopToast({
  message,
  title = 'Date incomplete',
  action = null,
  onDismiss,
  durationMs,
}: ShopToastProps) {
  const [visible, setVisible] = useState(false)
  const timeoutMs = durationMs ?? (action ? 7000 : 4500)

  useEffect(() => {
    if (!message) {
      setVisible(false)
      return
    }

    setVisible(true)
    const timer = window.setTimeout(() => {
      setVisible(false)
      window.setTimeout(onDismiss, 220)
    }, timeoutMs)

    return () => window.clearTimeout(timer)
  }, [timeoutMs, message, onDismiss, action])

  if (!message) return null

  return (
    <div
      className={`shop-toast${visible ? ' shop-toast--visible' : ''}${action ? ' shop-toast--with-action' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="shop-toast__icon" aria-hidden="true">
        !
      </div>
      <div className="shop-toast__content">
        <p className="shop-toast__title">{title}</p>
        <p className="shop-toast__message">{message}</p>
        {action ? (
          <Link
            to={action.to}
            className="shop-toast__action"
            onClick={() => {
              setVisible(false)
              window.setTimeout(onDismiss, 220)
            }}
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        className="shop-toast__close"
        aria-label="Închide mesajul"
        onClick={() => {
          setVisible(false)
          window.setTimeout(onDismiss, 220)
        }}
      >
        ×
      </button>
    </div>
  )
}

export function useShopToast() {
  const [message, setMessage] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [action, setAction] = useState<ShopToastAction | null>(null)

  const dismissToast = useCallback(() => {
    setMessage(null)
    setTitle(null)
    setAction(null)
  }, [])

  const showToast = useCallback(
    (
      nextMessage: string,
      nextTitle = 'Date incomplete',
      nextAction?: ShopToastAction | null,
    ) => {
      setTitle(nextTitle)
      setAction(nextAction ?? null)
      setMessage(nextMessage)
    },
    [],
  )

  return {
    message,
    title,
    action,
    showToast,
    dismissToast,
  }
}
