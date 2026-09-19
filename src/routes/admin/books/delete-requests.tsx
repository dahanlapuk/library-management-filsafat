import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminHeader } from '../../../admin/AdminHeader'
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
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-6xl mx-auto">
        <AdminHeader />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)]">
            Pengajuan Hapus Buku
          </h1>
          <Link
            to="/admin/books"
            className="text-sm text-[var(--gray-600)] hover:text-[var(--text-primary)]"
          >
            ← Kembali ke daftar buku
          </Link>
        </div>

        {(error || loadError) && (
          <div className="p-3 mb-4 bg-[#fee] border border-[#fcc] text-[#c00]">
            {error || 'Gagal memuat pengajuan hapus.'}
          </div>
        )}

        <div className="bg-[var(--white)] border-2 border-[var(--black)]">
          {isLoading ? (
            <p className="text-center py-8">Memuat...</p>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-[var(--gray-600)]">
              Tidak ada pengajuan hapus yang menunggu.
            </p>
          ) : (
            <div className="flex flex-col">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 p-4 border-b border-[var(--gray-200)] last:border-b-0"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-semibold text-[var(--text-primary)] truncate">
                      {req.bookJudul}
                    </span>
                    <span className="text-sm text-[var(--gray-600)]">
                      Diajukan oleh {req.requestedByNama} ·{' '}
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString('id-ID') : '-'}
                    </span>
                    <span className="text-sm text-[var(--text-primary)]">
                      Alasan: {req.alasan}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(req.id, req.bookJudul)}
                      disabled={processingId === req.id}
                      className="px-3 py-2 border-2 border-[#c00] text-[#c00] text-sm font-medium uppercase tracking-wide hover:bg-[#fee] disabled:opacity-50"
                    >
                      {processingId === req.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(req.id, req.bookJudul)}
                      disabled={processingId === req.id}
                      className="px-3 py-2 border-2 border-[var(--gray-600)] text-[var(--gray-600)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--gray-100)] disabled:opacity-50"
                    >
                      {processingId === req.id ? '...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
