import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STATUS_TRANSITIONS, getStatusNotificationMessage } from '@/lib/constants'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendSMS } from '@/lib/sms'
import { formatOrderNumber, formatCurrency } from '@/lib/format'
import type { OrderStatus } from '@/types'
import { logger } from '@/lib/logger'
import { orderUpdateSchema, parseBody } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`order-detail:${user.id}`, 60, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, customer:customers(*), status_history:order_status_history(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 404 })

  return Response.json({ order })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`order-update:${user.id}`, 30, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = parseBody(orderUpdateSchema, await request.json())
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 })

  const body = parsed.data
  const newStatus = body.status

  const { data: order } = await supabase
    .from('orders')
    .select('*, customer:customers(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })

  if (body.delivery_address !== undefined || body.delivery_notes !== undefined) {
    const fieldUpdates: Record<string, unknown> = {}
    if (body.delivery_address !== undefined) fieldUpdates.delivery_address = body.delivery_address
    if (body.delivery_notes !== undefined) fieldUpdates.delivery_notes = body.delivery_notes
    const { error } = await supabase.from('orders').update(fieldUpdates).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!newStatus) return Response.json({ success: true })
  }

  if (newStatus) {
    const allowed = STATUS_TRANSITIONS[order.status as OrderStatus]
    if (!allowed?.includes(newStatus)) {
      return Response.json(
        { error: `Cannot transition from ${order.status} to ${newStatus}` },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'DELIVERED') updates.delivered_at = new Date().toISOString()
    if (newStatus === 'CANCELLED') updates.cancel_reason = body.cancel_reason ?? null
    if (newStatus === 'REFUND_PENDING' && body.refund_amount_pesewas) {
      updates.refund_amount_pesewas = body.refund_amount_pesewas
    }
    if (newStatus === 'REFUNDED') updates.refunded_at = new Date().toISOString()

    const { error } = await supabase.from('orders').update(updates).eq('id', id)
    if (error) {
      logger.error('order-update', 'Failed to update order', { orderId: id, newStatus, error: error.message })
      return Response.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('order_status_history').insert({
      order_id: id,
      from_status: order.status,
      to_status: newStatus,
      changed_by: 'owner',
      note: body.note ?? null,
      user_id: user.id,
    })

    logger.info('order-update', 'Order status changed', { orderId: id, from: order.status, to: newStatus })

    if (order.customer?.phone) {
      const notification = getStatusNotificationMessage(newStatus, {
        name: order.customer.name ?? 'Customer',
        orderNumber: formatOrderNumber(order.order_number),
        total: order.total_amount_pesewas ? formatCurrency(order.total_amount_pesewas) : undefined,
        reason: body.cancel_reason ?? undefined,
      })
      if (notification) {
        await sendWhatsAppMessage(order.customer.phone, notification)
        await sendSMS(order.customer.phone, notification)
      }
    }
  }

  return Response.json({ success: true })
}
