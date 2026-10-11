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
      },
      {
        "hash": "79a543a",
        "pesan": "Login: pesan jelas untuk email belum dikonfirmasi dan rate limit, bukan selalu 'Password salah'"
      },
      {
        "hash": "d9cabeb",
        "pesan": "Alias /login ke /admin/login, halaman 404 (notFoundComponent di root)"
      },
      {
        "hash": "4a36af2",
        "pesan": "Alias /login, halaman 404, footer (menu, link admin, kredit Hexadev Technologies)"
      },
      {
        "hash": "1c777e9",
        "pesan": "Rebrand: Biblioteka Departemen Filsafat UI (heading, title tab, login, AdminHeader), hapus link admin di bawah katalog, footer: Koleksi Buku"
      }
    ]
  },
  "2.2.0": {
    "tanggal": "2026-09-23",
    "dari": "2.1.0",
    "commits": [
      {
        "hash": "ad7c9bf",
        "pesan": "Maintenance mode: redirect semua route ke /maintenance via env var MAINTENANCE_MODE"
      },
      {
        "hash": "d7e5455",
        "pesan": "Fix: redirect keluar dari /maintenance saat MAINTENANCE_MODE dimatikan"
      },
      {
        "hash": "eb17aab",
        "pesan": "feat(catalog): SSR title/meta per buku via loader+head untuk SEO"
      },
      {
        "hash": "f1f9645",
        "pesan": "feat: 301 redirect domain default vercel.app ke biblioteka.filsafatui.app"
      },
      {
        "hash": "935776e",
        "pesan": "feat(seo): robots.txt statis + sitemap.xml dinamis per-buku"
      },
      {
        "hash": "7388ddd",
        "pesan": "feat(inventory): search buku lintas rak di halaman inventory check"
      },
      {
        "hash": "e14f3df",
        "pesan": "fix(books): unwrap DrizzleQueryError.cause.code saat cek unique_violation pending delete-request"
      },
      {
        "hash": "c4dea1b",
        "pesan": "fix(books): remount BookForm saat data edit selesai di-refetch"
      }
    ]
  },
  "2.2.1": {
    "tanggal": "2026-10-01",
    "dari": "2.2.0",
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
    "dari": "2.2.1",
    "commits": [
      {
        "hash": "f990f40",
        "pesan": "chore: upgrade TanStack Start to patched version (CVE-2026-102989), align router-core"
      },
      {
        "hash": "97a42cb",
        "pesan": "update message on maintenance mode"
      },
      {
        "hash": "fa57ed4",
        "pesan": "fix: natural sort judul, urutan fisik rak, toggle urutan di inventory check"
      },
      {
        "hash": "de18d07",
        "pesan": "feat: maintenance katalog-saja dengan persetujuan superadmin"
      }
    ]
  },
  "2.4.0": {
    "tanggal": "2026-10-10",
    "dari": "2.3.0",
    "commits": [
      {
        "hash": "1c0a157",
        "pesan": "feat: pohon kategori, kelola kategori, kategorisasi massal, form buku"
      },
      {
        "hash": "9fdbdf6",
        "pesan": "feat: filter kategori publik berbentuk pohon, sembunyikan tag"
      },
      {
        "hash": "ff4059a",
        "pesan": "refactor: jalur kategori di kartu dan daftar, hapus komentar berlebih"
      },
      {
        "hash": "b5b6103",
        "pesan": "feat: daftar kategori katalog publik diciutkan di mobile"
      }
    ]
  },
  "2.5.0": {
    "tanggal": "2026-10-10",
    "dari": "2.4.0",
    "commits": [
      {
        "hash": "cb29f1b",
        "pesan": "feat: seo dasar (lang id, canonical, og, nosnippet footer)"
      },
      {
        "hash": "017be84",
        "pesan": "feat: halaman informasi biblioteka + seo nama alternatif"
      },
      {
        "hash": "9fa859a",
        "pesan": "feat: reset password mandiri, halaman lupa/reset password, alias /signin /signup /forgot-password"
      },
      {
        "hash": "28753d4",
        "pesan": "feat: tautan reset password yang sudah dipakai atau kedaluwarsa langsung ditolak saat halaman dibuka"
      },
      {
        "hash": "cafd254",
        "pesan": "docs: prosedur darurat lupa password mengikuti alur reset mandiri"
      }
    ]
  },
  "2.6.0": {
    "tanggal": "2026-10-10",
    "dari": "2.5.0",
    "commits": [
      {
        "hash": "d0f8a0f",
        "pesan": "Install Vercel Web Analytics"
      },
      {
        "hash": "d952f28",
        "pesan": "chore: seragamkan nama Biblioteka (Filsafat UI) di UI dan perpendek judul/deskripsi SEO beranda dan informasi"
      },
      {
        "hash": "fa12647",
        "pesan": "feat: logo png (favicon, apple-touch-icon, og:image 1200x630), hapus favicon.svg jpeg-berbungkus-svg dan drizzle.svg"
      },
      {
        "hash": "3d13661",
        "pesan": "docs: hapus komentar deleteBook yang keliru (loans.book_id set null, bukan cascade)"
      },
      {
        "hash": "fda4309",
        "pesan": "fix: requested_by di category_requests dan delete_requests nullable (selaras FK set null)"
      },
      {
        "hash": "8753666",
        "pesan": "feat: label bahasa Indonesia untuk kode aksi di halaman activity"
      },
      {
        "hash": "10da019",
        "pesan": "chore: npm audit fix (tanpa --force)"
      }
    ]
  },
  "2.7.0": {
    "tanggal": "2026-10-10",
    "dari": "2.6.0",
    "commits": [
      {
        "hash": "8311a4c",
        "pesan": "feat: ganti email di profil (konfirmasi ke alamat baru, password wajib, sinkron admin_profiles)"
      },
      {
        "hash": "49ed75d",
        "pesan": "fix: ganti email lewat client terisolasi (token tanpa pkce, bisa ditukar di server)"
      },
      {
        "hash": "064d5c2",
        "pesan": "docs: pangkas komentar guards dan loan/maintenance requests"
      },
      {
        "hash": "9379cd2",
        "pesan": "feat: role developer (kolom is_developer, requireDeveloper)"
      },
      {
        "hash": "2c5ae71",
        "pesan": "feat: request fitur admin (tiket ke developer, role developer)"
      }
    ]
  },
  "2.8.0": {
    "tanggal": "2026-10-10",
    "dari": "2.7.0",
    "commits": [
      {
        "hash": "288cd67",
        "pesan": "feat: skema feedback publik (feedback, feedback_votes), RLS feature_requests dicatat di skema"
      },
      {
        "hash": "4713e3f",
        "pesan": "feat: submitFeedback (publik; honeypot, pembatas 3/jam per ip_hash, validasi zod)"
      },
      {
        "hash": "b5161f5",
        "pesan": "feat: fungsi admin feedback (daftar, vote, status, teruskan jadi request fitur)"
      },
      {
        "hash": "61c1bd6",
        "pesan": "feat: halaman publik /feedback, tautan dari modal buku dan footer"
      },
      {
        "hash": "7f647a4",
        "pesan": "fix: pembatas feedback gagal-tertutup saat IP tidak terbaca (bucket unknown 20/jam), log nama header untuk diagnosis"
      },
      {
        "hash": "c9fda55",
        "pesan": "chore: sederhanakan log IP tak terbaca di submitFeedback"
      },
      {
        "hash": "d6da3ce",
        "pesan": "feat: halaman admin /admin/feedback (daftar, vote, status, teruskan jadi request), warna status"
      }
    ]
  }
}
