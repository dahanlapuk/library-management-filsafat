export type Petugas = {
  nama: string
  tampil: string
  wa: string
  hari: string[]
}

export const PETUGAS: Petugas[] = [
  { nama: 'Daffa', tampil: '0895604990809', wa: '62895604990809', hari: ['Senin', 'Selasa', 'Jumat'] },
  { nama: 'Ila', tampil: '082283113848', wa: '6282283113848', hari: ['Senin', 'Selasa', 'Jumat'] },
  { nama: 'Zidni', tampil: '081285605963', wa: '6281285605963', hari: ['Rabu', 'Kamis'] },
]

export const PETUGAS_AKHIR_PEKAN = 'Ila'

const NAMA_HARI: Record<string, string> = {
  Sun: 'Minggu',
  Mon: 'Senin',
  Tue: 'Selasa',
  Wed: 'Rabu',
  Thu: 'Kamis',
  Fri: 'Jumat',
  Sat: 'Sabtu',
}

export function hariIniJakarta(now: Date = new Date()): string {
  const w = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(now)
  return NAMA_HARI[w] ?? ''
}

export function petugasHariIni(hari: string): Petugas[] {
  const bertugas = PETUGAS.filter((p) => p.hari.includes(hari))
  if (bertugas.length > 0) return bertugas
  return PETUGAS.filter((p) => p.nama === PETUGAS_AKHIR_PEKAN)
}
