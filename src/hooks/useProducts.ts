import { useCallback, useEffect, useState } from 'react'
import type { Product } from '../types/product'
import { mergeSeedProducts } from '../data/seedProducts'
import {
  createProduct,
  deleteProductRemote,
  fetchProducts,
  isProductsApiEnabled,
  replaceAllProductsRemote,
  updateProductRemote,
} from '../lib/productsApi'
import { loadProducts, saveProducts } from '../lib/storage'

export function useProducts() {
  const apiEnabled = isProductsApiEnabled()
  const [products, setProducts] = useState<Product[]>(() => {
    if (apiEnabled) return []
    const loaded = loadProducts() ?? []
    return mergeSeedProducts(loaded)
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
            : 'Nu am putut incarca produsele din MySQL.'
        setError(message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [apiEnabled])

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
            : 'Nu am putut reincarca produsele din MySQL.'
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
            setProducts((prev) => [...prev, saved])
            setError(null)
          })
          .catch((err: unknown) => {
            const message =
              err instanceof Error
                ? err.message
                : 'Nu am putut salva produsul in MySQL.'
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
            setProducts((prev) =>
              prev.map((x) => (x.id === saved.id ? saved : x)),
            )
            setError(null)
          })
          .catch((err: unknown) => {
            const message =
              err instanceof Error
                ? err.message
                : 'Nu am putut actualiza produsul in MySQL.'
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
                : 'Nu am putut sterge produsul din MySQL.'
            setError(message)
          })
        return
      }
      setProducts((prev) => prev.filter((x) => x.id !== id))
    },
    [apiEnabled],
  )

  const replaceAll = useCallback(
    (next: Product[]) => {
      if (apiEnabled) {
        void replaceAllProductsRemote(next)
          .then(() => {
            setProducts(next)
            setError(null)
          })
          .catch((err: unknown) => {
            const message =
              err instanceof Error
                ? err.message
                : 'Nu am putut importa produsele in MySQL.'
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
    replaceAll,
    reloadProducts,
  }
}
