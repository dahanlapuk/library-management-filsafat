import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCategories } from './catalog'
import { getPosisiList, requestCategory } from './admin'
import { kategoriOptions, tagOptions } from './category-options'

export interface BookFormValues {
  kode: string
  judul: string
  penulis: string
  tahun: string
  keterangan: string
  qty: string
  kategoriId: number | null
  tagIds: number[]
  posisiId: number | null
}

export const emptyBookFormValues: BookFormValues = {
  kode: '',
  judul: '',
  penulis: '',
  tahun: '',
  keterangan: '',
  qty: '1',
  kategoriId: null,
  tagIds: [],
  posisiId: null,
}

interface BookFormProps {
  initialValues: BookFormValues
  submitLabel: string
  submittingLabel: string
  onSubmit: (values: BookFormValues) => Promise<void>
}

const inputClass =
  'w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]'

export function BookForm({
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
}: BookFormProps) {
  const [values, setValues] = useState<BookFormValues>(initialValues)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [showCategoryRequest, setShowCategoryRequest] = useState(false)
  const [categoryRequestNama, setCategoryRequestNama] = useState('')
  const [categoryRequestAlasan, setCategoryRequestAlasan] = useState('')
  const [categoryRequestError, setCategoryRequestError] = useState('')
  const [categoryRequestSuccess, setCategoryRequestSuccess] = useState('')
  const [submittingCategoryRequest, setSubmittingCategoryRequest] = useState(false)

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  })

  const { data: posisiList = [], isLoading: loadingPosisi } = useQuery({
    queryKey: ['posisi-list'],
    queryFn: () => getPosisiList(),
  })

  const kategoriList = kategoriOptions(categories)
  const tagList = tagOptions(categories)

  async function handleSubmitCategoryRequest() {
    if (!categoryRequestNama.trim()) {
      setCategoryRequestError('Nama kategori wajib diisi.')
      return
    }
    setCategoryRequestError('')
    setSubmittingCategoryRequest(true)
    try {
      await requestCategory({
        data: {
          nama: categoryRequestNama.trim(),
          alasan: categoryRequestAlasan.trim() || undefined,
        },
      })
      setCategoryRequestSuccess(
        `Kategori "${categoryRequestNama.trim()}" diajukan, menunggu persetujuan superadmin.`,
      )
      setCategoryRequestNama('')
      setCategoryRequestAlasan('')
      setShowCategoryRequest(false)
    } catch (err) {
      setCategoryRequestError(
        err instanceof Error ? err.message : 'Gagal mengajukan kategori.',
      )
    } finally {
      setSubmittingCategoryRequest(false)
    }
  }

  function toggleTag(id: number) {
    setValues((v) => ({
      ...v,
      tagIds: v.tagIds.includes(id) ? v.tagIds.filter((t) => t !== id) : [...v.tagIds, id],
    }))
  }

  function validate(): string | null {
    if (!values.judul.trim()) return 'Judul wajib diisi.'
    const qty = Number(values.qty)
    if (!Number.isInteger(qty) || qty < 1) return 'Qty minimal 1.'
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
        <div className="p-3 bg-[#fee] border border-[#fcc] text-[#c00]">{error}</div>
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
          className={inputClass}
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
            className={inputClass}
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
            className={inputClass}
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
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="keterangan" className="font-medium">
          Keterangan:
        </label>
        <textarea
          id="keterangan"
          value={values.keterangan}
          onChange={(e) => setValues((v) => ({ ...v, keterangan: e.target.value }))}
          rows={3}
          className={inputClass}
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
            className={inputClass}
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
            className={`${inputClass} bg-[var(--white)]`}
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
        <label htmlFor="kategori" className="font-medium">
          Kategori utama:
        </label>
        <select
          id="kategori"
          value={values.kategoriId ?? ''}
          onChange={(e) =>
            setValues((v) => ({
              ...v,
              kategoriId: e.target.value ? Number(e.target.value) : null,
            }))
          }
          disabled={loadingCategories}
          className={`${inputClass} bg-[var(--white)]`}
        >
          <option value="">-- Belum dikategorikan --</option>
          {kategoriList.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>

        {categoryRequestSuccess && (
          <p className="text-xs text-[var(--accent)]">{categoryRequestSuccess}</p>
        )}

        {!showCategoryRequest ? (
          <button
            type="button"
            onClick={() => setShowCategoryRequest(true)}
            className="text-left text-xs text-[var(--text-primary)] underline underline-offset-2 w-fit"
          >
            + Ajukan kategori baru
          </button>
        ) : (
          <div className="flex flex-col gap-2 border-2 border-[var(--gray-200)] p-3">
            {categoryRequestError && (
              <p className="text-xs text-[#c00]">{categoryRequestError}</p>
            )}
            <input
              type="text"
              value={categoryRequestNama}
              onChange={(e) => setCategoryRequestNama(e.target.value)}
              placeholder="Nama kategori baru"
              className="w-full text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
            />
            <input
              type="text"
              value={categoryRequestAlasan}
              onChange={(e) => setCategoryRequestAlasan(e.target.value)}
              placeholder="Alasan (opsional)"
              className="w-full text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmitCategoryRequest}
                disabled={submittingCategoryRequest}
                className="px-3 py-2 bg-[var(--black)] text-[var(--white)] text-sm font-medium uppercase tracking-wide disabled:opacity-50"
              >
                {submittingCategoryRequest ? 'Mengajukan...' : 'Ajukan'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryRequest(false)
                  setCategoryRequestError('')
                }}
                className="px-3 py-2 border-2 border-[var(--gray-200)] text-sm font-medium uppercase tracking-wide"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-medium">Tag:</label>
        {loadingCategories ? (
          <p className="text-[var(--gray-600)] text-sm">Memuat tag...</p>
        ) : tagList.length === 0 ? (
          <p className="text-[var(--gray-600)] text-sm">Belum ada tag.</p>
        ) : (
          <div className="border-2 border-[var(--gray-200)] max-h-[180px] overflow-y-auto flex flex-col">
            {tagList.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-3 px-3 py-2 border-b border-[var(--gray-100)] last:border-b-0 cursor-pointer hover:bg-[var(--gray-100)]"
              >
                <input
                  type="checkbox"
                  checked={values.tagIds.includes(t.id)}
                  onChange={() => toggleTag(t.id)}
                  className="w-4 h-4 accent-[var(--black)]"
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        )}
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
