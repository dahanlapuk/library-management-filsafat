import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getCurrentAdmin } from '../../admin/auth'
import { AdminHeader } from '../../admin/AdminHeader'
import {
  listFeatureRequests,
  createFeatureRequest,
  updateMyFeatureRequest,
  deleteMyFeatureRequest,
  respondFeatureRequest,
} from '../../requests/admin'
import { errorMessage } from '../../lib/error-message'

export const Route = createFileRoute('/admin/requests')({
  component: RequestsPage,
})

const AREAS = [
  { value: 'dashboard', label: 'Dashboard admin' },
  { value: 'katalog', label: 'Katalog publik' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

const STATUSES = [
  { value: 'baru', label: 'Baru' },
  { value: 'dipertimbangkan', label: 'Dipertimbangkan' },
  { value: 'dikerjakan', label: 'Dikerjakan' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'ditolak', label: 'Ditolak' },
] as const

type Area = (typeof AREAS)[number]['value']
type Status = (typeof STATUSES)[number]['value']
type FormValues = { judul: string; deskripsi: string; area: Area }
type Req = Awaited<ReturnType<typeof listFeatureRequests>>[number]

const inputClass =
  'w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]'
const buttonClass =
  'p-3 bg-[var(--black)] text-[var(--white)] font-semibold uppercase tracking-wide text-sm disabled:opacity-50'
const secondaryButtonClass =
  'p-3 border-2 border-[var(--black)] text-[var(--text-primary)] font-semibold uppercase tracking-wide text-sm disabled:opacity-50'

function labelOf(list: readonly { value: string; label: string }[], value: string) {
  return list.find((x) => x.value === value)?.label ?? value
}

function formatTanggal(value: Date | string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ErrorNotice({ error }: { error: string }) {
  if (!error) return null
  return <div className="p-3 bg-[#fee] border border-[#fcc] text-[#c00]">{error}</div>
}

function RequestForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: FormValues
  submitLabel: string
  onSubmit: (values: FormValues) => Promise<void>
  onCancel?: () => void
}) {
  const [judul, setJudul] = useState(initial?.judul ?? '')
  const [deskripsi, setDeskripsi] = useState(initial?.deskripsi ?? '')
  const [area, setArea] = useState<Area>(initial?.area ?? 'dashboard')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSubmit({ judul, deskripsi, area })
      if (!initial) {
        setJudul('')
        setDeskripsi('')
      }
    } catch (err) {
      setError(errorMessage(err, 'Gagal menyimpan request.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ErrorNotice error={error} />
      <div className="flex flex-col gap-2">
        <label className="font-medium">Judul:</label>
        <input value={judul} onChange={(e) => setJudul(e.target.value)} maxLength={120} className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium">Untuk bagian:</label>
        <select value={area} onChange={(e) => setArea(e.target.value as Area)} className={inputClass}>
          {AREAS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium">Deskripsi:</label>
        <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={4} maxLength={2000} className={inputClass} />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving || !judul.trim() || !deskripsi.trim()} className={buttonClass}>
          {saving ? 'Memproses...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>
            Batal
          </button>
        )}
      </div>
    </form>
  )
}

function RequestCard({
  r,
  meId,
  isDeveloper,
  onChanged,
}: {
  r: Req
  meId: string | undefined
  isDeveloper: boolean
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<Status>(r.status)
  const [tanggapan, setTanggapan] = useState(r.tanggapan ?? '')
  const [saving, setSaving] = useState(false)
  const canEdit = !!meId && r.createdBy === meId && r.status === 'baru'

  async function handleDelete() {
    if (!window.confirm('Tarik request ini?')) return
    setError('')
    try {
      await deleteMyFeatureRequest({ data: { id: r.id } })
      onChanged()
    } catch (err) {
      setError(errorMessage(err, 'Gagal menarik request.'))
    }
  }

  async function handleRespond() {
    setError('')
    setSaving(true)
    try {
      await respondFeatureRequest({ data: { id: r.id, status, tanggapan } })
      onChanged()
    } catch (err) {
      setError(errorMessage(err, 'Gagal menyimpan tanggapan.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 border-2 border-[var(--gray-200)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-[var(--text-primary)]">
            #{r.id} {r.judul}
          </span>
          <span className="text-sm text-[var(--gray-600)]">
            {r.pengirimNama} · {formatTanggal(r.createdAt)} · {labelOf(AREAS, r.area)}
          </span>
        </div>
        <span className="px-2 py-1 text-xs uppercase tracking-wide border border-[var(--gray-200)]">
          {labelOf(STATUSES, r.status)}
        </span>
      </div>

      {editing ? (
        <RequestForm
          initial={{ judul: r.judul, deskripsi: r.deskripsi, area: r.area }}
          submitLabel="Simpan"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await updateMyFeatureRequest({ data: { id: r.id, ...values } })
            setEditing(false)
            onChanged()
          }}
        />
      ) : (
        <p className="whitespace-pre-wrap">{r.deskripsi}</p>
      )}

      {r.tanggapan && (
        <div className="p-3 bg-[var(--bg-page)] border-l-4 border-[var(--black)]">
          <p className="text-xs uppercase tracking-wide text-[var(--gray-600)] mb-1">
            Tanggapan developer · {formatTanggal(r.respondedAt)}
          </p>
          <p className="whitespace-pre-wrap">{r.tanggapan}</p>
        </div>
      )}

      <ErrorNotice error={error} />

      {canEdit && !editing && (
        <div className="flex gap-3">
          <button onClick={() => setEditing(true)} className={secondaryButtonClass}>Ubah</button>
          <button onClick={handleDelete} className={secondaryButtonClass}>Tarik</button>
        </div>
      )}

      {isDeveloper && (
        <div className="flex flex-col gap-3 pt-3 border-t border-[var(--gray-200)]">
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <textarea
            value={tanggapan}
            onChange={(e) => setTanggapan(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Tanggapan (opsional)"
            className={inputClass}
          />
          <button onClick={handleRespond} disabled={saving} className={buttonClass}>
            {saving ? 'Memproses...' : 'Simpan tanggapan'}
          </button>
        </div>
      )}
    </div>
  )
}

function RequestsPage() {
  const queryClient = useQueryClient()
  const { data: me } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })
  const { data: requests, isPending } = useQuery({
    queryKey: ['feature-requests'],
    queryFn: () => listFeatureRequests(),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['feature-requests'] })

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-6xl mx-auto">
        <AdminHeader />
        <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)] mb-2">
          Request Fitur
        </h1>
        <p className="text-[var(--gray-600)] mb-6">
          Usulkan fitur atau perbaikan untuk dashboard admin dan katalog. Nama pengirim tercatat otomatis.
        </p>

        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6 self-start">
            <h2 className="text-lg font-semibold mb-4">Kirim request</h2>
            <RequestForm
              submitLabel="Kirim"
              onSubmit={async (values) => {
                await createFeatureRequest({ data: values })
                refresh()
              }}
            />
          </div>

          <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6">
            {isPending ? (
              <p className="text-center py-4">Memuat...</p>
            ) : !requests || requests.length === 0 ? (
              <p className="text-center py-4 text-[var(--gray-600)]">Belum ada request.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {requests.map((r) => (
                  <RequestCard
                    key={r.id}
                    r={r}
                    meId={me?.id}
                    isDeveloper={!!me?.isDeveloper}
                    onChanged={refresh}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
