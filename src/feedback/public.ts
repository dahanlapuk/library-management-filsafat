import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { and, count, eq, gt, sql } from 'drizzle-orm'
import { db } from '../db'
import { books, feedback, feedbackJenisEnum } from '../db/schema'

const MAX_PER_HOUR = 3

const submitFeedbackSchema = z.object({
  jenis: z.enum(feedbackJenisEnum.enumValues),
  pesan: z
    .string()
    .trim()
    .min(10, 'Pesan minimal 10 karakter.')
    .max(1000, 'Pesan maksimal 1000 karakter.'),
  kontak: z.string().trim().max(100, 'Kontak maksimal 100 karakter.').optional(),
  bookId: z.number().int().optional(),
  website: z.string().optional(),
})

export const submitFeedback = createServerFn({ method: 'POST' })
  .inputValidator(submitFeedbackSchema)
  .handler(async ({ data }) => {
    if (data.website) return { ok: true }

    const salt = process.env.FEEDBACK_IP_SALT
    if (!salt) {
      console.error('FEEDBACK_IP_SALT belum diatur')
      throw new Error('Layanan feedback belum dapat digunakan.')
    }

    const forwarded = getRequestHeader('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || getRequestHeader('x-real-ip') || null
    const ipHash = createHash('sha256').update(`${salt}:${ip ?? 'unknown'}`).digest('hex')

    if (ip) {
      const [{ n }] = await db
        .select({ n: count() })
        .from(feedback)
        .where(
          and(
            eq(feedback.ipHash, ipHash),
            gt(feedback.createdAt, sql`now() - interval '1 hour'`),
          ),
        )
      if (n >= MAX_PER_HOUR) {
        throw new Error('Terlalu banyak kiriman. Coba lagi dalam satu jam.')
      }
    } else {
      console.warn('submitFeedback: IP klien tidak terbaca, pembatas dilewati')
    }

    let bookJudulSnapshot: string | null = null
    if (data.bookId !== undefined) {
      const [book] = await db
        .select({ judul: books.judul })
        .from(books)
        .where(eq(books.id, data.bookId))
        .limit(1)
      if (!book) throw new Error('Buku tidak ditemukan.')
      bookJudulSnapshot = book.judul
    }

    await db.insert(feedback).values({
      jenis: data.jenis,
      pesan: data.pesan,
      kontak: data.kontak || null,
      bookId: data.bookId ?? null,
      bookJudulSnapshot,
      ipHash,
    })

    return { ok: true }
  })

export const getFeedbackBook = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const [book] = await db
      .select({ id: books.id, judul: books.judul })
      .from(books)
      .where(eq(books.id, data.id))
      .limit(1)
    return book ?? null
  })
