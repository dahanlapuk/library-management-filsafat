import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCategories } from './catalog'
import { getPosisiList, requestCategory } from './admin'
import { kategoriOptions, tagOptions } from './category-options'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Field'
import { OptionPicker } from '../components/ui/OptionPicker'

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

const SHOW_TAGS = false

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

  const labelClass = 'text-sm font-medium'
  const req = <span className="text-red-700">*</span>
  const sectionTitle = 'text-lg font-semibold'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <h2 className={sectionTitle} style={{ fontFamily: 'var(--font-heading)' }}>
        Info buku
      </h2>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="judul" className={labelClass}>
          Judul {req}
        </label>
        <Input
          id="judul"
          type="text"
          value={values.judul}
          onChange={(e) => setValues((v) => ({ ...v, judul: e.target.value }))}
          required
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="penulis" className={labelClass}>
          Penulis
        </label>
        <Input
          id="penulis"
          type="text"
          value={values.penulis}
          onChange={(e) => setValues((v) => ({ ...v, penulis: e.target.value }))}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="kode" className={labelClass}>
            Kode
          </label>
          <Input
            id="kode"
            type="text"
            value={values.kode}
            onChange={(e) => setValues((v) => ({ ...v, kode: e.target.value }))}
            placeholder="(boleh kosong)"
            className="w-full"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="tahun" className={labelClass}>
            Tahun
          </label>
          <Input
            id="tahun"
            type="number"
            value={values.tahun}
            onChange={(e) => setValues((v) => ({ ...v, tahun: e.target.value }))}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="keterangan" className={labelClass}>
          Keterangan
        </label>
        <Textarea
          id="keterangan"
          value={values.keterangan}
          onChange={(e) => setValues((v) => ({ ...v, keterangan: e.target.value }))}
          rows={3}
          className="w-full"
        />
      </div>

      <h2
        className={`${sectionTitle} mt-2 border-t border-[var(--rule)] pt-5`}
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Penempatan
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="qty" className={labelClass}>
            Qty {req}
          </label>
          <Input
            id="qty"
            type="number"
            min={1}
            value={values.qty}
            onChange={(e) => setValues((v) => ({ ...v, qty: e.target.value }))}
            required
            className="w-full"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="posisi" className={labelClass}>
            Posisi rak {req}
          </label>
          <OptionPicker
            id="posisi"
            title="Pilih posisi rak"
            placeholder="-- Pilih posisi --"
            disabled={loadingPosisi}
            value={values.posisiId === null ? '' : String(values.posisiId)}
            onChange={(v) =>
              setValues((prev) => ({ ...prev, posisiId: v ? Number(v) : null }))
            }
            options={posisiList.map((p) => ({
              value: String(p.id),
              label: `${p.kode} (${p.rak})`,
            }))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="kategori" className={labelClass}>
          Kategori utama
        </label>
        <OptionPicker
          id="kategori"
          title="Pilih kategori utama"
          placeholder="-- Belum dikategorikan --"
          disabled={loadingCategories}
          value={values.kategoriId === null ? '' : String(values.kategoriId)}
          onChange={(v) =>
            setValues((prev) => ({ ...prev, kategoriId: v ? Number(v) : null }))
          }
          options={[
            { value: '', label: '(Belum dikategorikan)' },
            ...kategoriList.map((o) => ({ value: String(o.id), label: o.label })),
          ]}
        />

        {categoryRequestSuccess && (
          <p className="rounded-lg bg-[var(--pale-soft)] p-2 text-xs">{categoryRequestSuccess}</p>
        )}

        {!showCategoryRequest ? (
          <button
            type="button"
            onClick={() => setShowCategoryRequest(true)}
            className="w-fit py-1 text-left text-sm underline underline-offset-2"
          >
            + Ajukan kategori baru
          </button>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-[var(--rule)] bg-[var(--pale-soft)] p-3">
            {categoryRequestError && <p className="text-xs text-red-700">{categoryRequestError}</p>}
            <Input
              type="text"
              value={categoryRequestNama}
              onChange={(e) => setCategoryRequestNama(e.target.value)}
              placeholder="Nama kategori baru"
              className="w-full"
            />
            <Input
              type="text"
              value={categoryRequestAlasan}
              onChange={(e) => setCategoryRequestAlasan(e.target.value)}
              placeholder="Alasan (opsional)"
              className="w-full"
            />
            <div className="flex gap-2">
              <Button
                variant="accent"
                onClick={handleSubmitCategoryRequest}
                disabled={submittingCategoryRequest}
              >
                {submittingCategoryRequest ? 'Mengajukan...' : 'Ajukan'}
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  setShowCategoryRequest(false)
                  setCategoryRequestError('')
                }}
              >
                Batal
              </Button>
            </div>
          </div>
        )}
      </div>

      {SHOW_TAGS && (
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Tag</label>
          {loadingCategories ? (
            <p className="text-sm text-[var(--muted)]">Memuat tag...</p>
          ) : tagList.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Belum ada tag.</p>
          ) : (
            <div className="flex max-h-[180px] flex-col overflow-y-auto rounded-lg border border-[var(--rule)]">
              {tagList.map((t) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-[var(--rule)] px-3 py-2 last:border-b-0 hover:bg-[var(--pale-soft)]"
                >
                  <input
                    type="checkbox"
                    checked={values.tagIds.includes(t.id)}
                    onChange={() => toggleTag(t.id)}
                    className="h-4 w-4 accent-[var(--ink)]"
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="sticky bottom-0 z-20 -mx-4 -mb-4 rounded-b-xl border-t border-[var(--rule)] bg-[var(--white)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:-mb-6 sm:px-6">
        <Button type="submit" variant="accent" disabled={submitting} className="w-full">
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
