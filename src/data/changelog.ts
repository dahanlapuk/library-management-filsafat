export const REPO_URL = 'https://github.com/dahanlapuk/library-management-filsafat'

export type Rilis = {
  versi: string
  judul: string
  ringkas: string[]
  teknis: string[]
  fitur?: boolean
}

export const RILIS: Rilis[] = [
  {
    versi: '2.12.1',
    judul: 'Buku tanpa eksemplar tampil Tidak tersedia',
    ringkas: [
      'Buku yang eksemplarnya tidak tercatat atau tidak ditemukan di rak kini tampil Tidak tersedia, bukan Dipinjam.',
      'Buku yang tidak tersedia tidak lagi menampilkan tombol pengajuan pinjam dan tidak muncul di filter Tersedia.',
      'Daftar buku di admin memakai penandaan yang sama.',
    ],
    teknis: [
      'isDipinjam di src/books/catalog.ts kini mensyaratkan qty > 0. Ditambah field tidakTersedia (qty <= 0) yang dipakai StatusBadge, LoanRequestSection, dan daftar buku admin.',
      'Filter Tersedia memakai qty > 0 dan sisa > 0. Tanpa migrasi skema.',
    ],
  },
  {
    versi: '2.12.0',
    judul: 'Tampilan baru Biblioteka: lebih lembut dan lebih nyaman di HP',
    fitur: true,
    ringkas: [
      'Seluruh halaman publik (katalog, informasi, kritik dan saran, changelog) tampil dengan gaya baru yang sejalan dengan situs Departemen Filsafat UI: warna krem dan kuning, huruf baru, dan sudut yang membulat.',
      'Kolom cari kini besar di bagian atas katalog. Di HP, kategori dibuka lewat tombol Kategori yang menampilkan daftarnya dari bawah layar.',
      'Detail buku ditata ulang: kode, jumlah eksemplar, dan posisi rak dikelompokkan dalam satu bidang. Judul yang panjang tidak lagi terpotong.',
      'Halaman katalog tidak lagi melompat ke atas setelah membaca detail buku, jadi kamu tetap di posisi semula.',
      'Kartu buku lebih ringkas di HP, ada pilihan 10 buku per halaman, dan saat memuat tampil kartu kosong berdenyut.',
      'Jenis masukan Saran kini bernama Kritik dan saran.',
    ],
    teknis: [
      'Token warna dan huruf di src/styles.css; Inter dan Source Serif 4 dipasang lokal lewat fontsource, tanpa Google Fonts. Nama variabel lama dipetakan ke token baru sehingga halaman admin ikut berubah warna.',
      'src/routes/index.tsx dipecah ke src/components/catalog/ (BookCard, BookDetailModal, CategoryTree, StatusBadge, BookTags, dan lainnya).',
      'Posisi scroll dipertahankan saat modal buku dibuka dan ditutup (resetScroll: false). Lebar tata letak standar 1280px.',
      'Jenis feedback saran hanya berubah label tampilan; nilai di database tidak diubah dan tidak ada migrasi.',
    ],
  },
  {
    versi: '2.11.0',
    judul: 'Lencana peran, katalog buku multi-eksemplar, dan kredit baru',
    fitur: true,
    ringkas: [
      'Buku yang punya lebih dari satu eksemplar kini tetap tampil Tersedia selama masih ada eksemplar yang belum dipinjam. Sebelumnya, begitu satu eksemplar dipinjam, seluruh buku tampil Dipinjam dan tombol pinjam tertutup.',
      'Halaman login dan header admin kini membedakan peran dengan jelas: Developer (lencana solid), Superadmin (lencana garis), dan Admin biasa (tanpa lencana).',
      'Footer memuat tautan ke situs Departemen Filsafat UI (filsafatui.app) dan kredit pengembang kini crkstudio.',
    ],
    teknis: [
      'Ketersediaan katalog dihitung dari qty dikurangi pinjaman aktif (sisa), bukan EXISTS pinjaman aktif. Data katalog publik kini membawa jumlah sisa, tanpa identitas peminjam.',
      'approveLoanRequest mengunci baris buku (SELECT ... FOR UPDATE) di dalam transaksi supaya dua persetujuan bersamaan tidak melebihi stok.',
      'Komponen PeranBadge (src/admin/PeranBadge.tsx) dengan hierarki developer, superadmin, admin; getAdminList kini menyertakan isDeveloper.',
      'Migrasi 0017: CHECK constraint developer_implies_superadmin pada admin_profiles (developer wajib superadmin).',
    ],
  },
  {
    versi: '2.10.0',
    judul: 'Email terima kasih saat buku dikembalikan',
    fitur: true,
    ringkas: [
      'Peminjam yang mengisi alamat email di formulir pinjam kini menerima ucapan terima kasih otomatis saat bukunya dikembalikan.',
      'Peminjam yang tidak mengisi email tidak terpengaruh. Email ini dikirim otomatis dan tidak perlu dibalas.',
    ],
    teknis: [
      'src/loans/thank-you.ts: email HTML dikirim lewat API pengirim email setelah transaksi returnLoan selesai. Kegagalan kirim tidak membatalkan pengembalian.',
      'Kode aksi baru di log aktivitas: LOAN_THANKYOU_SENT dan LOAN_THANKYOU_FAILED, lengkap dengan label.',
    ],
  },
  {
    versi: '2.9.0',
    judul: 'Halaman Changelog',
    fitur: true,
    ringkas: [
      'Ada halaman Changelog yang memuat riwayat perubahan, dikelompokkan per versi dan dapat dibuka satu per satu.',
      'Setiap versi menampilkan tanggal, ringkasan, dan penanda Fitur baru. Rincian teknis dan daftar commit dapat dibuka dari tiap versi.',
      'Tautan Changelog tersedia di kolom Menu pada footer.',
    ],
    teknis: [
      'Rute /changelog (noindex, tidak masuk sitemap). Data ringkasan ditulis tangan di src/data/changelog.ts; tanggal dan daftar commit dihasilkan dari tag git lewat scripts/changelog-git.mjs.',
      'Penomoran versi kini mengikuti deploy produksi: tiap deploy mendapat tag, 45 tag lama diganti dan riwayat dari v2.0.0 sampai v2.8.6 dinomori ulang.',
    ],
  },
  {
    versi: '2.8.6',
    judul: 'Data changelog dan perapian',
    ringkas: ['Persiapan halaman changelog dan perapian kode. Tidak ada perubahan tampilan.'],
    teknis: [
      'Data changelog (ringkasan dan daftar commit per rilis) beserta skrip generator dari tag git.',
      'Komentar berlebih di schema.ts dipangkas.',
    ],
  },
  {
    versi: '2.8.5',
    judul: 'Halaman admin Feedback Publik',
    fitur: true,
    ringkas: [
      'Admin membaca kiriman di halaman Feedback Publik, lengkap dengan status berwarna.',
      'Saran yang didukung dua admin naik menjadi perlu perhatian, lalu superadmin dapat meneruskannya sebagai request fitur.',
    ],
    teknis: [
      'Halaman /admin/feedback: daftar, vote, ubah status, dan teruskan menjadi request fitur. Menu Kelola mendapat tautan Feedback Publik.',
      'Kode aksi log: FEEDBACK_VOTE, FEEDBACK_STATUS, FEEDBACK_PROMOTE. Log IP yang tidak terbaca disederhanakan.',
    ],
  },
  {
    versi: '2.8.4',
    judul: 'Pembatas feedback tetap bekerja saat alamat tidak terbaca',
    ringkas: ['Pembatas kiriman feedback tidak lagi terlewati ketika alamat pengunjung tidak dapat dibaca.'],
    teknis: ['Pembatas gagal-tertutup: alamat yang tidak terbaca masuk satu bucket bersama dengan batas tersendiri, bukan dilewati.'],
  },
  {
    versi: '2.8.3',
    judul: 'Halaman Kirim Feedback',
    fitur: true,
    ringkas: [
      'Pengunjung dapat mengirim saran, koreksi data buku, atau usul buku lewat halaman Kirim Feedback, tanpa perlu masuk.',
      'Dari halaman sebuah buku, tautan Laporkan koreksi membuka formulir dengan buku itu sudah terisi.',
    ],
    teknis: ['Halaman publik /feedback (parameter book dan jenis), tautan dari modal buku dan kolom Menu footer. Kontak pengirim opsional dan tidak ada balasan email otomatis.'],
  },
  {
    versi: '2.8.2',
    judul: 'Fungsi admin feedback',
    ringkas: ['Bagian belakang pengelolaan feedback untuk admin. Belum ada perubahan tampilan.'],
    teknis: ['Fungsi server untuk daftar, vote, ubah status, dan meneruskan saran menjadi request fitur; semuanya tercatat di log aktivitas.'],
  },
  {
    versi: '2.8.1',
    judul: 'Pengiriman feedback dengan perlindungan spam',
    ringkas: ['Bagian belakang pengiriman feedback beserta perlindungan dari spam. Belum ada perubahan tampilan.'],
    teknis: ['submitFeedback (publik): kolom jebakan tersembunyi, pembatas kiriman per IP (IP hanya disimpan sebagai hash), dan validasi panjang input.'],
  },
  {
    versi: '2.8.0',
    judul: 'Skema feedback publik',
    ringkas: ['Fondasi data untuk fitur feedback publik. Belum ada perubahan tampilan.'],
    teknis: ['Migrasi 0016: tabel feedback dan feedback_votes (RLS aktif). RLS tabel feature_requests kini tercatat di skema.'],
  },
  {
    versi: '2.7.3',
    judul: 'Request fitur untuk admin',
    fitur: true,
    ringkas: ['Ada halaman Request Fitur untuk mengirim usulan fitur atau perbaikan langsung ke developer.'],
    teknis: [
      'Migrasi 0015: tabel feature_requests. Pengirim selalu dari sesi; hanya developer yang dapat menanggapi.',
      'Kode aksi log: REQUEST_CREATE, REQUEST_UPDATE, REQUEST_DELETE, REQUEST_RESPOND.',
    ],
  },
  {
    versi: '2.7.2',
    judul: 'Peran developer',
    fitur: true,
    ringkas: ['Ada peran developer di samping admin dan superadmin.'],
    teknis: [
      'Migrasi 0014: kolom is_developer dan guard requireDeveloper.',
      'Komentar di guards dan blok request di skema dipangkas.',
    ],
  },
  {
    versi: '2.7.1',
    judul: 'Perbaikan tautan konfirmasi ganti email',
    ringkas: ['Tautan konfirmasi ganti email kini dapat dipakai dengan benar, juga dari perangkat lain.'],
    teknis: ['Permintaan ganti email lewat client Supabase terisolasi, sehingga token tidak berawalan pkce dan dapat ditukar di server.'],
  },
  {
    versi: '2.7.0',
    judul: 'Ganti email di profil',
    fitur: true,
    ringkas: ['Admin dapat mengganti email dari halaman profil. Tautan konfirmasi dikirim ke alamat yang baru.'],
    teknis: [
      'Password saat ini diverifikasi, lalu halaman /admin/confirm-email menukar token; admin_profiles.email ikut disinkronkan.',
      'Kode aksi log: EMAIL_CHANGE_REQUEST dan EMAIL_CHANGE.',
    ],
  },
  {
    versi: '2.6.5',
    judul: 'Pembaruan keamanan pustaka',
    ringkas: ['Pembaruan keamanan pada pustaka pendukung.'],
    teknis: ['npm audit fix tanpa --force.'],
  },
  {
    versi: '2.6.4',
    judul: 'Statistik kunjungan',
    ringkas: ['Statistik kunjungan situs mulai dicatat.'],
    teknis: ['Vercel Web Analytics dipasang di root aplikasi.'],
  },
  {
    versi: '2.6.3',
    judul: 'Label aksi Bahasa Indonesia di halaman Activity',
    ringkas: ['Halaman Activity menampilkan nama aksi dalam Bahasa Indonesia.'],
    teknis: ['Peta label di action-labels.ts; nilai filter tetap kode aksi asli.'],
  },
  {
    versi: '2.6.2',
    judul: 'Perbaikan skema pengajuan',
    ringkas: ['Akun admin yang pernah mengajukan permintaan kini dapat dihapus tanpa masalah.'],
    teknis: [
      'Migrasi 0013: requested_by pada category_requests dan delete_requests menjadi nullable, selaras dengan FK set null.',
      'Komentar keliru pada deleteBook diperbaiki.',
    ],
  },
  {
    versi: '2.6.1',
    judul: 'Logo dan gambar pratinjau',
    ringkas: ['Logo dan ikon baru. Tautan yang dibagikan, misalnya lewat WhatsApp, menampilkan gambar pratinjau.'],
    teknis: ['favicon-32, icon-192, apple-touch-icon, dan og-image 1200x630. favicon.svg lama (gambar JPEG yang dibungkus tag SVG) dan drizzle.svg dihapus.'],
  },
  {
    versi: '2.6.0',
    judul: 'Penyeragaman nama Biblioteka',
    ringkas: ['Nama Biblioteka Filsafat UI diseragamkan di seluruh tampilan, dan judul serta deskripsi di mesin pencari diperpendek.'],
    teknis: ['Heading, footer, dan judul serta deskripsi SEO beranda dan halaman Informasi diperbarui.'],
  },
  {
    versi: '2.5.4',
    judul: 'Prosedur darurat lupa password',
    ringkas: ['Dokumentasi prosedur darurat lupa password disesuaikan dengan fitur reset mandiri. Tidak ada perubahan tampilan.'],
    teknis: ['README memuat reset mandiri sebagai jalur utama dan dashboard Supabase sebagai jalur cadangan.'],
  },
  {
    versi: '2.5.3',
    judul: 'Tautan reset password yang tidak berlaku ditolak sejak awal',
    ringkas: ['Tautan reset password yang sudah dipakai atau kedaluwarsa langsung menampilkan pesan tidak valid, tanpa form.'],
    teknis: ['Loader halaman reset memeriksa tabel token sebelum menampilkan form; penentu akhir tetap verifikasi token saat password dikirim.'],
  },
  {
    versi: '2.5.2',
    judul: 'Reset password mandiri',
    fitur: true,
    ringkas: ['Admin yang lupa password dapat mengaturnya ulang sendiri lewat email, tanpa menunggu bantuan.'],
    teknis: [
      'Halaman lupa dan reset password; admin dipilih dari daftar nama, bukan mengetik email. Token ditukar di server saat form dikirim, dan semua sesi admin itu dicabut setelah sukses.',
      'Alias rute /signin, /signup, dan /forgot-password. Kode aksi log baru: RESET_PASSWORD_REQUEST dan RESET_PASSWORD.',
    ],
  },
  {
    versi: '2.5.1',
    judul: 'Halaman Informasi',
    fitur: true,
    ringkas: ['Halaman Informasi memuat lokasi, jam buka, cara pinjam, tata tertib, dan petugas yang bertugas hari ini.'],
    teknis: ['Data petugas dibaca dari src/data/petugas.ts. Nama alternatif perpustakaan ditambahkan untuk SEO.'],
  },
  {
    versi: '2.5.0',
    judul: 'SEO dasar',
    ringkas: ['Perpustakaan lebih mudah ditemukan di mesin pencari.'],
    teknis: ['Bahasa halaman id, canonical, Open Graph, dan nosnippet pada footer.'],
  },
  {
    versi: '2.4.2',
    judul: 'Daftar kategori diciutkan di HP',
    ringkas: ['Di HP, daftar kategori diciutkan supaya hasil buku tidak terdorong ke bawah.'],
    teknis: ['Daftar kategori katalog publik berbentuk tombol yang menutup otomatis setelah memilih; tampilan desktop tidak berubah.'],
  },
  {
    versi: '2.4.1',
    judul: 'Jalur kategori di kartu dan daftar',
    ringkas: ['Kartu dan daftar buku menampilkan jalur kategori lengkap.'],
    teknis: ['Chip kategori menampilkan jalur dari induk ke anak; komentar berlebih dihapus.'],
  },
  {
    versi: '2.4.0',
    judul: 'Pohon kategori dan kategorisasi massal',
    fitur: true,
    ringkas: [
      'Kategori buku kini berbentuk pohon: kategori utama dengan subkategori, maksimal tiga tingkat.',
      'Superadmin dapat mengelola kategori dan mengkategorikan banyak buku sekaligus. Buku boleh disimpan tanpa kategori.',
      'Di katalog, daftar kategori tampil sebagai pohon yang dapat dibuka dan ditutup.',
    ],
    teknis: [
      'Migrasi 0012: categories mendapat kind, parent_id, dan urutan; unique (kind, parent_id, nama). Kategori utama buku di books.kategori_id dan dicerminkan di book_categories; tag memakai baris dengan kind tag.',
      'Filter kategori ikut memuat turunan lewat recursive CTE. Kontrak form buku berubah dari categoryIds menjadi kategoriId dan tagIds.',
      'Kategorisasi massal maksimal 200 buku per proses. Log baru: CATEGORY_* dan BOOK_BULK_CATEGORIZE.',
    ],
  },
  {
    versi: '2.3.3',
    judul: 'Maintenance katalog-saja',
    fitur: true,
    ringkas: ['Admin dapat mengajukan maintenance yang hanya menutup katalog publik; setelah disetujui superadmin, halaman admin tetap dapat dipakai.'],
    teknis: ['Migrasi 0011: tabel maintenance_requests. Penutupan penuh lewat pengaturan server tetap berlaku dan mengalahkan pengaturan di database.'],
  },
  {
    versi: '2.3.2',
    judul: 'Urutan judul alami dan urutan rak fisik',
    fitur: true,
    ringkas: ['Judul buku diurutkan secara alami (Jilid 2 sebelum Jilid 10), dan Inventory Check dapat diurutkan menurut rak fisik atau jumlah.'],
    teknis: ['Migrasi 0010: collation natural_sort (ICU). Tombol urutan di Inventory Check.'],
  },
  {
    versi: '2.3.1',
    judul: 'Teks halaman maintenance',
    ringkas: ['Pesan di halaman maintenance diperbarui.'],
    teknis: ['Teks halaman /maintenance diubah.'],
  },
  {
    versi: '2.3.0',
    judul: 'Pembaruan keamanan',
    ringkas: ['Pembaruan keamanan pada kerangka aplikasi.'],
    teknis: ['TanStack Start dinaikkan ke versi yang sudah ditambal dan router-core diselaraskan.'],
  },
  {
    versi: '2.2.8',
    judul: 'Dokumentasi dan perapian repo',
    ringkas: ['Dokumentasi proyek ditulis ulang. Tidak ada perubahan tampilan.'],
    teknis: [
      'README diganti dengan dokumentasi proyek V2, file dump database diabaikan git, dan routeTree diregenerasi untuk rute sitemap.xml.',
    ],
  },
  {
    versi: '2.2.7',
    judul: 'Perbaikan form edit buku',
    ringkas: ['Form edit buku kini selalu menampilkan data buku yang benar setelah data selesai dimuat.'],
    teknis: ['BookForm dipasang ulang saat data edit selesai di-refetch.'],
  },
  {
    versi: '2.2.6',
    judul: 'Perbaikan pengajuan hapus buku ganda',
    ringkas: ['Buku yang sudah punya pengajuan hapus yang menunggu kini dikenali dengan benar.'],
    teknis: ['Kode error unique_violation dibaca dari DrizzleQueryError.cause saat memeriksa pengajuan hapus yang masih pending.'],
  },
  {
    versi: '2.2.5',
    judul: 'Pencarian lintas rak di Inventory Check',
    fitur: true,
    ringkas: ['Inventory Check dapat mencari buku di semua rak sekaligus.'],
    teknis: ['Pencarian buku lintas rak ditambahkan di halaman inventory check.'],
  },
  {
    versi: '2.2.4',
    judul: 'robots.txt dan sitemap',
    ringkas: ['Mesin pencari kini mendapat petunjuk halaman mana yang boleh dibaca, beserta daftar halaman setiap buku.'],
    teknis: ['robots.txt statis dan sitemap.xml dinamis yang memuat tiap buku.'],
  },
  {
    versi: '2.2.3',
    judul: 'Alamat lama dialihkan ke domain baru',
    ringkas: ['Alamat lama vercel.app kini otomatis diarahkan ke biblioteka.filsafatui.app.'],
    teknis: ['Redirect 301 dari domain bawaan Vercel ke domain utama.'],
  },
  {
    versi: '2.2.2',
    judul: 'Judul dan pratinjau per buku untuk mesin pencari',
    ringkas: ['Setiap buku punya judul dan pratinjau sendiri saat muncul di mesin pencari atau dibagikan.'],
    teknis: ['SSR title dan meta per buku lewat loader dan head pada halaman katalog.'],
  },
  {
    versi: '2.2.1',
    judul: 'Perbaikan keluar dari mode maintenance',
    ringkas: ['Pengunjung tidak lagi tertahan di halaman pemberitahuan setelah perawatan selesai.'],
    teknis: ['Redirect keluar dari /maintenance saat mode maintenance dimatikan.'],
  },
  {
    versi: '2.2.0',
    judul: 'Mode maintenance',
    fitur: true,
    ringkas: ['Situs dapat ditutup sementara untuk perawatan; pengunjung melihat halaman pemberitahuan.'],
    teknis: ['Semua rute dialihkan ke /maintenance selama mode maintenance aktif.'],
  },
  {
    versi: '2.1.4',
    judul: 'Nama Biblioteka Departemen Filsafat UI',
    ringkas: ['Nama di judul halaman, tab browser, halaman login, dan header admin diganti menjadi Biblioteka Departemen Filsafat UI.'],
    teknis: ['Heading, title tab, halaman login, dan AdminHeader diperbarui.'],
  },
  {
    versi: '2.1.3',
    judul: 'Footer',
    fitur: true,
    ringkas: ['Ada footer di semua halaman dengan menu, tautan masuk admin, dan kredit pembuat. Tautan masuk admin dipindahkan dari bawah katalog ke footer.'],
    teknis: ['Komponen Footer dengan kolom Menu, tautan admin, dan kredit.'],
  },
  {
    versi: '2.1.2',
    judul: 'Alamat pendek /login dan halaman 404',
    ringkas: ['Alamat /login membuka halaman masuk admin. Alamat yang tidak ada kini menampilkan halaman 404.'],
    teknis: ['Alias /login ke /admin/login dan notFoundComponent di root.'],
  },
  {
    versi: '2.1.1',
    judul: 'Pesan login yang lebih jelas',
    ringkas: ['Email yang belum dikonfirmasi atau terlalu banyak percobaan tidak lagi dikira salah password.'],
    teknis: ['loginErrorMessage memetakan kode error Supabase (email_not_confirmed, over_request_rate_limit) ke pesan yang jelas; kode aslinya tetap dicatat pada log LOGIN_FAILED.'],
  },
  {
    versi: '2.1.0',
    judul: 'Rebrand Perpustakaan Departemen Filsafat',
    ringkas: ['Nama dan tampilan diperbarui, dengan logo ikon di header admin.'],
    teknis: ['Judul katalog, subtitle, dan title tab diganti; favicon dan logo ikon di AdminHeader.'],
  },
  {
    versi: '2.0.1',
    judul: 'Perbaikan cookie sesi',
    ringkas: ['Perbaikan keamanan pada pengaturan cookie sesi login.'],
    teknis: ['Pengaturan cookie sesi login diperkuat pada client Supabase di sisi server.'],
  },
  {
    versi: '2.0.0',
    judul: 'Deploy pertama: log aktivitas, sesi admin, profil, halaman Activity',
    fitur: true,
    ringkas: [
      'Rilis pertama yang tayang di produksi. Seluruh pekerjaan pra-rilis (katalog, kelola buku, peminjaman, cek inventaris) ikut tayang bersama versi ini.',
      'Setiap tindakan admin tercatat di log aktivitas: siapa, kapan, dan apa. Superadmin dapat membacanya di halaman Activity.',
      'Sesi admin dibatasi 8 jam. Ada halaman profil untuk mengubah nama, nomor WhatsApp, dan password.',
    ],
    teknis: [
      'logActivity(tx, actor, entry) dipasang di 14 mutation dan ditulis dalam transaksi yang sama dengan aksinya. Aktor selalu dari sesi tervalidasi, bukan dari request body.',
      'Log autentikasi: LOGIN, LOGOUT, LOGIN_FAILED, SIGNUP_ADMIN. Batas sesi 8 jam diperiksa server lewat auth.sessions, dan rute /admin dijaga di sisi route.',
      'Migrasi 0009: kolom no_whatsapp. Halaman /admin/activity khusus superadmin dengan filter aksi dan paginasi.',
    ],
  },
  {
    versi: '2.0.0-pre.3',
    judul: 'Peminjaman, cek inventaris, pengajuan kategori',
    fitur: true,
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
    versi: '2.0.0-pre.2',
    judul: 'Katalog publik dan kelola buku',
    fitur: true,
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
    versi: '2.0.0-pre.1',
    judul: 'Fondasi: login admin dan persetujuan akun',
    fitur: true,
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
