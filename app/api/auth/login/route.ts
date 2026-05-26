import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { alert } from '@/lib/alerts'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  if (!rateLimit(`login:${ip}`, 10, 300_000)) {
    await alert('auth', 'Login rate limit hit by IP', { ip })
    return Response.json(
      { error: 'Too many login attempts. Please try again in a few minutes.' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 })
  }

  if (!rateLimit(`login:${email.toLowerCase()}`, 5, 300_000)) {
    return Response.json(
      { error: 'Too many login attempts for this account. Please try again in a few minutes.' },
      { status: 429 }
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    logger.warn('auth', 'Login failed', { email: email.toLowerCase(), ip })
    return Response.json(
      { error: 'Incorrect email or password' },
      { status: 401 }
    )
  }

  logger.info('auth', 'Login successful', { email: email.toLowerCase(), ip })
  return Response.json({ success: true })
}
