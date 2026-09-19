import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getCurrentAdmin } from '../../admin/auth'
import { getPendingAdmins, approveAdmin } from '../../admin/approval'
import { AdminHeader } from '../../admin/AdminHeader'

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
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-6xl mx-auto">
        <AdminHeader />
        <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)] mb-6">
          Persetujuan Admin Baru
        </h1>

        {error && (
          <div className="p-3 mb-4 bg-[#fee] border border-[#fcc] text-[#c00]">
            {error}
          </div>
        )}

        <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6">
          {loadingCurrent || loadingPending ? (
            <p className="text-center py-4">Memuat...</p>
          ) : pending.length === 0 ? (
            <p className="text-center py-4 text-[var(--gray-600)]">
              Tidak ada admin yang menunggu persetujuan.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between gap-3 p-4 border-2 border-[var(--gray-200)]"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {admin.nama}
                    </span>
                    <span className="text-sm text-[var(--gray-600)]">
                      {admin.email}
                    </span>
                  </div>
                  <button
                    onClick={() => handleApprove(admin.id)}
                    disabled={approvingId === admin.id}
                    className="p-3 bg-[var(--black)] text-[var(--white)] font-semibold uppercase tracking-wide text-sm disabled:opacity-50"
                  >
                    {approvingId === admin.id ? 'Memproses...' : 'Approve'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
