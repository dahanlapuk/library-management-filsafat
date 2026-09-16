# Catatan Audit V1 — Behavior yang Perlu Keputusan Sadar di Fase 2

File ini nyimpen temuan dari baca kode asli V1 (`pustaka-filsafat-api`) yang
BELUM di-characterization-test karena fitur terkait bakal didesain ulang
total di Fase 2 (bukan di-port apa adanya). Dicatat di sini supaya nggak
kelupaan pas waktunya tiba.

## Bug: `ApproveLoanRequest` bypass alokasi stok + tanpa transaksi

Sumber: `handlers/batch_and_requests.go`, fungsi `ApproveLoanRequest`.

**Masalah 1 — bypass alokasi stok:**
Beda dari `CreateLoan` normal (yang manggil `allocateLoanFromLargestStockTx`
dan insert baris `loan_stock_allocations`), `ApproveLoanRequest` langsung
`INSERT INTO loans (...)` tanpa alokasi stok sama sekali. Akibatnya: loan
yang lahir dari approve loan-request TIDAK PERNAH punya baris di
`loan_stock_allocations`, bikin perhitungan stock availability
(`GetBookStockAvailability`, `GetBookStockBreakdown`) jadi nggak akurat
untuk buku yang pernah dipinjam lewat jalur ini.

**Masalah 2 — tidak ada transaksi:**
Dua write (`UPDATE loan_requests SET status='approved'` lalu
`INSERT INTO loans`) dieksekusi terpisah, TIDAK dibungkus `tx.Begin()`.
Kalau insert kedua gagal (misal koneksi DB putus di tengah), status
request sudah kepalang "approved" secara permanen, padahal loan-nya nggak
pernah kebuat. Hasilnya: pemohon dapat notifikasi "disetujui" tapi tidak
ada catatan peminjaman apa pun — admin dan pemohon sama-sama bingung.

**Kenapa belum ditest sekarang (bukan lupa, tapi keputusan sadar):**
Alur "loan request" ini bakal didesain ulang total di Fase 2 mengikuti
requirement bisnis baru (member mahasiswa/dosen dengan aturan berbeda).
Menulis characterization test untuk fungsi yang direncanakan dibuang total
strukturnya cuma bikin test mubazir begitu Fase 2 dimulai. Beda dengan
`allocateFromLargestStock` (lihat `src/loans/allocation.ts` +
`allocation.test.ts`) yang MEMANG dipertahankan persis di V2, sehingga
worth dikunci sekarang.

**Yang WAJIB dilakukan pas desain approve-flow versi V2 di Fase 2:**
1. Bungkus semua write (update status request + insert loan + insert
   alokasi stok) dalam SATU transaksi database — kalau salah satu gagal,
   semua di-rollback, status request tetap `pending`.
2. Approve-flow versi V2 WAJIB memanggil logic alokasi stok yang sama
   (`allocateFromLargestStock`) yang dipakai jalur `CreateLoan` normal —
   jangan insert `loans` langsung tanpa alokasi, supaya stock availability
   selalu akurat untuk semua loan, dari jalur mana pun asalnya.
3. Karena member sekarang punya identitas jelas (`members.id`, bukan teks
   bebas), loan request V2 kemungkinan perlu field tambahan buat
   menghubungkan pemohon ke record member yang benar (atau membuat member
   baru kalau belum ada) — detail ini menyusul saat loan_requests schema
   ditulis.

## Masalah terkait: pengecekan ketersediaan di `CreateLoanRequest`

Sumber: `handlers/batch_and_requests.go`, fungsi `CreateLoanRequest`.

Pengecekan ketersediaan buku sebelum bikin loan request pakai:
```sql
EXISTS(SELECT 1 FROM loans l WHERE l.book_id = b.id AND l.tanggal_kembali IS NULL)
```
Ini boolean "ada minimal 1 pinjaman aktif" — SALAH untuk buku multi-copy
(qty > 1). Buku dengan qty 3 tapi baru 1 dipinjam akan tetap di-block
("Buku sedang dipinjam orang lain") padahal masih ada 2 sisa. Ini tidak
konsisten dengan logic qty yang benar di `canCreateLoan`
(`src/loans/allocation.ts`). Perlu diperbaiki di V2 supaya pengecekan
ketersediaan konsisten pakai qty, bukan boolean ada/tidak-ada.

## Keputusan Desain: Privasi Data Peminjam di API Katalog Publik (Fase 1)

Sumber: `handlers/books.go` (V1) vs `src/books/catalog.ts` (V2).

**Temuan di V1:** Endpoint publik katalog buku (tanpa autentikasi apa pun)
mengembalikan `nama_peminjam` secara langsung untuk buku yang sedang
dipinjam. Artinya siapa pun yang membuka API publik — tanpa login, tanpa
rate limit khusus — bisa tahu persis nama orang yang sedang meminjam buku
apa. Ini bukan bug fungsional (fitur ini "bekerja sesuai desain"), tapi
merupakan kebocoran privasi data pribadi yang tidak disengaja: tidak ada
consent, tidak ada kebutuhan bisnis yang mengharuskan nama peminjam
terlihat publik — status ketersediaan (dipinjam/tidak) sudah cukup untuk
tujuan katalog.

**Keputusan di V2 (sudah dieksekusi, bukan rencana):** `getBooks` dan
`getBook` di `src/books/catalog.ts` HANYA mengembalikan boolean
`isDipinjam`, tidak pernah mengembalikan identitas peminjam dalam bentuk
apa pun ke endpoint publik. Nama peminjam tetap tersimpan di tabel
`loans`/`members` untuk keperluan internal admin, tapi tidak pernah
di-expose lewat server function yang bisa diakses tanpa login.

**Kenapa dicatat di sini (bukan cuma di commit message):** Ini contoh
konkret di mana V2 SENGAJA menyimpang dari behavior V1 apa adanya, bukan
karena V1 salah secara fungsional, tapi karena V1 punya cacat privasi yang
baru kelihatan setelah audit langsung terhadap payload API publik —
penting untuk didokumentasikan sebagai preseden kalau nanti ada fitur lain
(mis. activity log, member archive) yang berpotensi expose data pribadi
serupa lewat endpoint publik, supaya polanya konsisten dicek dari awal,
bukan ditambal belakangan.
