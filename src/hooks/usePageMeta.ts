import { useEffect } from 'react'
import { pageUrl } from '../lib/seo'

export type PageMeta = {
  title: string
  description?: string
  path?: string
  image?: string
  type?: 'website' | 'product' | 'article'
  robots?: string
  jsonLd?: Record<string, unknown>
}

const JSON_LD_ID = 'shoptop-jsonld'

function upsertMeta(name: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  )
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('name', name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertOg(property: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  )
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('property', property)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertTwitter(name: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  )
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('name', name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertLink(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

function upsertJsonLd(payload: Record<string, unknown> | undefined): void {
  const existing = document.getElementById(JSON_LD_ID)
  if (!payload) {
    existing?.remove()
    return
  }

  let element = existing as HTMLScriptElement | null
  if (!element) {
    element = document.createElement('script')
    element.id = JSON_LD_ID
    element.type = 'application/ld+json'
    document.head.appendChild(element)
  }
  element.textContent = JSON.stringify(payload)
}

export function usePageMeta({
  title,
  description,
  path,
  image,
  type = 'website',
  robots,
  jsonLd,
}: PageMeta): void {
  useEffect(() => {
    document.title = title

    if (description) {
      upsertMeta('description', description)
      upsertOg('og:description', description)
      upsertTwitter('twitter:description', description)
    }

    upsertOg('og:title', title)
    upsertTwitter('twitter:title', title)
    upsertOg('og:type', type)
    upsertOg('og:locale', 'ro_RO')
    upsertMeta('language', 'Romanian')

    if (path) {
      const canonical = pageUrl(path)
      upsertLink('canonical', canonical)
      upsertOg('og:url', canonical)
    }

    if (image) {
      upsertOg('og:image', image)
      upsertTwitter('twitter:card', 'summary_large_image')
      upsertTwitter('twitter:image', image)
    } else {
      upsertTwitter('twitter:card', 'summary')
    }

    if (robots) {
      upsertMeta('robots', robots)
    }

    upsertJsonLd(jsonLd)

    return () => {
      upsertJsonLd(undefined)
    }
  }, [description, image, jsonLd, path, robots, title, type])
}
