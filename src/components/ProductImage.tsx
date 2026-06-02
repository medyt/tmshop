import { useEffect, useMemo, useState } from 'react'
import { imageUrlCandidates } from '../lib/productImages'

type ProductImageProps = {
  src?: string
  urls?: string[]
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  placeholderClassName?: string
  placeholderLabel?: string
}

export function ProductImage({
  src,
  urls,
  alt,
  className,
  loading = 'lazy',
  placeholderClassName,
  placeholderLabel = 'Fără imagine',
}: ProductImageProps) {
  const candidates = useMemo(() => {
    const srcCandidates = src?.trim() ? imageUrlCandidates([src]) : []
    if (srcCandidates.length > 0) {
      const seen = new Set(srcCandidates)
      const extras = urls
        ? imageUrlCandidates(urls).filter((url) => !seen.has(url))
        : []
      return [...srcCandidates, ...extras]
    }
    if (urls && urls.length > 0) return imageUrlCandidates(urls)
    return []
  }, [src, urls])
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setIndex(0)
    setFailed(false)
  }, [src, urls])
  const resolved = candidates[index]

  if (!resolved || failed) {
    return (
      <div className={placeholderClassName} aria-hidden>
        {placeholderLabel}
      </div>
    )
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => {
        if (index < candidates.length - 1) {
          setIndex((current) => current + 1)
          return
        }
        setFailed(true)
      }}
    />
  )
}
