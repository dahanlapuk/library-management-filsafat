import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboardPlaceholder,
})

function AdminDashboardPlaceholder() {
  return (
    <div className="p-8">
      <h1>Dashboard Admin</h1>
      <p>Halaman ini akan dibangun di fase berikutnya.</p>
    </div>
  )
}
