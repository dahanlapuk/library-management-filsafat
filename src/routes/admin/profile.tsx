import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getCurrentAdmin } from '../../admin/auth'
import { updateMyProfile, changeMyPassword } from '../../admin/profile'
import { AdminHeader } from '../../admin/AdminHeader'
import { errorMessage } from '../../lib/error-message'

export const Route = createFileRoute('/admin/profile')({
  component: AdminProfilePage,
})

const inputClass =
  'w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]'
const buttonClass =
  'p-3 bg-[var(--black)] text-[var(--white)] font-semibold uppercase tracking-wide text-sm disabled:opacity-50'

function Notice({ error, success }: { error: string; success: string }) {
  if (error) {
    return (
      <div className="p-3 bg-[#fee] border border-[#fcc] text-[#c00]">{error}</div>
    )
  }
  if (success) {
    return (
      <div className="p-3 bg-[#efe] border border-[#cfc] text-[#060]">{success}</div>
    )
  }
  return null
}

function ProfileForm({
  admin,
}: {
  admin: { nama: string; email: string; noWhatsapp: string | null }
}) {
  const queryClient = useQueryClient()
  const [nama, setNama] = useState(admin.nama)
  const [noWhatsapp, setNoWhatsapp] = useState(admin.noWhatsapp ?? '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const res = await updateMyProfile({ data: { nama, noWhatsapp } })
      await queryClient.invalidateQueries({ queryKey: ['current-admin'] })
      setSuccess(res.changed ? 'Profil disimpan.' : 'Tidak ada perubahan.')
    } catch (err) {
      setError(errorMessage(err, 'Gagal menyimpan profil.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Data Diri</h2>
      <Notice error={error} success={success} />
      <div className="flex flex-col gap-2">
        <label className="font-medium">Nama:</label>
        <input value={nama} onChange={(e) => setNama(e.target.value)} className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium">Nomor WhatsApp:</label>
        <input
          value={noWhatsapp}
          onChange={(e) => setNoWhatsapp(e.target.value)}
          placeholder="mis. 081234567890 atau +6281234567890"
          inputMode="tel"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium">Email:</label>
        <input value={admin.email} disabled className={`${inputClass} bg-[var(--gray-100)]`} />
        <p className="text-xs text-[var(--gray-600)]">Email belum bisa diubah dari sini.</p>
      </div>
      <button type="submit" disabled={saving || !nama.trim()} className={buttonClass}>
        {saving ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const [passwordLama, setPasswordLama] = useState('')
  const [passwordBaru, setPasswordBaru] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (passwordBaru !== konfirmasi) {
      setError('Konfirmasi password tidak cocok.')
      return
    }
    setSaving(true)
    try {
      await changeMyPassword({ data: { passwordLama, passwordBaru } })
      setPasswordLama('')
      setPasswordBaru('')
      setKonfirmasi('')
      setSuccess('Password diganti.')
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengganti password.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Ganti Password</h2>
      <Notice error={error} success={success} />
      <div className="flex flex-col gap-2">
        <label className="font-medium">Password lama:</label>
        <input type="password" value={passwordLama} onChange={(e) => setPasswordLama(e.target.value)} autoComplete="current-password" className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium">Password baru (min. 8 karakter):</label>
        <input type="password" value={passwordBaru} onChange={(e) => setPasswordBaru(e.target.value)} autoComplete="new-password" className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium">Ulangi password baru:</label>
        <input type="password" value={konfirmasi} onChange={(e) => setKonfirmasi(e.target.value)} autoComplete="new-password" className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={saving || !passwordLama || !passwordBaru || !konfirmasi}
        className={buttonClass}
      >
        {saving ? 'Memproses...' : 'Ganti Password'}
      </button>
    </form>
  )
}

function AdminProfilePage() {
  const { data: currentAdmin, isPending } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-6xl mx-auto">
        <AdminHeader />
        <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)] mb-6">
          Profil Saya
        </h1>
        {isPending || !currentAdmin ? (
          <p>Memuat...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6">
              <ProfileForm admin={currentAdmin} />
            </div>
            <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6">
              <PasswordForm />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
