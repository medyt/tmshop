import type { ReactNode } from 'react'
import { ShopLayout } from '../../components/shop/ShopLayout'
import { usePageMeta } from '../../hooks/usePageMeta'
import { SITE_LEGAL } from '../../lib/siteLegal'

export type ShopInfoSection = {
  title: string
  body: ReactNode
}

type ShopInfoPageProps = {
  title: string
  lead: string
  path: string
  description?: string
  sections: ShopInfoSection[]
}

export function ShopInfoPage({
  title,
  lead,
  path,
  description,
  sections,
}: ShopInfoPageProps) {
  usePageMeta({
    title: `${title} — ${SITE_LEGAL.brandName}`,
    description: description ?? lead,
    path,
  })

  return (
    <ShopLayout>
      <section className="shop-page shop-info">
        <div className="shop-page__head">
          <h1 className="shop-page__title">{title}</h1>
          <p className="shop-page__lead muted">{lead}</p>
        </div>
        <div className="shop-info__content">
          {sections.map((section) => (
            <article key={section.title} className="shop-info__section">
              <h2>{section.title}</h2>
              <div className="shop-info__body">{section.body}</div>
            </article>
          ))}
        </div>
      </section>
    </ShopLayout>
  )
}
