import { createFileRoute } from '@tanstack/react-router'
import { db } from '../db'
import { books } from '../db/schema'

const SITE_URL = 'https://biblioteka.filsafatui.app'

// Sitemap dinamis -- generate dari tabel books tiap kali diminta (bukan
// file statis), supaya otomatis update tanpa maintenance manual dan ~1799
// halaman detail buku bisa diindex individual. Layak dipakai SEKARANG
// karena ?book=<id> sudah SSR (lihat commit eb17aab) -- sebelumnya cuma
// modal client-side, jadi sitemap begini kurang berguna.
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const rows = await db
          .select({ id: books.id })
          .from(books)

        const bookUrls = rows
          .map(
            (b) => `  <url>
    <loc>${SITE_URL}/?book=${b.id}</loc>
    <changefreq>monthly</changefreq>
  </url>`,
          )
          .join('\n')

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${bookUrls}
</urlset>`

        return new Response(xml, {
          headers: { 'Content-Type': 'application/xml' },
        })
      },
    },
  },
})
