import { useCallback, useEffect, useState } from 'react'
import type { Product } from '../types/product'
import { useAuth } from '../contexts/AuthContext'
import {
  createProduct,
  deleteProductRemote,
  fetchProducts,
  isProductsApiEnabled,
  replaceAllProductsRemote,
  updateProductRemote,
} from '../lib/productsApi'
import { loadProducts, saveProducts } from '../lib/storage'

/** Păstrează lista ușoară — description se încarcă pe detaliu / edit. */
function withoutHeavyFields(product: Product): Product {
  const { description: _d, notes: _n, ...rest } = product
  return rest
}

export function useProducts() {
  const apiEnabled = isProductsApiEnabled()
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState<Product[]>(() => {
    if (apiEnabled) return []
    return loadProducts() ?? []
  })
  const [loading, setLoading] = useState(apiEnabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!apiEnabled) {
      saveProducts(products)
    }
  }, [apiEnabled, products])

  useEffect(() => {
    if (!apiEnabled) return

    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchProducts()
      .then((loaded) => {
        if (cancelled) return
        setProducts(loaded)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error
            ? err.message
            : 'Nu am putut încărca produsele.'
        setError(message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // Reîncarcă când adminul se autentifică (câmpuri sensibile: EAN, preț achiziție).
  }, [apiEnabled, isAdmin])
  const reloadProducts = useCallback(() => {
    if (!apiEnabled) return

    setLoading(true)
    setError(null)

    void fetchProducts()
      .then((loaded) => {
        setProducts(loaded)
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : 'Nu am putut reîncărca produsele.'
        setError(message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [apiEnabled])

  const addProduct = useCallback(
    (p: Product) => {
      if (apiEnabled) {
        void createProduct(p)
          .then((saved) => {
            setProducts((prev) => [...prev, withoutHeavyFields(saved)])
            setError(null)
          })
          .catch((err: unknown) => {
            const message =
              err instanceof Error
                ? err.message
                : 'Nu am putut salva produsul.'
            setError(message)
          })
        return
      }
      setProducts((prev) => [...prev, p])
    },
    [apiEnabled],
  )

  const updateProduct = useCallback(
    (p: Product) => {
      if (apiEnabled) {
        void updateProductRemote(p)
          .then((saved) => {
            const light = withoutHeavyFields(saved)
            setProducts((prev) =>
              prev.map((x) => (x.id === light.id ? light : x)),
            )
            setError(null)
          })
          .catch((err: unknown) => {
            const message =
              err instanceof Error
                ? err.message
                : 'Nu am putut actualiza produsul.'
            setError(message)
          })
        return
      }
      setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)))
    },
    [apiEnabled],
  )

  const removeProduct = useCallback(
    (id: string) => {
      if (apiEnabled) {
        void deleteProductRemote(id)
          .then(() => {
            setProducts((prev) => prev.filter((x) => x.id !== id))
            setError(null)
          })
          .catch((err: unknown) => {
            const message =
              err instanceof Error
                ? err.message
                : 'Nu am putut șterge produsul.'
            setError(message)
          })
        return
      }
      setProducts((prev) => prev.filter((x) => x.id !== id))
    },
    [apiEnabled],
  )

  /**
   * Salvare cu rezultat (editorul de produs pe pagină dedicată).
   * Creează sau actualizează în funcție de existența id-ului în listă.
   */
  const saveProduct = useCallback(
    async (p: Product): Promise<Product> => {
      const exists = products.some((x) => x.id === p.id)
      if (!apiEnabled) {
        setProducts((prev) =>
          exists ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p],
        )
        return p
      }
      const saved = exists
        ? await updateProductRemote(p)
        : await createProduct(p)
      const light = withoutHeavyFields(saved)
      setProducts((prev) =>
        exists
          ? prev.map((x) => (x.id === light.id ? light : x))
          : [...prev, light],
      )
      setError(null)
      return saved
    },
    [apiEnabled, products],
  )

  const deleteProduct = useCallback(
    async (id: string): Promise<void> => {
      if (apiEnabled) {
        await deleteProductRemote(id)
      }
      setProducts((prev) => prev.filter((x) => x.id !== id))
      setError(null)
    },
    [apiEnabled],
  )

  const replaceAll = useCallback(
    (next: Product[]) => {
      if (apiEnabled) {
        void replaceAllProductsRemote(next)
          .then(() => {
            setProducts(next.map(withoutHeavyFields))
            setError(null)
          })
          .catch((err: unknown) => {
            const message =
              err instanceof Error
                ? err.message
                : 'Nu am putut importa produsele.'
            setError(message)
          })
        return
      }
      setProducts(next)
    },
    [apiEnabled],
  )

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    removeProduct,
    saveProduct,
    deleteProduct,
    replaceAll,
    reloadProducts,
  }
}
