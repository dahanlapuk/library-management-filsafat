import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { AdminPage } from '../../../components/ui/AdminPage'
import { buttonClass } from '../../../components/ui/Button'
import { BookForm, emptyBookFormValues, type BookFormValues } from '../../../books/BookForm'
import { createBook } from '../../../books/admin'

export const Route = createFileRoute('/admin/books/new')({
  component: NewBookPage,
})

function NewBookPage() {
  const navigate = useNavigate()

  async function handleSubmit(values: BookFormValues) {
    await createBook({
      data: {
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
          Tambah Buku
        </h1>
        <Link to="/admin/books" className={buttonClass('quiet')}>
          ← Kembali ke daftar
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--rule)] bg-[var(--white)] p-4 shadow-[0_1px_2px_rgba(24,22,0,0.05)] sm:p-6">
        <BookForm
          initialValues={emptyBookFormValues}
          submitLabel="Simpan Buku"
          submittingLabel="Menyimpan..."
          onSubmit={handleSubmit}
        />
      </div>
    </AdminPage>
  )
}
