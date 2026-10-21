import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { buttonClass } from '../components/ui/Button'
import { Chevron } from '../components/ui/Chevron'

type Who = {
  nama: string
  nickname: string | null
  isSuperadmin: boolean
  isDeveloper: boolean
}

type Step = {
  title: string
  body: string
  target?: string
  points?: { label: string; text: string }[]
}

function buildSteps(who: Who): Step[] {
  const sapaan = who.nickname?.trim() || who.nama
  const steps: Step[] = [
    {
      title: `Selamat datang, ${sapaan}`,
      body: 'Tampilan admin Biblioteka sudah dirombak dan menu disusun ulang. Tur singkat ini menunjukkan di mana semuanya sekarang.',
    },
    {
      title: 'Menu ada di sini',
      target: 'nav',
      body: 'Semua halaman admin dikelompokkan di bilah atas. Di HP, buka lewat tombol "Menu". Klik sebuah kelompok untuk melihat isinya.',
    },
    {
      title: 'Peminjaman',
      target: 'grup-Peminjaman',
      body: 'Urusan harian peminjam ada di satu kelompok.',
      points: [
        { label: 'Pengajuan Peminjaman', text: 'Setujui atau tolak pengajuan, catat pengembalian, dan kirim pesan WhatsApp ke peminjam.' },
        { label: 'Data Anggota', text: 'Daftar mahasiswa dan dosen beserta riwayat pinjamnya.' },
      ],
    },
    {
      title: 'Koleksi',
      target: 'grup-Koleksi',
      body: 'Semua yang menyangkut data buku.',
      points: [
        { label: 'Kelola Buku', text: 'Tambah, ubah, atau ajukan hapus buku.' },
        { label: 'Inventory Check', text: 'Alur baru: buku yang ada dan sesuai cukup satu ketuk "Ada, sesuai". Kalau ada selisih atau perlu ubah posisi, pilih "Ada selisih / ubah". Kartu kuning belum dicek, hijau sudah dicek; filter "Hanya yang belum dicek" membantu.' },
        { label: 'Kategorisasi Massal', text: 'Atur kategori dan tag banyak buku sekaligus.' },
        ...(who.isSuperadmin
          ? [{ label: 'Kelola Kategori', text: 'Tambah, ganti nama, pindah, dan urutkan kategori.' }]
          : []),
      ],
    },
  ]

  if (who.isSuperadmin) {
    steps.push({
      title: 'Persetujuan',
      target: 'grup-Persetujuan',
      body: 'Antrean yang menunggu keputusan superadmin.',
      points: [
        { label: 'Pengajuan Hapus', text: 'Setujui atau tolak permintaan menghapus buku.' },
        { label: 'Pengajuan Kategori', text: 'Tinjau usulan perubahan kategori.' },
        { label: 'Approval Admin', text: 'Setujui admin baru yang mendaftar.' },
      ],
    })
  }

  steps.push({
    title: 'Masukan',
    target: 'grup-Masukan',
    body: 'Suara dari pengguna dan dari tim.',
    points: [
      { label: 'Feedback Publik', text: 'Kritik, saran, koreksi buku, dan usul buku dari pengunjung.' },
      { label: 'Request Fitur', text: 'Usulan fitur dari tim untuk developer.' },
    ],
  })

  steps.push({
    title: 'Sistem',
    target: 'grup-Sistem',
    body: 'Pengaturan dan jejak aktivitas.',
    points: [
      ...(who.isSuperadmin
        ? [{ label: 'Activity Log', text: 'Catatan siapa melakukan apa.' }]
        : []),
      { label: 'Maintenance', text: 'Mengatur halaman pemeliharaan saat sistem sedang dirawat.' },
    ],
  })

  steps.push({
    title: 'Menu akun Anda',
    target: 'user',
    body: 'Di sini ada Profil Saya untuk mengubah data diri, password, dan email. Angka kecil di samping menu menunjukkan jumlah antrean yang menunggu. Mau melihat tur ini lagi? Pilih "Tutorial" di menu ini.',
  })

  return steps
}

function ScrollBox({
  className,
  style,
  resetKey,
  children,
}: {
  className: string
  style?: CSSProperties
  resetKey: number
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)
  const check = useCallback(() => {
    const el = ref.current
    if (!el) return
    setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
  }, [])

  useLayoutEffect(() => {
    ref.current?.scrollTo(0, 0)
    check()
    const t = setTimeout(check, 350)
    window.addEventListener('resize', check)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', check)
    }
  }, [resetKey, check])

  return (
    <div ref={ref} onScroll={check} className={className} style={style}>
      {children}
      <div
        aria-hidden="true"
        className={`pointer-events-none sticky bottom-0 -mx-5 -mb-5 flex h-12 items-end justify-center bg-gradient-to-t from-[var(--white)] to-transparent pb-1.5 transition-opacity duration-200 ${
          more ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ink)] px-3 py-1 text-xs font-medium text-[var(--cream)] shadow">
          Gulir ke bawah
          <Chevron className="h-3.5 w-3.5 animate-bounce motion-reduce:animate-none" />
        </span>
      </div>
    </div>
  )
}

type Box = { top: number; left: number; width: number; height: number }

function findVisible(name: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)
  for (const el of els) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

const CARD_W = 384
const PAD = 6

export function Tutorial({
  who,
  manual,
  onClose,
  onTarget,
}: {
  who: Who
  manual: boolean
  onClose: () => void
  onTarget?: (target: string | null) => void
}) {
  const steps = buildSteps(who)
  const [i, setI] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [mobile, setMobile] = useState(false)
  const step = steps[i]
  const last = i === steps.length - 1

  useLayoutEffect(() => {
    function measure() {
      const isMobile = window.matchMedia('(max-width: 767px)').matches
      setMobile(isMobile)
      const name = step.target ?? null
      const el = name ? findVisible(name) : null
      if (!el) {
        setBox(null)
        return
      }
      el.scrollIntoView({ block: 'nearest' })
      const r = el.getBoundingClientRect()
      const next = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
      setBox((prev) =>
        prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.height === next.height
          ? prev
          : next,
      )
    }
    onTarget?.(step.target ?? null)
    measure()
    const timers = [60, 380].map((ms) => setTimeout(measure, ms))
    window.addEventListener('resize', measure)
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', measure)
    }
  }, [i, step.target])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const vh = window.innerHeight
  const vw = window.innerWidth
  const below = !!box && vh - (box.top + box.height + 16) >= 240
  const right = !!box && !below && vw - (box.left + box.width + 16) >= CARD_W
  const placed = !!box && !mobile && (below || right)
  const cardTop = !box
    ? 0
    : below
      ? box.top + box.height + 16
      : Math.max(16, Math.min(box.top, vh - 320))
  const cardLeft = !box
    ? 0
    : right
      ? box.left + box.width + 16
      : Math.min(Math.max(16, box.left), Math.max(16, vw - CARD_W - 16))

  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {i + 1} dari {steps.length}
        {manual ? ' · Tutorial' : ''}
      </p>
      <h2 className="mt-1 text-2xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
        {step.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed break-words">{step.body}</p>
      {step.points && (
        <ul className="mt-4 space-y-2">
          {step.points.map((p) => (
            <li key={p.label} className="rounded-lg border border-[var(--rule)] bg-[var(--pale-soft)] px-3 py-2 text-sm break-words">
              <span className="font-semibold">{p.label}</span>
              <span className="block text-[var(--muted)]">{p.text}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={onClose} className={buttonClass('quiet')}>
          {last ? 'Tutup' : 'Lewati'}
        </button>
        <div className="flex items-center gap-2">
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} className={buttonClass('secondary')}>
              Kembali
            </button>
          )}
          <button type="button" onClick={() => (last ? onClose() : setI(i + 1))} className={buttonClass('accent')}>
            {last ? 'Selesai' : 'Lanjut'}
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Tutorial">
      <div className="absolute inset-0" />
      {box ? (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-[var(--sun-bright)] transition-[top,left,width,height] duration-300 motion-reduce:transition-none"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            boxShadow: '0 0 0 9999px rgba(24,22,0,0.7)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(24,22,0,0.7)]" />
      )}

      {box && mobile ? (
        <ScrollBox
          resetKey={i}
          className="absolute inset-x-3 overflow-y-auto rounded-2xl bg-[var(--white)] p-5 text-[var(--ink)] shadow-2xl"
          style={{ top: 68, maxHeight: 'calc(50vh - 80px)' }}
        >
          {content}
        </ScrollBox>
      ) : placed ? (
        <div
          className="absolute overflow-y-auto rounded-2xl bg-[var(--white)] p-6 text-[var(--ink)] shadow-2xl"
          style={{
            top: cardTop,
            left: cardLeft,
            width: CARD_W,
            maxHeight: `calc(100vh - ${cardTop + 16}px)`,
          }}
        >
          {content}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-end justify-center md:items-center">
          <div className="sheet-in relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--white)] p-6 text-[var(--ink)] shadow-2xl md:max-w-lg md:rounded-2xl">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}
