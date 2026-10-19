export type GitRilis = {
  tanggal: string
  dari: string | null
  commits: { hash: string; pesan: string }[]
}

export const GIT_RILIS: Record<string, GitRilis> = {
  "2.0.0-pre.1": {
    "tanggal": "2026-09-15",
    "dari": null,
    "commits": [
      {
        "hash": "8fa7b11",
        "pesan": "chore: initialize V2 repository"
      },
      {
        "hash": "a6c1fdf",
        "pesan": "feat: initial drizzle schema (books, loans, members, admin_profiles)"
      },
      {
        "hash": "736ddb8",
        "pesan": "Phase 0: Supabase wiring, admin auth server functions, login flow working end-to-end"
      },
      {
        "hash": "cc9641d",
        "pesan": "Add centralized authorization guards (requireSuperadmin, requireApprovedAdmin)"
      },
      {
        "hash": "2fca997",
        "pesan": "Add admin signup + superadmin approval flow, plus shared AdminHeader with logout"
      },
      {
        "hash": "9f68a7e",
        "pesan": "Add characterization tests for V1 stock allocation logic (allocateFromLargestStock, canCreateLoan)"
      },
      {
        "hash": "1e4385f",
        "pesan": "Document V1 approve-loan-request bug (bypass allocation, no transaction) as Fase 2 design note"
      },
      {
        "hash": "985bc44",
        "pesan": "Fix missing getCurrentAdmin import in approval.ts; wire real dashboard with admin stats"
      }
    ]
  },
  "2.0.0-pre.2": {
    "tanggal": "2026-09-17",
    "dari": "2.0.0-pre.1",
    "commits": [
      {
        "hash": "16596d7",
        "pesan": "Add read-only katalog buku server functions (Fase 1)"
      },
      {
        "hash": "c0c80bc",
        "pesan": "add catalog for public, still needs to be fix and repaired"
      },
      {
        "hash": "cf2b490",
        "pesan": "Fase 1: add posisi/books legacy columns and activity_logs table for V1 data migration"
      },
      {
        "hash": "a7356f9",
        "pesan": "docs: document deliberate privacy decision — nama_peminjam not exposed in public catalog API"
      },
      {
        "hash": "cea0759",
        "pesan": "Fase 1: implement catalog UI design decisions (accent color, masthead header, sidebar search, page size dropdown)"
      },
      {
        "hash": "4a7bcd7",
        "pesan": "Fase 1: convert book detail to shareable modal (?book=id), fix category sidebar (top-N + search, drop unused grouping)"
      },
      {
        "hash": "0397519",
        "pesan": "Fase 2: CRUD buku (create/update/delete) + delete-request approval workflow"
      },
      {
        "hash": "652e8ed",
        "pesan": "Fase 1: batasi tinggi sidebar kategori dengan scroll biar tidak melebihi grid buku"
      },
      {
        "hash": "bedcf7a",
        "pesan": "Fase 1: redesign card & modal buku"
      }
    ]
  },
  "2.0.0-pre.3": {
    "tanggal": "2026-09-19",
    "dari": "2.0.0-pre.2",
    "commits": [
      {
        "hash": "392f088",
        "pesan": "Fase 2: category_requests approval workflow"
      },
      {
        "hash": "b5e3d2c",
        "pesan": "Fase 2: fitur peminjaman (loan_requests) end-to-end"
      },
      {
        "hash": "659abfb",
        "pesan": "Fix: hindari referensi 'db' di top-level type books/admin.ts"
      },
      {
        "hash": "361e82a",
        "pesan": "Fase 2: fitur inventory check"
      },
      {
        "hash": "097e01d",
        "pesan": "Fase 2: navbar admin (grouped dropdown, conditional per role) + fix responsive mobile"
      }
    ]
  },
  "2.0.0": {
    "tanggal": "2026-09-21",
    "dari": "2.0.0-pre.3",
    "commits": [
      {
        "hash": "4138c8e",
        "pesan": "Fase 3: activity-log baru (aktor dari sesi tervalidasi, ditulis dalam transaksi) di 14 mutation"
      },
      {
        "hash": "efe470f",
        "pesan": "Rapikan activity-log: cabut fallback posisi dari tabel stok (buku tanpa rak memang belum punya posisi)"
      },
      {
        "hash": "e4077e9",
        "pesan": "Fase 3: batas sesi admin 8 jam (dicek server lewat auth.sessions) + guard route /admin + redirect login + pesan error daftar admin"
      },
      {
        "hash": "a135c17",
        "pesan": "Fase 3: log LOGIN/LOGOUT/LOGIN_FAILED (maks 3/menit) + SIGNUP_ADMIN, logout scope local"
      },
      {
        "hash": "11d0b7f",
        "pesan": "Fase 3: kolom no_whatsapp di admin_profiles (migrasi 0009)"
      },
      {
        "hash": "a96e717",
        "pesan": "Fase 3: halaman profil admin (nama, WhatsApp, ganti password), id dari sesi"
      },
      {
        "hash": "adbbf3c",
        "pesan": "Signup: tampilkan pesan validasi sebagai kalimat biasa"
      },
      {
        "hash": "664207c",
        "pesan": "Fase 3: halaman /admin/activity (baca activity log, superadmin-only, filter aksi + pagination)"
      }
    ]
  },
  "2.0.1": {
    "tanggal": "2026-09-21",
    "dari": "2.0.0",
    "commits": [
      {
        "hash": "f521fc6",
        "pesan": "Fix: teruskan cookie options (httpOnly, secure) ke setCookie sesi Supabase"
      }
    ]
  },
  "2.1.0": {
    "tanggal": "2026-09-21",
    "dari": "2.0.1",
    "commits": [
      {
        "hash": "fcbf2f6",
        "pesan": "Rebrand: Perpustakaan Departemen Filsafat (judul katalog, subtitle, title tab), favicon, logo ikon di AdminHeader"
      }
    ]
  },
  "2.1.1": {
    "tanggal": "2026-09-21",
    "dari": "2.1.0",
    "commits": [
      {
        "hash": "79a543a",
        "pesan": "Login: pesan jelas untuk email belum dikonfirmasi dan rate limit, bukan selalu 'Password salah'"
      }
    ]
  },
  "2.1.2": {
    "tanggal": "2026-09-21",
    "dari": "2.1.1",
    "commits": [
      {
        "hash": "d9cabeb",
        "pesan": "Alias /login ke /admin/login, halaman 404 (notFoundComponent di root)"
      }
    ]
  },
  "2.1.3": {
    "tanggal": "2026-09-21",
    "dari": "2.1.2",
    "commits": [
      {
        "hash": "4a36af2",
        "pesan": "Alias /login, halaman 404, footer (menu, link admin, kredit Hexadev Technologies)"
      }
    ]
  },
  "2.1.4": {
    "tanggal": "2026-09-21",
    "dari": "2.1.3",
    "commits": [
      {
        "hash": "1c777e9",
        "pesan": "Rebrand: Biblioteka Departemen Filsafat UI (heading, title tab, login, AdminHeader), hapus link admin di bawah katalog, footer: Koleksi Buku"
      }
    ]
  },
  "2.2.0": {
    "tanggal": "2026-09-22",
    "dari": "2.1.4",
    "commits": [
      {
        "hash": "ad7c9bf",
        "pesan": "Maintenance mode: redirect semua route ke /maintenance via env var MAINTENANCE_MODE"
      }
    ]
  },
  "2.2.1": {
    "tanggal": "2026-09-22",
    "dari": "2.2.0",
    "commits": [
      {
        "hash": "d7e5455",
        "pesan": "Fix: redirect keluar dari /maintenance saat MAINTENANCE_MODE dimatikan"
      }
    ]
  },
  "2.2.2": {
    "tanggal": "2026-09-22",
    "dari": "2.2.1",
    "commits": [
      {
        "hash": "eb17aab",
        "pesan": "feat(catalog): SSR title/meta per buku via loader+head untuk SEO"
      }
    ]
  },
  "2.2.3": {
    "tanggal": "2026-09-22",
    "dari": "2.2.2",
    "commits": [
      {
        "hash": "f1f9645",
        "pesan": "feat: 301 redirect domain default vercel.app ke biblioteka.filsafatui.app"
      }
    ]
  },
  "2.2.4": {
    "tanggal": "2026-09-22",
    "dari": "2.2.3",
    "commits": [
      {
        "hash": "935776e",
        "pesan": "feat(seo): robots.txt statis + sitemap.xml dinamis per-buku"
      }
    ]
  },
  "2.2.5": {
    "tanggal": "2026-09-22",
    "dari": "2.2.4",
    "commits": [
      {
        "hash": "7388ddd",
        "pesan": "feat(inventory): search buku lintas rak di halaman inventory check"
      }
    ]
  },
  "2.2.6": {
    "tanggal": "2026-09-23",
    "dari": "2.2.5",
    "commits": [
      {
        "hash": "e14f3df",
        "pesan": "fix(books): unwrap DrizzleQueryError.cause.code saat cek unique_violation pending delete-request"
      }
    ]
  },
  "2.2.7": {
    "tanggal": "2026-09-23",
    "dari": "2.2.6",
    "commits": [
      {
        "hash": "c4dea1b",
        "pesan": "fix(books): remount BookForm saat data edit selesai di-refetch"
      }
    ]
  },
  "2.2.8": {
    "tanggal": "2026-10-01",
    "dari": "2.2.7",
    "commits": [
      {
        "hash": "52d2481",
        "pesan": "chore: regenerate routeTree untuk route sitemap.xml"
      },
      {
        "hash": "f235076",
        "pesan": "chore: abaikan file *.dump (backup database)"
      },
      {
        "hash": "153cb00",
        "pesan": "docs: ganti README scaffold dengan dokumentasi proyek V2"
      }
    ]
  },
  "2.3.0": {
    "tanggal": "2026-10-05",
    "dari": "2.2.8",
    "commits": [
      {
        "hash": "f990f40",
        "pesan": "chore: upgrade TanStack Start to patched version (CVE-2026-102989), align router-core"
      }
    ]
  },
  "2.3.1": {
    "tanggal": "2026-10-05",
    "dari": "2.3.0",
    "commits": [
      {
        "hash": "97a42cb",
        "pesan": "update message on maintenance mode"
      }
    ]
  },
  "2.3.2": {
    "tanggal": "2026-10-05",
    "dari": "2.3.1",
    "commits": [
      {
        "hash": "fa57ed4",
        "pesan": "fix: natural sort judul, urutan fisik rak, toggle urutan di inventory check"
      }
    ]
  },
  "2.3.3": {
    "tanggal": "2026-10-06",
    "dari": "2.3.2",
    "commits": [
      {
        "hash": "de18d07",
        "pesan": "feat: maintenance katalog-saja dengan persetujuan superadmin"
      }
    ]
  },
  "2.4.0": {
    "tanggal": "2026-10-10",
    "dari": "2.3.3",
    "commits": [
      {
        "hash": "1c0a157",
        "pesan": "feat: pohon kategori, kelola kategori, kategorisasi massal, form buku"
      },
      {
        "hash": "9fdbdf6",
        "pesan": "feat: filter kategori publik berbentuk pohon, sembunyikan tag"
      }
    ]
  },
  "2.4.1": {
    "tanggal": "2026-10-10",
    "dari": "2.4.0",
    "commits": [
      {
        "hash": "ff4059a",
        "pesan": "refactor: jalur kategori di kartu dan daftar, hapus komentar berlebih"
      }
    ]
  },
  "2.4.2": {
    "tanggal": "2026-10-10",
    "dari": "2.4.1",
    "commits": [
      {
        "hash": "b5b6103",
        "pesan": "feat: daftar kategori katalog publik diciutkan di mobile"
      }
    ]
  },
  "2.5.0": {
    "tanggal": "2026-10-10",
    "dari": "2.4.2",
    "commits": [
      {
        "hash": "cb29f1b",
        "pesan": "feat: seo dasar (lang id, canonical, og, nosnippet footer)"
      }
    ]
  },
  "2.5.1": {
    "tanggal": "2026-10-10",
    "dari": "2.5.0",
    "commits": [
      {
        "hash": "017be84",
        "pesan": "feat: halaman informasi biblioteka + seo nama alternatif"
      }
    ]
  },
  "2.5.2": {
    "tanggal": "2026-10-10",
    "dari": "2.5.1",
    "commits": [
      {
        "hash": "9fa859a",
        "pesan": "feat: reset password mandiri, halaman lupa/reset password, alias /signin /signup /forgot-password"
      }
    ]
  },
  "2.5.3": {
    "tanggal": "2026-10-10",
    "dari": "2.5.2",
    "commits": [
      {
        "hash": "28753d4",
        "pesan": "feat: tautan reset password yang sudah dipakai atau kedaluwarsa langsung ditolak saat halaman dibuka"
      }
    ]
  },
  "2.5.4": {
    "tanggal": "2026-10-10",
    "dari": "2.5.3",
    "commits": [
      {
        "hash": "cafd254",
        "pesan": "docs: prosedur darurat lupa password mengikuti alur reset mandiri"
      }
    ]
  },
  "2.6.0": {
    "tanggal": "2026-10-10",
    "dari": "2.5.4",
    "commits": [
      {
        "hash": "d952f28",
        "pesan": "chore: seragamkan nama Biblioteka (Filsafat UI) di UI dan perpendek judul/deskripsi SEO beranda dan informasi"
      }
    ]
  },
  "2.6.1": {
    "tanggal": "2026-10-10",
    "dari": "2.6.0",
    "commits": [
      {
        "hash": "fa12647",
        "pesan": "feat: logo png (favicon, apple-touch-icon, og:image 1200x630), hapus favicon.svg jpeg-berbungkus-svg dan drizzle.svg"
      }
    ]
  },
  "2.6.2": {
    "tanggal": "2026-10-10",
    "dari": "2.6.1",
    "commits": [
      {
        "hash": "3d13661",
        "pesan": "docs: hapus komentar deleteBook yang keliru (loans.book_id set null, bukan cascade)"
      },
      {
        "hash": "fda4309",
        "pesan": "fix: requested_by di category_requests dan delete_requests nullable (selaras FK set null)"
      }
    ]
  },
  "2.6.3": {
    "tanggal": "2026-10-10",
    "dari": "2.6.2",
    "commits": [
      {
        "hash": "8753666",
        "pesan": "feat: label bahasa Indonesia untuk kode aksi di halaman activity"
      }
    ]
  },
  "2.6.4": {
    "tanggal": "2026-10-10",
    "dari": "2.6.3",
    "commits": [
      {
        "hash": "d0f8a0f",
        "pesan": "Install Vercel Web Analytics"
      }
    ]
  },
  "2.6.5": {
    "tanggal": "2026-10-10",
    "dari": "2.6.4",
    "commits": [
      {
        "hash": "10da019",
        "pesan": "chore: npm audit fix (tanpa --force)"
      }
    ]
  },
  "2.7.0": {
    "tanggal": "2026-10-10",
    "dari": "2.6.5",
    "commits": [
      {
        "hash": "8311a4c",
        "pesan": "feat: ganti email di profil (konfirmasi ke alamat baru, password wajib, sinkron admin_profiles)"
      }
    ]
  },
  "2.7.1": {
    "tanggal": "2026-10-10",
    "dari": "2.7.0",
    "commits": [
      {
        "hash": "49ed75d",
        "pesan": "fix: ganti email lewat client terisolasi (token tanpa pkce, bisa ditukar di server)"
      }
    ]
  },
  "2.7.2": {
    "tanggal": "2026-10-10",
    "dari": "2.7.1",
    "commits": [
      {
        "hash": "064d5c2",
        "pesan": "docs: pangkas komentar guards dan loan/maintenance requests"
      },
      {
        "hash": "9379cd2",
        "pesan": "feat: role developer (kolom is_developer, requireDeveloper)"
      }
    ]
  },
  "2.7.3": {
    "tanggal": "2026-10-10",
    "dari": "2.7.2",
    "commits": [
      {
        "hash": "2c5ae71",
        "pesan": "feat: request fitur admin (tiket ke developer, role developer)"
      }
    ]
  },
  "2.8.0": {
    "tanggal": "2026-10-10",
    "dari": "2.7.3",
    "commits": [
      {
        "hash": "288cd67",
        "pesan": "feat: skema feedback publik (feedback, feedback_votes), RLS feature_requests dicatat di skema"
      }
    ]
  },
  "2.8.1": {
    "tanggal": "2026-10-10",
    "dari": "2.8.0",
    "commits": [
      {
        "hash": "4713e3f",
        "pesan": "feat: submitFeedback (publik; honeypot, pembatas 3/jam per ip_hash, validasi zod)"
      }
    ]
  },
  "2.8.2": {
    "tanggal": "2026-10-10",
    "dari": "2.8.1",
    "commits": [
      {
        "hash": "b5161f5",
        "pesan": "feat: fungsi admin feedback (daftar, vote, status, teruskan jadi request fitur)"
      }
    ]
  },
  "2.8.3": {
    "tanggal": "2026-10-10",
    "dari": "2.8.2",
    "commits": [
      {
        "hash": "61c1bd6",
        "pesan": "feat: halaman publik /feedback, tautan dari modal buku dan footer"
      }
    ]
  },
  "2.8.4": {
    "tanggal": "2026-10-10",
    "dari": "2.8.3",
    "commits": [
      {
        "hash": "7f647a4",
        "pesan": "fix: pembatas feedback gagal-tertutup saat IP tidak terbaca (bucket unknown 20/jam), log nama header untuk diagnosis"
      }
    ]
  },
  "2.8.5": {
    "tanggal": "2026-10-10",
    "dari": "2.8.4",
    "commits": [
      {
        "hash": "c9fda55",
        "pesan": "chore: sederhanakan log IP tak terbaca di submitFeedback"
      },
      {
        "hash": "d6da3ce",
        "pesan": "feat: halaman admin /admin/feedback (daftar, vote, status, teruskan jadi request), warna status"
      }
    ]
  },
  "2.8.6": {
    "tanggal": "2026-10-11",
    "dari": "2.8.5",
    "commits": [
      {
        "hash": "403f00f",
        "pesan": "feat: data changelog (ringkasan awam + catatan teknis) dan skrip generator daftar commit dari tag"
      },
      {
        "hash": "65f25a8",
        "pesan": "chore: changelog mengikuti skema versi v2"
      },
      {
        "hash": "488a727",
        "pesan": "chore: pangkas komentar schema.ts"
      }
    ]
  },
  "2.9.0": {
    "tanggal": "2026-10-11",
    "dari": "2.8.6",
    "commits": [
      {
        "hash": "76d1131",
        "pesan": "feat: halaman /changelog (pohon versi, noindex)"
      },
      {
        "hash": "84eab09",
        "pesan": "chore: changelog per deploy produksi (48 rilis), penanda fitur baru dan current version"
      }
    ]
  },
  "2.10.0": {
    "tanggal": "2026-10-11",
    "dari": "2.9.0",
    "commits": [
      {
        "hash": "6f20053",
        "pesan": "docs: tulis ulang README (versioning dan alur rilis); chore: entri changelog v2.9.0"
      },
      {
        "hash": "957592b",
        "pesan": "feat: email terima kasih ke peminjam saat buku dikembalikan (opsional, tanpa balasan)"
      },
      {
        "hash": "43f13a8",
        "pesan": "style: email terima kasih berbentuk HTML (seragam dengan template auth)"
      }
    ]
  },
  "2.11.0": {
    "tanggal": "2026-10-19",
    "dari": "2.10.0",
    "commits": [
      {
        "hash": "d7b4195",
        "pesan": "chore: entri changelog v2.10.0"
      },
      {
        "hash": "5593592",
        "pesan": "fix: ketersediaan katalog dihitung dari sisa eksemplar, bukan ada/tidaknya pinjaman aktif"
      },
      {
        "hash": "159e8d4",
        "pesan": "fix: kunci baris buku saat approve loan request (cegah approval bersamaan melebihi stok)"
      },
      {
        "hash": "2c04fa2",
        "pesan": "feat: lencana peran Developer/Superadmin dibedakan di halaman login dan header admin"
      },
      {
        "hash": "de7e98d",
        "pesan": "feat: constraint database developer wajib superadmin (migrasi 0017)"
      },
      {
        "hash": "295057c",
        "pesan": "feat: kredit footer dan README jadi crkstudio, tautan balik ke filsafatui.app"
      }
    ]
  }
}
