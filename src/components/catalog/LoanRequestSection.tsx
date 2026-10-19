import { useState } from 'react'
import type { FormEvent } from 'react'
import { submitLoanRequest } from '../../loans/public'

type LoanRequestFormState = {
  namaPeminjam: string
  role: 'mahasiswa' | 'dosen'
  jenjang: 'S1' | 'S2' | 'S3' | ''
  angkatan: string
  whatsapp: string
  email: string
  keperluan: string
}

const emptyLoanRequestForm: LoanRequestFormState = {
  namaPeminjam: '',
  role: 'mahasiswa',
  jenjang: '',
  angkatan: '',
  whatsapp: '',
  email: '',
  keperluan: '',
}

// Form pengajuan peminjaman -- publik, tanpa login. Submit ke
// submitLoanRequest (src/loans/public.ts), yang cuma bikin baris
// loan_requests berstatus pending. Konfirmasi & approve dilakukan
// MANUAL oleh petugas di admin panel setelah peminjam datang tatap
// muka -- lihat alur di pengumuman resmi pembukaan perpustakaan.
export function LoanRequestSection({
  book,
}: {
  book: { id: number; judul: string; isDipinjam: boolean }
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<LoanRequestFormState>(emptyLoanRequestForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (book.isDipinjam) {
    return (
      <p className="text-sm text-[var(--gray-600)] border-t-2 border-[var(--black)] pt-4">
        Buku ini sedang tidak tersedia untuk diajukan peminjamannya.
      </p>
    )
  }

  if (success) {
    return (
      <div className="border-t-2 border-[var(--black)] pt-4 flex flex-col gap-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Pengajuan terkirim.
        </p>
        <p className="text-sm text-[var(--gray-600)]">
          Silakan konfirmasi ke petugas perpustakaan secara langsung untuk
          mengambil buku ini.
        </p>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (form.role === 'mahasiswa' && (!form.jenjang || !form.angkatan.trim())) {
      setError('Jenjang dan angkatan wajib diisi untuk mahasiswa.')
      return
    }
    if (!form.namaPeminjam.trim() || !form.whatsapp.trim()) {
      setError('Nama dan nomor WhatsApp wajib diisi.')
      return
    }

    setSubmitting(true)
    try {
      await submitLoanRequest({
        data: {
          bookId: book.id,
          namaPeminjam: form.namaPeminjam.trim(),
          role: form.role,
          jenjang:
            form.role === 'mahasiswa'
              ? (form.jenjang as 'S1' | 'S2' | 'S3')
              : undefined,
          angkatan:
            form.role === 'mahasiswa' ? Number(form.angkatan) : undefined,
          whatsapp: form.whatsapp.trim(),
          email: form.email.trim() || undefined,
          keperluan: form.keperluan.trim() || undefined,
        },
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pengajuan.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!showForm) {
    return (
      <div className="border-t-2 border-[var(--black)] pt-4">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full px-3 py-2 border-2 border-[var(--accent)] text-[var(--accent)] text-sm font-medium uppercase tracking-wide hover:bg-[var(--accent-soft)]"
        >
          Ajukan Peminjaman
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t-2 border-[var(--black)] pt-4 flex flex-col gap-3"
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        Ajukan Peminjaman
      </h3>

      {error && (
        <div className="p-2 bg-[#fee] border border-[#fcc] text-[#c00] text-xs">
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="Nama lengkap"
        value={form.namaPeminjam}
        onChange={(e) => setForm((f) => ({ ...f, namaPeminjam: e.target.value }))}
        className="w-full text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
      />

      <div className="flex gap-2">
        <select
          value={form.role}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              role: e.target.value as 'mahasiswa' | 'dosen',
              jenjang: '',
              angkatan: '',
            }))
          }
          className="flex-1 text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
        >
          <option value="mahasiswa">Mahasiswa</option>
          <option value="dosen">Dosen</option>
        </select>

        {form.role === 'mahasiswa' && (
          <select
            value={form.jenjang}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                jenjang: e.target.value as 'S1' | 'S2' | 'S3' | '',
              }))
            }
            className="flex-1 text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
          >
            <option value="">Jenjang</option>
            <option value="S1">S1</option>
            <option value="S2">S2</option>
            <option value="S3">S3</option>
          </select>
        )}
      </div>

      {form.role === 'mahasiswa' && (
        <input
          type="number"
          placeholder="Angkatan (mis. 2023)"
          value={form.angkatan}
          onChange={(e) => setForm((f) => ({ ...f, angkatan: e.target.value }))}
          className="w-full text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
        />
      )}

      <input
        type="text"
        placeholder="Nomor WhatsApp"
        value={form.whatsapp}
        onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
        className="w-full text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
      />

      <input
        type="email"
        placeholder="Email (opsional)"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className="w-full text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
      />

      <textarea
        placeholder="Keperluan (opsional)"
        value={form.keperluan}
        onChange={(e) => setForm((f) => ({ ...f, keperluan: e.target.value }))}
        rows={2}
        className="w-full text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)] resize-none"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-3 py-2 bg-[var(--black)] text-[var(--white)] text-sm font-medium uppercase tracking-wide disabled:opacity-50"
        >
          {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="px-3 py-2 border-2 border-[var(--gray-200)] text-sm text-[var(--gray-600)]"
        >
          Batal
        </button>
      </div>
    </form>
  )
}
