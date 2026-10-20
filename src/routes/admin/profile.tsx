import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getCurrentAdmin } from '../../admin/auth'
import { updateMyProfile, changeMyPassword } from '../../admin/profile'
import { requestEmailChange } from '../../admin/email-change'
import { AdminPage } from '../../components/ui/AdminPage'
import { Button } from '../../components/ui/Button'
import { Chevron } from '../../components/ui/Chevron'
import { Input } from '../../components/ui/Field'
import { errorMessage } from '../../lib/error-message'

export const Route = createFileRoute('/admin/profile')({
  component: AdminProfilePage,
})

function Notice({ error, success }: { error: string; success: string }) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </div>
    )
  }
  if (success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        {success}
      </div>
    )
  }
  return null
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
      {children}
    </h2>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  )
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
      <SectionTitle>Data Diri</SectionTitle>
      <Notice error={error} success={success} />
      <Field label="Nama">
        <Input value={nama} onChange={(e) => setNama(e.target.value)} className="w-full" />
      </Field>
      <Field label="Nomor WhatsApp">
        <Input
          value={noWhatsapp}
          onChange={(e) => setNoWhatsapp(e.target.value)}
          placeholder="mis. 081234567890 atau +6281234567890"
          inputMode="tel"
          className="w-full"
        />
      </Field>
      <Field label="Email" hint="Email belum bisa diubah dari sini.">
        <Input value={admin.email} disabled className="w-full opacity-60" />
      </Field>
      <div>
        <Button type="submit" variant="accent" disabled={saving || !nama.trim()}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
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
      <Notice error={error} success={success} />
      <Field label="Password lama">
        <Input
          type="password"
          value={passwordLama}
          onChange={(e) => setPasswordLama(e.target.value)}
          autoComplete="current-password"
          className="w-full"
        />
      </Field>
      <Field label="Password baru" hint="Minimal 8 karakter.">
        <Input
          type="password"
          value={passwordBaru}
          onChange={(e) => setPasswordBaru(e.target.value)}
          autoComplete="new-password"
          className="w-full"
        />
      </Field>
      <Field label="Ulangi password baru">
        <Input
          type="password"
          value={konfirmasi}
          onChange={(e) => setKonfirmasi(e.target.value)}
          autoComplete="new-password"
          className="w-full"
        />
      </Field>
      <div>
        <Button
          type="submit"
          variant="accent"
          disabled={saving || !passwordLama || !passwordBaru || !konfirmasi}
        >
          {saving ? 'Memproses...' : 'Ganti Password'}
        </Button>
      </div>
    </form>
  )
}

function EmailForm() {
  const [emailBaru, setEmailBaru] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await requestEmailChange({ data: { emailBaru, password } })
      setPassword('')
      setSuccess(
        'Email konfirmasi dikirim ke ' + emailBaru + '. Klik tautan di dalamnya untuk menyelesaikan penggantian.',
      )
      setEmailBaru('')
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengajukan ganti email.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Notice error={error} success={success} />
      <Field label="Email baru">
        <Input
          type="email"
          value={emailBaru}
          onChange={(e) => setEmailBaru(e.target.value)}
          autoComplete="off"
          className="w-full"
        />
      </Field>
      <Field label="Password saat ini">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full"
        />
      </Field>
      <div>
        <Button type="submit" variant="accent" disabled={saving || !emailBaru || !password}>
          {saving ? 'Memproses...' : 'Kirim Email Konfirmasi'}
        </Button>
      </div>
    </form>
  )
}

function Collapsible({
  title,
  desc,
  open,
  onToggle,
  children,
}: {
  title: string
  desc: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-[var(--rule)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-4 text-left"
      >
        <span className="flex min-w-0 flex-col">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-[var(--muted)]">{desc}</span>
        </span>
        <Chevron
          className={`text-[var(--muted)] transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="-mx-1 min-h-0 overflow-hidden px-1">
          <div className="pb-5 pt-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

function AdminProfilePage() {
  const [openKey, setOpenKey] = useState<'password' | 'email' | null>(null)
  const { data: currentAdmin, isPending } = useQuery({
    queryKey: ['current-admin'],
    queryFn: () => getCurrentAdmin(),
  })

  return (
    <AdminPage narrow>
      <h1
        className="mb-5 text-2xl font-semibold sm:text-3xl"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Profil Saya
      </h1>
      {isPending || !currentAdmin ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">Memuat...</p>
      ) : (
        <div className="rounded-xl border border-[var(--rule)] bg-[var(--white)] p-4 shadow-[0_1px_2px_rgba(24,22,0,0.05)] sm:p-6">
          <ProfileForm admin={currentAdmin} />
          <div className="mt-6">
            <Collapsible
              title="Ganti password"
              desc="Ubah password untuk masuk ke dashboard admin."
              open={openKey === 'password'}
              onToggle={() => setOpenKey(openKey === 'password' ? null : 'password')}
            >
              <PasswordForm />
            </Collapsible>
            <Collapsible
              title="Ganti email"
              desc="Konfirmasi dikirim ke email baru."
              open={openKey === 'email'}
              onToggle={() => setOpenKey(openKey === 'email' ? null : 'email')}
            >
              <EmailForm />
            </Collapsible>
          </div>
        </div>
      )}
    </AdminPage>
  )
}
