import { createFileRoute } from '@tanstack/react-router'
import { AdminHeader } from '../../admin/AdminHeader'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboardPlaceholder,
})

function AdminDashboardPlaceholder() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-[640px] mx-auto">
        <AdminHeader />
        <h1 className="text-2xl font-semibold">Dashboard Admin</h1>
        <p className="text-[var(--gray-600)]">
          Halaman ini akan dibangun di fase berikutnya.
        </p>
      </div>
    </div>
  )
}
