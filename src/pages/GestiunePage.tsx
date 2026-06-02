import { useCallback, useEffect, useRef, useState } from 'react'
import { ProductForm } from '../components/ProductForm'
import { AdminLayout } from '../components/admin/AdminLayout'
import { ProductTable } from '../components/ProductTable'
import { parseProductsJson } from '../lib/validateImport'
import type { Product } from '../types/product'

type GestiunePageProps = {
  products: Product[]
  addProduct: (p: Product) => void
  updateProduct: (p: Product) => void
  removeProduct: (id: string) => void
  replaceAll: (products: Product[]) => void
}

type FormMode =
  | null
  | { kind: 'new' }
  | { kind: 'edit'; product: Product }

export function GestiunePage({
  products,
  addProduct,
  updateProduct,
  removeProduct,
  replaceAll,
}: GestiunePageProps) {
  const [formMode, setFormMode] = useState<FormMode>(null)
  const importRef = useRef<HTMLInputElement>(null)

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
      setFormMode({ kind: 'edit', product: p })
    },
    [addProduct, products, updateProduct],
  )

  const handleDelete = useCallback(
    (id: string) => {
      if (!globalThis.confirm('Ștergi acest produs?')) return
      removeProduct(id)
      setFormMode(null)
    },
    [removeProduct],
  )

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(products, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shoptop-produse-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [products])

  useEffect(() => {
    if (!formMode) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [formMode])

  useEffect(() => {
    if (!formMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFormMode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [formMode])

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
        const ok = globalThis.confirm(
          `Restaurezi lista din backup? Se vor înlocui cele ${products.length} produse curente cu ${parsed.length} din fișier.`,
        )
        if (!ok) return
        replaceAll(parsed)
        setFormMode(null)
      }
      reader.readAsText(file)
    },
    [products.length, replaceAll],
  )

  return (
    <AdminLayout
      title="Gestiune produse"
      lead="Actualizează stocurile, prețurile și detaliile produselor."
      actions={
        <>
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
        <ProductTable
          products={products}
          selectedId={selectedId}
          onSelect={(id) => {
            const p = products.find((x) => x.id === id)
            if (p) setFormMode({ kind: 'edit', product: p })
          }}
        />
      </section>

      {formMode ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFormMode(null)
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
    </AdminLayout>
  )
}
