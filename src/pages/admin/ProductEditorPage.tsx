import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { ConfirmModal } from '../../components/admin/ConfirmModal'
import { ProductBundlesCard } from '../../components/admin/product-editor/ProductBundlesCard'
import { ProductMediaCard } from '../../components/admin/product-editor/ProductMediaCard'
import { RichTextEditor } from '../../components/RichTextEditor'
import {
  draftFromProduct,
  emptyProductDraft,
  normalizeProductDraft,
  productDraftFingerprint,
  productDraftWarnings,
  slugifyProductName,
  validateProductDraft,
  type ProductDraft,
  type ProductDraftIssue,
} from '../../lib/productDraft'
import { fetchProductById, isProductsApiEnabled } from '../../lib/productsApi'
import {
  collectProductCategories,
  formatRon,
  isListedInShop,
  isVirtualProductId,
} from '../../lib/shopCatalog'
import { productPagePath } from '../../lib/shopProductRoutes'
import { SITE_LEGAL } from '../../lib/siteLegal'
import type { Product } from '../../types/product'
import './ProductEditorPage.css'

type Props = {
  products: Product[]
  saveProduct: (p: Product) => Promise<Product>
  deleteProduct: (id: string) => Promise<void>
}

type LoadState =
  | { kind: 'new' }
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'ready'; product: Product }

const DISCOUNT_PRESETS = [0, 10, 20, 30, 40, 50] as const

function toNumber(value: string): number {
  const n = parseFloat(value.replace(',', '.'))
  return value === '' || Number.isNaN(n) ? 0 : n
}

function money(value: number): string {
  return formatRon(Math.round(value * 100) / 100)
}

/** Draft pentru „Duplică”: copie fără identificatori unici (SKU, EAN, slug). */
function duplicateDraft(source: Product): ProductDraft {
  const draft = draftFromProduct(source)
  return {
    ...draft,
    name: `${source.name} (copie)`,
    sku: '',
    ean: '',
    slug: '',
    stockQty: 0,
  }
}

function newProductId(sku: string, products: Product[]): string {
  const candidate = sku.trim()
  if (
    candidate &&
    !isVirtualProductId(candidate) &&
    !products.some((p) => p.id.toLowerCase() === candidate.toLowerCase())
  ) {
    return candidate
  }
  return crypto.randomUUID()
}

/**
 * Wrapper de rută: remontează editorul (cu `key`) când se schimbă id-ul din
 * URL, ca starea formularului să pornească curat la fiecare produs.
 */
export function ProductEditorPage(props: Props) {
  const { productId } = useParams<{ productId?: string }>()
  return <ProductEditor key={productId ?? 'new'} {...props} productId={productId} />
}

type EditorProps = Props & { productId?: string }

function ProductEditor({ products, saveProduct, deleteProduct, productId }: EditorProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const isNew = !productId
  const formId = useId()

  // „Duplică” din listă: produs nou pre-completat din altul (fără SKU/EAN/slug).
  const duplicateOf = useMemo(() => {
    const state = location.state as { duplicateOf?: unknown } | null
    return isNew && typeof state?.duplicateOf === 'string' ? state.duplicateOf : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fără API (mod localStorage) produsul e complet în listă; cu API aducem
  // descrierea de pe server, deci pornim în „loading”.
  const initial = useMemo<{ load: LoadState; draft: ProductDraft }>(() => {
    if (isNew && duplicateOf) {
      const source = products.find((p) => p.id === duplicateOf)
      if (!isProductsApiEnabled()) {
        return {
          load: { kind: 'new' },
          draft: source ? duplicateDraft(source) : emptyProductDraft(),
        }
      }
      return { load: { kind: 'loading' }, draft: emptyProductDraft() }
    }
    if (isNew) return { load: { kind: 'new' }, draft: emptyProductDraft() }
    if (!isProductsApiEnabled()) {
      const listed = products.find((p) => p.id === productId)
      return listed
        ? { load: { kind: 'ready', product: listed }, draft: draftFromProduct(listed) }
        : { load: { kind: 'missing' }, draft: emptyProductDraft() }
    }
    return { load: { kind: 'loading' }, draft: emptyProductDraft() }
    // Doar la montare (componenta e remontată prin `key` la schimbarea id-ului).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [load, setLoad] = useState<LoadState>(initial.load)
  const [draft, setDraft] = useState<ProductDraft>(initial.draft)
  const [baseline, setBaseline] = useState<string>(() => productDraftFingerprint(initial.draft))
  // La produse existente adresa e fixă (nu urmează titlul); la produs nou
  // urmează titlul până când o editezi manual.
  const [slugTouched, setSlugTouched] = useState(() => initial.load.kind === 'ready')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(() => {
    const state = location.state as { flash?: unknown } | null
    return typeof state?.flash === 'string' ? state.flash : null
  })
  const [showIssues, setShowIssues] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Duplicare cu API: aducem produsul sursă complet (cu descriere).
  useEffect(() => {
    if (!isNew || !duplicateOf || !isProductsApiEnabled()) return
    let cancelled = false
    void fetchProductById(duplicateOf)
      .then((source) => {
        if (cancelled) return
        setDraft(duplicateDraft(source))
        setLoad({ kind: 'new' })
      })
      .catch(() => {
        if (cancelled) return
        setLoad({ kind: 'new' })
      })
    return () => {
      cancelled = true
    }
  }, [duplicateOf, isNew])

  // Încarcă produsul complet (cu descriere) de pe server când edităm.
  useEffect(() => {
    if (isNew || !isProductsApiEnabled() || !productId) return
    let cancelled = false
    const listed = products.find((p) => p.id === productId)

    const apply = (product: Product) => {
      if (cancelled) return
      const next = draftFromProduct(product)
      setDraft(next)
      setBaseline(productDraftFingerprint(next))
      setSlugTouched(true)
      setLoad({ kind: 'ready', product })
    }

    void fetchProductById(productId)
      .then(apply)
      .catch(() => {
        if (cancelled) return
        if (listed) apply(listed)
        else setLoad({ kind: 'missing' })
      })
    return () => {
      cancelled = true
    }
    // `products` se schimbă la fiecare salvare; nu vrem re-încărcare atunci.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, isNew])

  const dirty = useMemo(() => productDraftFingerprint(draft) !== baseline, [draft, baseline])
  const issues = useMemo(() => validateProductDraft(draft), [draft])
  const warnings = useMemo(() => productDraftWarnings(draft), [draft])
  const issueFor = (field: ProductDraftIssue['field']) =>
    showIssues ? issues.find((i) => i.field === field)?.message : undefined

  const preview = useMemo(
    () => normalizeProductDraft(draft, productId ?? 'draft'),
    [draft, productId],
  )
  const listed = isListedInShop(preview)
  const profit = preview.salePrice - preview.purchasePrice
  const marginPct = preview.salePrice > 0 ? (profit / preview.salePrice) * 100 : null
  const compareAt =
    preview.discountPercent && preview.salePrice > 0
      ? Math.round((preview.salePrice / (1 - preview.discountPercent / 100)) * 100) / 100
      : null
  const categories = useMemo(() => collectProductCategories(products), [products])
  const existing = load.kind === 'ready' ? load.product : null
  const skuLocked = Boolean(existing?.sku)
  const [skuUnlocked, setSkuUnlocked] = useState(false)
  const slugPreview = slugifyProductName(draft.slug || draft.name) || 'produs'
  const currentSlug = existing ? existing.slug ?? slugifyProductName(existing.name) : null
  const slugChanged = currentSlug !== null && slugPreview !== currentSlug
  const slugFromTitle = slugifyProductName(draft.name)
  const previousSlugs = existing?.previousSlugs ?? []

  const patch = useCallback(
    <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) =>
      setDraft((d) => ({ ...d, [key]: value })),
    [],
  )

  // Avertisment la părăsirea paginii cu modificări nesalvate.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 3500)
    return () => window.clearTimeout(t)
  }, [flash])

  const handleSave = useCallback(async () => {
    if (saving) return
    if (issues.length > 0) {
      setShowIssues(true)
      setSaveError(issues[0].message)
      if (issues[0].field === 'name') nameRef.current?.focus()
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const id = productId ?? newProductId(draft.sku ?? '', products)
      const saved = await saveProduct(normalizeProductDraft(draft, id))
      const next = draftFromProduct(saved)
      setDraft(next)
      setBaseline(productDraftFingerprint(next))
      setLoad({ kind: 'ready', product: saved })
      setShowIssues(false)
      if (isNew) {
        navigate(`/admin/produse/${encodeURIComponent(saved.id)}`, {
          replace: true,
          state: { flash: 'Produs creat.' },
        })
      } else {
        setFlash('Modificările au fost salvate.')
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Nu am putut salva produsul.')
    } finally {
      setSaving(false)
    }
  }, [draft, isNew, issues, navigate, productId, products, saveProduct, saving])

  // Ctrl+S / Cmd+S salvează.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave])

  // Mesajul „Produs creat.” vine prin history state după redirect; îl consumăm
  // ca să nu reapară la refresh.
  useEffect(() => {
    const state = location.state as { flash?: unknown } | null
    if (state?.flash) {
      window.history.replaceState({ ...window.history.state, usr: {} }, '')
    }
  }, [location.state])

  function discardChanges() {
    if (isNew) {
      navigate('/admin/gestiune')
      return
    }
    if (existing) {
      const next = draftFromProduct(existing)
      setDraft(next)
      setBaseline(productDraftFingerprint(next))
      setShowIssues(false)
      setSaveError(null)
    }
  }

  async function handleDelete() {
    if (!productId || deleting) return
    setDeleting(true)
    try {
      await deleteProduct(productId)
      navigate('/admin/gestiune', { replace: true })
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Nu am putut șterge produsul.')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const title = isNew ? 'Produs nou' : draft.name.trim() || existing?.name || 'Editează produs'

  if (load.kind === 'loading') {
    return (
      <AdminLayout
        title="Se încarcă produsul…"
        parent={{ to: '/admin/gestiune', label: 'Gestiune produse' }}
      >
        <div className="pe-skeleton" aria-busy="true" aria-live="polite">
          <div className="pe-skeleton__block" />
          <div className="pe-skeleton__block pe-skeleton__block--tall" />
        </div>
      </AdminLayout>
    )
  }

  if (load.kind === 'missing') {
    return (
      <AdminLayout
        title="Produsul nu a fost găsit"
        parent={{ to: '/admin/gestiune', label: 'Gestiune produse' }}
      >
        <section className="pe-card">
          <p>Produsul cu id-ul „{productId}” nu există sau a fost șters.</p>
          <Link to="/admin/gestiune" className="btn primary">
            Înapoi la lista de produse
          </Link>
        </section>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title={title}
      parent={{ to: '/admin/gestiune', label: 'Gestiune produse' }}
      lead={
        isNew
          ? 'Completează informațiile de bază; poți reveni oricând pentru detalii.'
          : undefined
      }
      actions={
        existing && listed ? (
          <a
            className="btn secondary"
            href={productPagePath(existing)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Vezi în magazin ↗
          </a>
        ) : null
      }
    >
      <form
        id={formId}
        className="pe"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSave()
        }}
        noValidate
      >
        <div className="pe-toolbar">
          <Link to="/admin/gestiune" className="pe-back">
            <span aria-hidden="true">←</span> Toate produsele
          </Link>
          <span className={`pe-status pe-status--${listed ? 'on' : 'off'}`}>
            <span className="pe-status__dot" aria-hidden="true" />
            {listed ? 'Vizibil în magazin' : 'Ascuns din magazin'}
          </span>
          {existing?.sku ? <span className="pe-chip">SKU {existing.sku}</span> : null}
        </div>

        {flash ? (
          <p className="pe-alert pe-alert--success" role="status">
            {flash}
          </p>
        ) : null}
        {saveError ? (
          <p className="pe-alert pe-alert--error" role="alert">
            {saveError}
          </p>
        ) : null}

        <div className="pe-grid">
          {/* ===== Coloana principală ===== */}
          <div className="pe-main">
            <section className="pe-card">
              <label className="field pe-field-lg">
                <span>Titlu</span>
                <input
                  ref={nameRef}
                  type="text"
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setDraft((d) => ({
                      ...d,
                      name,
                      slug: slugTouched ? d.slug : '',
                    }))
                  }}
                  placeholder="ex. Set mop rotativ 360° cu găleată inox"
                  autoComplete="off"
                  required
                  aria-invalid={issueFor('name') ? true : undefined}
                />
                {issueFor('name') ? (
                  <span className="pe-field-error">{issueFor('name')}</span>
                ) : null}
              </label>

              <div className="field">
                <span>Descriere</span>
                <RichTextEditor
                  value={draft.description ?? ''}
                  onChange={(html) => patch('description', html)}
                  placeholder="Ce este produsul, ce include, specificații, garanție…"
                  ariaLabel="Descriere produs"
                />
                <span className="pe-hint">
                  Apare pe pagina produsului. Folosește titluri (H2/H3) și liste pentru
                  lizibilitate; poți insera imagini, video sau tabele.
                </span>
              </div>
            </section>

            <ProductMediaCard
              imageUrls={draft.imageUrls}
              onChange={(updater) =>
                setDraft((d) => ({ ...d, imageUrls: updater(d.imageUrls) }))
              }
            />
            {issueFor('images') ? (
              <p className="pe-field-error pe-field-error--block">{issueFor('images')}</p>
            ) : null}

            <section className="pe-card" aria-labelledby={`${formId}-pricing`}>
              <header className="pe-card__head">
                <div>
                  <h2 id={`${formId}-pricing`} className="pe-card__title">
                    Prețuri
                  </h2>
                  <p className="pe-card__lead">
                    Prețul de vânzare este cel plătit de client. Discountul afișează
                    un preț tăiat calculat automat.
                  </p>
                </div>
              </header>

              <div className="pe-row pe-row--3">
                <label className="field">
                  <span>Preț de vânzare</span>
                  <span className="pe-input-affix">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={0}
                      value={draft.salePrice}
                      onChange={(e) => patch('salePrice', toNumber(e.target.value))}
                      aria-invalid={issueFor('salePrice') ? true : undefined}
                    />
                    <span className="pe-input-affix__unit">RON</span>
                  </span>
                  {issueFor('salePrice') ? (
                    <span className="pe-field-error">{issueFor('salePrice')}</span>
                  ) : null}
                </label>

                <label className="field">
                  <span>Discount afișat</span>
                  <span className="pe-input-affix">
                    <input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min={0}
                      max={99}
                      value={draft.discountPercent ?? 0}
                      onChange={(e) =>
                        patch('discountPercent', Math.min(99, Math.max(0, toNumber(e.target.value))))
                      }
                    />
                    <span className="pe-input-affix__unit">%</span>
                  </span>
                  <span className="pe-chips" role="group" aria-label="Discount rapid">
                    {DISCOUNT_PRESETS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`pe-chip pe-chip--btn${(draft.discountPercent ?? 0) === value ? ' pe-chip--active' : ''}`}
                        onClick={() => patch('discountPercent', value)}
                      >
                        {value === 0 ? 'Fără' : `${value}%`}
                      </button>
                    ))}
                  </span>
                </label>

                <div className="field">
                  <span>Preț tăiat (calculat)</span>
                  <output className="pe-readonly">
                    {compareAt !== null ? money(compareAt) : '—'}
                  </output>
                  <span className="pe-hint">
                    {compareAt !== null
                      ? `În magazin: ${money(compareAt)} tăiat, ${money(preview.salePrice)} final.`
                      : 'Fără discount: se afișează doar prețul de vânzare.'}
                  </span>
                </div>
              </div>

              <hr className="pe-sep" />

              <div className="pe-row pe-row--3">
                <label className="field">
                  <span>Preț de achiziție (cost)</span>
                  <span className="pe-input-affix">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={0}
                      value={draft.purchasePrice}
                      onChange={(e) => patch('purchasePrice', toNumber(e.target.value))}
                      aria-invalid={issueFor('purchasePrice') ? true : undefined}
                    />
                    <span className="pe-input-affix__unit">RON</span>
                  </span>
                  <span className="pe-hint">Nu apare clienților. Folosit la profit și feed Meta.</span>
                  {issueFor('purchasePrice') ? (
                    <span className="pe-field-error">{issueFor('purchasePrice')}</span>
                  ) : null}
                </label>
                <div className="field">
                  <span>Profit / bucată</span>
                  <output className={`pe-readonly${profit < 0 ? ' pe-readonly--bad' : ''}`}>
                    {money(profit)}
                  </output>
                </div>
                <div className="field">
                  <span>Marjă</span>
                  <output
                    className={`pe-readonly${marginPct !== null && marginPct < 0 ? ' pe-readonly--bad' : ''}`}
                  >
                    {marginPct === null ? '—' : `${marginPct.toFixed(1)} %`}
                  </output>
                  {profit < SITE_LEGAL.metaMinProductProfitRon && preview.purchasePrice > 0 ? (
                    <span className="pe-hint pe-hint--warn">
                      Sub {SITE_LEGAL.metaMinProductProfitRon} RON profit: exclus din feed-ul Meta.
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="pe-card" aria-labelledby={`${formId}-inventory`}>
              <header className="pe-card__head">
                <div>
                  <h2 id={`${formId}-inventory`} className="pe-card__title">
                    Stoc și coduri
                  </h2>
                </div>
              </header>
              <div className="pe-row pe-row--3">
                <label className="field">
                  <span>SKU</span>
                  <span className="pe-input-affix">
                    <input
                      type="text"
                      value={draft.sku}
                      onChange={(e) => patch('sku', e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="ex. A025"
                      readOnly={skuLocked && !skuUnlocked}
                    />
                    {skuLocked && !skuUnlocked ? (
                      <button
                        type="button"
                        className="pe-input-affix__btn"
                        onClick={() => setSkuUnlocked(true)}
                      >
                        Modifică
                      </button>
                    ) : null}
                  </span>
                  <span className="pe-hint">
                    {skuLocked
                      ? 'Este id-ul din feed-ul Meta. După lansare nu se schimbă.'
                      : 'Devine id-ul din feed-ul Meta. Alege-l o singură dată.'}
                  </span>
                </label>
                <label className="field">
                  <span>Cod de bare (EAN / GTIN)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={draft.ean}
                    onChange={(e) => patch('ean', e.target.value)}
                    autoComplete="off"
                    placeholder="ex. 5901234123457"
                  />
                </label>
                <label className="field">
                  <span>Stoc (bucăți)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={0}
                    value={draft.stockQty ?? 0}
                    onChange={(e) => patch('stockQty', Math.max(0, Math.floor(toNumber(e.target.value))))}
                  />
                  <span className="pe-hint">Se suprascrie la sincronizarea cu SmartBill.</span>
                </label>
              </div>
            </section>

            <ProductBundlesCard
              salePrice={preview.salePrice}
              offers={draft.bundleOffers ?? []}
              onChange={(offers) => patch('bundleOffers', offers)}
            />
          </div>

          {/* ===== Coloana laterală ===== */}
          <aside className="pe-side">
            <section className="pe-card">
              <h2 className="pe-card__title">Status</h2>
              <p className={`pe-status pe-status--${listed ? 'on' : 'off'} pe-status--block`}>
                <span className="pe-status__dot" aria-hidden="true" />
                {listed ? 'Vizibil în magazin' : 'Ascuns din magazin'}
              </p>
              <p className="pe-hint">
                {listed
                  ? 'Produsul apare în catalog și poate fi comandat.'
                  : isVirtualProductId(preview.id, preview.sku)
                    ? 'Produs de sistem (addon checkout): nu apare în catalog.'
                    : 'Setează un preț de vânzare mai mare decât 0 ca să apară în catalog.'}
              </p>
              {warnings.length > 0 ? (
                <ul className="pe-checklist" aria-label="De completat">
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : (
                <p className="pe-checklist__ok">Toate câmpurile recomandate sunt completate.</p>
              )}
            </section>

            <section className="pe-card">
              <h2 className="pe-card__title">Organizare</h2>
              <label className="field">
                <span>Categorie</span>
                <input
                  type="text"
                  list={`${formId}-categories`}
                  value={draft.category}
                  onChange={(e) => patch('category', e.target.value)}
                  autoComplete="off"
                  placeholder="ex. Bucătărie"
                />
                <datalist id={`${formId}-categories`}>
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <span className="pe-hint">Filtrul din catalog. Fără categorie: „Casă și grădină”.</span>
              </label>
              <label className="field">
                <span>Brand</span>
                <input
                  type="text"
                  value={draft.brand}
                  onChange={(e) => patch('brand', e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span>Adresă URL (slug)</span>
                <span className="pe-input-affix">
                  <input
                    type="text"
                    value={draft.slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      patch('slug', e.target.value)
                    }}
                    onBlur={() => {
                      if (!draft.slug.trim() && !existing) setSlugTouched(false)
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={slugPreview}
                  />
                  {existing && slugFromTitle && slugFromTitle !== slugPreview ? (
                    <button
                      type="button"
                      className="pe-input-affix__btn"
                      title="Regenerează adresa din titlul curent"
                      onClick={() => {
                        setSlugTouched(true)
                        patch('slug', slugFromTitle)
                      }}
                    >
                      După titlu
                    </button>
                  ) : null}
                </span>
                <span className="pe-hint pe-hint--mono">/produs/{slugPreview}</span>
                <span className="pe-hint">
                  {existing
                    ? 'Adresa nu se schimbă când modifici titlul. Dacă o schimbi aici, cea veche redirecționează automat (301) către cea nouă.'
                    : 'Se generează din titlu la creare și rămâne fixă după aceea.'}
                </span>
                {slugChanged ? (
                  <span className="pe-hint pe-hint--warn">
                    La salvare, /produs/{currentSlug} va redirecționa către /produs/{slugPreview}.
                    Reclamele și linkurile vechi rămân valide.
                  </span>
                ) : null}
                {previousSlugs.length > 0 ? (
                  <span className="pe-hint">
                    Adrese vechi active (redirect):{' '}
                    {previousSlugs.map((s, i) => (
                      <span key={s}>
                        {i > 0 ? ', ' : ''}
                        <code>/produs/{s}</code>
                      </span>
                    ))}
                  </span>
                ) : null}
              </label>
            </section>

            <section className="pe-card">
              <h2 className="pe-card__title">Feed Google / Meta / TikTok</h2>
              <p className="pe-hint">
                Pentru aprobare în cataloage: EAN (mai sus) sau Brand + MPN.
              </p>
              <label className="field">
                <span>MPN (cod producător)</span>
                <input
                  type="text"
                  value={draft.mpn}
                  onChange={(e) => patch('mpn', e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span>Categorie Google</span>
                <input
                  type="text"
                  value={draft.googleCategory}
                  onChange={(e) => patch('googleCategory', e.target.value)}
                  autoComplete="off"
                  placeholder="ex. 672 sau Home & Garden > Kitchen"
                />
              </label>
            </section>

            <section className="pe-card">
              <h2 className="pe-card__title">Note interne</h2>
              <label className="field">
                <span className="sr-only">Note interne</span>
                <textarea
                  value={draft.notes}
                  onChange={(e) => patch('notes', e.target.value)}
                  rows={4}
                  placeholder="Furnizor, cod furnizor, observații. Nu apar pe site."
                />
              </label>
            </section>

            {existing ? (
              <section className="pe-card pe-card--danger">
                <h2 className="pe-card__title">Ștergere</h2>
                <p className="pe-hint">
                  Produsul dispare din gestiune și din catalog. Comenzile vechi rămân.
                </p>
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  Șterge produsul
                </button>
              </section>
            ) : null}
          </aside>
        </div>

        <div
          className={`pe-savebar${dirty || isNew ? ' pe-savebar--visible' : ''}`}
          role="region"
          aria-label="Salvare"
          aria-hidden={!(dirty || isNew)}
        >
          <span className="pe-savebar__text">
            {saving
              ? 'Se salvează…'
              : isNew
                ? 'Produs nou, nesalvat'
                : 'Modificări nesalvate'}
          </span>
          <div className="pe-savebar__actions">
            <button
              type="button"
              className="btn secondary"
              disabled={saving}
              onClick={discardChanges}
            >
              {isNew ? 'Anulează' : 'Renunță'}
            </button>
            <button type="submit" className="btn primary pe-savebar__save" disabled={saving}>
              {saving ? 'Se salvează…' : isNew ? 'Creează produsul' : 'Salvează'}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={confirmDelete}
        tone="danger"
        title="Ștergi produsul?"
        description={`„${existing?.name ?? ''}” va fi eliminat din gestiune. Acțiunea nu poate fi anulată.`}
        confirmLabel="Șterge produsul"
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          void handleDelete()
        }}
      />
    </AdminLayout>
  )
}
