import { createFileRoute, redirect } from '@tanstack/react-router'

// Alias pendek: /login otomatis ke /admin/login.
export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/login' })
  },
})
