import { asc, sql } from 'drizzle-orm'
import { books, posisi } from './schema'

// Judul diurutkan "natural" (angka dibaca sebagai angka): "Encyclopedia
// (2)" sebelum "Encyclopedia (10)". Collation dibuat di migrasi 0010.
export const judulUrut = sql`${books.judul} collate "public"."natural_sort"`

// Urutan fisik rak: nomor rak, baris (baris '#' paling akhir), kolom
// naik, lalu B sebelum F.
export const posisiUrut = [
  asc(posisi.rakNo),
  sql`(${posisi.baris} = '#')`,
  asc(posisi.baris),
  asc(posisi.kolomNo),
  asc(posisi.letak),
]
