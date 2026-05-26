import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { customerUpdateSchema, parseBody } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`customer-update:${user.id}`, 30, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = parseBody(customerUpdateSchema, await request.json())
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name || null
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes || null

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('customers').update(updates).eq('id', id).eq('user_id', user.id)
  if (error) {
    logger.error('customer-update', 'Failed to update customer', { customerId: id, error: error.message })
    return Response.json({ error: error.message }, { status: 500 })
  }

  logger.info('customer-update', 'Customer updated', { customerId: id, fields: Object.keys(updates) })
  return Response.json({ success: true })
}
