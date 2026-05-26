import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS } from '@/lib/sms'
import { getOrderPlacedMessage } from '@/lib/constants'
import { formatOrderNumber } from '@/lib/format'
import { rateLimit } from '@/lib/rate-limit'
import { orderPlaceSchema, parseBody } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { alert } from '@/lib/alerts'

export async function POST(request: Request) {
  const ownerId = process.env.DEFAULT_OWNER_USER_ID
  if (!ownerId) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(`place:${ip}`, 10, 60_000)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const parsed = parseBody(orderPlaceSchema, await request.json())
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 })

  const { customer_name, customer_phone, request_text, delivery_address, request_images } = parsed.data

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', customer_phone)
    .eq('user_id', ownerId)
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
      .insert({ phone: customer_phone, name: customer_name || null, user_id: ownerId })
      .select('id')
      .single()
    if (custErr || !newCustomer) {
      logger.error('order-place', 'Failed to create customer', { phone: customer_phone, error: custErr?.message })
      return Response.json({ error: 'Failed to create customer' }, { status: 500 })
    }
    customerId = newCustomer.id
  }

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      request_text,
      request_images,
      delivery_address: delivery_address || null,
      status: 'REQUEST_RECEIVED',
      user_id: ownerId,
    })
    .select('id, order_number')
    .single()

  if (orderErr || !order) {
    await alert('order-place', 'Customer order failed to save', { phone: customer_phone, error: orderErr?.message })
    return Response.json({ error: 'Failed to create order' }, { status: 500 })
  }

  await supabase.from('order_status_history').insert({
    order_id: order.id,
    to_status: 'REQUEST_RECEIVED',
    changed_by: 'customer',
    user_id: ownerId,
  })

  const smsMessage = getOrderPlacedMessage(
    customer_name || 'Customer',
    formatOrderNumber(order.order_number)
  )
  await sendSMS(customer_phone, smsMessage)

  logger.info('order-place', 'Order placed by customer', { orderId: order.id, orderNumber: order.order_number, phone: customer_phone })
  return Response.json({ order_number: order.order_number }, { status: 201 })
}
