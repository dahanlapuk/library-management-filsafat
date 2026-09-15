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
