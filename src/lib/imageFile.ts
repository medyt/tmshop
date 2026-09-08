/**
 * Normalizează fișierele imagine înainte de preview/upload.
 *
 * Telefoanele (iPhone, dar și unele Android) salvează implicit în HEIC/HEIF.
 * Browserele pe desktop (Chrome/Edge/Firefox) nu pot decoda HEIC, deci nici
 * preview-ul (`<img>`), nici serverul (`getimagesize`) nu îl acceptă. Convertim
 * HEIC/HEIF în JPEG direct în browser ca upload-ul să meargă cu orice poză.
 */

const HEIC_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])

/** Recunoaște HEIC/HEIF după MIME type sau, dacă lipsește, după extensie. */
export function isHeicImage(file: File): boolean {
  const type = file.type.toLowerCase()
  if (HEIC_MIME_TYPES.has(type)) return true
  // Unele sisteme nu setează MIME type pentru HEIC — cădem pe extensie.
  return /\.(heic|heif)$/i.test(file.name)
}

/**
 * Întoarce un fișier pe care browserul și serverul îl pot procesa.
 * Pentru HEIC/HEIF face conversia în JPEG; restul formatelor rămân neatinse.
 */
export async function ensureUploadableImage(file: File): Promise<File> {
  if (!isHeicImage(file)) {
    return file
  }

  let heic2any: (options: {
    blob: Blob
    toType?: string
    quality?: number
  }) => Promise<Blob | Blob[]>
  try {
    const mod = await import('heic2any')
    heic2any = mod.default as typeof heic2any
  } catch {
    throw new Error(
      'Nu am putut încărca convertorul HEIC. Verifică conexiunea și reîncearcă.',
    )
  }

  let converted: Blob | Blob[]
  try {
    converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  } catch {
    throw new Error(
      'Poza este în format HEIC și nu a putut fi convertită. ' +
        'Setează telefonul să salveze în JPEG („Cel mai compatibil”) sau alege o poză JPG/PNG.',
    )
  }

  const blob = Array.isArray(converted) ? converted[0] : converted
  const jpegName = file.name.replace(/\.(heic|heif)$/i, '') + '.jpg'
  return new File([blob], jpegName, { type: 'image/jpeg' })
}
