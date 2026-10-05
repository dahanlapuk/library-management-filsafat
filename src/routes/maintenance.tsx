import { createFileRoute } from '@tanstack/react-router'
import { getMaintenanceMode } from '../lib/maintenance'

export const Route = createFileRoute('/maintenance')({
  loader: () => getMaintenanceMode(),
  component: MaintenancePage,
})

function MaintenancePage() {
  const mode = Route.useLoaderData()
  const isCatalog = mode === 'catalog'

  return (
    <div className="flex min-h-screen items-center justify-center px-8 text-center">
      <div className="max-w-md">
        <h1 className="mb-2 text-2xl font-semibold">
          {isCatalog ? 'Pembaruan & Perbaikan Data' : 'Pemeliharaan Sistem Berkala'}
        </h1>
        <p className="text-slate-400">
          {isCatalog
            ? 'Kami sedang melakukan validasi dan pembaruan data agar informasi yang disajikan selalu akurat dan mutakhir. Akses data akan segera normal kembali dalam beberapa saat. Mohon maaf atas ketidaknyamanannya.'
            : 'Saat ini sistem sedang dalam perbaikan rutin agar dapat memberikan pelayanan yang lebih optimal dan lancar. Akses akan segera dibuka kembali secara bertahap. Mohon maaf atas ketidaknyamanan ini.'}
        </p>
      </div>
    </div>
  )
}
