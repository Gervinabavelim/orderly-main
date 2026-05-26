import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initializePayment } from '@/lib/paystack'
import { phoneToEmail } from '@/lib/format'
import { paymentInitSchema, parseBody } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { alert } from '@/lib/alerts'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`payment:${user.id}`, 10, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = parseBody(paymentInitSchema, await request.json())
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 })

  const { order_id } = parsed.data

  const { data: order } = await supabase
    .from('orders')
    .select('*, customer:customers(*)')
    .eq('id', order_id)
    .eq('user_id', user.id)
    .single()

  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })
  if (!order.total_amount_pesewas) return Response.json({ error: 'Order has no quote' }, { status: 400 })

  const reference = `ORD-${order.order_number}-${Date.now()}`

  const result = await initializePayment({
    amount_pesewas: order.total_amount_pesewas,
    email: phoneToEmail(order.customer?.phone ?? ''),
    reference,
    currency: 'GHS',
    metadata: { order_id, customer_phone: order.customer?.phone },
    channels: ['mobile_money'],
  })

  if (!result) {
    await alert('payment', 'Payment initialization failed', { orderId: order_id, reference })
    return Response.json({ error: 'Payment initialization failed' }, { status: 500 })
  }

  logger.info('payment', 'Payment initialized', { orderId: order_id, reference, amount: order.total_amount_pesewas })

  await supabase
    .from('orders')
    .update({ payment_reference: reference })
    .eq('id', order_id)

  await supabase.from('payment_transactions').insert({
    order_id,
    paystack_reference: reference,
    amount_pesewas: order.total_amount_pesewas,
    currency: 'GHS',
    status: 'pending',
    user_id: user.id,
  })

  return Response.json({ authorization_url: result.authorization_url, reference })
}
