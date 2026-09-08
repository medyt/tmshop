import { useCallback, useEffect, useState } from 'react'
import { AdminReturnsTable } from '../components/admin/AdminReturnsTable'
import { AdminLayout } from '../components/admin/AdminLayout'
import { ConfirmModal } from '../components/admin/ConfirmModal'
import { ReturnEditModal } from '../components/admin/ReturnEditModal'
import { isApiEnabled } from '../lib/apiClient'
import {
  deleteReturnRequest,
  fetchAdminReturns,
  type ReturnRequest,
  type ReturnStatus,
} from '../lib/returnsApi'

const STATUS_TABS: Array<{ id: ReturnStatus | 'all'; label: string }> = [
  { id: 'nou', label: 'De validat' },
  { id: 'aprobat', label: 'Validate' },
  { id: 'respins', label: 'Respinse' },
  { id: 'finalizat', label: 'Finalizate' },
  { id: 'all', label: 'Toate' },
]

export function AdminReturnsPage() {
  const [status, setStatus] = useState<ReturnStatus | 'all'>('nou')
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(isApiEnabled())
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<ReturnRequest | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

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

  const handleDeleteConfirm = () => {
    if (deleteId == null || deleteBusy) return
    setDeleteBusy(true)
    void deleteReturnRequest(deleteId)
      .then(() => {
        setReturns((current) => current.filter((item) => item.id !== deleteId))
        setDeleteId(null)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Nu am putut șterge cererea.',
        )
      })
      .finally(() => {
        setDeleteBusy(false)
      })
  }

  return (
    <AdminLayout
      title="Retururi"
      lead="Validează cererile asociate unei comenzi, trimite adresa de retur pe email, apoi finalizează după primirea coletului și rambursare."
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
          {notice ? (
            <p className="app-status" role="status">
              {notice}
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
                onEdit={setEditing}
                onDelete={setDeleteId}
              />
            </>
          ) : null}
        </section>
      )}

      {editing ? (
        <ReturnEditModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated, emailWarning) => {
            setEditing(null)
            setNotice(
              emailWarning
                ?? (updated.status === 'aprobat'
                  ? 'Cerere validată. Email cu adresa de retur trimis clientului.'
                  : updated.status === 'finalizat'
                    ? 'Retur finalizat. Comanda a fost marcată ca returnată. Email de rambursare trimis clientului.'
                    : updated.status === 'respins'
                      ? 'Cerere respinsă. Clientul a fost notificat pe email.'
                      : 'Cererea a fost actualizată.'),
            )
            load()
          }}
        />
      ) : null}

      <ConfirmModal
        open={deleteId != null}
        title="Ștergi cererea de retur?"
        description="Acțiunea este definitivă. Cererea dispare din listă."
        confirmLabel="Șterge"
        tone="danger"
        busy={deleteBusy}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleteBusy) setDeleteId(null)
        }}
      />
    </AdminLayout>
  )
}
