import DOMPurify from 'dompurify'

/** Etichete/atribute permise pentru descrierea produsului (editor WYSIWYG). */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'blockquote',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'iframe',
  'video',
  'source',
  'figure',
  'figcaption',
]

const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'style',
  'colspan',
  'rowspan',
  'allow',
  'allowfullscreen',
  'frameborder',
  'loading',
  'controls',
  'poster',
  'type',
  'muted',
  'loop',
  'playsinline',
  'class',
]

/** Domenii permise pentru embed video (iframe). */
const ALLOWED_IFRAME_HOSTS =
  /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//i

let hookRegistered = false
function ensureSanitizeHook(): void {
  if (hookRegistered) return
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element
    if (el.tagName === 'IFRAME') {
      const src = el.getAttribute('src') ?? ''
      if (!ALLOWED_IFRAME_HOSTS.test(src)) {
        el.parentNode?.removeChild(el)
        return
      }
      el.setAttribute('allowfullscreen', '')
      el.setAttribute('loading', 'lazy')
      el.setAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      )
    }
    if (el.tagName === 'A' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer')
    }
  })
  hookRegistered = true
}

/**
 * Curăță HTML-ul introdus în editor înainte de salvare/afișare, ca să prevină
 * XSS (script, on* handlers, iframe etc.) dar să păstreze formatarea uzuală.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  ensureSanitizeHook()
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_TAGS: ['iframe'],
  })
  return clean.trim()
}

/**
 * Construiește markup-ul de embed pentru un link video (YouTube/Vimeo) sau
 * pentru un fișier video direct (.mp4/.webm). Returnează '' dacă URL-ul nu e valid.
 */
export function buildVideoEmbed(rawUrl: string): string {
  const url = rawUrl.trim()
  if (!url) return ''

  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i,
  )
  if (youtube) {
    const id = youtube[1]
    return `<div class="shop-video"><iframe src="https://www.youtube.com/embed/${id}" title="Video" frameborder="0" allowfullscreen></iframe></div>`
  }

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (vimeo) {
    const id = vimeo[1]
    return `<div class="shop-video"><iframe src="https://player.vimeo.com/video/${id}" title="Video" frameborder="0" allowfullscreen></iframe></div>`
  }

  if (/^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
    return `<div class="shop-video"><video src="${url}" controls playsinline></video></div>`
  }

  return ''
}

/** True dacă textul conține markup HTML (folosit pentru fallback la afișare). */
export function looksLikeHtml(value: string | undefined | null): boolean {
  if (!value) return false
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

/** Transformă HTML-ul în text simplu pe o singură linie (meta description, previzualizări). */
export function htmlToPlainText(html: string | undefined | null): string {
  if (!html) return ''
  if (!looksLikeHtml(html)) return html.replace(/\s+/g, ' ').trim()
  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
  }
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extrage blocuri de text (paragrafe, titluri, elemente de listă) din HTML,
 * pentru derivarea lead-ului / highlights / specs din descriere.
 */
export function htmlToBlocks(html: string | undefined | null): string[] {
  if (!html) return []
  if (!looksLikeHtml(html)) {
    return html
      .split(/\n+/)
      .map((part) => part.trim())
      .filter(Boolean)
  }
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
  const text =
    typeof document !== 'undefined'
      ? (new DOMParser().parseFromString(withBreaks, 'text/html').body
          .textContent ?? '')
      : withBreaks.replace(/<[^>]+>/g, '')
  return text
    .split(/\n+/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}
