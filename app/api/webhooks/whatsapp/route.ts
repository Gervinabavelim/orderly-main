import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseWebhookPayload, sendWhatsAppMessage, sendWhatsAppButtons } from '@/lib/whatsapp'
import { getStatusNotificationMessage } from '@/lib/constants'
import { formatOrderNumber, formatCurrency, normalizePhone } from '@/lib/format'
import { initializePayment } from '@/lib/paystack'
import { phoneToEmail } from '@/lib/format'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(`wh-whatsapp:${ip}`, 120, 60_000)) {
    return Response.json({ status: 'ok' })
  }

  const ownerId = process.env.DEFAULT_OWNER_USER_ID
  if (!ownerId) return Response.json({ status: 'ok' })

  const body = await request.json()
  const supabase = createAdminClient()

  const msg = parseWebhookPayload(body)
  if (!msg) return Response.json({ status: 'ok' })

  const phone = normalizePhone(msg.from)

  const { data: customer } = await supabase
    .from('customers')
    .upsert({ phone, name: msg.name || null, user_id: ownerId }, { onConflict: 'phone,user_id' })
    .select()
    .single()

  if (!customer) return Response.json({ status: 'ok' })

  const msgBody = msg.text ? msg.text.slice(0, 5000) : null

  await supabase.from('whatsapp_messages').insert({
    wa_message_id: msg.messageId,
    customer_id: customer.id,
    direction: 'inbound',
    message_type: msg.type,
    body: msgBody,
    media_url: msg.imageUrl ?? null,
    raw_payload: body,
    user_id: ownerId,
  })

  if (msg.type === 'interactive' && msg.buttonPayload) {
    if (msg.buttonPayload.startsWith('accept_quote_')) {
      const orderId = msg.buttonPayload.replace('accept_quote_', '')
      if (uuidSchema.safeParse(orderId).success) {
        await handleQuoteAccept(supabase, orderId, customer, ownerId)
      }
      return Response.json({ status: 'ok' })
    }
    if (msg.buttonPayload.startsWith('cancel_')) {
      const orderId = msg.buttonPayload.replace('cancel_', '')
      if (uuidSchema.safeParse(orderId).success) {
        await handleCancel(supabase, orderId, customer, ownerId)
      }
      return Response.json({ status: 'ok' })
    }
  }

  const text = (msg.text ?? '').trim().toLowerCase()

  if (/^(status|check|my order)/i.test(text) || /^ORD-\d+/i.test(msg.text ?? '')) {
    await handleStatusCheck(supabase, customer, msg.text ?? '')
    return Response.json({ status: 'ok' })
  }

  if (/^(cancel|stop)/i.test(text)) {
    await handleCancelRequest(supabase, customer)
    return Response.json({ status: 'ok' })
  }

  const { data: order } = await supabase
    .from('orders')
    .insert({
      customer_id: customer.id,
      request_text: (msg.text ?? '[Image/media message]').slice(0, 5000),
      request_images: msg.imageUrl ? [msg.imageUrl] : [],
      status: 'REQUEST_RECEIVED',
      user_id: ownerId,
    })
    .select()
    .single()

  if (order) {
    await supabase.from('order_status_history').insert({
      order_id: order.id,
      to_status: 'REQUEST_RECEIVED',
      changed_by: 'customer',
      user_id: ownerId,
    })

    logger.info('wa-webhook', 'Order placed via WhatsApp', { orderId: order.id, orderNumber: order.order_number, phone })

    const notification = getStatusNotificationMessage('REQUEST_RECEIVED', {
      name: customer.name ?? 'Customer',
      orderNumber: formatOrderNumber(order.order_number),
    })
    if (notification) {
      await sendWhatsAppMessage(phone, notification)
    }
  }

  return Response.json({ status: 'ok' })
}

async function handleQuoteAccept(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: string,
  customer: { id: string; phone: string; name: string | null },
  ownerId: string
) {
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order || order.status !== 'QUOTED') return

  await supabase
    .from('orders')
    .update({ status: 'ACCEPTED' })
    .eq('id', orderId)

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: 'QUOTED',
    to_status: 'ACCEPTED',
    changed_by: 'customer',
    user_id: ownerId,
  })

  logger.info('wa-webhook', 'Quote accepted by customer', { orderId, phone: customer.phone })

  const reference = `ORD-${order.order_number}-${Date.now()}`
  const paymentResult = await initializePayment({
    amount_pesewas: order.total_amount_pesewas,
    email: phoneToEmail(customer.phone),
    reference,
    currency: 'GHS',
    metadata: { order_id: orderId, customer_phone: customer.phone },
  })

  if (paymentResult) {
    await supabase
      .from('orders')
      .update({ payment_reference: reference })
      .eq('id', orderId)

    await supabase.from('payment_transactions').insert({
      order_id: orderId,
      paystack_reference: reference,
      amount_pesewas: order.total_amount_pesewas,
      currency: 'GHS',
      status: 'pending',
      user_id: ownerId,
    })

    await sendWhatsAppMessage(
      customer.phone,
      `Great! To pay ${formatCurrency(order.total_amount_pesewas)} for ${formatOrderNumber(order.order_number)}, tap the link below:\n\n${paymentResult.authorization_url}\n\nYou can pay with MTN MoMo, Vodafone Cash, or card.`
    )
  }
}

async function handleCancel(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: string,
  customer: { id: string; phone: string; name: string | null },
  ownerId: string
) {
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order) return

  const cancellable = ['REQUEST_RECEIVED', 'QUOTED', 'ACCEPTED']
  if (!cancellable.includes(order.status)) {
    await sendWhatsAppMessage(
      customer.phone,
      `Sorry, ${formatOrderNumber(order.order_number)} cannot be cancelled at this stage. Please contact us directly.`
    )
    return
  }

  await supabase
    .from('orders')
    .update({ status: 'CANCELLED', cancel_reason: 'Cancelled by customer' })
    .eq('id', orderId)

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: order.status,
    to_status: 'CANCELLED',
    changed_by: 'customer',
    user_id: ownerId,
  })

  logger.info('wa-webhook', 'Order cancelled by customer', { orderId, phone: customer.phone })

  const notification = getStatusNotificationMessage('CANCELLED', {
    name: customer.name ?? 'Customer',
    orderNumber: formatOrderNumber(order.order_number),
    reason: 'Cancelled by customer',
  })
  if (notification) {
    await sendWhatsAppMessage(customer.phone, notification)
  }
}

async function handleStatusCheck(
  supabase: ReturnType<typeof createAdminClient>,
  customer: { id: string; phone: string; name: string | null },
  text: string
) {
  const orderMatch = text.match(/ORD-(\d+)/i)
  let query = supabase.from('orders').select('*')

  if (orderMatch) {
    query = query.eq('order_number', parseInt(orderMatch[1], 10))
  } else {
    query = query.eq('customer_id', customer.id)
      .not('status', 'in', '("COMPLETED","CANCELLED","REFUNDED")')
      .order('created_at', { ascending: false })
      .limit(1)
  }

  const { data: orders } = await query

  if (!orders?.length) {
    await sendWhatsAppMessage(customer.phone, "You don't have any active orders right now.")
    return
  }

  const order = orders[0]
  const statusMsg = `${formatOrderNumber(order.order_number)} status: ${order.status.replace(/_/g, ' ')}\nPlaced: ${new Date(order.created_at).toLocaleDateString('en-GH')}${order.total_amount_pesewas ? '\nTotal: ' + formatCurrency(order.total_amount_pesewas) : '\nQuote pending'}`

  await sendWhatsAppMessage(customer.phone, statusMsg)
}

async function handleCancelRequest(
  supabase: ReturnType<typeof createAdminClient>,
  customer: { id: string; phone: string; name: string | null }
) {
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customer.id)
    .in('status', ['REQUEST_RECEIVED', 'QUOTED', 'ACCEPTED'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (!orders?.length) {
    await sendWhatsAppMessage(customer.phone, "You don't have any active orders that can be cancelled.")
    return
  }

  const order = orders[0]
  await sendWhatsAppButtons(
    customer.phone,
    `Cancel ${formatOrderNumber(order.order_number)}? This cannot be undone.`,
    [
      { id: `cancel_${order.id}`, title: 'Yes, Cancel' },
      { id: `keep_${order.id}`, title: 'Keep Order' },
    ]
  )
}
