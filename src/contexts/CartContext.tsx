import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Product } from '../types/product'
import {
  loadCartItems,
  saveCartItems,
  type StoredCartItem,
} from '../lib/cartStorage'
import {
  availableStock,
  cartLineTotal,
  isListedInShop,
} from '../lib/shopCatalog'

export type CartLine = {
  product: Product
  quantity: number
}

type CartContextValue = {
  lines: CartLine[]
  itemCount: number
  subtotal: number
  addProduct: (product: Product, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  removeProduct: (productId: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function normalizeStoredItems(
  items: StoredCartItem[],
  products: Product[],
): StoredCartItem[] {
  const productById = new Map(products.map((product) => [product.id, product]))
  const next: StoredCartItem[] = []

  for (const item of items) {
    const product = productById.get(item.productId)
    if (!product || !isListedInShop(product)) continue
    const maxQty = availableStock(product)
    const quantity = Math.min(maxQty, Math.max(1, Math.floor(item.quantity)))
    if (quantity <= 0) continue
    next.push({ productId: item.productId, quantity })
  }

  return next
}

function linesFromStored(
  items: StoredCartItem[],
  products: Product[],
): CartLine[] {
  const productById = new Map(products.map((product) => [product.id, product]))
  const lines: CartLine[] = []

  for (const item of items) {
    const product = productById.get(item.productId)
    if (!product || !isListedInShop(product)) continue
    lines.push({ product, quantity: item.quantity })
  }

  return lines
}

type CartProviderProps = {
  products: Product[]
  children: ReactNode
}

export function CartProvider({ products, children }: CartProviderProps) {
  const [storedItems, setStoredItems] = useState<StoredCartItem[]>(() =>
    loadCartItems(),
  )

  useEffect(() => {
    setStoredItems((current) => {
      const normalized = normalizeStoredItems(current, products)
      return normalized
    })
  }, [products])

  useEffect(() => {
    saveCartItems(storedItems)
  }, [storedItems])

  const lines = useMemo(
    () => linesFromStored(storedItems, products),
    [products, storedItems],
  )

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  )

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + cartLineTotal(line.product, line.quantity),
        0,
      ),
    [lines],
  )

  const addProduct = useCallback((product: Product, quantity = 1) => {
    if (!isListedInShop(product)) return
    const maxQty = availableStock(product)
    const nextQty = Math.min(maxQty, Math.max(1, Math.floor(quantity)))
    if (nextQty <= 0) return

    setStoredItems((current) => {
      const index = current.findIndex((item) => item.productId === product.id)
      if (index === -1) {
        return [...current, { productId: product.id, quantity: nextQty }]
      }
      const existing = current[index]
      const mergedQty = Math.min(maxQty, existing.quantity + nextQty)
      const next = [...current]
      next[index] = { ...existing, quantity: mergedQty }
      return next
    })
  }, [])

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      const product = products.find((item) => item.id === productId)
      if (!product || !isListedInShop(product)) {
        setStoredItems((current) =>
          current.filter((item) => item.productId !== productId),
        )
        return
      }

      const maxQty = availableStock(product)
      const nextQty = Math.min(maxQty, Math.max(1, Math.floor(quantity)))
      setStoredItems((current) =>
        current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: nextQty }
            : item,
        ),
      )
    },
    [products],
  )

  const removeProduct = useCallback((productId: string) => {
    setStoredItems((current) =>
      current.filter((item) => item.productId !== productId),
    )
  }, [])

  const clearCart = useCallback(() => {
    setStoredItems([])
  }, [])

  const value = useMemo(
    () => ({
      lines,
      itemCount,
      subtotal,
      addProduct,
      setQuantity,
      removeProduct,
      clearCart,
    }),
    [
      addProduct,
      clearCart,
      itemCount,
      lines,
      removeProduct,
      setQuantity,
      subtotal,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart trebuie folosit in interiorul CartProvider.')
  }
  return context
}
