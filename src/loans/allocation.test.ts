import { describe, it, expect } from 'vitest'
import { allocateFromLargestStock, canCreateLoan } from './allocation'

describe('allocateFromLargestStock (port dari allocateLoanFromLargestStockTx V1)', () => {
  it('memilih posisi dengan SISA stok terbesar, bukan qty total terbesar', () => {
    // Posisi A: qty total 10, tapi 9 sudah dipinjam -> sisa 1
    // Posisi B: qty total 3, belum ada yang dipinjam -> sisa 3
    // V1 harus pilih B, meskipun qty total A jauh lebih besar.
    const locations = [
      { posisiId: 1, qty: 10 },
      { posisiId: 2, qty: 3 },
    ]
    const activeAllocations = [{ posisiId: 1, qty: 9 }]

    expect(allocateFromLargestStock(locations, activeAllocations)).toBe(2)
  })

  it('tie-break berdasarkan qty total terbesar kalau sisa stok sama', () => {
    const locations = [
      { posisiId: 1, qty: 5 },
      { posisiId: 2, qty: 10 },
    ]
    // Sisa sama-sama 5 (posisi 1: 5-0=5, posisi 2: 10-5=5)
    const activeAllocations = [{ posisiId: 2, qty: 5 }]

    expect(allocateFromLargestStock(locations, activeAllocations)).toBe(2)
  })

  it('return null kalau semua posisi sudah habis sisa stoknya', () => {
    const locations = [{ posisiId: 1, qty: 2 }]
    const activeAllocations = [{ posisiId: 1, qty: 2 }]

    expect(allocateFromLargestStock(locations, activeAllocations)).toBeNull()
  })

  it('return null kalau tidak ada stock location sama sekali', () => {
    expect(allocateFromLargestStock([], [])).toBeNull()
  })

  it('menangani posisiId null (buku tanpa posisi rak) sebagai key yang valid', () => {
    const locations = [{ posisiId: null, qty: 1 }]
    expect(allocateFromLargestStock(locations, [])).toBeNull()
  })

  it('mengalokasikan ke posisiId null kalau memang ada sisa stok di sana', () => {
    const locations = [{ posisiId: null, qty: 2 }]
    const activeAllocations = [{ posisiId: null, qty: 1 }]
    expect(allocateFromLargestStock(locations, activeAllocations)).toBeNull()
  })
})

describe('canCreateLoan (port dari pengecekan di CreateLoan V1)', () => {
  it('menolak kalau activeLoanCount >= bookQty', () => {
    const result = canCreateLoan(2, 2, 5, true)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/habis/i)
  })

  it('mengizinkan loan normal ketika alokasi posisi ditemukan', () => {
    const result = canCreateLoan(0, 3, 5, true)
    expect(result.allowed).toBe(true)
  })

  it('menolak kalau tidak ada posisi tersedia DAN bookQty > 1', () => {
    const result = canCreateLoan(0, 2, null, true)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/distribusi stok/i)
  })

  it('EDGE CASE V1: tetap mengizinkan kalau bookQty === 1 meski tidak ada posisi tersedia', () => {
    // Ini perilaku asli V1 yang mungkin tidak diinginkan -- dikunci di sini
    // secara eksplisit supaya siapa pun yang porting ke V2 sadar dan
    // memutuskan: pertahankan, atau perbaiki jadi konsisten dengan
    // kasus bookQty > 1.
    const result = canCreateLoan(0, 1, null, true)
    expect(result.allowed).toBe(true)
  })
})
