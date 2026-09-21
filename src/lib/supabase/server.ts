import { getCookies, setCookie } from '@tanstack/react-start/server'
import { createServerClient } from '@supabase/ssr'

export function getSupabaseServerClient() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(getCookies()).map(([name, value]) => ({
            name,
            value,
          }))
        },
        setAll(cookies) {
          cookies.forEach((cookie) => {
            // Argumen ketiga (options) dari @supabase/ssr WAJIB diteruskan,
            // kalau tidak httpOnly/secure/sameSite hilang begitu saja
            // (ketauan pas cek DevTools di produksi Vercel: flag kosong semua).
            setCookie(cookie.name, cookie.value, {
              ...cookie.options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
            })
          })
        },
      },
    },
  )
}
