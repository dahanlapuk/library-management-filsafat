import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AdminHeader } from '../../../admin/AdminHeader'
import { BookForm, type BookFormValues } from '../../../books/BookForm'
import { getBookForEdit, updateBook } from '../../../books/admin'

export const Route = createFileRoute('/admin/books/$bookId/edit')({
  component: EditBookPage,
})

function EditBookPage() {
  const { bookId } = Route.useParams()
  const navigate = useNavigate()
  const id = Number(bookId)

  const {
    data: book,
    isLoading,
    error: loadError,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['book-for-edit', id],
    queryFn: () => getBookForEdit({ data: { id } }),
  })

  async function handleSubmit(values: BookFormValues) {
    await updateBook({
      data: {
        id,
        kode: values.kode.trim() || undefined,
        judul: values.judul.trim(),
        penulis: values.penulis.trim() || undefined,
        tahun: values.tahun ? Number(values.tahun) : undefined,
        keterangan: values.keterangan.trim() || undefined,
        qty: Number(values.qty),
        categoryIds: values.categoryIds,
        posisiId: values.posisiId as number,
      },
    })
    navigate({ to: '/admin/books' })
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-[640px] mx-auto">
        <AdminHeader />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)]">
            Edit Buku
          </h1>
          <Link
            to="/admin/books"
            className="text-sm text-[var(--gray-600)] hover:text-[var(--text-primary)]"
          >
            ← Kembali ke daftar
          </Link>
        </div>

        <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6">
          {isLoading ? (
            <p className="text-center py-8">Memuat data buku...</p>
          ) : loadError || !book ? (
            <p className="text-center py-8 text-[#c00]">
              {loadError instanceof Error
                ? loadError.message
                : 'Buku tidak ditemukan.'}
            </p>
          ) : (
            <BookForm
              key={dataUpdatedAt}
              initialValues={{
                kode: book.kode ?? '',
                judul: book.judul,
                penulis: book.penulis ?? '',
                tahun: book.tahun ? String(book.tahun) : '',
                keterangan: book.keterangan ?? '',
                qty: String(book.qty),
                categoryIds: book.categoryIds,
                posisiId: book.posisiId,
              }}
              submitLabel="Simpan Perubahan"
              submittingLabel="Menyimpan..."
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  )
}
