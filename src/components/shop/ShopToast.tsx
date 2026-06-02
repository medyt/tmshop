import { useEffect, useState } from 'react'

type ShopToastProps = {
  message: string | null
  title?: string | null
  onDismiss: () => void
  durationMs?: number
}

export function ShopToast({
  message,
  title = 'Date incomplete',
  onDismiss,
  durationMs = 4500,
}: ShopToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) {
      setVisible(false)
      return
    }

    setVisible(true)
    const timer = window.setTimeout(() => {
      setVisible(false)
      window.setTimeout(onDismiss, 220)
    }, durationMs)

    return () => window.clearTimeout(timer)
  }, [durationMs, message, onDismiss])

  if (!message) return null

  return (
    <div
      className={`shop-toast${visible ? ' shop-toast--visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="shop-toast__icon" aria-hidden="true">
        !
      </div>
      <div className="shop-toast__content">
        <p className="shop-toast__title">{title}</p>
        <p className="shop-toast__message">{message}</p>
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

  return {
    message,
    title,
    showToast: (nextMessage: string, nextTitle = 'Date incomplete') => {
      setTitle(nextTitle)
      setMessage(nextMessage)
    },
    dismissToast: () => {
      setMessage(null)
      setTitle(null)
    },
  }
}
