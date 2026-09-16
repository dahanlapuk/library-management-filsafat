import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCategories } from './catalog'
import { getPosisiList } from './admin'

export interface BookFormValues {
  kode: string
  judul: string
  penulis: string
  tahun: string // string di form (input text/number kosong-able), di-parse ke number|undefined saat submit
  keterangan: string
  qty: string
  categoryIds: number[]
  posisiId: number | null
}

export const emptyBookFormValues: BookFormValues = {
  kode: '',
  judul: '',
  penulis: '',
  tahun: '',
  keterangan: '',
  qty: '1',
  categoryIds: [],
  posisiId: null,
}

interface BookFormProps {
  initialValues: BookFormValues
  submitLabel: string
  submittingLabel: string
  onSubmit: (values: BookFormValues) => Promise<void>
}

// Form CRUD buku dipakai bersama oleh new.tsx (create) dan
// $bookId.edit.tsx (edit) -- field-nya identik, cuma beda default value
// dan handler submit-nya (createBook vs updateBook), jadi dipusatkan di
// sini daripada duplikat JSX.
export function BookForm({
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
}: BookFormProps) {
  const [values, setValues] = useState<BookFormValues>(initialValues)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  })

  const { data: posisiList = [], isLoading: loadingPosisi } = useQuery({
    queryKey: ['posisi-list'],
    queryFn: () => getPosisiList(),
  })

  function toggleCategory(id: number) {
    setValues((v) => ({
      ...v,
      categoryIds: v.categoryIds.includes(id)
        ? v.categoryIds.filter((c) => c !== id)
        : [...v.categoryIds, id],
    }))
  }

  // Validasi ringan client-side -- cuma mencegah submit yang jelas gagal
  // (judul kosong, qty < 1, kategori/posisi belum dipilih). Validasi
  // "asli" tetap di bookInputSchema (Zod) sisi server.
  function validate(): string | null {
    if (!values.judul.trim()) return 'Judul wajib diisi.'
    const qty = Number(values.qty)
    if (!Number.isInteger(qty) || qty < 1) return 'Qty minimal 1.'
    if (values.categoryIds.length === 0) return 'Pilih minimal satu kategori.'
    if (values.posisiId === null) return 'Posisi rak wajib dipilih.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan buku.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="p-3 bg-[#fee] border border-[#fcc] text-[#c00]">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="judul" className="font-medium">
          Judul: <span className="text-[#c00]">*</span>
        </label>
        <input
          id="judul"
          type="text"
          value={values.judul}
          onChange={(e) => setValues((v) => ({ ...v, judul: e.target.value }))}
          required
          className="w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="kode" className="font-medium">
            Kode:
          </label>
          <input
            id="kode"
            type="text"
            value={values.kode}
            onChange={(e) => setValues((v) => ({ ...v, kode: e.target.value }))}
            placeholder="(boleh kosong)"
            className="w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="tahun" className="font-medium">
            Tahun:
          </label>
          <input
            id="tahun"
            type="number"
            value={values.tahun}
            onChange={(e) => setValues((v) => ({ ...v, tahun: e.target.value }))}
            className="w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="penulis" className="font-medium">
          Penulis:
        </label>
        <input
          id="penulis"
          type="text"
          value={values.penulis}
          onChange={(e) => setValues((v) => ({ ...v, penulis: e.target.value }))}
          className="w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="keterangan" className="font-medium">
          Keterangan:
        </label>
        <textarea
          id="keterangan"
          value={values.keterangan}
          onChange={(e) =>
            setValues((v) => ({ ...v, keterangan: e.target.value }))
          }
          rows={3}
          className="w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="qty" className="font-medium">
            Qty: <span className="text-[#c00]">*</span>
          </label>
          <input
            id="qty"
            type="number"
            min={1}
            value={values.qty}
            onChange={(e) => setValues((v) => ({ ...v, qty: e.target.value }))}
            required
            className="w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="posisi" className="font-medium">
            Posisi Rak: <span className="text-[#c00]">*</span>
          </label>
          <select
            id="posisi"
            value={values.posisiId ?? ''}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                posisiId: e.target.value ? Number(e.target.value) : null,
              }))
            }
            disabled={loadingPosisi}
            required
            className="w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)] bg-[var(--white)]"
          >
            <option value="">-- Pilih posisi --</option>
            {posisiList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.kode} ({p.rak})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-medium">
          Kategori: <span className="text-[#c00]">*</span>
        </label>
        {loadingCategories ? (
          <p className="text-[var(--gray-600)] text-sm">Memuat kategori...</p>
        ) : (
          <div className="border-2 border-[var(--gray-200)] max-h-[220px] overflow-y-auto flex flex-col">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-3 px-3 py-2 border-b border-[var(--gray-100)] last:border-b-0 cursor-pointer hover:bg-[var(--gray-100)]"
              >
                <input
                  type="checkbox"
                  checked={values.categoryIds.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                  className="w-4 h-4 accent-[var(--black)]"
                />
                <span>{cat.nama}</span>
              </label>
            ))}
          </div>
        )}
        <p className="text-xs text-[var(--gray-600)]">
          Kategori pertama yang dicentang jadi kategori utama buku.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full p-4 bg-[var(--black)] text-[var(--white)] font-semibold uppercase tracking-wide disabled:opacity-50"
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </form>
  )
}
