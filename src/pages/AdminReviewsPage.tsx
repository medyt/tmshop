import { useCallback, useEffect, useState } from 'react'
import { AdminReviewsTable } from '../components/admin/AdminReviewsTable'
import { AdminLayout } from '../components/admin/AdminLayout'
import { isApiEnabled } from '../lib/apiClient'
import {
  fetchAdminReviews,
  moderateReview,
  type AdminReview,
  type AdminReviewStatus,
} from '../lib/shopGrowth'

const STATUS_TABS: Array<{ id: AdminReviewStatus; label: string }> = [
  { id: 'pending', label: 'În așteptare' },
  { id: 'approved', label: 'Aprobate' },
  { id: 'all', label: 'Toate' },
]

export function AdminReviewsPage() {
  const [status, setStatus] = useState<AdminReviewStatus>('pending')
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(isApiEnabled())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!isApiEnabled()) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchAdminReviews(status)
      .then((loaded) => {
        if (!cancelled) setReviews(loaded)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Nu am putut încărca recenziile.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => {
    const cleanup = load()
    return cleanup
  }, [load])

  const handleModerate = (
    id: number,
    action: 'approve' | 'reject' | 'delete',
  ) => {
    if (action === 'delete' && !globalThis.confirm('Ștergi această recenzie?')) {
      return
    }
    void moderateReview(id, action)
      .then(() => {
        setReviews((current) => current.filter((review) => review.id !== id))
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Nu am putut actualiza recenzia.',
        )
      })
  }

  return (
    <AdminLayout
      title="Recenzii"
      lead="Aprobă sau respinge recenziile trimise de clienți."
    >
      {!isApiEnabled() ? (
        <section className="panel panel--form">
          <p className="muted">
            Moderarea recenziilor este disponibilă când aplicația folosește
            API-ul de pe server.
          </p>
        </section>
      ) : (
        <section className="panel panel--list" aria-label="Recenzii">
          {loading ? (
            <div className="empty-state">
              <p className="muted">Se încarcă recenziile…</p>
            </div>
          ) : null}
          {error ? (
            <p className="app-status app-status--error" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && !error ? (
            <>
              <div className="admin-reviews__toolbar-row">
                <div className="admin-reviews__tabs" role="tablist" aria-label="Filtru recenzii">
                  {STATUS_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={status === tab.id}
                      className={`btn secondary${status === tab.id ? ' admin-reviews__tab--active' : ''}`}
                      onClick={() => setStatus(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <span className="muted admin-reviews__count">
                  {reviews.length} {reviews.length === 1 ? 'recenzie' : 'recenzii'}
                </span>
              </div>
              <AdminReviewsTable reviews={reviews} onModerate={handleModerate} />
            </>
          ) : null}
        </section>
      )}
    </AdminLayout>
  )
}
