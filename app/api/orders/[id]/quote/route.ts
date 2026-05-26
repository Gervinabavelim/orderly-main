import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppButtons } from '@/lib/whatsapp'
import { formatOrderNumber, formatCurrency } from '@/lib/format'
import { quoteSchema, parseBody } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`quote:${user.id}`, 20, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = parseBody(quoteSchema, await request.json())
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 })

  const { item_cost_pesewas, service_fee_pesewas, delivery_fee_pesewas, quote_note } = parsed.data
  const total = item_cost_pesewas + service_fee_pesewas + delivery_fee_pesewas

  const { data: order } = await supabase
    .from('orders')
    .select('*, customer:customers(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'REQUEST_RECEIVED') {
    return Response.json({ error: 'Order already quoted' }, { status: 400 })
  }

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'QUOTED',
      item_cost_pesewas,
      service_fee_pesewas,
      delivery_fee_pesewas,
      total_amount_pesewas: total,
      quote_note: quote_note ?? null,
    })
    .eq('id', id)

  if (error) {
    logger.error('quote', 'Failed to save quote', { orderId: id, error: error.message })
    return Response.json({ error: error.message }, { status: 500 })
  }

  logger.info('quote', 'Quote sent', { orderId: id, total })

  await supabase.from('order_status_history').insert({
    order_id: id,
    from_status: 'REQUEST_RECEIVED',
    to_status: 'QUOTED',
    changed_by: 'owner',
    user_id: user.id,
  })

  if (order.customer?.phone) {
    const orderNum = formatOrderNumber(order.order_number)
    const quoteMsg = [
      `Hi ${order.customer.name ?? 'Customer'}! Here's your quote for ${orderNum}:`,
      '',
      `Items: ${formatCurrency(item_cost_pesewas)}`,
      `Service fee: ${formatCurrency(service_fee_pesewas)}`,
      `Delivery: ${formatCurrency(delivery_fee_pesewas)}`,
      `---`,
      `Total: ${formatCurrency(total)}`,
      quote_note ? `\n${quote_note}` : '',
    ].join('\n')

    await sendWhatsAppButtons(
      order.customer.phone,
      quoteMsg,
      [
        { id: `accept_quote_${id}`, title: 'Accept' },
        { id: `cancel_${id}`, title: 'Cancel' },
      ]
    )
  }

  return Response.json({ success: true })
}
