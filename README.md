# Biblioteka Departemen Filsafat UI

Sistem manajemen perpustakaan untuk Program Studi Ilmu Filsafat, Fakultas Ilmu Pengetahuan Budaya, Universitas Indonesia. Live di **[biblioteka.filsafatui.app](https://biblioteka.filsafatui.app)**. Riwayat perubahan ada di halaman [/changelog](https://biblioteka.filsafatui.app/changelog).

Ini adalah **V2**, migrasi total dari sistem lama (Vue + Go + Neon) ke arsitektur baru, dikerjakan bertahap (pola _strangler_) tanpa mengganggu operasional intern selama pembangunan.

## Fitur

**Publik (tanpa login)**

- Katalog buku: pencarian, filter kategori berbentuk pohon, halaman detail yang dapat dibagikan
- Pengajuan pinjam lewat formulir; konfirmasi tatap muka dengan petugas
- Halaman Informasi (lokasi, jam buka, cara pinjam, tata tertib, petugas hari ini)
- Kirim Feedback (saran, koreksi data buku, usul buku) dan halaman Changelog

**Admin**

- Kelola buku, kategori (pohon, kategorisasi massal), dan posisi rak
- Peminjaman dengan alokasi stok per posisi rak; peminjam dicatat sebagai anggota (mahasiswa atau dosen) dengan durasi pinjam berbeda per peran
- Inventory check (koreksi stok langsung tanpa approval)
- Pengajuan hapus buku dan kategori baru dengan persetujuan superadmin
- Mode maintenance: penutupan penuh, atau katalog-saja dengan persetujuan superadmin
- Akun: daftar dan persetujuan oleh superadmin, sesi 8 jam, profil, ganti email, reset password mandiri
- Activity log: siapa melakukan apa dan kapan, aktor selalu dari sesi tervalidasi
- Feedback publik (dibaca admin, saran bisa diteruskan) dan Request Fitur ke developer

Peran: admin, superadmin, dan developer (developer selalu juga superadmin).

## Stack

| Bagian        | Teknologi                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework     | [TanStack Start](https://tanstack.com/start) (React 19, TanStack Router + Query, server functions); satu aplikasi untuk frontend dan backend |
| ORM / migrasi | [Drizzle ORM](https://orm.drizzle.team/)                                                                                                     |
| Database      | [Supabase](https://supabase.com/) (Postgres + Auth)                                                                                          |
| Auth          | Supabase Auth, khusus identitas admin/staf, bukan peminjam                                                                                   |
| Email         | SMTP Resend lewat pengaturan Supabase (domain pengirim `mail.filsafatui.app`)                                                                |
| Hosting       | [Vercel](https://vercel.com/) (via Nitro), Vercel Web Analytics                                                                              |
| Testing       | [Vitest](https://vitest.dev/)                                                                                                                |

## Struktur kode

Modular monolith: satu folder per domain di `src/`.

- `src/admin/`: guard otorisasi, auth dan sesi, activity log, profil, reset password, ganti email
- `src/books/`, `src/loans/`, `src/requests/`, `src/feedback/`: logika per domain (server functions)
- `src/routes/`: rute (flat file, notasi titik, mis. `$bookId.edit.tsx`); layout admin = `src/routes/admin.tsx`
- `src/db/`: skema Drizzle (`schema.ts`); migrasi di `drizzle/`
- `src/data/`: data statis (petugas, changelog)
- `scripts/`: skrip bantu (generator changelog dan lainnya); `docs/`: catatan audit V1

### Konvensi

- Otorisasi hanya lewat guard server di `src/admin/guards.ts` (`requireApprovedAdmin`, `requireSuperadmin`, `requireDeveloper`). Guard di sisi route hanya lapisan UX.
- Setiap mutation admin dibungkus `db.transaction` dan memanggil `logActivity(tx, admin, {...})`; aktor dari guard, bukan dari request body.
- Tabel baru di schema: tambahkan `.enableRLS()` (deny-all; Drizzle tetap jalan karena memakai role yang melewati RLS).
- Komentar di kode seminimal mungkin; simpan hanya alasan yang tidak terlihat dari kodenya.
- Sebelum commit: `npx tsc --noEmit` harus bersih. Route baru wajib `npm run generate-routes`.

## Menjalankan secara lokal

```bash
git clone https://github.com/dahanlapuk/library-management-filsafat.git
cd library-management-filsafat
npm install
```

Buat `.env` (jangan pakai `.env.local`: file itu menang duluan saat load dan menimpa `.env` secara diam-diam):

| Variabel            | Wajib              | Keterangan                                                      |
| ------------------- | ------------------ | --------------------------------------------------------------- |
| `DATABASE_URL`      | ya                 | Connection string Supabase (lokal: session pooler)              |
| `SUPABASE_URL`      | ya                 | Project URL polos, bukan endpoint `/rest/v1/`                   |
| `SUPABASE_ANON_KEY` | ya                 | Anon key Supabase                                               |
| `FEEDBACK_IP_SALT`  | ya, untuk feedback | Garam hash IP pengirim feedback; fungsi gagal jelas bila kosong |
| `MAINTENANCE_MODE`  | tidak              | `true` menutup seluruh situs untuk perawatan                    |

```bash
npm run dev            # http://localhost:3000
npm run generate-routes
npm test
```

**Hati-hati:** `DATABASE_URL` di laptop biasanya menunjuk database produksi. Perlakukan setiap query dan migrasi sebagai tindakan pada data asli.

### Migrasi database

```bash
npm run db:generate    # buat migrasi dari schema.ts, lalu periksa SQL-nya
npm run db:migrate     # terapkan (diam bila sukses)
```

Tabel `drizzle.__drizzle_migrations` tidak bisa dijadikan bukti: verifikasi hasil migrasi lewat `information_schema` atau `pg_catalog`.

## Deployment

Live di Vercel, terhubung otomatis ke branch `main`: setiap push langsung men-deploy. Karena itu, jangan push fitur yang butuh variabel lingkungan baru sebelum variabel itu terpasang di Vercel.

Variabel produksi diatur lewat Vercel Project Settings, bukan file. `DATABASE_URL` produksi memakai **transaction pooler** Supabase (port `6543`), berbeda dari `.env` lokal. Domain dikelola di name.com. Bila domain berubah, perbarui Site URL dan Redirect URLs di Supabase.

## Versioning dan rilis

Skema: `v2.MINOR.PATCH`.

- **MAJOR (2)**: generasi sistem (V1 ke V2). Naik hanya bila arsitektur diganti total.
- **MINOR**: tema fitur baru yang terlihat pengguna. Deploy produksi pertama dari satu tema bernomor `x.y.0`.
- **PATCH**: deploy produksi berikutnya dalam tema yang sama (lanjutan, perbaikan, perapian): `x.y.1`, `x.y.2`, dan seterusnya.
- **`-pre.N`**: sebelum deploy produksi pertama.

Setiap deploy produksi yang sukses mendapat satu tag anotasi, dengan tanggal tag = waktu deploy selesai. Pengecualian: deploy yang hanya berisi pembaruan changelog atau README tidak diberi tag; commit-nya otomatis tercatat di rentang rilis berikutnya.

### Alur rilis

1. Push ke `main`, tunggu Vercel menandai deploy produksi **Ready**.
2. Pastikan commit deploy itu sama dengan `HEAD`: `git rev-parse --short=7 HEAD`.
3. Tag commit itu dengan waktu deploy (WIB):

```bash
   GIT_COMMITTER_DATE='2026-10-11T11:12:28+07:00' git tag -a v2.9.0 <hash> -m "v2.9.0: <judul>"
   git push origin v2.9.0
```

Waktu deploy ada di dashboard Vercel, atau lewat API GitHub Deployments (`/repos/dahanlapuk/library-management-filsafat/deployments`; tanpa token dibatasi 60 permintaan per jam). 4. Regenerasi daftar commit: `node scripts/changelog-git.mjs` (menulis `src/data/changelog-git.ts`; jangan diedit tangan). 5. Tambahkan entri di paling atas `RILIS` pada `src/data/changelog.ts`, lalu `npx tsc --noEmit`, commit, dan push (tanpa tag, lihat pengecualian di atas).

Entri: `ringkas` untuk bahasa awam, `teknis` untuk rincian (migrasi, tabel, rute, kode aksi), dan `fitur: true` bila rilis itu membawa fitur baru yang terlihat pengguna atau admin. Halaman changelog bersifat publik, jadi dilarang memuat nilai rahasia, nama variabel lingkungan, angka batas anti-penyalahgunaan, atau rincian celah keamanan (perbaikan keamanan ditulis umum).

## Prosedur darurat

**Lupa password admin:** admin membuka `/forgot-password` (atau tautan "Lupa password?" di halaman login), memilih namanya, lalu mengikuti tautan di email (berlaku 1 jam, sekali pakai). Hasilnya semua sesi admin itu dicabut dan dia login ulang dengan password baru. Kalau email tidak sampai, pengelola sistem bisa mengirim tautan yang sama dari **Supabase Dashboard → Authentication → Users → pilih akun → Send password recovery**. Setiap reset tercatat di activity log (`RESET_PASSWORD_REQUEST`, `RESET_PASSWORD`). Alurnya sama untuk superadmin. Email akun harus sama di Supabase Auth dan `admin_profiles.email`, kalau tidak, tautan terkirim ke alamat yang salah. Pastikan akses dashboard Supabase dipegang oleh lebih dari satu orang tepercaya, supaya tidak ada single point of failure kalau satu orang tidak bisa dihubungi.

**Situs perlu ditutup cepat:** setel `MAINTENANCE_MODE=true` di Vercel lalu redeploy. Untuk menutup katalog saja, admin mengajukan maintenance dan superadmin menyetujuinya.

## Kenapa migrasi dari V1?

Sistem lama ([pustaka-filsafat-web](https://github.com/dahanlapuk/pustaka-filsafat-web), sudah tidak aktif dan dialihkan ke sini) punya masalah mendasar:

- **Otorisasi nyaris tidak ditegakkan di server**: identitas aktor untuk log dipercaya dari data yang dikirim client. V2 selalu mengambil aktor dari sesi server.
- **Alokasi stok per posisi tidak konsisten** saat persetujuan peminjaman. V2 mem-port aturan alokasi menjadi fungsi murni dengan characterization test.
- **Skema database ad hoc**: sebagian kolom ditambah lewat `ALTER TABLE` manual di luar version control. V2 memakai Drizzle sehingga skema terkontrol versi.

Detail audit ada di `docs/v1-audit-notes.md`.

## Kontribusi, Lisensi dan Kredit

Proyek ini dikelola dan dikembangkan oleh [Itba Muhammad Kamil](https://github.com/dahanlapuk) di bawah [crkstudio](https://crkstudio.com) untuk Departemen Filsafat Fakultas Ilmu Pengetahuan Budaya Universitas Indonesia.
