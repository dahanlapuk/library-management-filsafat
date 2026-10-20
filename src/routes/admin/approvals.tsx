import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getCurrentAdmin } from '../../admin/auth'
import { getPendingAdmins, approveAdmin } from '../../admin/approval'
import { AdminPage } from '../../components/ui/AdminPage'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

export const Route = createFileRoute('/admin/approvals')({
  component: AdminApprovalsPage,
})

function AdminApprovalsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data: currentAdmin, isLoading: loadingCurrent } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ['pending-admins'],
    queryFn: () => getPendingAdmins(),
    // Server function ini sendiri dijaga requireSuperadmin — query ini
    // cuma dijalankan kalau kita sudah tahu currentAdmin superadmin,
    // supaya non-superadmin nggak dapat error mentah di UI.
    enabled: !!currentAdmin?.isSuperadmin,
  })

  if (!loadingCurrent && !currentAdmin?.isSuperadmin) {
    navigate({ to: '/admin' })
    return null
  }

  async function handleApprove(adminId: string) {
    setError('')
    setApprovingId(adminId)
    try {
      await approveAdmin({ data: { adminId } })
      queryClient.invalidateQueries({ queryKey: ['pending-admins'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal approve admin.')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <AdminPage>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
          Persetujuan Admin Baru
        </h1>
        {pending.length > 0 && <Badge tone="solid">{pending.length} menunggu</Badge>}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--white)] shadow-[0_1px_2px_rgba(24,22,0,0.05)]">
        {loadingCurrent || loadingPending ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">Memuat...</p>
        ) : pending.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            Tidak ada admin yang menunggu persetujuan.
          </p>
        ) : (
          pending.map((admin) => (
            <div
              key={admin.id}
              className="flex flex-col gap-3 border-b border-[var(--rule)] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="break-words font-semibold">{admin.nama}</span>
                <span className="break-all text-sm text-[var(--muted)]">{admin.email}</span>
              </div>
              <Button
                variant="accent"
                onClick={() => handleApprove(admin.id)}
                disabled={approvingId === admin.id}
              >
                {approvingId === admin.id ? 'Memproses...' : 'Setujui'}
              </Button>
            </div>
          ))
        )}
      </div>
    </AdminPage>
  )
}
