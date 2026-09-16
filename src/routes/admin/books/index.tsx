import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getCurrentAdmin } from '../../../admin/auth'
import { getBooks, searchBooks, getCategories } from '../../../books/catalog'
import { deleteBook, requestBookDeletion, getPendingDeleteRequests } from '../../../books/admin'
import { AdminHeader } from '../../../admin/AdminHeader'

export const Route = createFileRoute('/admin/books/')({
  component: AdminBooksPage,
})

function AdminBooksPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [kategoriId, setKategoriId] = useState<number | undefined>(undefined)
  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [requestingId, setRequestingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  // Debounce 350ms -- sama seperti pola search di katalog publik.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(rawSearch)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [rawSearch])

  const { data: currentAdmin } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })

  // Cuma dipanggil kalau superadmin -- server function ini sendiri
  // dijaga requireSuperadmin, query di-skip untuk admin biasa supaya
  // tidak dapat error mentah di UI (pola sama seperti approvals.tsx).
  const { data: pendingDeleteRequests = [] } = useQuery({
    queryKey: ['pending-delete-requests'],
    queryFn: () => getPendingDeleteRequests(),
    enabled: !!currentAdmin?.isSuperadmin,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  })

  const isSearching = search.trim().length > 0

  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-books', { page, limit, kategoriId, search }],
    queryFn: () =>
      isSearching
        ? searchBooks({ data: { q: search, page, limit, kategoriId } })
        : getBooks({ data: { page, limit, kategoriId } }),
  })

  const books = result?.data ?? []
  const totalPages = result?.totalPages ?? 1

  async function handleDelete(id: number, judul: string) {
    if (!window.confirm(`Hapus buku "${judul}"? Ini juga menghapus histori peminjamannya. Tidak bisa dibatalkan.`)) {
      return
    }
    setError('')
    setDeletingId(id)
    try {
      await deleteBook({ data: { id } })
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus buku.')
    } finally {
      setDeletingId(null)
    }
  }

  // Admin biasa (bukan superadmin) tidak boleh hapus langsung -- cuma
  // bisa mengajukan. window.prompt dipakai buat alasan, konsisten
  // dengan pola window.confirm yang sudah ada di sini, tanpa perlu
  // bikin komponen modal baru untuk aksi sekecil ini.
  async function handleRequestDelete(id: number, judul: string) {
    const alasan = window.prompt(
      `Alasan pengajuan hapus buku "${judul}" (minimal 5 karakter):`,
    )
    if (alasan === null) return // dibatalkan
    if (alasan.trim().length < 5) {
      setError('Alasan minimal 5 karakter.')
      return
    }

    setError('')
    setRequestingId(id)
    try {
      await requestBookDeletion({ data: { bookId: id, alasan: alasan.trim() } })
      window.alert('Pengajuan hapus terkirim, menunggu persetujuan superadmin.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengajukan hapus buku.')
    } finally {
      setRequestingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-[900px] mx-auto">
        <AdminHeader />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)]">
            Kelola Buku
          </h1>
          <div className="flex items-center gap-3">
            {currentAdmin?.isSuperadmin && (
              <Link
                to="/admin/books/delete-requests"
                className="px-4 py-3 border-2 border-[var(--black)] font-semibold uppercase tracking-wide text-sm hover:bg-[var(--gray-100)] relative"
              >
                Pengajuan Hapus
                {pendingDeleteRequests.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center bg-[#c00] text-[var(--white)] rounded-full w-5 h-5 text-xs">
                    {pendingDeleteRequests.length}
                  </span>
                )}
              </Link>
            )}
            <Link
              to="/admin/books/new"
              className="px-4 py-3 bg-[var(--black)] text-[var(--white)] font-semibold uppercase tracking-wide text-sm"
            >
              + Tambah Buku
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-[#fee] border border-[#fcc] text-[#c00]">
            {error}
          </div>
        )}

        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            type="text"
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder="Cari judul, kode, keterangan..."
            className="flex-1 min-w-[220px] p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
          />
          <select
            value={kategoriId ?? ''}
            onChange={(e) => {
              setKategoriId(e.target.value ? Number(e.target.value) : undefined)
              setPage(1)
            }}
            className="p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)] bg-[var(--white)]"
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama} ({c.bookCount})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[var(--white)] border-2 border-[var(--black)]">
          {isLoading ? (
            <p className="text-center py-8">Memuat...</p>
          ) : books.length === 0 ? (
            <p className="text-center py-8 text-[var(--gray-600)]">
              Tidak ada buku ditemukan.
            </p>
          ) : (
            <div className="flex flex-col">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center justify-between gap-3 p-4 border-b border-[var(--gray-200)] last:border-b-0"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-semibold text-[var(--text-primary)] truncate">
                      {book.judul}
                    </span>
                    <span className="text-sm text-[var(--gray-600)]">
                      {book.kode || '(tanpa kode)'} · {book.kategoriNama ?? '-'} ·
                      qty {book.qty} · {book.posisiKode ?? 'belum ada posisi'} ·{' '}
                      {book.isDipinjam ? 'Dipinjam' : 'Tersedia'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to="/admin/books/$bookId/edit"
                      params={{ bookId: String(book.id) }}
                      className="px-3 py-2 border-2 border-[var(--black)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--gray-100)]"
                    >
                      Edit
                    </Link>
                    {currentAdmin?.isSuperadmin ? (
                      <button
                        onClick={() => handleDelete(book.id, book.judul)}
                        disabled={deletingId === book.id}
                        className="px-3 py-2 border-2 border-[#c00] text-[#c00] text-sm font-medium uppercase tracking-wide hover:bg-[#fee] disabled:opacity-50"
                      >
                        {deletingId === book.id ? '...' : 'Hapus'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRequestDelete(book.id, book.judul)}
                        disabled={requestingId === book.id}
                        className="px-3 py-2 border-2 border-[var(--gray-600)] text-[var(--gray-600)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--gray-100)] disabled:opacity-50"
                      >
                        {requestingId === book.id ? '...' : 'Ajukan Hapus'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 border-2 border-[var(--black)] font-medium disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-[var(--gray-600)]">
              Halaman {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 border-2 border-[var(--black)] font-medium disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
