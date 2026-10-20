import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getCurrentAdmin } from '../../admin/auth'
import { AdminPage } from '../../components/ui/AdminPage'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Field'
import { OptionPicker } from '../../components/ui/OptionPicker'
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

const STATUS_BADGE: Record<string, string> = {
  baru: 'bg-[var(--pale)] text-[var(--ink)] border-[var(--sun)]',
  dipertimbangkan: 'bg-[var(--pale-soft)] text-[var(--muted)] border-[var(--rule)]',
  dikerjakan: 'bg-[var(--ink)] text-[var(--cream)] border-[var(--ink)] font-semibold',
  selesai: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ditolak: 'bg-red-50 text-red-700 border-red-200',
}

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
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {error}
    </div>
  )
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

  const labelClass = 'text-sm font-medium'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ErrorNotice error={error} />
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Judul</label>
        <Input
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          maxLength={120}
          className="w-full"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Untuk bagian</label>
        <OptionPicker
          title="Untuk bagian"
          placeholder="Pilih bagian"
          searchable={false}
          value={area}
          onChange={(v) => setArea(v as Area)}
          options={AREAS.map((a) => ({ value: a.value, label: a.label }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Deskripsi</label>
        <Textarea
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="accent"
          disabled={saving || !judul.trim() || !deskripsi.trim()}
        >
          {saving ? 'Memproses...' : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="quiet" onClick={onCancel}>
            Batal
          </Button>
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
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--rule)] bg-[var(--white)] p-4 shadow-[0_1px_2px_rgba(24,22,0,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="break-words font-semibold">
            #{r.id} {r.judul}
          </span>
          <span className="text-xs text-[var(--muted)]">
            {r.pengirimNama} · {formatTanggal(r.createdAt)} · {labelOf(AREAS, r.area)}
          </span>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs ${STATUS_BADGE[r.status] ?? ''}`}
        >
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
        <p className="whitespace-pre-wrap break-words text-sm">{r.deskripsi}</p>
      )}

      {r.tanggapan && (
        <div className="rounded-lg border-l-4 border-[var(--ink)] bg-[var(--pale-soft)] p-3">
          <p className="mb-1 text-xs text-[var(--muted)]">
            Tanggapan developer · {formatTanggal(r.respondedAt)}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm">{r.tanggapan}</p>
        </div>
      )}

      <ErrorNotice error={error} />

      {canEdit && !editing && (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Ubah
          </Button>
          <Button variant="quiet" onClick={handleDelete}>
            Tarik
          </Button>
        </div>
      )}

      {isDeveloper && (
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--rule)] bg-[var(--pale-soft)] p-3">
          <OptionPicker
            title="Status request"
            placeholder="Pilih status"
            searchable={false}
            value={status}
            onChange={(v) => setStatus(v as Status)}
            options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Textarea
            value={tanggapan}
            onChange={(e) => setTanggapan(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Tanggapan (opsional)"
            className="w-full"
          />
          <Button variant="accent" onClick={handleRespond} disabled={saving}>
            {saving ? 'Memproses...' : 'Simpan tanggapan'}
          </Button>
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
    <AdminPage>
      <div className="mb-1 flex flex-wrap items-center gap-3 sm:mb-2">
        <h1
          className="text-2xl font-semibold sm:text-3xl"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Request Fitur
        </h1>
        {requests && requests.length > 0 && <Badge tone="solid">{requests.length}</Badge>}
      </div>
      <p className="mb-5 hidden text-sm text-[var(--muted)] sm:block">
        Usulkan fitur atau perbaikan untuk dashboard admin dan katalog. Nama pengirim tercatat
        otomatis.
      </p>

      <div className="mt-3 grid gap-6 sm:mt-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="self-start rounded-xl border border-[var(--rule)] bg-[var(--white)] p-4 shadow-[0_1px_2px_rgba(24,22,0,0.05)] sm:p-5">
          <h2
            className="mb-4 text-lg font-semibold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Kirim request
          </h2>
          <RequestForm
            submitLabel="Kirim"
            onSubmit={async (values) => {
              await createFeatureRequest({ data: values })
              refresh()
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          {isPending ? (
            <p className="py-10 text-center text-sm text-[var(--muted)]">Memuat...</p>
          ) : !requests || requests.length === 0 ? (
            <p className="rounded-xl border border-[var(--rule)] bg-[var(--white)] px-4 py-10 text-center text-sm text-[var(--muted)]">
              Belum ada request.
            </p>
          ) : (
            requests.map((r) => (
              <RequestCard
                key={r.id}
                r={r}
                meId={me?.id}
                isDeveloper={!!me?.isDeveloper}
                onChanged={refresh}
              />
            ))
          )}
        </div>
      </div>
    </AdminPage>
  )
}
