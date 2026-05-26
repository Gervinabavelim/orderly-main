import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const trackQuerySchema = z.object({
  phone: z.string().trim().min(7).max(20).optional(),
  order_number: z.string().trim().max(20).optional(),
}).refine(d => d.phone || d.order_number, {
  message: 'Provide a phone number or order number',
})

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(`track:${ip}`, 30, 60_000)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const searchParams = request.nextUrl.searchParams
  const parsed = trackQuerySchema.safeParse({
    phone: searchParams.get('phone') ?? undefined,
    order_number: searchParams.get('order_number') ?? undefined,
  })
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { phone, order_number: orderNumber } = parsed.data

  const supabase = createAdminClient()

  if (orderNumber) {
    const num = parseInt(orderNumber.replace(/\D/g, ''), 10)
    if (isNaN(num)) {
      return Response.json({ error: 'Invalid order number' }, { status: 400 })
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, request_text, request_images, status, total_amount_pesewas, delivery_address, created_at, updated_at, customer:customers(name, phone), status_history:order_status_history(to_status, note, created_at)')
      .eq('order_number', num)
      .order('created_at', { referencedTable: 'order_status_history', ascending: true })
      .single()

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 })
    }

    return Response.json({ orders: [order] })
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', phone!)
    .single()

  if (!customer) {
    return Response.json({ error: 'No orders found for this phone number' }, { status: 404 })
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, request_text, request_images, status, total_amount_pesewas, delivery_address, created_at, updated_at, customer:customers(name, phone), status_history:order_status_history(to_status, note, created_at)')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'order_status_history', ascending: true })
    .limit(20)

  if (!orders?.length) {
    return Response.json({ error: 'No orders found' }, { status: 404 })
  }

  return Response.json({ orders })
}
