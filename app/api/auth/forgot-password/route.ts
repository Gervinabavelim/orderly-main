import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(`forgot:${ip}`, 3, 300_000)) {
    return Response.json({ success: true })
  }

  const body = await request.json()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) {
    return Response.json({ success: true })
  }

  if (!rateLimit(`forgot:${email}`, 3, 300_000)) {
    return Response.json({ success: true })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const supabase = createAdminClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  })

  logger.info('auth', 'Password reset requested', { ip })
  return Response.json({ success: true })
}
