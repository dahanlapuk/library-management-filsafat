import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getCurrentAdmin } from '../../admin/auth'
import { AdminHeader } from '../../admin/AdminHeader'
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
  { value: 'saran', label: 'Saran' },
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
    badge: 'bg-[#e8f0fe] text-[#1a4fa0] border-[#b6cdf5]',
    stripe: 'border-l-[#4a7fd4]',
  },
  perlu_perhatian: {
    badge: 'bg-[#f5a623] text-[#1a1a1a] border-[#b36b00] font-bold',
    stripe: 'border-l-[#f5a623]',
  },
  diteruskan: {
    badge: 'bg-[#e6f4ea] text-[#1e6b34] border-[#a8d5b5]',
    stripe: 'border-l-[#2e8b4f]',
  },
  selesai: {
    badge: 'bg-[var(--gray-200)] text-[var(--gray-600)] border-[var(--gray-200)]',
    stripe: 'border-l-[color:var(--gray-200)]',
  },
  ditolak: {
    badge: 'bg-[#fee] text-[#c00] border-[#fcc]',
    stripe: 'border-l-[#c00]',
  },
}

const STATUS_PRIORITY: Record<string, number> = { perlu_perhatian: 0, baru: 1 }

type Area = (typeof AREAS)[number]['value']
type Item = Awaited<ReturnType<typeof listFeedback>>[number]

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
  return <div className="p-3 bg-[#fee] border border-[#fcc] text-[#c00]">{error}</div>
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
      className={`flex flex-col gap-3 p-4 border-2 border-[var(--gray-200)] border-l-[6px] ${STATUS_STYLE[f.status]?.stripe ?? ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-[var(--text-primary)]">
            #{f.id} {labelOf(JENIS, f.jenis)}
          </span>
          <span className="text-sm text-[var(--gray-600)]">{formatTanggal(f.createdAt)}</span>
        </div>
        <span
          className={`px-2 py-1 text-xs uppercase tracking-wide border ${STATUS_STYLE[f.status]?.badge ?? ''}`}
        >
          {labelOf(STATUSES, f.status)}
        </span>
      </div>

      <p className="whitespace-pre-wrap">{f.pesan}</p>

      {(f.bookId || f.bookJudulSnapshot) && (
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--gray-600)]">
            Buku: <span className="font-medium text-[var(--text-primary)]">{f.bookJudulSnapshot}</span>
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
        <p className="text-sm text-[var(--gray-600)]">
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

      {isSaran && <p className="text-sm text-[var(--gray-600)]">Dukungan admin: {f.voteCount}</p>}

      <ErrorNotice error={error} />

      <div className="flex flex-wrap gap-3">
        {isSaran && open && (
          <button
            disabled={busy}
            onClick={() =>
              run(() => toggleFeedbackVote({ data: { id: f.id } }), 'Gagal memberi vote.')
            }
            className={secondaryButtonClass}
          >
            {f.sudahVote ? 'Tarik dukungan' : 'Dukung'}
          </button>
        )}

        {isSaran && open && isSuperadmin && (
          <>
            <button disabled={busy} onClick={() => setPromoting((v) => !v)} className={secondaryButtonClass}>
              Teruskan jadi request
            </button>
            <button disabled={busy} onClick={() => setStatus('selesai')} className={secondaryButtonClass}>
              Tandai selesai
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (window.confirm('Tolak saran ini?')) setStatus('ditolak')
              }}
              className={secondaryButtonClass}
            >
              Tolak
            </button>
          </>
        )}

        {!isSaran && f.status === 'baru' && (
          <button disabled={busy} onClick={() => setStatus('selesai')} className={buttonClass}>
            Tandai selesai
          </button>
        )}
        {!isSaran && f.status === 'selesai' && (
          <button disabled={busy} onClick={() => setStatus('baru')} className={secondaryButtonClass}>
            Buka kembali
          </button>
        )}
      </div>

      {promoting && isSuperadmin && (
        <div className="flex flex-col gap-3 pt-3 border-t border-[var(--gray-200)]">
          <input
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            maxLength={120}
            placeholder="Judul request"
            className={inputClass}
          />
          <select value={area} onChange={(e) => setArea(e.target.value as Area)} className={inputClass}>
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--gray-600)]">
            Pesan ini menjadi deskripsi request. Kontak pengunjung tidak ikut disalin.
          </p>
          <button
            disabled={busy || judul.trim().length < 3}
            onClick={() =>
              run(
                () => promoteFeedback({ data: { id: f.id, judul, area } }),
                'Gagal meneruskan saran.',
              )
            }
            className={buttonClass}
          >
            {busy ? 'Memproses...' : 'Buat request'}
          </button>
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
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-6xl mx-auto">
        <AdminHeader />
        <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)] mb-2">
          Feedback Publik
        </h1>
        <p className="text-[var(--gray-600)] mb-6">
          Kiriman pengunjung katalog. Saran yang didukung dua admin naik menjadi perlu perhatian,
          lalu superadmin dapat meneruskannya sebagai request fitur.
        </p>

        <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={jenisFilter}
              onChange={(e) => setJenisFilter(e.target.value as 'semua' | Item['jenis'])}
              className={inputClass}
            >
              <option value="semua">Semua jenis</option>
              {JENIS.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
            <select
              value={tampil}
              onChange={(e) => setTampil(e.target.value as 'aktif' | 'semua')}
              className={inputClass}
            >
              <option value="aktif">Belum selesai</option>
              <option value="semua">Semua status</option>
            </select>
          </div>

          {error ? (
            <ErrorNotice error={errorMessage(error, 'Gagal memuat feedback.')} />
          ) : isPending ? (
            <p className="text-center py-4">Memuat...</p>
          ) : shown.length === 0 ? (
            <p className="text-center py-4 text-[var(--gray-600)]">Tidak ada feedback.</p>
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
        </div>
      </div>
    </div>
  )
}
