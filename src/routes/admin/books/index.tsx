import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getCurrentAdmin } from '../../../admin/auth'
import { getBooks, searchBooks, getCategories } from '../../../books/catalog'
import { kategoriOptions } from '../../../books/category-options'
import {
  deleteBook,
  requestBookDeletion,
  getPendingDeleteRequests,
  getPendingCategoryRequests,
} from '../../../books/admin'
import { AdminPage } from '../../../components/ui/AdminPage'
import { Badge } from '../../../components/ui/Badge'
import { Button, buttonClass } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/Field'

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

  // Hanya superadmin: server function-nya dijaga requireSuperadmin.
  const { data: pendingDeleteRequests = [] } = useQuery({
    queryKey: ['pending-delete-requests'],
    queryFn: () => getPendingDeleteRequests(),
    enabled: !!currentAdmin?.isSuperadmin,
  })

  const { data: pendingCategoryRequests = [] } = useQuery({
    queryKey: ['pending-category-requests'],
    queryFn: () => getPendingCategoryRequests(),
    enabled: !!currentAdmin?.isSuperadmin,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  })

  const kategoriLabel = new Map(kategoriOptions(categories).map((o) => [o.id, o.label]))

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

  async function handleRequestDelete(id: number, judul: string) {
    const alasan = window.prompt(
      `Alasan pengajuan hapus buku "${judul}" (minimal 5 karakter):`,
    )
    if (alasan === null) return
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
    <AdminPage>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
          Kelola Buku
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {currentAdmin?.isSuperadmin && (
            <Link to="/admin/books/category-requests" className={buttonClass('secondary')}>
              Pengajuan Kategori
              {pendingCategoryRequests.length > 0 && (
                <Badge tone="solid">{pendingCategoryRequests.length}</Badge>
              )}
            </Link>
          )}
          {currentAdmin?.isSuperadmin && (
            <Link to="/admin/books/delete-requests" className={buttonClass('secondary')}>
              Pengajuan Hapus
              {pendingDeleteRequests.length > 0 && (
                <Badge tone="solid">{pendingDeleteRequests.length}</Badge>
              )}
            </Link>
          )}
          <Link to="/admin/books/new" className={buttonClass('primary')}>
            + Tambah Buku
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          type="search"
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          placeholder="Cari judul, kode, keterangan..."
          className="flex-1"
        />
        <Select
          value={kategoriId ?? ''}
          onChange={(e) => {
            setKategoriId(e.target.value ? Number(e.target.value) : undefined)
            setPage(1)
          }}
          className="sm:w-64"
        >
          <option value="">Semua kategori</option>
          {kategoriOptions(categories).map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--white)] shadow-[0_1px_2px_rgba(24,22,0,0.05)]">
        {isLoading ? (
          <p className="py-10 text-center text-[var(--muted)]">Memuat...</p>
        ) : books.length === 0 ? (
          <p className="py-10 text-center text-[var(--muted)]">Tidak ada buku ditemukan.</p>
        ) : (
          <div className="flex flex-col">
            {books.map((book) => (
              <div
                key={book.id}
                className="flex flex-col gap-3 border-b border-[var(--rule)] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="break-words font-semibold">{book.judul}</span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
                    {book.tidakTersedia ? (
                      <Badge tone="solid">Tidak tersedia</Badge>
                    ) : book.isDipinjam ? (
                      <Badge tone="soft">Dipinjam</Badge>
                    ) : (
                      <Badge>Tersedia</Badge>
                    )}
                    <span>
                      {book.kode || '(tanpa kode)'} ·{' '}
                      {(book.kategoriId ? kategoriLabel.get(book.kategoriId) : null) ??
                        book.kategoriNama ??
                        '-'}{' '}
                      · qty {book.qty} · {book.posisiKode ?? 'belum ada posisi'}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    to="/admin/books/$bookId/edit"
                    params={{ bookId: String(book.id) }}
                    className={buttonClass('secondary')}
                  >
                    Edit
                  </Link>
                  {currentAdmin?.isSuperadmin ? (
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(book.id, book.judul)}
                      disabled={deletingId === book.id}
                    >
                      {deletingId === book.id ? '...' : 'Hapus'}
                    </Button>
                  ) : (
                    <Button
                      variant="quiet"
                      onClick={() => handleRequestDelete(book.id, book.judul)}
                      disabled={requestingId === book.id}
                    >
                      {requestingId === book.id ? '...' : 'Ajukan Hapus'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            ← Prev
          </Button>
          <span className="text-sm text-[var(--muted)]">
            Hal. {page} dari {totalPages}
          </span>
          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next →
          </Button>
        </div>
      )}
    </AdminPage>
  )
}
