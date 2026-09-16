import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { AdminHeader } from '../../../admin/AdminHeader'
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
            Tambah Buku
          </h1>
          <Link
            to="/admin/books"
            className="text-sm text-[var(--gray-600)] hover:text-[var(--text-primary)]"
          >
            ← Kembali ke daftar
          </Link>
        </div>

        <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6">
          <BookForm
            initialValues={emptyBookFormValues}
            submitLabel="Simpan Buku"
            submittingLabel="Menyimpan..."
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  )
}
