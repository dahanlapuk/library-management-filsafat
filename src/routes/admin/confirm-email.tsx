import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { completeEmailChange } from '../../admin/email-change'
import { Button, buttonClass } from '../../components/ui/Button'
import { AuthError, AuthShell } from '../../components/ui/AuthShell'
import { errorMessage } from '../../lib/error-message'

export const Route = createFileRoute('/admin/confirm-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    token_hash: typeof search.token_hash === 'string' ? search.token_hash : '',
  }),
  component: ConfirmEmailPage,
})

function ConfirmEmailPage() {
  const { token_hash: tokenHash } = Route.useSearch()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleConfirm() {
    setError('')
    setLoading(true)
    try {
      await completeEmailChange({ data: { tokenHash } })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengonfirmasi email.'))
    } finally {
      setLoading(false)
    }
  }

  const title = 'text-xl font-semibold'
  const titleStyle = { fontFamily: 'var(--font-heading)' }

  return (
    <AuthShell subtitle="Konfirmasi Email Baru">
      <div className="flex flex-col gap-3 text-center">
        {done ? (
          <>
            <h2 className={title} style={titleStyle}>
              Email Berhasil Diganti
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Silakan masuk dengan email baru. Semua sesi lama telah dikeluarkan.
            </p>
            <Link to="/admin/login" className={`${buttonClass('accent')} w-full justify-center`}>
              Ke halaman login
            </Link>
          </>
        ) : !tokenHash ? (
          <>
            <h2 className={title} style={titleStyle}>
              Tautan Tidak Valid
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Ajukan ganti email lagi dari halaman profil.
            </p>
          </>
        ) : (
          <>
            <h2 className={title} style={titleStyle}>
              Ganti Email Akun
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Klik tombol di bawah untuk mengonfirmasi penggantian email akun Anda.
            </p>
            {error && <AuthError>{error}</AuthError>}
            <Button
              variant="accent"
              onClick={handleConfirm}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Memproses...' : 'Konfirmasi Email'}
            </Button>
          </>
        )}
      </div>
    </AuthShell>
  )
}
