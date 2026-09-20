import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentAdmin } from '../admin/auth'

// Halaman di bawah /admin yang boleh dibuka tanpa login.
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/signup']

// Layout untuk semua route /admin/*. Ini cuma lapisan UX (arahkan ke login
// kalau sesi tidak valid). Penegakan sebenarnya tetap di guard server function.
export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    const path = location.pathname.replace(/\/+$/, '')
    if (PUBLIC_ADMIN_PATHS.includes(path)) return

    const admin = await getCurrentAdmin()
    if (!admin || !admin.isApproved) {
      throw redirect({ to: '/admin/login' })
    }
  },
  component: () => <Outlet />,
})
