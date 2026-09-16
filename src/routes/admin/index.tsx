import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getCurrentAdmin } from '../../admin/auth'
import { getAdminStats } from '../../admin/approval'
import { AdminHeader } from '../../admin/AdminHeader'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const { data: currentAdmin } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => getAdminStats(),
  })

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-[640px] mx-auto">
        <AdminHeader />

        <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)] mb-1">
          Dashboard Admin
        </h1>
        <p className="text-[var(--gray-600)] mb-6">
          Halo, {currentAdmin?.nama ?? '...'}.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--white)] border-2 border-[var(--black)] p-4">
            <span className="text-sm text-[var(--gray-600)]">
              Total Admin Aktif
            </span>
            <p className="text-3xl font-semibold text-[var(--text-primary)]">
              {stats?.totalApprovedAdmins ?? '...'}
            </p>
          </div>

          {currentAdmin?.isSuperadmin && (
            <Link
              to="/admin/approvals"
              className="bg-[var(--white)] border-2 border-[var(--black)] p-4 hover:bg-[var(--gray-100)] transition-colors"
            >
              <span className="text-sm text-[var(--gray-600)]">
                Menunggu Persetujuan
              </span>
              <p className="text-3xl font-semibold text-[var(--text-primary)]">
                {stats?.pendingCount ?? '...'}
              </p>
            </Link>
          )}
        </div>

        <Link
          to="/admin/books"
          className="block bg-[var(--white)] border-2 border-[var(--black)] p-6 text-center hover:bg-[var(--gray-100)] transition-colors"
        >
          <p className="text-[var(--text-primary)] font-semibold uppercase tracking-wide">
            Kelola Buku →
          </p>
        </Link>
      </div>
    </div>
  )
}
