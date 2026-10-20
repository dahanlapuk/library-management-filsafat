import { Chevron } from '../../components/ui/Chevron'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { AdminPage } from '../../components/ui/AdminPage'
import { Badge } from '../../components/ui/Badge'
import { Chip } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
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

function MemberLoanHistory({ memberId }: { memberId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['member-loans', memberId],
    queryFn: () => getMemberLoans({ data: { memberId } }),
  })

  if (isLoading) {
    return <p className="px-4 pb-4 text-sm text-[var(--muted)]">Memuat histori...</p>
  }
  if (!data || data.length === 0) {
    return (
      <p className="px-4 pb-4 text-sm text-[var(--muted)]">
        Belum ada histori peminjaman.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 px-4 pb-4">
      {data.map((loan) => (
        <div key={loan.id} className="flex justify-between gap-3 text-sm">
          <span className="truncate">{loan.bookJudul ?? '(buku sudah dihapus)'}</span>
          <span className="shrink-0 text-[var(--muted)]">
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
    <AdminPage>
      <h1 className="mb-6 text-3xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
        Data Anggota
      </h1>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <Input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari nama..."
          className="flex-1"
        />
        <Input
          type="number"
          value={angkatanInput}
          onChange={(e) => setAngkatanInput(e.target.value)}
          placeholder="Angkatan"
          className="sm:w-36"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <Chip
            key={opt.label}
            active={filter === opt.value}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </Chip>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--white)] shadow-[0_1px_2px_rgba(24,22,0,0.05)]">
        {isLoading ? (
          <p className="py-10 text-center text-[var(--muted)]">Memuat...</p>
        ) : members.length === 0 ? (
          <p className="py-10 text-center text-[var(--muted)]">
            Tidak ada anggota yang cocok.
          </p>
        ) : (
          <div className="flex flex-col">
            {members.map((member) => (
              <div key={member.id} className="border-b border-[var(--rule)] last:border-b-0">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((cur) => (cur === member.id ? null : member.id))
                  }
                  aria-expanded={expandedId === member.id}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[var(--pale-soft)]"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-semibold">{member.nama}</span>
                    <span className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                      {member.role === 'dosen' ? (
                        <Badge tone="solid">Dosen</Badge>
                      ) : (
                        <Badge>
                          {`Mahasiswa ${member.jenjang ?? ''} ${member.angkatan ?? ''}`.trim()}
                        </Badge>
                      )}
                      {member.whatsapp && <span>{member.whatsapp}</span>}
                    </span>
                  </div>
                  <Chevron
                    className={`text-[var(--muted)] transition-transform duration-300 ${
                      expandedId === member.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedId === member.id && <MemberLoanHistory memberId={member.id} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPage>
  )
}
