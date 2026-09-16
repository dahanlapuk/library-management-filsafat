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
  jsonb,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── ENUMS ────────────────────────────────────────────────────────
export const memberRoleEnum = pgEnum('member_role', ['mahasiswa', 'dosen'])
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
  whatsapp: text('whatsapp'),
  email: text('email'),
  authUserId: uuid('auth_user_id'), // FK ke auth.users, diisi nanti kalau perlu
  createdAt: timestamp('created_at').defaultNow(),
})

// ── LOANS ────────────────────────────────────────────────────────
export const loans = pgTable('loans', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  memberId: integer('member_id').notNull().references(() => members.id, { onDelete: 'restrict' }),
  tanggalPinjam: date('tanggal_pinjam').defaultNow().notNull(),
  // Untuk mahasiswa: diisi otomatis = jam tutup perpus hari itu. Untuk dosen: null/lebih panjang.
  dueAt: timestamp('due_at'),
  tanggalKembali: date('tanggal_kembali'), // null = masih dipinjam
  catatan: text('catatan'),
  dicatatOleh: uuid('dicatat_oleh').references(() => adminProfiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const loanStockAllocations = pgTable('loan_stock_allocations', {
  id: serial('id').primaryKey(),
  loanId: integer('loan_id').notNull().references(() => loans.id, { onDelete: 'cascade' }),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
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