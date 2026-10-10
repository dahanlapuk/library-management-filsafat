import { Link, createFileRoute } from '@tanstack/react-router'
import { hariIniJakarta, petugasHariIni } from '../data/petugas'

const SITE_URL = 'https://biblioteka.filsafatui.app'
const LOKASI_UTAMA =
  'Gedung VII Anton M. Moeliono, Fakultas Ilmu Pengetahuan Budaya, Universitas Indonesia'
const LOKASI_RINCI =
  'Ruang Departemen Filsafat, Lantai 2. Area membaca berada di Lantai 1.'
const LOKASI_KODE = 'JRPG+HXF, Pondok Cina, Beji, Depok City, West Java 16424'
const DENDA_BAWA_PULANG = 'Rp10.000'
const PETA_URL =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('JRPG+HXF Pondok Cina Beji Depok')
const EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d623.2904048908243!2d106.82759907468105!3d-6.363615638894296!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69ed70f829e267%3A0xf1afc899c6f74111!2sDepartemen%20Filsafat%2C%20Fakultas%20Ilmu%20Pengetahuan%20Budaya%2C%20Universitas%20Indonesia!5e0!3m2!1sen!2sid!4v1791622347211!5m2!1sen!2sid'

export const Route = createFileRoute('/informasi')({
  loader: () => ({ hari: hariIniJakarta() }),
  head: () => ({
    meta: [
      { title: 'Informasi Biblioteka (Perpustakaan) Filsafat UI — Lokasi, Jam Buka, Cara Pinjam' },
      {
        name: 'description',
        content:
          'Lokasi, jam operasional, alur peminjaman, dan tata tertib Biblioteka (perpustakaan) Departemen Filsafat, Fakultas Ilmu Pengetahuan Budaya, Universitas Indonesia.',
      },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}/informasi` }],
  }),
  component: InformasiPage,
})

function Blok({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--gray-200)] pt-6">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--gray-600)]">
        {judul}
      </h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed">{children}</div>
    </section>
  )
}

function InformasiPage() {
  const { hari } = Route.useLoaderData()
  const bertugas = petugasHariIni(hari)

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="border-b-4 border-[var(--black)] bg-[var(--white)] px-5 pt-10 pb-6">
        <div className="mx-auto flex max-w-[800px] flex-col gap-2">
          <Link to="/" className="text-xs uppercase tracking-[0.2em] hover:underline">
            ← Kembali ke katalog
          </Link>
          <h1 className="text-3xl font-bold uppercase tracking-[0.08em] sm:text-4xl">
            Informasi Biblioteka
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gray-600)]">
            Perpustakaan Departemen Filsafat UI
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-[800px] flex-col gap-6 px-5 py-6">

        <Blok judul="Tentang">
          <p>
            Biblioteka Departemen Filsafat UI, atau perpustakaan Departemen Filsafat FIB UI,
            menyimpan koleksi buku, jurnal, dan tugas akhir milik Departemen Filsafat,
            Fakultas Ilmu Pengetahuan Budaya, Universitas Indonesia. Seluruh koleksi dapat
            dicari di katalog daring.
          </p>
        </Blok>

        <Blok judul="Lokasi">
          <p>{LOKASI_UTAMA}</p>
          <p>{LOKASI_RINCI}</p>
          <p className="text-xs text-[var(--gray-600)]">{LOKASI_KODE}</p>
          <iframe
            src={EMBED_URL}
            title="Peta lokasi Departemen Filsafat FIB UI"
            className="mt-2 h-[350px] w-full"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <a href={PETA_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Buka di Google Maps
          </a>
        </Blok>

        <Blok judul="Jam operasional">
          <p>Senin sampai Rabu dan Jumat: 08.00-16.00 WIB.</p>
          <p>Kamis: 08.00-14.00 WIB.</p>
        </Blok>

        <Blok judul="Alur peminjaman">
          <ol className="ml-5 flex list-decimal flex-col gap-1.5">
            <li>Buka katalog, lalu cari buku atau skripsi yang diinginkan.</li>
            <li>Buka halaman buku tersebut, lalu isi data peminjaman pada formulir.</li>
            <li>Tunggu tindak lanjut dan persetujuan dari admin.</li>
            <li>Datang ke Biblioteka dan lakukan konfirmasi peminjaman kepada petugas.</li>
            <li>Petugas mengambilkan buku yang dipilih, lalu baca di area membaca.</li>
          </ol>
          <p>Tidak perlu membuat akun atau login untuk meminjam.</p>
        </Blok>

        <Blok judul="Alur pengembalian">
          <ol className="ml-5 flex list-decimal flex-col gap-1.5">
            <li>Kembalikan buku secara langsung kepada petugas.</li>
            <li>
              Jika belum selesai membaca dan ingin melanjutkan di lain hari, beri tahu
              petugas halaman terakhir yang dibaca untuk dicatat.
            </li>
          </ol>
        </Blok>

        <Blok judul="Ketentuan peminjaman">
          <ul className="ml-5 flex list-disc flex-col gap-1.5">
            <li>Khusus mahasiswa dan dosen Departemen Filsafat UI (jenjang S1, S2, dan S3).</li>
            <li>Buku hanya dapat dibaca di tempat dan tidak boleh dibawa pulang.</li>
            <li>Area membaca berada di Gedung VII Lantai 1.</li>
            <li>
              Pengajuan peminjaman ditutup satu jam sebelum jam operasional berakhir: pukul
              15.00 WIB (Senin sampai Rabu dan Jumat) dan pukul 13.00 WIB (Kamis). Area
              membaca tetap dapat digunakan sampai jam operasional berakhir.
            </li>
          </ul>
          <p className="mt-1 text-xs text-[var(--gray-600)]">
            Katalog hanya menampilkan status Tersedia atau Dipinjam. Identitas peminjam
            tidak pernah ditampilkan.
          </p>
        </Blok>

        <Blok judul="Tata tertib dan larangan">
          <ul className="ml-5 flex list-disc flex-col gap-1.5">
            <li>
              Dilarang merusak koleksi Biblioteka (melipat, mencoret, merobek, mengotori,
              atau menyelipkan pembatas yang merusak buku).
            </li>
            <li>Dilarang membuat kegaduhan.</li>
            <li>Dilarang membawa makanan dan minuman.</li>
            <li>Dilarang merokok, baik rokok konvensional maupun rokok elektrik.</li>
            <li>Dilarang membawa senjata tajam serta obat-obatan terlarang.</li>
            <li>
              Dilarang membawa pulang koleksi buku Biblioteka. Pelanggaran dikenakan denda
              sebesar {DENDA_BAWA_PULANG}.
            </li>
          </ul>
        </Blok>

        {bertugas.length > 0 && (
          <section className="border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em]">
              Hubungi petugas · bertugas hari {hari}
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {bertugas.map((p) => (
                <a key={p.nama} href={`https://wa.me/${p.wa}`} target="_blank" rel="noopener noreferrer" className="flex flex-wrap items-baseline gap-x-3 hover:underline">
                  <span className="font-semibold">{p.nama}</span>
                  <span className="text-base font-bold tracking-wide">{p.tampil}</span>
                  <span className="text-xs text-[var(--gray-600)]">WhatsApp →</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
