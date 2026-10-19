import { Link, createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { getFeedbackBook, submitFeedback } from '../feedback/public'
import { errorMessage } from '../lib/error-message'

type Jenis = 'saran' | 'koreksi_buku' | 'usul_buku'

const JENIS_OPTIONS: { value: Jenis; label: string; petunjuk: string }[] = [
  {
    value: 'saran',
    label: 'Kritik dan saran',
    petunjuk: 'Kritik atau saran umum untuk perpustakaan atau situs ini.',
  },
  {
    value: 'koreksi_buku',
    label: 'Koreksi data buku',
    petunjuk:
      'Judul, penulis, atau lokasi rak yang salah. Sebutkan bagian yang keliru dan seharusnya seperti apa.',
  },
  {
    value: 'usul_buku',
    label: 'Usul buku',
    petunjuk: 'Buku yang belum ada di koleksi. Sertakan judul dan penulisnya.',
  },
]

function parseJenis(v: unknown): Jenis | undefined {
  return v === 'saran' || v === 'koreksi_buku' || v === 'usul_buku' ? v : undefined
}

function parseBook(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : undefined
}

export const Route = createFileRoute('/feedback')({
  validateSearch: (s: Record<string, unknown>): { book?: number; jenis?: Jenis } => ({
    book: parseBook(s.book),
    jenis: parseJenis(s.jenis),
  }),
  loaderDeps: ({ search }) => ({ book: search.book }),
  loader: ({ deps }) =>
    deps.book ? getFeedbackBook({ data: { id: deps.book } }) : null,
  head: () => ({
    meta: [
      { title: 'Kirim Feedback | Biblioteka Filsafat UI' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: FeedbackPage,
})

const MAX_PESAN = 1000

function FeedbackPage() {
  const search = Route.useSearch()
  const buku = Route.useLoaderData()

  const [jenis, setJenis] = useState<Jenis>(
    search.jenis ?? (buku ? 'koreksi_buku' : 'saran'),
  )
  const [pesan, setPesan] = useState('')
  const [kontak, setKontak] = useState('')
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const petunjuk = JENIS_OPTIONS.find((o) => o.value === jenis)?.petunjuk

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (pesan.trim().length < 10) {
      setError('Pesan minimal 10 karakter.')
      return
    }

    setSubmitting(true)
    try {
      await submitFeedback({
        data: {
          jenis,
          pesan: pesan.trim(),
          kontak: kontak.trim() || undefined,
          bookId: jenis === 'koreksi_buku' && buku ? buku.id : undefined,
          website,
        },
      })
      setSuccess(true)
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengirim feedback.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="border-b border-[var(--rule)] bg-[var(--sun-bright)] px-5 py-8 sm:py-10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 sm:px-3">
          <Link to="/" className="text-sm text-[var(--ink)]/75 hover:text-[var(--ink)] hover:underline">
            ← Kembali ke katalog
          </Link>
          <h1 className="font-[var(--font-heading)] text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl">
            Kirim Feedback
          </h1>
          <p className="text-sm text-[var(--ink)]/75">
            Kritik, saran, koreksi data, atau usul buku
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 py-6 sm:px-8">
        {success ? (
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--rule)] bg-[var(--white)] p-5">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Terima kasih, feedback Anda sudah kami terima.
            </p>
            <p className="text-sm text-[var(--gray-600)]">
              Kiriman dibaca oleh pengelola perpustakaan.
            </p>
            <Link to="/" className="text-sm underline">
              Kembali ke katalog
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
            {buku && jenis === 'koreksi_buku' && (
              <p className="rounded-xl bg-[var(--pale-soft)] p-3 text-sm">
                Koreksi untuk buku: <span className="font-semibold">{buku.judul}</span>
              </p>
            )}

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold text-[var(--ink)]">
                Jenis
              </legend>
              <div className="flex flex-wrap gap-2">
                {JENIS_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ink)] ${
                      jenis === o.value
                        ? 'border-[var(--sun)] bg-[var(--sun-bright)] font-medium text-[var(--ink)]'
                        : 'border-[var(--gray-200)] bg-[var(--white)] hover:bg-[var(--pale-soft)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="jenis"
                      value={o.value}
                      checked={jenis === o.value}
                      onChange={() => setJenis(o.value)}
                      className="sr-only"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--gray-600)]">{petunjuk}</p>
            </fieldset>

            {error && (
              <div className="rounded-lg border border-[#fcc] bg-[#fee] p-2 text-xs text-[#c00]">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label
                htmlFor="pesan"
                className="text-sm font-semibold text-[var(--ink)]"
              >
                Pesan
              </label>
              <textarea
                id="pesan"
                value={pesan}
                onChange={(e) => setPesan(e.target.value)}
                maxLength={MAX_PESAN}
                rows={6}
                className="w-full rounded-lg border border-[var(--gray-200)] bg-[var(--white)] px-3 py-2 text-base sm:text-sm"
              />
              <p className="text-right text-xs text-[var(--gray-600)]">
                {pesan.length}/{MAX_PESAN}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="kontak"
                className="text-sm font-semibold text-[var(--ink)]"
              >
                Kontak (opsional)
              </label>
              <input
                id="kontak"
                type="text"
                value={kontak}
                onChange={(e) => setKontak(e.target.value)}
                maxLength={100}
                className="w-full rounded-lg border border-[var(--gray-200)] bg-[var(--white)] px-3 py-2 text-base sm:text-sm"
              />
              <p className="text-xs text-[var(--gray-600)]">
                Email atau WhatsApp. Hanya dilihat pengelola perpustakaan dan dipakai bila kami
                perlu menanyakan sesuatu. Tidak ada balasan otomatis.
              </p>
            </div>

            <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg border border-[var(--sun)] bg-[var(--sun-bright)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--sun)] disabled:opacity-50 sm:w-auto"
            >
              {submitting ? 'Mengirim...' : 'Kirim'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
