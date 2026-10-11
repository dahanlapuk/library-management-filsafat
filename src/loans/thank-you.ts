const FROM = 'Biblioteka Departemen Filsafat UI <biblioteka@mail.filsafatui.app>'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendThankYouEmail(input: {
  to: string
  nama: string
  judul: string
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error('RESEND_API_KEY belum diatur, email terima kasih dilewati')
    return false
  }

  const text =
    `Halo ${input.nama},\n\n` +
    `Terima kasih sudah meminjam dan mengembalikan buku "${input.judul}" ` +
    `di Biblioteka Departemen Filsafat UI.\n\n` +
    `Email ini dikirim otomatis dan tidak perlu dibalas.`

  const html =
    `<p>Halo ${esc(input.nama)},</p>` +
    `<p>Terima kasih sudah meminjam dan mengembalikan buku <strong>${esc(input.judul)}</strong> ` +
    `di Biblioteka Departemen Filsafat UI.</p>` +
    `<p style="color:#666;font-size:13px">Email ini dikirim otomatis dan tidak perlu dibalas.</p>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [input.to],
        subject: 'Terima kasih sudah meminjam buku',
        text,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.error('Resend gagal', res.status)
      return false
    }
    return true
  } catch (err) {
    console.error('Resend error', err instanceof Error ? err.message : err)
    return false
  }
}
