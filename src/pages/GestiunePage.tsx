import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'
import { ConfirmModal } from '../components/admin/ConfirmModal'
import { ProductList } from '../components/admin/ProductList'
import { buildMetaCatalogCsv } from '../lib/metaCatalogCsv'
import {
  fetchProducts,
  isProductsApiEnabled,
  syncSmartbillStock,
} from '../lib/productsApi'
import { fetchProductSales, type ProductSalesMap } from '../lib/productSales'
import { SITE_LEGAL } from '../lib/siteLegal'
import { parseProductsJson } from '../lib/validateImport'
import type { Product } from '../types/product'

type GestiunePageProps = {
  products: Product[]
  replaceAll: (products: Product[]) => void
  reloadProducts: () => void
  deleteProduct: (id: string) => Promise<void>
}

type PendingConfirm =
  | { kind: 'restoreBackup'; products: Product[] }
  | { kind: 'deleteProduct'; product: Product }

/**
 * Lista de produse. Adăugarea / editarea se fac pe pagină dedicată
 * (/admin/produse/nou, /admin/produse/:id), nu în pop-up.
 */
export function GestiunePage({
  products,
  replaceAll,
  reloadProducts,
  deleteProduct,
}: GestiunePageProps) {
  const navigate = useNavigate()
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)
  const [sales, setSales] = useState<ProductSalesMap | null>(null)
  const [salesError, setSalesError] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const syncingRef = useRef(false)

  // Comenzi pe produs (7/30/90 zile), agregate pe server.
  useEffect(() => {
    if (!isProductsApiEnabled()) {
      return
    }
    let cancelled = false
    void fetchProductSales()
      .then((map) => {
        if (!cancelled) setSales(map)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setSalesError(
          err instanceof Error ? err.message : 'Nu am putut încărca vânzările.',
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleDeleteConfirmed = useCallback(async () => {
    if (pending?.kind !== 'deleteProduct' || deleting) return
    setDeleting(true)
    try {
      await deleteProduct(pending.product.id)
      setPending(null)
    } catch (err: unknown) {
      setSyncNote(
        err instanceof Error ? err.message : 'Nu am putut șterge produsul.',
      )
      setPending(null)
    } finally {
      setDeleting(false)
    }
  }, [deleteProduct, deleting, pending])

  const handleExport = useCallback(async () => {
    let payload = products
    if (isProductsApiEnabled()) {
      try {
        payload = await fetchProducts({ full: true })
      } catch {
        globalThis.alert(
          'Nu am putut încărca descrierile complete pentru backup. Încearcă din nou.',
        )
        return
      }
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shoptop-produse-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [products])

  const handleExportMetaCatalog = useCallback(async () => {
    let payload = products
    if (isProductsApiEnabled()) {
      try {
        payload = await fetchProducts({ full: true })
      } catch {
        globalThis.alert(
          'Nu am putut încărca produsele pentru catalogul Meta. Încearcă din nou.',
        )
        return
      }
    }
    const csv = buildMetaCatalogCsv(payload)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `catalog_products-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [products])

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const text =
          typeof reader.result === 'string' ? reader.result : ''
        const parsed = parseProductsJson(text)
        if (!parsed) {
          globalThis.alert(
            'Fișier invalid sau gol. Folosește doar un backup JSON exportat mai devreme din această aplicație.',
          )
          return
        }
        setPending({ kind: 'restoreBackup', products: parsed })
      }
      reader.readAsText(file)
    },
    [],
  )

  const handleSyncSmartbill = useCallback(async () => {
    if (!isProductsApiEnabled() || syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    setSyncNote(null)
    try {
      const result = await syncSmartbillStock()
      reloadProducts()
      const warehouse = result.warehouse ? ` „${result.warehouse}”` : ''
      const missing =
        result.missing > 0
          ? ` ${result.missing} SKU fără stoc în SmartBill (setate 0).`
          : ''
      setSyncNote(
        `Stoc SmartBill${warehouse}: ${result.updated} actualizate, ${result.unchanged} neschimbate.${missing}`,
      )
    } catch (err: unknown) {
      setSyncNote(
        err instanceof Error
          ? err.message
          : 'Nu am putut sincroniza stocul din SmartBill.',
      )
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [reloadProducts])

  useEffect(() => {
    void handleSyncSmartbill()
  }, [handleSyncSmartbill])

  return (
    <AdminLayout
      title="Gestiune produse"
      lead="Stocurile urmează SmartBill: scad la ambalare/expediere (în tranzit) și revin după retur."
      actions={
        <>
          {isProductsApiEnabled() ? (
            <button
              type="button"
              className="btn secondary"
              disabled={syncing}
              onClick={() => {
                void handleSyncSmartbill()
              }}
            >
              {syncing ? 'Sincronizez stoc…' : 'Sincronizează stoc SmartBill'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              void handleExportMetaCatalog()
            }}
          >
            Export catalog Meta (.csv)
          </button>
          <Link to="/admin/produse/nou" className="btn primary">
            Adaugă produs
          </Link>
          <details className="backup-details">
            <summary className="backup-details__summary">
              Backup fișier (opțional)
            </summary>
            <div className="backup-details__body">
              <p className="backup-details__hint muted">
                Nu ai nevoie de import ca să începi — doar dacă vrei să muți
                datele pe alt PC sau să restaurezi o copie.
              </p>
              <div className="backup-details__buttons">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={handleExport}
                >
                  Descarcă backup (.json)
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => importRef.current?.click()}
                >
                  Restaurează din backup
                </button>
              </div>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={handleImportFile}
              />
            </div>
          </details>
        </>
      }
    >
      <section className="panel panel--list" aria-label="Lista produse">
        <p className="gestiune-sync-note muted">
          Feed Meta (update automat):{' '}
          <a href={`${SITE_LEGAL.siteUrl}/catalog.csv`}>
            {SITE_LEGAL.siteUrl}/catalog.csv
          </a>
        </p>
        {syncNote ? (
          <p className="gestiune-sync-note muted" role="status">
            {syncNote}
          </p>
        ) : null}
        <ProductList
          products={products}
          sales={isProductsApiEnabled() ? sales : {}}
          salesError={salesError}
          onOpen={(id) => {
            navigate(`/admin/produse/${encodeURIComponent(id)}`)
          }}
          onDuplicate={(product) => {
            navigate('/admin/produse/nou', {
              state: { duplicateOf: product.id },
            })
          }}
          onDelete={(product) => setPending({ kind: 'deleteProduct', product })}
        />
      </section>

      <ConfirmModal
        open={pending?.kind === 'deleteProduct'}
        tone="danger"
        title="Ștergi produsul?"
        description={
          pending?.kind === 'deleteProduct'
            ? `„${pending.product.name}” va fi eliminat din gestiune și din catalog. Acțiunea nu poate fi anulată.`
            : ''
        }
        confirmLabel="Șterge produsul"
        busy={deleting}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          void handleDeleteConfirmed()
        }}
      />

      <ConfirmModal
        open={pending?.kind === 'restoreBackup'}
        tone="warning"
        title="Restaurezi din backup?"
        description={
          pending?.kind === 'restoreBackup'
            ? `Se vor înlocui cele ${products.length} produse curente cu ${pending.products.length} din fișier.`
            : ''
        }
        confirmLabel="Restaurează lista"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending?.kind !== 'restoreBackup') return
          replaceAll(pending.products)
          setPending(null)
        }}
      />
    </AdminLayout>
  )
}
