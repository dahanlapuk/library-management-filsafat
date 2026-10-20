import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminPage } from '../../../components/ui/AdminPage'
import { Badge } from '../../../components/ui/Badge'
import { Button, buttonClass } from '../../../components/ui/Button'
import {
  getPendingDeleteRequests,
  approveDeleteRequest,
  rejectDeleteRequest,
} from '../../../books/admin'

export const Route = createFileRoute('/admin/books/delete-requests')({
  component: DeleteRequestsPage,
})

function DeleteRequestsPage() {
  const queryClient = useQueryClient()
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const {
    data: requests = [],
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ['pending-delete-requests'],
    queryFn: () => getPendingDeleteRequests(),
  })

  // Requirement eksplisit: Approve TETAP pakai popup konfirmasi, sama
  // seperti tombol Hapus langsung di daftar buku -- tidak boleh jadi
  // satu klik tanpa jeda walau lewat jalur pengajuan.
  async function handleApprove(id: number, judul: string) {
    if (
      !window.confirm(`Yakin mau hapus buku "${judul}"? Tidak bisa dibatalkan.`)
    ) {
      return
    }
    setError('')
    setProcessingId(id)
    try {
      await approveDeleteRequest({ data: { id } })
      queryClient.invalidateQueries({ queryKey: ['pending-delete-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal approve pengajuan.')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(id: number, judul: string) {
    if (!window.confirm(`Tolak pengajuan hapus buku "${judul}"?`)) {
      return
    }
    setError('')
    setProcessingId(id)
    try {
      await rejectDeleteRequest({ data: { id } })
      queryClient.invalidateQueries({ queryKey: ['pending-delete-requests'] })
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
            Pengajuan Hapus Buku
          </h1>
          {requests.length > 0 && <Badge tone="solid">{requests.length} menunggu</Badge>}
        </div>
        <Link to="/admin/books" className={buttonClass('quiet')}>
          ← Kembali ke daftar buku
        </Link>
      </div>

      {(error || loadError) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error || 'Gagal memuat pengajuan hapus.'}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--white)] shadow-[0_1px_2px_rgba(24,22,0,0.05)]">
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">Memuat...</p>
        ) : requests.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            Tidak ada pengajuan hapus yang menunggu.
          </p>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="flex flex-col gap-3 border-b border-[var(--rule)] p-4 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="break-words font-semibold">{req.bookJudul}</span>
                <span className="text-xs text-[var(--muted)]">
                  Diajukan oleh {req.requestedByNama} ·{' '}
                  {req.createdAt ? new Date(req.createdAt).toLocaleDateString('id-ID') : '-'}
                </span>
                <p className="mt-1 break-words rounded-lg bg-[var(--pale-soft)] p-2.5 text-sm">
                  Alasan: {req.alasan}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="danger"
                  onClick={() => handleApprove(req.id, req.bookJudul)}
                  disabled={processingId === req.id}
                >
                  {processingId === req.id ? '...' : 'Setujui hapus'}
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => handleReject(req.id, req.bookJudul)}
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
