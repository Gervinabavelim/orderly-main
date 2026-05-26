import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { orderCreateSchema, orderQuerySchema, parseBody } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`orders:${user.id}`, 60, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const searchParams = request.nextUrl.searchParams
  const parsed = parseBody(orderQuerySchema, {
    status: searchParams.get('status') ?? undefined,
    customer_id: searchParams.get('customer_id') ?? undefined,
  })
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 })

  let query = supabase
    .from('orders')
    .select('*, customer:customers(*)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (parsed.data.status) query = query.eq('status', parsed.data.status)
  if (parsed.data.customer_id) query = query.eq('customer_id', parsed.data.customer_id)

  const { data: orders, count, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ orders, count })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`order-create:${user.id}`, 20, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = parseBody(orderCreateSchema, await request.json())
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 })

  const { customer_name, customer_phone, request_text, delivery_address } = parsed.data

  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', customer_phone)
    .eq('user_id', user.id)
    .single()

  let customerId: string
  if (existing) {
    customerId = existing.id
    if (customer_name) {
      await supabase.from('customers').update({ name: customer_name }).eq('id', customerId)
    }
  } else {
    const { data: newCustomer, error: custErr } = await supabase
      .from('customers')
      .insert({ phone: customer_phone, name: customer_name || null, user_id: user.id })
      .select('id')
      .single()
    if (custErr || !newCustomer) {
      logger.error('order-create', 'Failed to create customer', { phone: customer_phone, error: custErr?.message })
      return Response.json({ error: custErr?.message ?? 'Failed to create customer' }, { status: 500 })
    }
    customerId = newCustomer.id
  }

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      request_text,
      delivery_address: delivery_address || null,
      status: 'REQUEST_RECEIVED',
      user_id: user.id,
    })
    .select('*, customer:customers(*)')
    .single()

  if (orderErr) {
    logger.error('order-create', 'Failed to create order', { customerId, error: orderErr.message })
    return Response.json({ error: orderErr.message }, { status: 500 })
  }

  await supabase.from('order_status_history').insert({
    order_id: order.id,
    to_status: 'REQUEST_RECEIVED',
    changed_by: 'dashboard',
    user_id: user.id,
  })

  logger.info('order-create', 'Order created from dashboard', { orderId: order.id, orderNumber: order.order_number })
  return Response.json({ order }, { status: 201 })
}
