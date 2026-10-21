import { createServerFn } from '@tanstack/react-start'
import { sql } from 'drizzle-orm'
import { db } from '../db'
import { getSupabaseServerClient } from '../lib/supabase/server'
import { requireApprovedAdmin } from './guards'
import { ADMIN_SESSION_MAX_MS } from './auth'

export const getSessionExpiry = createServerFn({ method: 'GET' }).handler(async () => {
  await requireApprovedAdmin()
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.auth.getClaims()
  const sessionId = data?.claims?.session_id
  if (!sessionId) return null
  const res = await db.execute(
    sql`select created_at from auth.sessions where id = ${sessionId}::uuid`,
  )
  const row = res.rows[0] as { created_at: Date } | undefined
  if (!row) return null
  const created = new Date(row.created_at).getTime()
  return { remainingMs: created + ADMIN_SESSION_MAX_MS - Date.now() }
})
