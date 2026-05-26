import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatOrderNumber, formatCurrency } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/constants'
import type { OrderStatus } from '@/types'
import { exportTypeSchema, csvSanitize } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`export:${user.id}`, 10, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const typeResult = exportTypeSchema.safeParse(request.nextUrl.searchParams.get('type') ?? undefined)
  const type = typeResult.success ? typeResult.data : 'orders'

  if (type === 'customers') {
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const header = 'Name,Phone,Notes,Created'
    const rows = (customers ?? []).map((c) =>
      [
        csvSanitize(c.name ?? ''),
        c.phone,
        csvSanitize(c.notes ?? ''),
        new Date(c.created_at).toLocaleDateString('en-GH'),
      ].join(',')
    )

    return new Response([header, ...rows].join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers-${dateStamp()}.csv"`,
      },
    })
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('*, customer:customers(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const header = 'Order Number,Customer,Phone,Status,Item Cost,Service Fee,Delivery Fee,Total,Refund,Payment Channel,Created'
  const rows = (orders ?? []).map((o) =>
    [
      formatOrderNumber(o.order_number),
      csvSanitize(o.customer?.name ?? ''),
      o.customer?.phone ?? '',
      STATUS_LABELS[o.status as OrderStatus] ?? o.status,
      o.item_cost_pesewas ? formatCurrency(o.item_cost_pesewas) : '',
      o.service_fee_pesewas ? formatCurrency(o.service_fee_pesewas) : '',
      o.delivery_fee_pesewas ? formatCurrency(o.delivery_fee_pesewas) : '',
      o.total_amount_pesewas ? formatCurrency(o.total_amount_pesewas) : '',
      o.refund_amount_pesewas ? formatCurrency(o.refund_amount_pesewas) : '',
      o.payment_channel ?? '',
      new Date(o.created_at).toLocaleDateString('en-GH'),
    ].join(',')
  )

  return new Response([header, ...rows].join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="orders-${dateStamp()}.csv"`,
    },
  })
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}
