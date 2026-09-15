import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentAdmin, logout } from './auth'

// Header kecil buat semua halaman /admin/* (selain login/signup) supaya
// jelas lagi login sebagai siapa, dan ada tombol logout yang keliatan.
export function AdminHeader() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: currentAdmin } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })

  async function handleLogout() {
    await logout()
    queryClient.clear()
    navigate({ to: '/admin/login' })
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 mb-6 border-2 border-[var(--black)] bg-[var(--white)]">
      <span className="text-sm text-[var(--gray-600)]">
        Login sebagai:{' '}
        <span className="font-semibold text-[var(--text-primary)]">
          {currentAdmin?.nama ?? '...'}
        </span>
        {currentAdmin?.isSuperadmin && (
          <span className="ml-2 inline-block text-xs bg-[var(--black)] text-[var(--white)] px-2 py-0.5 font-medium">
            Superadmin
          </span>
        )}
      </span>
      <button
        onClick={handleLogout}
        className="text-sm underline text-[var(--text-primary)]"
      >
        Logout
      </button>
    </div>
  )
}
