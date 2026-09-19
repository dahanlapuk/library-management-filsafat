import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminHeader } from '../../../admin/AdminHeader'
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
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-6xl mx-auto">
        <AdminHeader />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)]">
            Pengajuan Kategori Baru
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
            {error || 'Gagal memuat pengajuan kategori.'}
          </div>
        )}

        <div className="bg-[var(--white)] border-2 border-[var(--black)]">
          {isLoading ? (
            <p className="text-center py-8">Memuat...</p>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-[var(--gray-600)]">
              Tidak ada pengajuan kategori yang menunggu.
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
                      {req.nama}
                    </span>
                    <span className="text-sm text-[var(--gray-600)]">
                      Diajukan oleh {req.requestedByNama} ·{' '}
                      {req.createdAt
                        ? new Date(req.createdAt).toLocaleDateString('id-ID')
                        : '-'}
                    </span>
                    {req.alasan && (
                      <span className="text-sm text-[var(--text-primary)]">
                        Alasan: {req.alasan}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={processingId === req.id}
                      className="px-3 py-2 border-2 border-[var(--accent)] text-[var(--accent)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--accent-soft)] disabled:opacity-50"
                    >
                      {processingId === req.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
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
