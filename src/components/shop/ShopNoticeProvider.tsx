import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import {
  ShopToast,
  useShopToast,
  type ShopToastAction,
} from './ShopToast'

export type ShopNoticeAction = ShopToastAction

type ShopNoticeContextValue = {
  notify: (
    message: string,
    title?: string,
    action?: ShopNoticeAction | null,
  ) => void
}

const ShopNoticeContext = createContext<ShopNoticeContextValue | null>(null)

type ShopNoticeProviderProps = {
  children: ReactNode
}

export function ShopNoticeProvider({ children }: ShopNoticeProviderProps) {
  const { message, title, action, showToast, dismissToast } = useShopToast()

  const value = useMemo(
    () => ({
      notify: showToast,
    }),
    [showToast],
  )

  return (
    <ShopNoticeContext.Provider value={value}>
      {children}
      <ShopToast
        message={message}
        title={title}
        action={action}
        onDismiss={dismissToast}
      />
    </ShopNoticeContext.Provider>
  )
}

export function useShopNotice(): ShopNoticeContextValue {
  const context = useContext(ShopNoticeContext)
  if (!context) {
    throw new Error('useShopNotice trebuie folosit in ShopNoticeProvider.')
  }
  return context
}
