import { useCallback, useEffect, useRef, useState } from 'react'
import { ProductForm } from '../components/ProductForm'
import { AdminLayout } from '../components/admin/AdminLayout'
import { ConfirmModal } from '../components/admin/ConfirmModal'
import { ProductTable } from '../components/ProductTable'
import { buildMetaCatalogCsv } from '../lib/metaCatalogCsv'
import {
  fetchProductById,
  fetchProducts,
  isProductsApiEnabled,
  syncSmartbillStock,
} from '../lib/productsApi'
import { SITE_LEGAL } from '../lib/siteLegal'
import { parseProductsJson } from '../lib/validateImport'
import type { Product } from '../types/product'

type GestiunePageProps = {
  products: Product[]
  addProduct: (p: Product) => void
  updateProduct: (p: Product) => void
  removeProduct: (id: string) => void
  replaceAll: (products: Product[]) => void
  reloadProducts: () => void
}

type FormMode =
  | null
  | { kind: 'new' }
  | { kind: 'edit'; product: Product }

type PendingConfirm =
  | { kind: 'deleteProduct'; id: string; name: string }
  | { kind: 'restoreBackup'; products: Product[] }

export function GestiunePage({
  products,
  addProduct,
  updateProduct,
  removeProduct,
  replaceAll,
  reloadProducts,
}: GestiunePageProps) {
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const syncingRef = useRef(false)

  const selectedId =
    formMode?.kind === 'edit' ? formMode.product.id : null

  const handleSave = useCallback(
    (p: Product) => {
      const exists = products.some((x) => x.id === p.id)
      if (exists) {
        updateProduct(p)
      } else {
        addProduct(p)
      }
      setFormMode(null)
    },
    [addProduct, products, updateProduct],
  )

  const handleDelete = useCallback(
    (id: string) => {
      const product = products.find((x) => x.id === id)
      setPending({
        kind: 'deleteProduct',
        id,
        name: product?.name ?? id,
      })
    },
    [products],
  )

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

  const openEdit = useCallback(
    async (id: string) => {
      const listed = products.find((x) => x.id === id)
      if (!listed) return
      if (!isProductsApiEnabled()) {
        setFormMode({ kind: 'edit', product: listed })
        return
      }
      try {
        const full = await fetchProductById(id)
        setFormMode({ kind: 'edit', product: full })
      } catch {
        setFormMode({ kind: 'edit', product: listed })
      }
    },
    [products],
  )

  useEffect(() => {
    if (!formMode) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [formMode])

  useEffect(() => {
    if (!formMode || pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFormMode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [formMode, pending])

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
          <button
            type="button"
            className="btn primary"
            onClick={() => setFormMode({ kind: 'new' })}
          >
            Adaugă produs
          </button>
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
        <ProductTable
          products={products}
          selectedId={selectedId}
          onSelect={(id) => {
            void openEdit(id)
          }}
        />
      </section>

      {formMode ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !pending) setFormMode(null)
          }}
        >
          <div
            className="modal-panel panel"
            role="dialog"
            aria-modal="true"
            aria-label={
              formMode.kind === 'new'
                ? 'Produs nou'
                : `Editează: ${formMode.product.name}`
            }
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-panel__body">
              <ProductForm
                key={formMode.kind === 'new' ? 'new' : formMode.product.id}
                variant="modal"
                mode={
                  formMode.kind === 'new'
                    ? { kind: 'new' }
                    : { kind: 'edit', product: formMode.product }
                }
                onSave={handleSave}
                onDelete={
                  formMode.kind === 'edit' ? handleDelete : undefined
                }
                onCancel={() => setFormMode(null)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={pending?.kind === 'deleteProduct'}
        tone="danger"
        title="Ștergi produsul?"
        description={
          pending?.kind === 'deleteProduct'
            ? `„${pending.name}” va fi eliminat din gestiune. Acțiunea nu poate fi anulată.`
            : ''
        }
        confirmLabel="Șterge produsul"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending?.kind !== 'deleteProduct') return
          removeProduct(pending.id)
          setFormMode(null)
          setPending(null)
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
          setFormMode(null)
          setPending(null)
        }}
      />
    </AdminLayout>
  )
}
