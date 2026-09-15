/**
 * Port dari allocateLoanFromLargestStockTx (V1, handlers/inventory_split.go).
 * Pure function, tanpa DB — supaya bisa di-characterization-test tanpa setup
 * database. Fungsi ini HANYA menentukan posisi mana yang dipakai untuk satu
 * unit alokasi baru; bukan yang menulis ke DB.
 *
 * Perilaku V1 yang sengaja dipertahankan (JANGAN diubah tanpa keputusan
 * eksplisit, karena ini business rule inti — lihat handoff audit #6):
 * - Pilih posisi dengan SISA stok terbesar (qty - allocated aktif),
 *   BUKAN qty total terbesar.
 * - Tie-break: qty total terbesar.
 * - Kalau tidak ada posisi dengan sisa stok > 0, return null.
 */

export type StockLocation = {
  posisiId: number | null
  qty: number
}

export type ActiveAllocation = {
  posisiId: number | null
  qty: number
}

export function allocateFromLargestStock(
  locations: StockLocation[],
  activeAllocations: ActiveAllocation[],
): number | null {
  const allocatedByPosisi = new Map<number | null, number>()
  for (const a of activeAllocations) {
    allocatedByPosisi.set(
      a.posisiId,
      (allocatedByPosisi.get(a.posisiId) ?? 0) + a.qty,
    )
  }

  let best: { posisiId: number | null; remaining: number; qty: number } | null =
    null

  for (const loc of locations) {
    const allocated = allocatedByPosisi.get(loc.posisiId) ?? 0
    const remaining = loc.qty - allocated
    if (remaining <= 0) continue

    if (
      best === null ||
      remaining > best.remaining ||
      (remaining === best.remaining && loc.qty > best.qty)
    ) {
      best = { posisiId: loc.posisiId, remaining, qty: loc.qty }
    }
  }

  return best?.posisiId ?? null
}

/**
 * Port dari pengecekan di CreateLoan (V1, handlers/loans.go) yang menentukan
 * apakah sebuah loan BOLEH dibuat sama sekali, sebelum alokasi posisi
 * ditentukan.
 *
 * Perilaku V1 yang sengaja dipertahankan, termasuk EDGE CASE-nya:
 * - Ditolak kalau activeLoanCount >= bookQty (stok habis).
 * - Ditolak kalau tidak ada posisi dengan sisa stok DAN bookQty > 1.
 * - KEJUTAN dari kode asli: kalau bookQty === 1 dan tidak ada posisi dengan
 *   sisa stok (kasusnya harusnya tidak mungkin terjadi kalau data konsisten,
 *   tapi kalau data TIDAK konsisten — misal book_stock_locations belum
 *   di-sync — V1 tetap MELOLOSKAN loan ini dengan posisi_id NULL, bukan
 *   menolaknya). Test di bawah mengunci perilaku ini secara eksplisit,
 *   BUKAN karena ini perilaku yang diinginkan, tapi supaya keputusan
 *   "perbaiki atau pertahankan" dibuat sadar, bukan kebobolan diam-diam.
 */
export function canCreateLoan(
  activeLoanCount: number,
  bookQty: number,
  allocatedPosisiId: number | null,
  hasAnyStockLocation: boolean,
): { allowed: boolean; reason?: string } {
  if (activeLoanCount >= bookQty) {
    return { allowed: false, reason: 'Stok buku sedang habis dipinjam' }
  }

  if (allocatedPosisiId === null && hasAnyStockLocation && bookQty > 1) {
    return {
      allowed: false,
      reason: 'Distribusi stok tidak tersedia untuk alokasi pinjaman',
    }
  }

  return { allowed: true }
}
