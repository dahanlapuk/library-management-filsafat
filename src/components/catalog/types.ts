import type { getBook } from '../../books/catalog'

export type BookDetail = Awaited<ReturnType<typeof getBook>>

export type BookTag = { id: number; nama: string }

export type BookRow = {
  id: number
  kode: string | null
  judul: string
  penulis: string | null
  tahun: number | null
  qty: number
  keterangan: string | null
  kategoriId: number | null
  kategoriNama: string | null
  posisiId: number | null
  posisiKode: string | null
  posisiRak: string | null
  isDipinjam: boolean
  tags: BookTag[]
}

export type CategoryRow = {
  id: number
  nama: string
  grouping: 'bentuk' | 'konten' | 'lain' | null
  kind: 'kategori' | 'tag'
  parentId: number | null
  urutan: number
  bookCount: number
}

export type CategoryNode = {
  cat: CategoryRow
  depth: number
  path: string
  hasChildren: boolean
}
