import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AdminPage } from '../../../components/ui/AdminPage'
import { buttonClass } from '../../../components/ui/Button'
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
        kategoriId: values.kategoriId,
        tagIds: values.tagIds,
        posisiId: values.posisiId as number,
      },
    })
    navigate({ to: '/admin/books' })
  }

  return (
    <AdminPage narrow>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
          Edit Buku
        </h1>
        <Link to="/admin/books" className={buttonClass('quiet')}>
          ← Kembali ke daftar
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--rule)] bg-[var(--white)] p-4 shadow-[0_1px_2px_rgba(24,22,0,0.05)] sm:p-6">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">Memuat data buku...</p>
        ) : loadError || !book ? (
          <p className="py-8 text-center text-sm text-red-700">
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
              kategoriId: book.kategoriId,
              tagIds: book.tagIds,
              posisiId: book.posisiId,
            }}
            submitLabel="Simpan Perubahan"
            submittingLabel="Menyimpan..."
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </AdminPage>
  )
}
