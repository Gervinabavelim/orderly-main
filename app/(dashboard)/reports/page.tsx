import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Reports' }
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { RevenueChart } from '@/components/reports/revenue-chart'
import { TrendingUp, Wallet, ShoppingBag, ArrowUpRight } from 'lucide-react'

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: completedOrders } = await supabase
    .from('orders')
    .select('total_amount_pesewas, item_cost_pesewas, service_fee_pesewas, delivery_fee_pesewas')
    .in('status', ['COMPLETED', 'DELIVERED'])

  const orders = completedOrders ?? []
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount_pesewas ?? 0), 0)
  const totalItemCost = orders.reduce((sum, o) => sum + (o.item_cost_pesewas ?? 0), 0)
  const totalServiceFees = orders.reduce((sum, o) => sum + (o.service_fee_pesewas ?? 0), 0)
  const totalDeliveryFees = orders.reduce((sum, o) => sum + (o.delivery_fee_pesewas ?? 0), 0)
  const grossProfit = totalRevenue - totalItemCost
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('total_amount_pesewas, created_at, status')
    .gte('created_at', last7Days[0])

  const dayMap = new Map(last7Days.map((d) => [d, { date: d, revenue: 0, orders: 0 }]))
  for (const o of recentOrders ?? []) {
    const day = o.created_at.split('T')[0]
    const entry = dayMap.get(day)
    if (entry) {
      entry.orders++
      if (['COMPLETED', 'DELIVERED'].includes(o.status)) {
        entry.revenue += o.total_amount_pesewas ?? 0
      }
    }
  }
  const chartData = last7Days.map((d) => dayMap.get(d)!)

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'text-indigo-400' },
    { label: 'Gross Profit', value: formatCurrency(grossProfit), icon: Wallet, color: 'text-green-400' },
    { label: 'Completed Orders', value: String(orders.length), icon: ShoppingBag, color: 'text-blue-400' },
    { label: 'Avg Order Value', value: formatCurrency(avgOrderValue), icon: ArrowUpRight, color: 'text-purple-400' },
  ]

  const breakdownStats = [
    { label: 'Item Costs', value: formatCurrency(totalItemCost) },
    { label: 'Service Fees Earned', value: formatCurrency(totalServiceFees) },
    { label: 'Delivery Fees Earned', value: formatCurrency(totalDeliveryFees) },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Revenue and business overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} className={`bg-card border-border animate-fade-in-up stagger-${i + 1}`}>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${stat.color}`} />
                <div className="min-w-0">
                  <p className="text-base sm:text-xl font-bold text-foreground truncate">{stat.value}</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Weekly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {breakdownStats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <span className="text-sm font-medium text-foreground">{stat.value}</span>
              </div>
            ))}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground/80">Total Revenue</span>
                <span className="text-sm font-bold text-foreground">{formatCurrency(totalRevenue)}</span>
              </div>
              {totalRevenue > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Profit Margin</span>
                  <span className={`text-sm font-medium ${grossProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {((grossProfit / totalRevenue) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
