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
  clientStockLimit,
  cartLineTotal,
  isListedInShop,
} from '../lib/shopCatalog'
import { trackAddToCart } from '../lib/analytics'
import { metaCatalogId } from '../lib/metaCatalogCsv'

export type CartLine = {
  product: Product
  quantity: number
}

/** Rezultat după „Adaugă în coș” (catalog / PDP). */
export type AddToCartResult = {
  quantityInCart: number
  maxStock: number
  /** false = erai deja la stocul maxim, cantitatea nu s-a schimbat */
  quantityIncreased: boolean
}

type CartContextValue = {
  lines: CartLine[]
  itemCount: number
  subtotal: number
  addProduct: (product: Product, quantity?: number) => AddToCartResult | null
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
    const maxQty = clientStockLimit(product)
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
  /**
   * Când e false, nu aliniem coșul la catalog (ex. API MySQL: lista e goală
   * până la primul fetch). Altfel `normalizeStoredItems([], [])` golește
   * localStorage la refresh pe /cos.
   */
  productsHydrated?: boolean
  children: ReactNode
}

export function CartProvider({
  products,
  productsHydrated = true,
  children,
}: CartProviderProps) {
  const [storedItems, setStoredItems] = useState<StoredCartItem[]>(() =>
    loadCartItems(),
  )

  useEffect(() => {
    if (!productsHydrated) return
    setStoredItems((current) => {
      const normalized = normalizeStoredItems(current, products)
      return normalized
    })
  }, [products, productsHydrated])

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

  const addProduct = useCallback((product: Product, quantity = 1): AddToCartResult | null => {
    if (!isListedInShop(product)) return null
    const maxQty = clientStockLimit(product)
    const nextQty = Math.min(maxQty, Math.max(1, Math.floor(quantity)))
    if (nextQty <= 0) return null

    let addedQty = 0
    let quantityIncreased = false
    let quantityInCart = 0
    setStoredItems((current) => {
      const index = current.findIndex((item) => item.productId === product.id)
      const prevQty = index === -1 ? 0 : current[index]!.quantity
      const mergedQty =
        index === -1
          ? nextQty
          : Math.min(maxQty, prevQty + nextQty)
      addedQty = Math.max(0, mergedQty - prevQty)
      quantityIncreased = mergedQty > prevQty
      quantityInCart = mergedQty
      if (index === -1) {
        return [...current, { productId: product.id, quantity: mergedQty }]
      }
      const existing = current[index]!
      const next = [...current]
      next[index] = { ...existing, quantity: mergedQty }
      return next
    })
    if (quantityIncreased && addedQty > 0) {
      const catalogId = metaCatalogId(product)
      if (catalogId) {
        trackAddToCart(catalogId, addedQty, cartLineTotal(product, addedQty))
      }
    }
    return { quantityInCart, maxStock: maxQty, quantityIncreased }
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

      const maxQty = clientStockLimit(product)
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
