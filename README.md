# Biblioteka Departemen Filsafat UI

Sistem manajemen perpustakaan untuk Program Studi Ilmu Filsafat, Fakultas Ilmu Budaya, Universitas Indonesia. Live di **[biblioteka.filsafatui.app](https://biblioteka.filsafatui.app)**.

Ini adalah **V2** — migrasi total dari sistem lama (Vue + Go + Neon) ke arsitektur baru, dikerjakan dengan pola *strangler* (bertahap per fitur, tanpa mengganggu operasional intern selama pembangunan).

## Fitur

- Katalog buku publik (baca, cari, filter kategori) tanpa perlu login
- Peminjaman: mahasiswa (baca di tempat / pinjam sampai tutup hari itu) dan dosen (bawa pulang, 14 hari)
- Alokasi stok per-lokasi rak, dengan aturan alokasi dari posisi bersisa stok terbesar
- Manajemen buku, kategori, posisi rak oleh admin
- Permintaan hapus buku & permintaan kategori baru, dengan alur persetujuan
- Inventory check (koreksi stok langsung, tanpa approval workflow)
- Login admin dengan sesi terbatas 8 jam, approval admin baru oleh superadmin
- Activity log lengkap (siapa melakukan apa, kapan) dengan identitas aktor dari sesi tervalidasi — bukan dari input client
- Halaman profil admin (ubah nama, WhatsApp, password)

## Stack

| Bagian | Teknologi |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, TanStack Router + Query, server functions) — satu aplikasi untuk frontend & backend |
| ORM / migrasi | [Drizzle ORM](https://orm.drizzle.team/) |
| Database | [Supabase](https://supabase.com/) (Postgres + Auth) |
| Auth | Supabase Auth — khusus identitas admin/staf, bukan untuk peminjam |
| Hosting | [Vercel](https://vercel.com/) (via Nitro, deploy-anywhere) |
| Testing | [Vitest](https://vitest.dev/) |

Arsitektur kode: modular monolith, satu folder per domain (`books/`, `loans/`, `members/`, `admin/`).

## Kenapa migrasi dari V1?

Sistem lama (masih bisa dilihat di [pustaka-filsafat-web](https://github.com/dahanlapuk/pustaka-filsafat-web), sudah tidak aktif dan redirect otomatis ke sini) punya beberapa masalah mendasar yang jadi alasan utama V2 dibangun:

- **Otorisasi nyaris tidak ditegakkan di server** — identitas aktor untuk activity log dipercaya dari data yang dikirim client, bukan dari sesi tervalidasi. Ini dibenahi total di V2: setiap aksi admin mencatat log di transaksi yang sama, dengan aktor selalu dari sesi server, bukan request body.
- **Alokasi stok per-posisi tidak konsisten ditegakkan** saat proses persetujuan peminjaman. V2 mem-port logic alokasi jadi pure function dengan characterization test.
- **Skema database ad hoc** — sebagian kolom ditambah lewat `ALTER TABLE` manual yang tidak pernah masuk version control. V2 pakai Drizzle sehingga skema selalu versi-terkontrol dan type-safe.

Detail audit lengkap V1 (kalau perlu referensi historis) ada di `docs/v1-audit-notes.md`.

## Menjalankan secara lokal

```bash
git clone https://github.com/dahanlapuk/library-management-filsafat.git
cd library-management-filsafat
npm install
```

Buat `.env` (jangan pakai `.env.local` — file itu bisa menang duluan saat load dan menimpa `.env` secara diam-diam):

```
DATABASE_URL=<connection string Supabase, session pooler>
SUPABASE_URL=<Project URL Supabase, bukan endpoint /rest/v1/>
SUPABASE_ANON_KEY=<anon key Supabase>
```

Jalankan migrasi & mulai dev server:

```bash
npm run db:generate   # generate migration dari schema.ts
npm run db:migrate    # terapkan ke database
npm run dev
```

Route baru wajib diikuti:

```bash
npm run generate-routes
```

## Deployment

Live di Vercel, terhubung otomatis ke branch `main`. Environment variable produksi (`DATABASE_URL` pakai **transaction pooler** Supabase, port `6543` — beda dari `.env` lokal yang pakai session pooler) diatur lewat Vercel Project Settings, bukan file.

## Prosedur darurat

**Lupa password admin:** admin membuka `/forgot-password` (atau tautan "Lupa password?" di halaman login), memilih namanya, lalu mengikuti tautan di email (berlaku 1 jam, sekali pakai). Hasilnya semua sesi admin itu dicabut dan dia login ulang dengan password baru. Kalau email tidak sampai, pengelola sistem bisa mengirim tautan yang sama dari **Supabase Dashboard → Authentication → Users → pilih akun → Send password recovery**. Setiap reset tercatat di activity log (`RESET_PASSWORD_REQUEST`, `RESET_PASSWORD`). Alurnya sama untuk superadmin. Email akun harus sama di Supabase Auth dan `admin_profiles.email`, kalau tidak, tautan terkirim ke alamat yang salah. Pastikan akses dashboard Supabase dipegang oleh lebih dari satu orang tepercaya, supaya tidak ada single point of failure kalau satu orang tidak bisa dihubungi.

## Kontribusi

Proyek ini dikelola dan dikembangkan oleh satu developer (mahasiswa Filsafat UI, bukan tim engineering formal). Prioritas desain: *maintainability* dan kesederhanaan jangka panjang di atas fitur yang canggih tapi rumit dirawat.

## Lisensi & kredit

Dibangun oleh [Hexadev Technologies](https://www.linkedin.com/in/itbamuhammad/) untuk Program Studi Ilmu Filsafat FIB UI.
