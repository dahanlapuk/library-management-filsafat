import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { AdminHeader } from '../../admin/AdminHeader'
import { getMembers, getMemberLoans } from '../../loans/admin'

export const Route = createFileRoute('/admin/members')({
  component: MembersPage,
})

const filterOptions = [
  { value: undefined, label: 'Semua' },
  { value: 'S1' as const, label: 'S1' },
  { value: 'S2' as const, label: 'S2' },
  { value: 'S3' as const, label: 'S3' },
  { value: 'dosen' as const, label: 'Dosen' },
]

// Histori peminjaman satu member -- fetch sendiri, cuma dipanggil kalau
// barisnya di-expand. Pola sama seperti StockLocationsList di katalog.
function MemberLoanHistory({ memberId }: { memberId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['member-loans', memberId],
    queryFn: () => getMemberLoans({ data: { memberId } }),
  })

  if (isLoading) {
    return <p className="text-xs text-[var(--gray-600)] px-4 pb-3">Memuat histori...</p>
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-xs text-[var(--gray-600)] px-4 pb-3">
        Belum ada histori peminjaman.
      </p>
    )
  }

  return (
    <div className="px-4 pb-3 flex flex-col gap-1">
      {data.map((loan) => (
        <div key={loan.id} className="text-xs text-[var(--text-primary)] flex justify-between gap-2">
          <span className="truncate">{loan.bookJudul ?? '(buku sudah dihapus)'}</span>
          <span className="shrink-0 text-[var(--gray-600)]">
            {new Date(loan.tanggalPinjam).toLocaleDateString('id-ID')} →{' '}
            {loan.tanggalKembali
              ? new Date(loan.tanggalKembali).toLocaleDateString('id-ID')
              : 'masih dipinjam'}
          </span>
        </div>
      ))}
    </div>
  )
}

function MembersPage() {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<'S1' | 'S2' | 'S3' | 'dosen' | undefined>(undefined)
  const [angkatanInput, setAngkatanInput] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const angkatan = angkatanInput.trim() ? Number(angkatanInput.trim()) : undefined

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', { debouncedSearch, filter, angkatan }],
    queryFn: () =>
      getMembers({
        data: {
          search: debouncedSearch || undefined,
          filter,
          angkatan,
        },
      }),
  })

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-6xl mx-auto">
        <AdminHeader />

        <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)] mb-6">
          Data Anggota
        </h1>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama..."
            className="flex-1 text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
          />
          <input
            type="number"
            value={angkatanInput}
            onChange={(e) => setAngkatanInput(e.target.value)}
            placeholder="Angkatan"
            className="w-32 text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
          />
        </div>

        <div className="flex gap-2 mb-4">
          {filterOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-2 border-2 text-sm transition-colors ${
                filter === opt.value
                  ? 'border-[var(--black)] bg-[var(--gray-100)]'
                  : 'border-[var(--gray-200)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="bg-[var(--white)] border-2 border-[var(--black)]">
          {isLoading ? (
            <p className="text-center py-8">Memuat...</p>
          ) : members.length === 0 ? (
            <p className="text-center py-8 text-[var(--gray-600)]">
              Tidak ada anggota yang cocok.
            </p>
          ) : (
            <div className="flex flex-col">
              {members.map((member) => (
                <div key={member.id} className="border-b border-[var(--gray-200)] last:border-b-0">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((cur) => (cur === member.id ? null : member.id))
                    }
                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[var(--gray-100)]"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-semibold text-[var(--text-primary)] truncate">
                        {member.nama}
                      </span>
                      <span className="text-sm text-[var(--gray-600)]">
                        {member.role === 'dosen'
                          ? 'Dosen'
                          : `Mahasiswa ${member.jenjang ?? ''} ${member.angkatan ?? ''}`}
                        {member.whatsapp ? ` · ${member.whatsapp}` : ''}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm text-[var(--gray-600)]">
                      {expandedId === member.id ? '▲' : '▼'}
                    </span>
                  </button>
                  {expandedId === member.id && (
                    <MemberLoanHistory memberId={member.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
