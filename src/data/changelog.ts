export const REPO_URL = 'https://github.com/dahanlapuk/library-management-filsafat'

export type Rilis = {
  versi: string
  judul: string
  ringkas: string[]
  teknis: string[]
}

export const RILIS: Rilis[] = [
  {
    versi: '0.11.0',
    judul: 'Feedback publik',
    ringkas: [
      'Pengunjung dapat mengirim saran, koreksi data buku, atau usul buku lewat halaman Kirim Feedback, tanpa perlu masuk.',
      'Dari halaman sebuah buku, tautan Laporkan koreksi membuka formulir dengan buku itu sudah terisi.',
      'Admin membaca kiriman di halaman Feedback Publik. Saran yang didukung dua admin naik menjadi perlu perhatian, lalu superadmin dapat meneruskannya sebagai request fitur.',
    ],
    teknis: [
      'Migrasi 0016: tabel feedback dan feedback_votes (RLS aktif). RLS tabel feature_requests kini tercatat di skema.',
      'Perlindungan spam: kolom jebakan tersembunyi, pembatas kiriman per IP (IP hanya disimpan sebagai hash), dan validasi panjang input.',
      'Fungsi admin untuk daftar, vote, ubah status, dan meneruskan saran menjadi request fitur; semuanya tercatat di log aktivitas.',
      'Kontak pengirim opsional dan tidak ada balasan email otomatis.',
    ],
  },
  {
    versi: '0.10.0',
    judul: 'Ganti email, role developer, request fitur',
    ringkas: [
      'Admin dapat mengganti email dari halaman profil. Tautan konfirmasi dikirim ke alamat yang baru.',
      'Ada peran developer, dan halaman Request Fitur untuk mengirim usulan fitur atau perbaikan langsung ke developer.',
    ],
    teknis: [
      'Ganti email: password lama diverifikasi, lalu permintaan dikirim lewat client Supabase terpisah supaya token dapat ditukar di server. Halaman /admin/confirm-email, dan admin_profiles.email ikut disinkronkan.',
      'Migrasi 0014: kolom is_developer dan guard requireDeveloper. Migrasi 0015: tabel feature_requests.',
      'Kode aksi log baru: EMAIL_CHANGE_REQUEST, EMAIL_CHANGE, REQUEST_CREATE, REQUEST_UPDATE, REQUEST_DELETE, REQUEST_RESPOND.',
    ],
  },
  {
    versi: '0.9.0',
    judul: 'Logo baru, label aksi Bahasa Indonesia, analitik kunjungan, perbaikan skema',
    ringkas: [
      'Logo dan ikon baru. Tautan yang dibagikan, misalnya lewat WhatsApp, menampilkan gambar pratinjau.',
      'Nama Biblioteka Filsafat UI diseragamkan di seluruh tampilan, dan judul serta deskripsi beranda di mesin pencari diperpendek.',
      'Halaman Activity memakai label Bahasa Indonesia, dan statistik kunjungan situs mulai dicatat.',
    ],
    teknis: [
      'Aset baru: favicon-32, icon-192, apple-touch-icon, dan og-image 1200x630. favicon.svg lama (gambar JPEG yang dibungkus tag SVG) dan drizzle.svg dihapus.',
      'Migrasi 0013: kolom requested_by pada category_requests dan delete_requests menjadi nullable, selaras dengan FK set null.',
      'Peta label aksi di action-labels.ts, Vercel Web Analytics, dan npm audit fix tanpa --force.',
      'Komentar keliru pada deleteBook diperbaiki.',
    ],
  },
  {
    versi: '0.8.0',
    judul: 'Halaman Informasi, SEO, reset password mandiri',
    ringkas: [
      'Halaman Informasi: lokasi, jam buka, cara pinjam, tata tertib, dan petugas yang bertugas hari ini.',
      'Lupa password: admin dapat mengatur ulang password sendiri lewat email. Tautan yang sudah dipakai atau kedaluwarsa langsung ditolak.',
      'Peningkatan SEO supaya perpustakaan lebih mudah ditemukan di mesin pencari.',
    ],
    teknis: [
      'SEO dasar: lang id, canonical, Open Graph, dan nosnippet pada footer; nama alternatif pada halaman Informasi.',
      'Data petugas dibaca dari src/data/petugas.ts.',
      'Alias rute /signin, /signup, dan /forgot-password. Prosedur darurat lupa password di README mengikuti alur reset mandiri.',
    ],
  },
  {
    versi: '0.7.0',
    judul: 'Pohon kategori dan kategorisasi massal',
    ringkas: [
      'Kategori buku kini berbentuk pohon: kategori utama dengan subkategori, maksimal tiga tingkat.',
      'Superadmin dapat mengelola kategori dan mengkategorikan banyak buku sekaligus. Buku boleh disimpan tanpa kategori.',
      'Di katalog, daftar kategori tampil sebagai pohon yang dapat dibuka dan ditutup, dan diciutkan di HP supaya hasil buku tidak terdorong ke bawah.',
    ],
    teknis: [
      'Migrasi 0012: categories mendapat kind, parent_id, dan urutan; unique (kind, parent_id, nama). Kategori utama buku di books.kategori_id dan dicerminkan di book_categories; tag memakai baris dengan kind tag.',
      'Filter kategori ikut memuat turunan lewat recursive CTE. Kontrak form buku berubah dari categoryIds menjadi kategoriId dan tagIds.',
      'Kategorisasi massal maksimal 200 buku per proses. Log baru: CATEGORY_* dan BOOK_BULK_CATEGORIZE. Chip kategori menampilkan jalur lengkap.',
    ],
  },
  {
    versi: '0.6.0',
    judul: 'Maintenance katalog-saja, urutan judul alami, pembaruan keamanan',
    ringkas: [
      'Admin dapat mengajukan maintenance yang hanya menutup katalog publik; setelah disetujui superadmin, halaman admin tetap dapat dipakai.',
      'Judul buku diurutkan secara alami (Jilid 2 sebelum Jilid 10), dan Inventory Check dapat diurutkan menurut rak fisik atau jumlah.',
      'Pembaruan keamanan pada kerangka aplikasi.',
    ],
    teknis: [
      'Migrasi 0010: collation natural_sort (ICU). Migrasi 0011: tabel maintenance_requests.',
      'Saklar MAINTENANCE_MODE tetap berlaku untuk penutupan penuh dan mengalahkan pengaturan di database. Teks halaman maintenance diperbarui.',
      'TanStack Start dinaikkan ke versi yang sudah ditambal dan router-core diselaraskan.',
    ],
  },
  {
    versi: '0.5.1',
    judul: 'Dokumentasi dan perapian repo',
    ringkas: ['Dokumentasi proyek ditulis ulang. Tidak ada perubahan tampilan.'],
    teknis: [
      'README diganti dengan dokumentasi proyek V2, file dump database diabaikan git, dan routeTree diregenerasi untuk rute sitemap.xml.',
    ],
  },
  {
    versi: '0.5.0',
    judul: 'Mode maintenance, SEO per buku, domain baru, pencarian lintas rak',
    ringkas: [
      'Situs dapat ditutup sementara untuk perawatan; pengunjung melihat halaman pemberitahuan.',
      'Setiap buku punya judul dan pratinjau sendiri di mesin pencari, ditambah robots.txt dan sitemap.',
      'Alamat lama vercel.app dialihkan ke biblioteka.filsafatui.app.',
      'Inventory Check dapat mencari buku lintas rak.',
    ],
    teknis: [
      'MAINTENANCE_MODE (variabel lingkungan) mengalihkan semua rute ke /maintenance.',
      'SSR title dan meta per buku lewat loader dan head, sitemap.xml dinamis, dan redirect 301 untuk domain bawaan Vercel.',
      'Perbaikan: kode error unique_violation dibaca dari DrizzleQueryError.cause, dan BookForm dipasang ulang setelah data edit selesai dimuat.',
    ],
  },
  {
    versi: '0.4.0',
    judul: 'Log aktivitas, sesi admin lebih aman, profil, nama Biblioteka',
    ringkas: [
      'Setiap tindakan admin tercatat di log aktivitas: siapa, kapan, dan apa. Superadmin dapat membacanya di halaman Activity.',
      'Sesi admin dibatasi 8 jam. Ada halaman profil untuk mengubah nama, nomor WhatsApp, dan password.',
      'Pesan login lebih jelas, ada halaman 404 dan footer, dan nama berubah menjadi Biblioteka Departemen Filsafat UI.',
    ],
    teknis: [
      'logActivity(tx, actor, entry) dipasang di 14 mutation dan ditulis dalam transaksi yang sama dengan aksinya. Aktor selalu dari sesi tervalidasi, bukan dari request body.',
      'Log autentikasi: LOGIN, LOGOUT, LOGIN_FAILED, SIGNUP_ADMIN. Batas sesi 8 jam diperiksa server lewat auth.sessions, dan rute /admin dijaga di sisi route.',
      'Migrasi 0009: kolom no_whatsapp. Perbaikan opsi cookie sesi (httpOnly, secure). Alias /login ke /admin/login.',
    ],
  },
  {
    versi: '0.3.0',
    judul: 'Peminjaman, cek inventaris, pengajuan kategori',
    ringkas: [
      'Peminjaman: mahasiswa dan dosen mengajukan dari halaman buku, lalu petugas menyetujui dan mencatat pengembalian.',
      'Cek inventaris untuk mencocokkan jumlah buku di sistem dengan yang ada di rak.',
      'Admin dapat mengajukan kategori baru untuk disetujui superadmin.',
      'Menu admin dikelompokkan, menyesuaikan peran, dan nyaman dipakai di HP.',
    ],
    teknis: [
      'Tabel loan_requests dan category_requests, alur persetujuan peminjaman, dan alokasi stok per posisi rak.',
      'Inventory check dengan koreksi jumlah yang langsung tersimpan.',
      'Navbar admin berupa dropdown berkelompok dan kondisional per peran. Perbaikan: referensi db tidak lagi berada di level atas modul books/admin.',
    ],
  },
  {
    versi: '0.2.0',
    judul: 'Katalog publik dan kelola buku',
    ringkas: [
      'Katalog publik dibuka: cari buku, saring kategori, dan buka detail buku lewat tautan yang dapat dibagikan.',
      'Admin dapat menambah dan mengubah buku; penghapusan diajukan lalu disetujui superadmin.',
      'Tampilan katalog dirancang ulang: warna aksen, header, kartu, dan jendela detail buku.',
      'Nama peminjam sengaja tidak pernah ditampilkan di katalog publik.',
    ],
    teknis: [
      'Server function katalog read-only, dan detail buku sebagai modal dengan parameter ?book=id.',
      'Kolom legacy pada posisi dan books serta tabel activity_logs untuk migrasi data V1.',
      'CRUD buku dan alur persetujuan hapus (delete_requests).',
      'Keputusan privasi: katalog publik hanya mengekspos boolean isDipinjam.',
    ],
  },
  {
    versi: '0.1.0',
    judul: 'Fondasi: login admin dan persetujuan akun',
    ringkas: [
      'Fondasi sistem V2: admin dapat mendaftar dan masuk, dan akun baru aktif setelah disetujui superadmin.',
      'Dashboard admin dengan statistik sederhana.',
    ],
    teknis: [
      'Repo V2 dimulai dengan TanStack Start, Drizzle, dan Supabase. Skema awal: books, loans, members, admin_profiles.',
      'Guard otorisasi terpusat di server: requireSuperadmin dan requireApprovedAdmin.',
      'Tes karakterisasi untuk logika alokasi stok V1 (allocateFromLargestStock, canCreateLoan). Bug approve-loan-request V1 didokumentasikan sebagai catatan desain Fase 2.',
    ],
  },
]
