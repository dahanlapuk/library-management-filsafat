import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uuid,
  unique,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// ── ENUMS ────────────────────────────────────────────────────────
export const memberRoleEnum = pgEnum('member_role', ['mahasiswa', 'dosen'])
// Jenjang cuma relevan buat mahasiswa (S1/S2/S3) -- null buat dosen. Dipakai
// buat filter di halaman admin members (jenjang S1/S2/S3, atau "Dosen" yang
// sebenarnya query-nya role='dosen', bukan filter kolom ini).
export const memberJenjangEnum = pgEnum('member_jenjang', ['S1', 'S2', 'S3'])
export const categoryGroupingEnum = pgEnum('category_grouping', ['bentuk', 'konten', 'lain'])

// ── ADMIN (identitas terhubung ke Supabase Auth) ────────────────
// id di sini SAMA dengan auth.users.id — bukan bikin sistem auth sendiri lagi
export const adminProfiles = pgTable('admin_profiles', {
  id: uuid('id').primaryKey(), // = auth.users.id
  nama: text('nama').notNull(),
  nickname: text('nickname'),
  email: text('email').notNull(),
  role: text('role').notNull().default('admin'),
  title: text('title'),
  isSuperadmin: boolean('is_superadmin').notNull().default(false),
  isApproved: boolean('is_approved').notNull().default(false),
  noWhatsapp: text('no_whatsapp'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ── CATEGORIES ───────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  nama: text('nama').notNull().unique(),
  grouping: categoryGroupingEnum('grouping'),
})

// ── POSISI (rak) ─────────────────────────────────────────────────
export const posisi = pgTable('posisi', {
  id: serial('id').primaryKey(),
  kode: text('kode').notNull().unique(), // 'A1', 'B3', dst
  rak: text('rak').notNull(),
  deskripsi: text('deskripsi'),
  // Kolom tambahan dari V1 (ditemukan lewat introspeksi live DB, bukan ada
  // di schema.sql yang usang) -- semua keisi penuh di data V1, wajib
  // dipertahankan.
  rakNo: integer('rak_no'),
  baris: text('baris'),
  kolomNo: integer('kolom_no'),
  letak: text('letak'),
})

// ── BOOKS ────────────────────────────────────────────────────────
export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  kode: text('kode'), // boleh kosong, sesuai V1 (49% buku tanpa kode)
  judul: text('judul').notNull(),
  penulis: text('penulis'),
  tahun: integer('tahun'),
  kategoriId: integer('kategori_id').references(() => categories.id, { onDelete: 'set null' }),
  posisiId: integer('posisi_id').references(() => posisi.id, { onDelete: 'set null' }),
  qty: integer('qty').notNull().default(1),
  keterangan: text('keterangan'),
  lastChecked: timestamp('last_checked'),
  checkedBy: text('checked_by'),
  // Catatan opsional saat inventory check -- diisi kalau ada
  // ketidaksesuaian (tidak ditemukan di rak manapun, ternyata sedang
  // dipinjam informal, dll). Ditimpa/dikosongkan tiap kali dicek ulang,
  // BUKAN histori penuh (audit trail lengkap masih Fase 3).
  lastCheckCatatan: text('last_check_catatan'),
  createdBy: uuid('created_by').references(() => adminProfiles.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => adminProfiles.id, { onDelete: 'set null' }),
  // Snapshot nama admin dari V1 -- createdBy/updatedBy (FK di atas) di-NULL
  // untuk data migrasi karena ID admin integer V1 tidak bisa dipetakan ke
  // UUID Supabase Auth V2. Kolom ini menyimpan nama aslinya sebagai jejak
  // historis, meski tidak bisa di-link ke akun admin V2 manapun.
  legacyCreatedByNama: text('legacy_created_by_nama'),
  legacyUpdatedByNama: text('legacy_updated_by_nama'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Tag tambahan per buku (many-to-many, terpisah dari kategoriId utama)
export const bookCategories = pgTable(
  'book_categories',
  {
    bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => [unique().on(t.bookId, t.categoryId)],
)

// Stok buku per-posisi — INI business rule paling penting dari V1, jangan disederhanakan
export const bookStockLocations = pgTable(
  'book_stock_locations',
  {
    id: serial('id').primaryKey(),
    bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
    posisiId: integer('posisi_id').references(() => posisi.id, { onDelete: 'set null' }),
    qty: integer('qty').notNull().default(0),
  },
  (t) => [unique().on(t.bookId, t.posisiId)],
)

// ── MEMBERS (mahasiswa/dosen) ────────────────────────────────────
// authUserId sengaja nullable — sekarang cuma dicatat admin, tapi kalau nanti
// mereka boleh login sendiri, tinggal isi kolom ini tanpa migrasi ulang skema
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  nama: text('nama').notNull(),
  role: memberRoleEnum('role').notNull(),
  // jenjang & angkatan cuma diisi buat role='mahasiswa' -- null buat dosen.
  // Dipakai buat search & filter di halaman admin members.
  jenjang: memberJenjangEnum('jenjang'),
  angkatan: integer('angkatan'),
  whatsapp: text('whatsapp'),
  email: text('email'),
  authUserId: uuid('auth_user_id'), // FK ke auth.users, diisi nanti kalau perlu
  createdAt: timestamp('created_at').defaultNow(),
})

// ── LOANS ────────────────────────────────────────────────────────
export const loans = pgTable('loans', {
  id: serial('id').primaryKey(),
  // set null (bukan cascade) -- histori peminjaman HARUS tetap ada meski
  // bukunya sudah dihapus (lihat diskusi CRUD buku Fase 2). bookJudulSnapshot
  // diisi pas loan dibuat, supaya histori tetap terbaca walau bookId null.
  bookId: integer('book_id').references(() => books.id, { onDelete: 'set null' }),
  bookJudulSnapshot: text('book_judul_snapshot'),
  memberId: integer('member_id').notNull().references(() => members.id, { onDelete: 'restrict' }),
  tanggalPinjam: date('tanggal_pinjam').defaultNow().notNull(),
  // Untuk mahasiswa: diisi otomatis = jam tutup perpus hari itu. Untuk dosen: null/lebih panjang.
  dueAt: timestamp('due_at'),
  tanggalKembali: date('tanggal_kembali'), // null = masih dipinjam
  catatan: text('catatan'),
  dicatatOleh: uuid('dicatat_oleh').references(() => adminProfiles.id, { onDelete: 'set null' }),
  // Chat WhatsApp pickup: opsional & independen, TIDAK nge-gate alur
  // pengembalian, bisa diklik/resend kapan saja -- cuma catatan kapan
  // terakhir dikirim.
  pickupNotifiedAt: timestamp('pickup_notified_at'),
  // Dua tahap alur reminder pengembalian: returnReminderStartedAt diisi
  // begitu admin klik "Konfirmasi Pengembalian" (belum kirim WA apa pun),
  // returnNotifiedAt diisi setelah admin benar-benar kirim pesan reminder.
  returnReminderStartedAt: timestamp('return_reminder_started_at'),
  returnNotifiedAt: timestamp('return_notified_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const loanStockAllocations = pgTable('loan_stock_allocations', {
  id: serial('id').primaryKey(),
  loanId: integer('loan_id').notNull().references(() => loans.id, { onDelete: 'cascade' }),
  // set null, bukan cascade -- baris ini bagian dari histori loan (lewat
  // loanId), jangan ikut lenyap kalau bukunya dihapus terpisah dari loan.
  bookId: integer('book_id').references(() => books.id, { onDelete: 'set null' }),
  posisiId: integer('posisi_id').references(() => posisi.id, { onDelete: 'set null' }),
  qty: integer('qty').notNull().default(1),
  allocatedAt: timestamp('allocated_at').defaultNow(),
  returnedAt: timestamp('returned_at'),
})

// ── ACTIVITY LOGS (data historis dari V1, migrasi Fase 1) ────────
// Tabel ini menyimpan histori dari V1 apa adanya. Logic activity-log V2
// yang BARU (dengan identitas aktor dari sesi tervalidasi, bukan trust
// client seperti V1) dibangun terpisah di Fase 3 -- tabel ini sementara
// murni untuk arsip data lama.
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  adminId: uuid('admin_id').references(() => adminProfiles.id, { onDelete: 'set null' }),
  adminNama: text('admin_nama').notNull().default('System'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: integer('entity_id'),
  entityName: text('entity_name'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ── RELATIONS (buat query type-safe pakai db.query.*) ────────────
export const booksRelations = relations(books, ({ one, many }) => ({
  kategori: one(categories, { fields: [books.kategoriId], references: [categories.id] }),
  posisi: one(posisi, { fields: [books.posisiId], references: [posisi.id] }),
  tags: many(bookCategories),
  stockLocations: many(bookStockLocations),
  loans: many(loans),
}))

export const loansRelations = relations(loans, ({ one, many }) => ({
  book: one(books, { fields: [loans.bookId], references: [books.id] }),
  member: one(members, { fields: [loans.memberId], references: [members.id] }),
  allocations: many(loanStockAllocations),
}))

export const membersRelations = relations(members, ({ many }) => ({
  loans: many(loans),
}))
// ── DELETE REQUESTS (pengajuan hapus buku) ────────────────────────
// Admin biasa tidak boleh hapus buku langsung (lihat guard di
// src/books/admin.ts) -- mereka cuma bisa MENGAJUKAN, superadmin yang
// approve/reject. Approve memanggil ulang logic hapus yang sama persis
// dengan deleteBook (bukan jalur terpisah), jadi tidak ada state
// "approved tapi bukunya masih ada".
export const deleteRequestStatusEnum = pgEnum('delete_request_status', [
  'pending',
  'approved',
  'rejected',
])

export const deleteRequests = pgTable(
  'delete_requests',
  {
    id: serial('id').primaryKey(),
    // set null, bukan cascade -- baris pengajuan (alasan, siapa mengajukan,
    // siapa approve/reject, kapan) HARUS tetap ada sebagai audit trail
    // meski approve-nya berujung buku itu dihapus. bookJudulSnapshot
    // diisi pas pengajuan dibuat, biar tetap terbaca walau bookId null.
    bookId: integer('book_id').references(() => books.id, { onDelete: 'set null' }),
    bookJudulSnapshot: text('book_judul_snapshot').notNull(),
    alasan: text('alasan').notNull(),
    status: deleteRequestStatusEnum('status').notNull().default('pending'),
    requestedBy: uuid('requested_by').notNull().references(() => adminProfiles.id, { onDelete: 'set null' }),
    reviewedBy: uuid('reviewed_by').references(() => adminProfiles.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    // Satu buku cuma boleh punya SATU pengajuan hapus yang masih pending
    // di satu waktu -- dicegah lewat partial unique index (WHERE status
    // = 'pending'), bukan cek manual di server function, supaya aman
    // dari race condition kalau dua admin submit nyaris bersamaan.
    // Drizzle pg-core belum dukung partial index lewat builder biasa,
    // jadi ditulis manual lewat sql`` di uniqueIndex.
    uniqueIndex('delete_requests_one_pending_per_book')
      .on(t.bookId)
      .where(sql`${t.status} = 'pending'`),
  ],
)

// ── CATEGORY REQUESTS (pengajuan kategori baru) ───────────────────
// Sama pola dengan delete_requests: admin biasa tidak bisa langsung
// nambah kategori (lihat guard requireApprovedAdmin di requestCategory
// di admin.ts), cuma bisa MENGAJUKAN nama kategori baru. Superadmin
// approve/reject. Approve = insert beneran ke categories dalam
// transaksi yang sama (bukan jalur terpisah), supaya tidak ada state
// "approved tapi kategorinya belum ada".
export const categoryRequestStatusEnum = pgEnum('category_request_status', [
  'pending',
  'approved',
  'rejected',
])

export const categoryRequests = pgTable(
  'category_requests',
  {
    id: serial('id').primaryKey(),
    nama: text('nama').notNull(),
    alasan: text('alasan'),
    status: categoryRequestStatusEnum('status').notNull().default('pending'),
    requestedBy: uuid('requested_by').notNull().references(() => adminProfiles.id, { onDelete: 'set null' }),
    reviewedBy: uuid('reviewed_by').references(() => adminProfiles.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at'),
    // Diisi pas approve, nyambung ke kategori yang beneran dibuat --
    // buat jejak/traceability, bukan buat query rutin.
    createdCategoryId: integer('created_category_id').references(() => categories.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    // Cegah pengajuan nama yang sama dobel selagi masih pending --
    // partial unique index, pola sama seperti delete_requests.
    uniqueIndex('category_requests_one_pending_per_nama')
      .on(t.nama)
      .where(sql`${t.status} = 'pending'`),
  ],
)

// ── LOAN REQUESTS (pengajuan peminjaman dari mahasiswa/dosen) ─────
// Diisi PUBLIK lewat modal detail buku di katalog (tanpa login) --
// bukan admin yang input. Petugas approve/reject manual di admin panel
// setelah peminjam konfirmasi tatap muka (lihat alur di pengumuman
// resmi). TIDAK pakai partial-unique-per-book seperti delete/category
// request, karena satu buku (qty > 1) boleh punya beberapa pengajuan
// pending sekaligus dari peminjam berbeda.
//
// Approve = transaksi: cek canCreateLoan (reuse src/loans/allocation.ts
// apa adanya) -> insert members baru dari snapshot data form ini ->
// insert loans (dueAt: mahasiswa = jam tutup hari itu, dosen = +14 hari)
// -> insert loan_stock_allocations (posisi dari allocateFromLargestStock)
// -> update status jadi approved + isi createdMemberId/createdLoanId.
export const loanRequestStatusEnum = pgEnum('loan_request_status', [
  'pending',
  'approved',
  'rejected',
])

export const loanRequests = pgTable('loan_requests', {
  id: serial('id').primaryKey(),
  // set null, bukan cascade -- baris pengajuan (siapa minjem, kapan,
  // disetujui siapa) HARUS tetap ada sebagai audit trail meski bukunya
  // nanti dihapus. bookJudulSnapshot diisi pas pengajuan dibuat, biar
  // tetap terbaca walau bookId null.
  bookId: integer('book_id').references(() => books.id, { onDelete: 'set null' }),
  bookJudulSnapshot: text('book_judul_snapshot').notNull(),
  namaPeminjam: text('nama_peminjam').notNull(),
  role: memberRoleEnum('role').notNull(),
  // jenjang & angkatan cuma diisi kalau role='mahasiswa' -- dipilih
  // sendiri sama peminjam di form publik, diverifikasi manual sama
  // petugas pas konfirmasi tatap muka (bukan validasi sistem).
  jenjang: memberJenjangEnum('jenjang'),
  angkatan: integer('angkatan'),
  whatsapp: text('whatsapp').notNull(),
  email: text('email'),
  keperluan: text('keperluan'),
  status: loanRequestStatusEnum('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => adminProfiles.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  // Diisi pas approve -- traceability ke member & loan yang beneran
  // dibuat, pola sama seperti createdCategoryId di category_requests.
  createdMemberId: integer('created_member_id').references(() => members.id, { onDelete: 'set null' }),
  createdLoanId: integer('created_loan_id').references(() => loans.id, { onDelete: 'set null' }),
  // Diisi pas admin reject -- alasan wajib ditulis admin (bukan dari
  // peminjam), ditampilkan di pesan WhatsApp reject yang bisa diedit.
  rejectionAlasan: text('rejection_alasan'),
  rejectionNotifiedAt: timestamp('rejection_notified_at'),
  createdAt: timestamp('created_at').defaultNow(),
})
