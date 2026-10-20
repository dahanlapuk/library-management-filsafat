import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminPage } from '../../../components/ui/AdminPage'
import { Badge } from '../../../components/ui/Badge'
import { Button, buttonClass } from '../../../components/ui/Button'
import {
  getPendingCategoryRequests,
  approveCategoryRequest,
  rejectCategoryRequest,
} from '../../../books/admin'

export const Route = createFileRoute('/admin/books/category-requests')({
  component: CategoryRequestsPage,
})

function CategoryRequestsPage() {
  const queryClient = useQueryClient()
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const {
    data: requests = [],
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ['pending-category-requests'],
    queryFn: () => getPendingCategoryRequests(),
  })

  // Beda dari approve delete-request: approve kategori TIDAK destruktif
  // (cuma bikin kategori baru), jadi sengaja gak pakai window.confirm --
  // konsisten dengan alasan kenapa delete-request approve WAJIB pakai
  // konfirmasi (itu ireversibel, ini enggak).
  async function handleApprove(id: number) {
    setError('')
    setProcessingId(id)
    try {
      await approveCategoryRequest({ data: { id } })
      queryClient.invalidateQueries({ queryKey: ['pending-category-requests'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['catalog-categories'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal approve pengajuan.')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(id: number) {
    setError('')
    setProcessingId(id)
    try {
      await rejectCategoryRequest({ data: { id } })
      queryClient.invalidateQueries({ queryKey: ['pending-category-requests'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menolak pengajuan.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <AdminPage>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold sm:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
            Pengajuan Kategori Baru
          </h1>
          {requests.length > 0 && <Badge tone="solid">{requests.length} menunggu</Badge>}
        </div>
        <Link to="/admin/books" className={buttonClass('quiet')}>
          ← Kembali ke daftar buku
        </Link>
      </div>

      {(error || loadError) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error || 'Gagal memuat pengajuan kategori.'}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--white)] shadow-[0_1px_2px_rgba(24,22,0,0.05)]">
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">Memuat...</p>
        ) : requests.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            Tidak ada pengajuan kategori yang menunggu.
          </p>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="flex flex-col gap-3 border-b border-[var(--rule)] p-4 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="break-words font-semibold">{req.nama}</span>
                <span className="text-xs text-[var(--muted)]">
                  Diajukan oleh {req.requestedByNama} ·{' '}
                  {req.createdAt ? new Date(req.createdAt).toLocaleDateString('id-ID') : '-'}
                </span>
                {req.alasan && (
                  <p className="mt-1 break-words rounded-lg bg-[var(--pale-soft)] p-2.5 text-sm">
                    Alasan: {req.alasan}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="accent"
                  onClick={() => handleApprove(req.id)}
                  disabled={processingId === req.id}
                >
                  {processingId === req.id ? '...' : 'Setujui'}
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => handleReject(req.id)}
                  disabled={processingId === req.id}
                >
                  {processingId === req.id ? '...' : 'Tolak'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminPage>
  )
}
