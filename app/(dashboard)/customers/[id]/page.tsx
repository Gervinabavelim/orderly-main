import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OrderList } from '@/components/orders/order-list'
import { formatCurrency } from '@/lib/format'
import { timeAgo } from '@/lib/format'
import type { Order } from '@/types'
import Link from 'next/link'
import { ArrowLeft, Phone, ShoppingBag, Wallet, Clock, StickyNote } from 'lucide-react'
import { CustomerNotes } from '@/components/customers/customer-notes'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) notFound()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, customer:customers(*)')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  const allOrders = (orders as Order[]) ?? []
  const totalSpent = allOrders.reduce((sum, o) => sum + (o.total_amount_pesewas ?? 0), 0)
  const completedCount = allOrders.filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status)).length
  const lastOrder = allOrders[0]

  function getInitials(name: string | null): string {
    if (!name) return '?'
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-bold shrink-0">
            {getInitials(customer.name)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{customer.name ?? 'Unknown Customer'}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" />
              <a href={`https://wa.me/${customer.phone.replace('+', '')}`} className="text-indigo-400 hover:text-indigo-300">
                {customer.phone}
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <ShoppingBag className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{allOrders.length}</p>
          <p className="text-[11px] text-muted-foreground">Total Orders</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Wallet className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalSpent)}</p>
          <p className="text-[11px] text-muted-foreground">Total Spent</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Clock className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground mt-0.5">{lastOrder ? timeAgo(lastOrder.created_at) : 'N/A'}</p>
          <p className="text-[11px] text-muted-foreground">Last Order</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <StickyNote className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
        </div>
        <CustomerNotes customerId={customer.id} initialNotes={customer.notes} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Order History ({allOrders.length})</h2>
        <OrderList orders={allOrders} />
      </div>
    </div>
  )
}
