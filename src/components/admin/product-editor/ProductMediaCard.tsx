import { useId, useRef, useState, type DragEvent } from 'react'
import { ProductImage } from '../../ProductImage'
import { ensureUploadableImage, isHeicImage } from '../../../lib/imageFile'
import { clampImageUrls, MAX_IMAGES_PER_PRODUCT } from '../../../lib/productImages'
import { isProductsApiEnabled, uploadProductImage } from '../../../lib/productsApi'

type Props = {
  imageUrls: string[]
  onChange: (updater: (urls: string[]) => string[]) => void
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      if (typeof r.result === 'string') resolve(r.result)
      else reject(new Error('Nu am putut citi fișierul.'))
    }
    r.onerror = () => reject(new Error('Nu am putut citi fișierul.'))
    r.readAsDataURL(file)
  })
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)
}

function looksLikeImageUrl(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (v.startsWith('/')) return true
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Card „Media” (stil Shopify): drop zone, upload multiplu, adăugare prin URL,
 * reordonare prin drag, imagine principală, eliminare.
 * Upload-ul merge pe server imediat; preview-ul local (data:) e înlocuit cu
 * URL-ul public când e gata.
 */
export function ProductMediaCard({ imageUrls, onChange }: Props) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const [urlOpen, setUrlOpen] = useState(false)
  const [urlValue, setUrlValue] = useState('')

  const slotsLeft = Math.max(0, MAX_IMAGES_PER_PRODUCT - imageUrls.length)

  async function addFiles(files: File[]) {
    const images = files.filter(isImageFile)
    if (images.length === 0) {
      setError('Selectează fișiere imagine (JPG, PNG, WEBP, GIF sau HEIC de pe telefon).')
      return
    }
    if (busy) return
    const room = Math.max(0, MAX_IMAGES_PER_PRODUCT - imageUrls.length)
    const batch = images.slice(0, room)
    if (batch.length === 0) {
      setError(`Poți avea maxim ${MAX_IMAGES_PER_PRODUCT} imagini per produs.`)
      return
    }

    setBusy(true)
    setError(null)
    const apiEnabled = isProductsApiEnabled()
    const failures: string[] = []

    for (let i = 0; i < batch.length; i++) {
      const file = batch[i]
      setProgress(
        batch.length > 1
          ? `Se încarcă ${i + 1} din ${batch.length}…`
          : 'Se încarcă imaginea…',
      )

      let uploadable: File
      try {
        if (isHeicImage(file)) setProgress('Se convertește poza din HEIC…')
        uploadable = await ensureUploadableImage(file)
      } catch (err: unknown) {
        failures.push(err instanceof Error ? err.message : 'Format imagine nesuportat.')
        continue
      }

      let preview: string
      try {
        preview = await readFileAsDataURL(uploadable)
      } catch {
        failures.push(`Nu am putut citi fișierul „${file.name}”.`)
        continue
      }

      onChange((urls) => clampImageUrls([...urls, preview]))

      if (!apiEnabled) continue

      try {
        const serverUrl = await uploadProductImage(uploadable)
        onChange((urls) => urls.map((u) => (u === preview ? serverUrl : u)))
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload eșuat pe server.'
        failures.push(`${file.name}: ${message}`)
        onChange((urls) => urls.filter((u) => u !== preview))
      }
    }

    if (failures.length > 0) {
      setError(
        failures.length === 1
          ? failures[0]
          : `${failures.length} imagini nu s-au încărcat. ${failures[0]}`,
      )
    }
    if (images.length > room) {
      setError(
        `Am adăugat doar ${room} din ${images.length}: limita este ${MAX_IMAGES_PER_PRODUCT} imagini.`,
      )
    }
    setProgress(null)
    setBusy(false)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (selected.length) void addFiles(selected)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDropActive(false)
    if (dragIndex !== null) return
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : []
    if (files.length) {
      void addFiles(files)
      return
    }
    const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (looksLikeImageUrl(text)) addUrl(text)
  }

  function addUrl(raw: string) {
    const value = raw.trim()
    if (!looksLikeImageUrl(value)) {
      setError('Adresa trebuie să înceapă cu https:// (sau / pentru fișiere locale).')
      return
    }
    if (imageUrls.includes(value)) {
      setError('Imaginea este deja în galerie.')
      return
    }
    if (slotsLeft <= 0) {
      setError(`Poți avea maxim ${MAX_IMAGES_PER_PRODUCT} imagini per produs.`)
      return
    }
    setError(null)
    onChange((urls) => clampImageUrls([...urls, value]))
    setUrlValue('')
  }

  function move(from: number, to: number) {
    if (from === to) return
    onChange((urls) => {
      const arr = [...urls]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }

  function removeAt(index: number) {
    onChange((urls) => urls.filter((_, i) => i !== index))
  }

  return (
    <section className="pe-card" aria-labelledby={`${inputId}-title`}>
      <header className="pe-card__head">
        <div>
          <h2 id={`${inputId}-title`} className="pe-card__title">
            Media
          </h2>
          <p className="pe-card__lead">
            {imageUrls.length} din {MAX_IMAGES_PER_PRODUCT}. Prima imagine e cea
            principală: apare în catalog, în feed-uri și pe social media.
          </p>
        </div>
        <div className="pe-card__head-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => setUrlOpen((v) => !v)}
            aria-expanded={urlOpen}
          >
            Adaugă din URL
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={busy || slotsLeft <= 0}
            onClick={() => fileInputRef.current?.click()}
          >
            Încarcă imagini
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        onChange={handleFileInput}
        disabled={busy || slotsLeft <= 0}
      />

      {urlOpen ? (
        <div className="pe-url-row">
          <input
            type="url"
            value={urlValue}
            placeholder="https://exemplu.ro/poza.jpg"
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addUrl(urlValue)
              }
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="btn secondary" onClick={() => addUrl(urlValue)}>
            Adaugă
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="pe-alert pe-alert--error" role="alert">
          {error}
          <button type="button" className="pe-alert__close" onClick={() => setError(null)} aria-label="Închide">
            ✕
          </button>
        </p>
      ) : null}
      {progress ? (
        <p className="pe-alert pe-alert--info" role="status">
          <span className="pe-spinner" aria-hidden="true" />
          {progress}
        </p>
      ) : null}

      <div
        className={`pe-dropzone${dropActive ? ' pe-dropzone--active' : ''}${imageUrls.length === 0 ? ' pe-dropzone--empty' : ''}`}
        onDragOver={(e) => {
          if (dragIndex !== null) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
          setDropActive(true)
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
          setDropActive(false)
        }}
        onDrop={handleDrop}
      >
        {imageUrls.length === 0 ? (
          <button
            type="button"
            className="pe-dropzone__empty"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <strong>Trage imaginile aici sau apasă pentru a le alege</strong>
            <span className="muted">JPG, PNG, WEBP, GIF, HEIC · până la 5 MB fiecare</span>
          </button>
        ) : (
          <ul className="pe-media-grid" aria-label="Galerie produs">
            {imageUrls.map((url, index) => {
              const pending = url.startsWith('data:')
              const isMain = index === 0
              return (
                <li
                  key={`${index}-${url.slice(0, 64)}`}
                  className={[
                    'pe-media-item',
                    isMain ? 'pe-media-item--main' : '',
                    dragIndex === index ? 'pe-media-item--dragging' : '',
                    overIndex === index && dragIndex !== null && dragIndex !== index
                      ? 'pe-media-item--over'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  draggable={!pending}
                  onDragStart={(e) => {
                    setDragIndex(index)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', String(index))
                  }}
                  onDragEnd={() => {
                    setDragIndex(null)
                    setOverIndex(null)
                  }}
                  onDragOver={(e) => {
                    if (dragIndex === null) return
                    e.preventDefault()
                    e.stopPropagation()
                    e.dataTransfer.dropEffect = 'move'
                    setOverIndex(index)
                  }}
                  onDrop={(e) => {
                    if (dragIndex === null) return
                    e.preventDefault()
                    e.stopPropagation()
                    move(dragIndex, index)
                    setDragIndex(null)
                    setOverIndex(null)
                  }}
                >
                  <div className="pe-media-item__frame">
                    <ProductImage
                      src={url}
                      alt=""
                      loading="eager"
                      placeholderClassName="pe-media-item__placeholder"
                      placeholderLabel="Imagine indisponibilă"
                    />
                    {pending ? (
                      <span className="pe-media-item__pending">
                        <span className="pe-spinner" aria-hidden="true" />
                        Se încarcă…
                      </span>
                    ) : null}
                    {isMain ? <span className="pe-media-item__badge">Principală</span> : null}
                  </div>
                  <div className="pe-media-item__actions">
                    {!isMain ? (
                      <button
                        type="button"
                        className="pe-media-item__btn"
                        onClick={() => move(index, 0)}
                        title="Setează ca imagine principală"
                      >
                        Principală
                      </button>
                    ) : (
                      <span className="pe-media-item__hint">Trage pentru a reordona</span>
                    )}
                    <button
                      type="button"
                      className="pe-media-item__btn pe-media-item__btn--danger"
                      onClick={() => removeAt(index)}
                      aria-label={`Elimină imaginea ${index + 1}`}
                      title="Elimină"
                    >
                      Elimină
                    </button>
                  </div>
                </li>
              )
            })}
            {slotsLeft > 0 ? (
              <li className="pe-media-item pe-media-item--add">
                <button
                  type="button"
                  className="pe-media-add"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Adaugă</span>
                </button>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </section>
  )
}
