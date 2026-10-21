import { useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSessionExpiry } from './session'

const TZ = 'Asia/Jakarta'

const timeFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TZ,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})
const hourFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hourCycle: 'h23',
  hour: 'numeric',
})
const dateFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function greetingFor(d: Date): string {
  const h = Number(hourFormat.format(d))
  if (h >= 4 && h < 11) return 'Selamat pagi'
  if (h >= 11 && h < 15) return 'Selamat siang'
  if (h >= 15 && h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

function timeParts(d: Date) {
  const parts = timeFormat.formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return { h: get('hour'), m: get('minute'), s: get('second') }
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}j ${String(m).padStart(2, '0')}m`
  return `${m}:${String(s).padStart(2, '0')}`
}

function useNow(seconds: boolean) {
  const [now, setNow] = useState<Date | null>(null)
  useLayoutEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const tick = () => {
      const d = new Date()
      setNow(d)
      const wait = seconds ? 1000 - (d.getTime() % 1000) : 60000 - (d.getTime() % 60000)
      t = setTimeout(tick, wait + 20)
    }
    tick()
    return () => clearTimeout(t)
  }, [seconds])
  return now
}

function useExpiryQuery(enabled = true) {
  return useQuery({
    queryKey: ['session-expiry'],
    queryFn: () => getSessionExpiry(),
    staleTime: Infinity,
    enabled,
  })
}

export function useSessionGuard(enabled: boolean) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, dataUpdatedAt } = useExpiryQuery(enabled)

  useEffect(() => {
    if (!data) return
    const ms = Math.max(0, dataUpdatedAt + data.remainingMs - Date.now())
    const t = setTimeout(() => {
      queryClient.clear()
      navigate({ to: '/admin/login' })
    }, ms)
    return () => clearTimeout(t)
  }, [data, dataUpdatedAt, queryClient, navigate])
}

function Colon() {
  return <span className="colon-blink">:</span>
}

export function AdminClock({ onDark = false }: { onDark?: boolean }) {
  const now = useNow(false)
  if (!now) return null
  const t = timeParts(now)
  return (
    <span
      className={`text-sm tabular-nums ${onDark ? 'text-[var(--cream)]/80' : 'text-[var(--muted)]'}`}
    >
      {t.h}
      <Colon />
      {t.m} <span className="text-xs">WIB</span>
    </span>
  )
}

export function AdminClockStrip() {
  const now = useNow(false)
  const t = now ? timeParts(now) : null
  return (
    <div className="mx-auto hidden h-8 max-w-[1280px] items-center justify-end gap-2 px-5 text-sm tabular-nums text-[var(--muted)] sm:px-8 xl:flex">
      {now && t && (
        <>
          <span>{dateFormat.format(now)}</span>
          <span aria-hidden="true">·</span>
          <span>
            <span className="font-medium text-[var(--ink)]">
              {t.h}
              <Colon />
              {t.m}
            </span>
            <span className="ml-1 text-xs">WIB</span>
          </span>
        </>
      )}
    </div>
  )
}

export function SessionCountdown({
  className = '',
  light = false,
}: {
  className?: string
  light?: boolean
}) {
  const now = useNow(true)
  const { data, dataUpdatedAt } = useExpiryQuery(false)
  if (!now || !data) return null
  const remaining = dataUpdatedAt + data.remainingMs - now.getTime()
  const low = remaining < 5 * 60 * 1000
  return (
    <span
      className={`tabular-nums ${
        low ? `font-semibold ${light ? 'text-red-600' : 'text-red-300'}` : className
      }`}
      title="Sesi admin berakhir otomatis 8 jam setelah login"
    >
      Sesi admin berakhir dalam {formatRemaining(remaining)}
    </span>
  )
}

export function DashboardGreeting({ nama }: { nama: string }) {
  const now = useNow(false)
  return (
    <div className="mb-6">
      <h1 className="mb-1 text-2xl font-semibold">Dashboard</h1>
      <p className="break-words text-[var(--muted)]">
        {now ? greetingFor(now) : 'Halo'}, {nama}.
      </p>
    </div>
  )
}
