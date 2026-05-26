import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Dashboard' }
import { Card, CardContent } from '@/components/ui/card'
import { RealtimeOrderList } from '@/components/orders/realtime-order-list'
import { formatCurrency, formatOrderNumber, timeAgo } from '@/lib/format'
import type { Order } from '@/types'
import Link from 'next/link'
import { ShoppingBag, Clock, Truck, CheckCircle, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const firstName = (user?.user_metadata?.full_name ?? 'there').split(' ')[0]

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [
    { count: newRequests },
    { count: awaitingPayment },
    { count: inProgress },
    { count: completedToday },
    { data: recentOrders },
    { data: todayRevenue },
    { data: yesterdayRevenue },
    { data: attentionOrders },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'REQUEST_RECEIVED'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['QUOTED', 'ACCEPTED']),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['PAID', 'SOURCING', 'SOURCED', 'OUT_FOR_DELIVERY', 'SOURCING_DELAYED']),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED').gte('updated_at', today),
    supabase.from('orders').select('*, customer:customers(*)').order('created_at', { ascending: false }).limit(10),
    supabase.from('orders').select('total_amount_pesewas').eq('status', 'COMPLETED').gte('updated_at', today),
    supabase.from('orders').select('total_amount_pesewas').eq('status', 'COMPLETED').gte('updated_at', yesterday).lt('updated_at', today),
    supabase.from('orders').select('id, order_number, status, request_text, updated_at, customer:customers(name)').in('status', ['DISPUTED', 'SOURCING_DELAYED', 'REFUND_PENDING']).order('updated_at', { ascending: true }).limit(5),
  ])

  const todayTotal = (todayRevenue ?? []).reduce((sum, o) => sum + (o.total_amount_pesewas ?? 0), 0)
  const yesterdayTotal = (yesterdayRevenue ?? []).reduce((sum, o) => sum + (o.total_amount_pesewas ?? 0), 0)
  const revenueDiff = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0
  const revenueUp = todayTotal >= yesterdayTotal

  const stats = [
    { label: 'New Requests', value: newRequests ?? 0, icon: ShoppingBag, color: 'text-blue-400', href: '/orders?status=REQUEST_RECEIVED' },
    { label: 'Awaiting Payment', value: awaitingPayment ?? 0, icon: Clock, color: 'text-yellow-400', href: '/orders?status=QUOTED' },
    { label: 'In Progress', value: inProgress ?? 0, icon: Truck, color: 'text-purple-400', href: '/orders?status=PAID' },
    { label: 'Completed Today', value: completedToday ?? 0, icon: CheckCircle, color: 'text-indigo-400', href: '/orders?status=COMPLETED' },
  ]

  const alerts = ((attentionOrders ?? []) as Array<{
    id: string
    order_number: number
    status: string
    request_text: string
    updated_at: string
    customer: Array<{ name: string | null }>
  }>).map((o) => ({ ...o, customer: o.customer?.[0] ?? null }))

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{getGreeting()}, {firstName}</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-muted-foreground text-sm">
            Today&apos;s revenue: <span className="text-foreground font-medium">{formatCurrency(todayTotal)}</span>
          </p>
          {yesterdayTotal > 0 && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${revenueUp ? 'text-green-400' : 'text-red-400'}`}>
              {revenueUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(revenueDiff).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <Link key={stat.label} href={stat.href} className={`animate-fade-in-up stagger-${i + 1}`}>
            <Card className="bg-card border-border hover:border-border transition-colors">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${stat.color}`} />
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{stat.value}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-400">Needs Attention</h2>
          </div>
          <div className="space-y-2">
            {alerts.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg hover:border-amber-500/20 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{formatOrderNumber(order.order_number)}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">
                      {order.status === 'DISPUTED' ? 'Disputed' : order.status === 'SOURCING_DELAYED' ? 'Delayed' : 'Refund Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {order.customer?.name ?? 'Unknown'} &middot; {timeAgo(order.updated_at)}
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link href="/orders" className="text-sm text-indigo-400 hover:text-indigo-300">
            View all
          </Link>
        </div>
        <RealtimeOrderList initialOrders={(recentOrders as Order[]) ?? []} />
      </div>
    </div>
  )
}
