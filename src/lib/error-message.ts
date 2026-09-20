// Error validasi zod dari server function sampai ke client sebagai Error yang
// message-nya berupa array JSON. Bongkar jadi kalimat biasa; error lain
// (mis. throw new Error('...') di handler) dikembalikan apa adanya.
export function errorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback
  try {
    const parsed = JSON.parse(err.message)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const pesan = parsed
        .map((i) => (typeof i?.message === 'string' ? i.message : null))
        .filter(Boolean)
      if (pesan.length > 0) return pesan.join(' ')
    }
  } catch {
    // bukan JSON: pakai pesan aslinya
  }
  return err.message || fallback
}
