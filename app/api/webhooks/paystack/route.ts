import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/paystack'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { getStatusNotificationMessage } from '@/lib/constants'
import { formatOrderNumber, formatCurrency } from '@/lib/format'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
import { alert } from '@/lib/alerts'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(`wh-paystack:${ip}`, 60, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn('paystack-webhook', 'Invalid webhook signature', { signature })
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const body = JSON.parse(rawBody)
  const event = body.event as string

  if (event !== 'charge.success') {
    return Response.json({ status: 'ok' })
  }

  const data = body.data
  const reference = data.reference as string
  const channel = data.channel as string
  const transactionId = String(data.id)

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('payment_transactions')
    .select('status')
    .eq('paystack_reference', reference)
    .single()

  if (existing?.status === 'success') {
    logger.info('paystack-webhook', 'Duplicate webhook ignored', { reference })
    return Response.json({ status: 'ok' })
  }

  const { data: payment } = await supabase
    .from('payment_transactions')
    .update({
      status: 'success',
      paystack_transaction_id: transactionId,
      channel,
      paystack_payload: data,
    })
    .eq('paystack_reference', reference)
    .select('order_id')
    .single()

  if (!payment) {
    await alert('paystack-webhook', 'Payment received but no matching transaction found', { reference })
    return Response.json({ status: 'ok' })
  }

  const { data: order } = await supabase
    .from('orders')
    .update({
      status: 'PAID',
      paid_at: new Date().toISOString(),
      payment_channel: channel,
    })
    .eq('id', payment.order_id)
    .select('*, customer:customers(*)')
    .single()

  if (!order) {
    await alert('paystack-webhook', 'Payment succeeded but order not found', { orderId: payment.order_id, reference })
    return Response.json({ status: 'ok' })
  }

  logger.info('paystack-webhook', 'Payment processed successfully', { orderId: order.id, reference, channel })

  await supabase.from('order_status_history').insert({
    order_id: order.id,
    from_status: 'ACCEPTED',
    to_status: 'PAID',
    changed_by: 'paystack',
    user_id: order.user_id,
  })

  if (order.customer?.phone) {
    const notification = getStatusNotificationMessage('PAID', {
      name: order.customer.name ?? 'Customer',
      orderNumber: formatOrderNumber(order.order_number),
      total: formatCurrency(order.total_amount_pesewas),
    })
    if (notification) {
      await sendWhatsAppMessage(order.customer.phone, notification)
    }
  }

  return Response.json({ status: 'ok' })
}
