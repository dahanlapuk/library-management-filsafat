import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/maintenance')({
  component: MaintenancePage,
})

function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-8 text-center">
      <div className="max-w-md">
        <h1 className="mb-2 text-2xl font-semibold">
          Pemeliharaan Sistem Berkala
        </h1>
        <p className="text-slate-400">
          Saat ini sistem sedang dalam perbaikan rutin agar dapat memberikan
          pelayanan yang lebih optimal dan lancar. Akses akan segera dibuka
          kembali secara bertahap. Mohon maaf atas ketidaknyamanan ini.
        </p>
      </div>
    </div>
  )
}
