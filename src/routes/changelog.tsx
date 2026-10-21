import { Link, createFileRoute } from '@tanstack/react-router'
import { REPO_URL, RILIS, formatVersi, type Rilis } from '../data/changelog'
import { GIT_RILIS } from '../data/changelog-git'

export const Route = createFileRoute('/changelog')({
  head: () => ({
    meta: [
      { title: 'Changelog Biblioteka Filsafat UI' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ChangelogPage,
})

const adaPre = (v: string) => v.includes('-pre')
const tag = (v: string) => (v.startsWith('v') ? v : `v${v}`)
const minorKey = (v: string) => v.split('.').slice(0, 2).join('.')
const patchNo = (v: string) => Number(v.split('.')[2])

function formatTanggal(t: string) {
  return new Date(`${t}T00:00:00Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

type Simpul = { induk: Rilis; anak: Rilis[] }

function susunPohon(): { simpul: Simpul[]; pra: Rilis[] } {
  const pra = RILIS.filter((r) => adaPre(r.versi))
  const stabil = RILIS.filter((r) => !adaPre(r.versi))
  const urutKey: string[] = []
  const peta = new Map<string, Rilis[]>()
  for (const r of stabil) {
    const k = minorKey(r.versi)
    if (!peta.has(k)) {
      peta.set(k, [])
      urutKey.push(k)
    }
    peta.get(k)!.push(r)
  }
  const simpul = urutKey.map((k) => {
    const naik = [...peta.get(k)!].sort((a, b) => patchNo(a.versi) - patchNo(b.versi))
    return { induk: naik[0], anak: naik.slice(1).reverse() }
  })
  return { simpul, pra }
}

function Judul({ r, live, sembunyiFitur }: { r: Rilis; live: boolean; sembunyiFitur?: boolean }) {
  const git = GIT_RILIS[r.versi]
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-base font-bold">{formatVersi(r.versi)}</span>
      <span className="text-sm font-normal">{r.judul}</span>
      {r.fitur && !sembunyiFitur && (
        <span className="rounded-full bg-[var(--black)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--white)]">
          Fitur baru
        </span>
      )}
      {live && (
        <span className="rounded-full border border-[var(--black)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]">
          Current version
        </span>
      )}
      {git && <span className="text-xs font-normal text-[var(--gray-600)]">{formatTanggal(git.tanggal)}</span>}
    </span>
  )
}

function Isi({ r }: { r: Rilis }) {
  const git = GIT_RILIS[r.versi]
  const compareUrl = git
    ? git.dari
      ? `${REPO_URL}/compare/${tag(git.dari)}...${tag(r.versi)}`
      : `${REPO_URL}/commits/${tag(r.versi)}`
    : null

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
        {r.ringkas.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.15em] text-[var(--gray-600)]">
          Rincian teknis
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed">
            {r.teknis.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          {git && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[var(--gray-600)]">{git.commits.length} commit di rilis ini</p>
              <ul className="flex flex-col gap-1 text-xs leading-relaxed">
                {git.commits.map((c) => (
                  <li key={c.hash}>
                    <a href={`${REPO_URL}/commit/${c.hash}`} target="_blank" rel="noopener noreferrer" className="font-mono underline">{c.hash}</a>{' '}
                    {c.pesan}
                  </li>
                ))}
              </ul>
              {compareUrl && (
                <a href={compareUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">Lihat perbandingan di GitHub</a>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  )
}

function Anak({ r, live }: { r: Rilis; live: boolean }) {
  return (
    <details open={live} className="border-l-2 border-[var(--gray-200)] pl-4">
      <summary className="cursor-pointer">
        <Judul r={r} live={live} />
      </summary>
      <div className="mt-3">
        <Isi r={r} />
      </div>
    </details>
  )
}

function ChangelogPage() {
  const live = RILIS.find((r) => !adaPre(r.versi))?.versi
  const { simpul, pra } = susunPohon()

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="border-b border-[var(--rule)] bg-[var(--sun-bright)] px-5 py-8 sm:py-10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 sm:px-3">
          <Link to="/" className="text-sm text-[var(--ink)]/75 hover:text-[var(--ink)] hover:underline">
            ← Kembali ke katalog
          </Link>
          <h1 className="font-[var(--font-heading)] text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl">Changelog</h1>
          <p className="text-sm text-[var(--ink)]/75">
            Riwayat perubahan Biblioteka Departemen Filsafat UI
          </p>
        </div>
      </header>
      <main className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-8 sm:px-8">
        {simpul.map((s) => {
          const terbuka = s.induk.versi === live || s.anak.some((a) => a.versi === live)
          const jumlahFitur = [s.induk, ...s.anak].filter((r) => r.fitur).length
          return (
            <details key={s.induk.versi} open={terbuka} className="rounded-xl border border-[var(--gray-200)] bg-[var(--white)] p-4">
              <summary className="cursor-pointer">
                <Judul r={s.induk} live={terbuka} sembunyiFitur />
                {jumlahFitur > 0 && (
                  <span className="ml-3 rounded-full bg-[var(--black)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--white)]">
                    {jumlahFitur} fitur baru
                  </span>
                )}
              </summary>
              <div className="mt-4 flex flex-col gap-5">
                <Isi r={s.induk} />
                {s.anak.length > 0 && (
                  <div className="flex flex-col gap-4 border-t border-[var(--gray-200)] pt-4">
                    {s.anak.map((a) => (
                      <Anak key={a.versi} r={a} live={a.versi === live} />
                    ))}
                  </div>
                )}
              </div>
            </details>
          )
        })}
        {pra.length > 0 && (
          <details className="rounded-xl border border-[var(--gray-200)] bg-[var(--white)] p-4">
            <summary className="cursor-pointer text-sm font-bold uppercase tracking-[0.15em]">
              Pra-rilis
              <span className="ml-2 text-xs font-normal normal-case tracking-normal text-[var(--gray-600)]">
                {pra.length} versi
              </span>
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              {pra.map((r) => (
                <Anak key={r.versi} r={r} live={false} />
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  )
}
