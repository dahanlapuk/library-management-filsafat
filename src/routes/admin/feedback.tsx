import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getCurrentAdmin } from '../../admin/auth'
import { AdminPage } from '../../components/ui/AdminPage'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { OptionPicker } from '../../components/ui/OptionPicker'
import {
  listFeedback,
  toggleFeedbackVote,
  setFeedbackStatus,
  promoteFeedback,
} from '../../feedback/admin'
import { errorMessage } from '../../lib/error-message'

export const Route = createFileRoute('/admin/feedback')({
  component: FeedbackPage,
})

const JENIS = [
  { value: 'saran', label: 'Kritik dan saran' },
  { value: 'koreksi_buku', label: 'Koreksi data buku' },
  { value: 'usul_buku', label: 'Usul buku' },
] as const

const STATUSES = [
  { value: 'baru', label: 'Baru' },
  { value: 'perlu_perhatian', label: 'Perlu perhatian' },
  { value: 'diteruskan', label: 'Diteruskan' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'ditolak', label: 'Ditolak' },
] as const

const AREAS = [
  { value: 'dashboard', label: 'Dashboard admin' },
  { value: 'katalog', label: 'Katalog publik' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

const STATUS_STYLE: Record<string, { badge: string; stripe: string }> = {
  baru: {
    badge: 'bg-[var(--pale)] text-[var(--ink)] border-[var(--sun)]',
    stripe: 'border-l-[color:var(--sun)]',
  },
  perlu_perhatian: {
    badge: 'bg-[var(--ink)] text-[var(--cream)] border-[var(--ink)] font-semibold',
    stripe: 'border-l-[color:var(--ink)]',
  },
  diteruskan: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    stripe: 'border-l-emerald-600',
  },
  selesai: {
    badge: 'bg-[var(--pale-soft)] text-[var(--muted)] border-[var(--rule)]',
    stripe: 'border-l-[color:var(--rule)]',
  },
  ditolak: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    stripe: 'border-l-red-600',
  },
}

const STATUS_PRIORITY: Record<string, number> = { perlu_perhatian: 0, baru: 1 }

type Area = (typeof AREAS)[number]['value']
type Item = Awaited<ReturnType<typeof listFeedback>>[number]

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

function kontakHref(kontak: string | null) {
  if (!kontak) return null
  const text = kontak.trim()
  if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(text)) return `mailto:${text}`
  const digits = text.replace(/\D/g, '')
  if (digits.length < 8 || !/^[+\d\s-]+$/.test(text)) return null
  const intl = digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  return `https://wa.me/${intl}`
}

function ErrorNotice({ error }: { error: string }) {
  if (!error) return null
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {error}
    </div>
  )
}

function FeedbackCard({
  f,
  isSuperadmin,
  onChanged,
}: {
  f: Item
  isSuperadmin: boolean
  onChanged: () => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [judul, setJudul] = useState(f.pesan.slice(0, 80))
  const [area, setArea] = useState<Area>('lainnya')

  const isSaran = f.jenis === 'saran'
  const open = f.status === 'baru' || f.status === 'perlu_perhatian'
  const href = kontakHref(f.kontak)

  async function run(action: () => Promise<unknown>, fallback: string) {
    setError('')
    setBusy(true)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(errorMessage(err, fallback))
    } finally {
      setBusy(false)
    }
  }

  const setStatus = (status: 'baru' | 'selesai' | 'ditolak') =>
    run(() => setFeedbackStatus({ data: { id: f.id, status } }), 'Gagal mengubah status.')

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-l-[6px] border-[var(--rule)] bg-[var(--white)] p-4 shadow-[0_1px_2px_rgba(24,22,0,0.05)] ${STATUS_STYLE[f.status]?.stripe ?? ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold">
            #{f.id} {labelOf(JENIS, f.jenis)}
          </span>
          <span className="text-xs text-[var(--muted)]">{formatTanggal(f.createdAt)}</span>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs ${STATUS_STYLE[f.status]?.badge ?? ''}`}
        >
          {labelOf(STATUSES, f.status)}
        </span>
      </div>

      <p className="whitespace-pre-wrap break-words rounded-lg bg-[var(--pale-soft)] p-3 text-sm">
        {f.pesan}
      </p>

      {(f.bookId || f.bookJudulSnapshot) && (
        <div className="flex flex-col gap-1 text-sm">
          <span className="break-words text-[var(--muted)]">
            Buku: <span className="font-medium text-[var(--ink)]">{f.bookJudulSnapshot}</span>
            {!f.bookId && ' (sudah dihapus)'}
          </span>
          {f.bookId && (
            <div className="flex flex-wrap gap-4">
              <Link
                to="/admin/books/$bookId/edit"
                params={{ bookId: String(f.bookId) }}
                className="underline"
              >
                Buka di Kelola Buku
              </Link>
              <Link to="/" search={{ book: f.bookId }} className="underline">
                Lihat di katalog
              </Link>
            </div>
          )}
        </div>
      )}

      {f.kontak && (
        <p className="break-all text-sm text-[var(--muted)]">
          Kontak:{' '}
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
              {f.kontak}
            </a>
          ) : (
            f.kontak
          )}
        </p>
      )}

      {f.requestId && (
        <p className="text-sm">
          Diteruskan sebagai{' '}
          <Link to="/admin/requests" className="underline">
            request fitur #{f.requestId}
          </Link>
        </p>
      )}

      {isSaran && (
        <p className="text-xs text-[var(--muted)]">Dukungan admin: {f.voteCount}</p>
      )}

      <ErrorNotice error={error} />

      <div className="flex flex-wrap gap-2">
        {isSaran && open && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run(() => toggleFeedbackVote({ data: { id: f.id } }), 'Gagal memberi vote.')
            }
          >
            {f.sudahVote ? 'Tarik dukungan' : 'Dukung'}
          </Button>
        )}

        {isSaran && open && isSuperadmin && (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setPromoting((v) => !v)}>
              Teruskan jadi request
            </Button>
            <Button variant="accent" disabled={busy} onClick={() => setStatus('selesai')}>
              Tandai selesai
            </Button>
            <Button
              variant="quiet"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Tolak saran ini?')) setStatus('ditolak')
              }}
            >
              Tolak
            </Button>
          </>
        )}

        {!isSaran && f.status === 'baru' && (
          <Button variant="accent" disabled={busy} onClick={() => setStatus('selesai')}>
            Tandai selesai
          </Button>
        )}
        {!isSaran && f.status === 'selesai' && (
          <Button variant="secondary" disabled={busy} onClick={() => setStatus('baru')}>
            Buka kembali
          </Button>
        )}
      </div>

      {promoting && isSuperadmin && (
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--rule)] bg-[var(--pale-soft)] p-3">
          <Input
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            maxLength={120}
            placeholder="Judul request"
            className="w-full"
          />
          <OptionPicker
            title="Area request"
            placeholder="Pilih area"
            searchable={false}
            value={area}
            onChange={(v) => setArea(v as Area)}
            options={AREAS.map((a) => ({ value: a.value, label: a.label }))}
          />
          <p className="text-xs text-[var(--muted)]">
            Pesan ini menjadi deskripsi request. Kontak pengunjung tidak ikut disalin.
          </p>
          <Button
            variant="accent"
            disabled={busy || judul.trim().length < 3}
            onClick={() =>
              run(
                () => promoteFeedback({ data: { id: f.id, judul, area } }),
                'Gagal meneruskan saran.',
              )
            }
          >
            {busy ? 'Memproses...' : 'Buat request'}
          </Button>
        </div>
      )}
    </div>
  )
}

function FeedbackPage() {
  const queryClient = useQueryClient()
  const [jenisFilter, setJenisFilter] = useState<'semua' | Item['jenis']>('semua')
  const [tampil, setTampil] = useState<'aktif' | 'semua'>('aktif')

  const { data: me } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })
  const { data: items, isPending, error } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => listFeedback(),
  })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['feedback'] })
    queryClient.invalidateQueries({ queryKey: ['feature-requests'] })
  }

  const shown = (items ?? []).filter(
    (f) =>
      (jenisFilter === 'semua' || f.jenis === jenisFilter) &&
      (tampil === 'semua' || f.status === 'baru' || f.status === 'perlu_perhatian'),
  ).sort(
    (a, b) =>
      (STATUS_PRIORITY[a.status] ?? 2) - (STATUS_PRIORITY[b.status] ?? 2) || b.id - a.id,
  )

  return (
    <AdminPage>
      <div className="mb-1 flex flex-wrap items-center gap-3 sm:mb-2">
        <h1 className="text-2xl font-semibold sm:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
          Feedback Publik
        </h1>
        {shown.length > 0 && <Badge tone="solid">{shown.length}</Badge>}
      </div>
      <p className="mb-5 hidden text-sm text-[var(--muted)] sm:block">
        Kiriman pengunjung katalog. Kritik dan saran yang didukung dua admin naik menjadi perlu
        perhatian, lalu superadmin dapat meneruskannya sebagai request fitur.
      </p>

      <div className="mb-4 mt-3 grid grid-cols-2 gap-3 sm:mt-0">
        <OptionPicker
          title="Jenis feedback"
          placeholder="Semua jenis"
          searchable={false}
          value={jenisFilter}
          onChange={(v) => setJenisFilter(v as 'semua' | Item['jenis'])}
          options={[
            { value: 'semua', label: 'Semua jenis' },
            ...JENIS.map((j) => ({ value: j.value, label: j.label })),
          ]}
        />
        <OptionPicker
          title="Tampilkan status"
          placeholder="Belum selesai"
          searchable={false}
          value={tampil}
          onChange={(v) => setTampil(v as 'aktif' | 'semua')}
          options={[
            { value: 'aktif', label: 'Belum selesai' },
            { value: 'semua', label: 'Semua status' },
          ]}
        />
      </div>

      {error ? (
        <ErrorNotice error={errorMessage(error, 'Gagal memuat feedback.')} />
      ) : isPending ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">Memuat...</p>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-[var(--rule)] bg-[var(--white)] px-4 py-10 text-center text-sm text-[var(--muted)]">
          Tidak ada feedback.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((f) => (
            <FeedbackCard
              key={f.id}
              f={f}
              isSuperadmin={!!me?.isSuperadmin}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </AdminPage>
  )
}
