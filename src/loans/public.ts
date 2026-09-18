import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { books, loanRequests } from '../db/schema'

// ── SUBMIT LOAN REQUEST (publik, tanpa login) ─────────────────────
// Diisi mahasiswa/dosen langsung dari modal detail buku di katalog
// publik. TIDAK ada guard sama sekali (persis seperti getBooks) --
// verifikasi identitas peminjam dilakukan MANUAL sama petugas pas
// konfirmasi tatap muka, bukan lewat sistem. Petugas approve/reject
// lewat src/loans/admin.ts.

const submitLoanRequestSchema = z
  .object({
    bookId: z.number().int(),
    namaPeminjam: z.string().trim().min(1, 'Nama wajib diisi.'),
    role: z.enum(['mahasiswa', 'dosen']),
    // jenjang & angkatan cuma wajib buat mahasiswa -- dicek di superRefine
    // di bawah, bukan lewat .optional() polos, supaya pesan errornya jelas
    // per-field.
    jenjang: z.enum(['S1', 'S2', 'S3']).optional(),
    angkatan: z.number().int().optional(),
    whatsapp: z.string().trim().min(8, 'Nomor WhatsApp wajib diisi.'),
    email: z.string().trim().email('Format email tidak valid.').optional().or(z.literal('')),
    keperluan: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'mahasiswa') {
      if (!data.jenjang) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['jenjang'],
          message: 'Jenjang wajib diisi untuk mahasiswa.',
        })
      }
      if (!data.angkatan) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['angkatan'],
          message: 'Angkatan wajib diisi untuk mahasiswa.',
        })
      }
    }
  })

// POST /pinjam setara -- dipanggil dari modal detail buku katalog publik.
export const submitLoanRequest = createServerFn({ method: 'POST' })
  .inputValidator(submitLoanRequestSchema)
  .handler(async ({ data }) => {
    const [book] = await db
      .select({ judul: books.judul })
      .from(books)
      .where(eq(books.id, data.bookId))
      .limit(1)

    if (!book) {
      throw new Error('Buku tidak ditemukan.')
    }

    // jenjang/angkatan dipaksa null buat dosen, apapun yang dikirim client --
    // jangan percaya input mentah buat field yang secara desain gak relevan
    // buat role ini.
    const [request] = await db
      .insert(loanRequests)
      .values({
        bookId: data.bookId,
        bookJudulSnapshot: book.judul,
        namaPeminjam: data.namaPeminjam,
        role: data.role,
        jenjang: data.role === 'mahasiswa' ? data.jenjang : null,
        angkatan: data.role === 'mahasiswa' ? data.angkatan : null,
        whatsapp: data.whatsapp,
        email: data.email || undefined,
        keperluan: data.keperluan || undefined,
      })
      .returning({ id: loanRequests.id })

    return { id: request.id }
  })
