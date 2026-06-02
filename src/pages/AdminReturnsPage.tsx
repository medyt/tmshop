import { useCallback, useEffect, useState } from 'react'
import { AdminReturnsTable } from '../components/admin/AdminReturnsTable'
import { AdminLayout } from '../components/admin/AdminLayout'
import { isApiEnabled } from '../lib/apiClient'
import {
  deleteReturnRequest,
  fetchAdminReturns,
  updateReturnStatus,
  type ReturnRequest,
  type ReturnStatus,
} from '../lib/returnsApi'

const STATUS_TABS: Array<{ id: ReturnStatus | 'all'; label: string }> = [
  { id: 'nou', label: 'Noi' },
  { id: 'aprobat', label: 'Aprobate' },
  { id: 'respins', label: 'Respinse' },
  { id: 'finalizat', label: 'Finalizate' },
  { id: 'all', label: 'Toate' },
]

export function AdminReturnsPage() {
  const [status, setStatus] = useState<ReturnStatus | 'all'>('nou')
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(isApiEnabled())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!isApiEnabled()) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchAdminReturns(status)
      .then((loaded) => {
        if (!cancelled) setReturns(loaded)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Nu am putut încărca cererile.',
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

  const handleStatusChange = (id: number, next: ReturnStatus) => {
    void updateReturnStatus(id, next)
      .then(() => load())
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Nu am putut actualiza cererea.',
        )
      })
  }

  const handleDelete = (id: number) => {
    if (!globalThis.confirm('Ștergi această cerere de retur?')) return
    void deleteReturnRequest(id)
      .then(() => {
        setReturns((current) => current.filter((item) => item.id !== id))
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Nu am putut șterge cererea.',
        )
      })
  }

  return (
    <AdminLayout
      title="Retururi"
      lead="Gestionează cererile de retur trimise de clienți."
    >
      {!isApiEnabled() ? (
        <section className="panel panel--form">
          <p className="muted">
            Gestiunea retururilor este disponibilă când aplicația folosește
            API-ul de pe server.
          </p>
        </section>
      ) : (
        <section className="panel panel--list" aria-label="Retururi">
          {loading ? (
            <div className="empty-state">
              <p className="muted">Se încarcă cererile…</p>
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
                <div className="admin-reviews__tabs" role="tablist" aria-label="Filtru retururi">
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
                  {returns.length}{' '}
                  {returns.length === 1 ? 'cerere' : 'cereri'}
                </span>
              </div>
              <AdminReturnsTable
                returns={returns}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            </>
          ) : null}
        </section>
      )}
    </AdminLayout>
  )
}
