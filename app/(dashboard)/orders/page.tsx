import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Orders' }
import { OrderList } from '@/components/orders/order-list'
import { NewOrderDialog } from '@/components/orders/new-order-dialog'
import { ExportButton } from '@/components/export-button'
import { OrderSearch } from '@/components/orders/order-search'
import { ALL_STATUSES, STATUS_LABELS } from '@/lib/constants'
import type { Order, OrderStatus } from '@/types'
import Link from 'next/link'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status: statusFilter, q: searchQuery } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('orders')
    .select('*, customer:customers(*)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusFilter && ALL_STATUSES.includes(statusFilter as OrderStatus)) {
    query = query.eq('status', statusFilter)
  }

  const { data: orders } = await query

  let filtered = (orders as Order[]) ?? []
  if (searchQuery?.trim()) {
    const q = searchQuery.trim().toLowerCase()
    filtered = filtered.filter((order) => {
      const name = order.customer?.name?.toLowerCase() ?? ''
      const phone = order.customer?.phone?.toLowerCase() ?? ''
      const text = order.request_text?.toLowerCase() ?? ''
      const orderNum = String(order.order_number)
      return name.includes(q) || phone.includes(q) || text.includes(q) || orderNum.includes(q)
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} orders</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton type="orders" />
          <NewOrderDialog />
        </div>
      </div>

      <OrderSearch defaultValue={searchQuery ?? ''} />

      <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 w-max md:w-auto md:flex-wrap">
          <Link
            href={`/orders${searchQuery ? `?q=${searchQuery}` : ''}`}
            className={`px-3 py-2 sm:py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap touch-manipulation ${
              !statusFilter ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </Link>
          {ALL_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/orders?status=${s}${searchQuery ? `&q=${searchQuery}` : ''}`}
              className={`px-3 py-2 sm:py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap touch-manipulation ${
                statusFilter === s ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {STATUS_LABELS[s]}
            </Link>
          ))}
        </div>
      </div>

      <OrderList orders={filtered} showBulk />
    </div>
  )
}
