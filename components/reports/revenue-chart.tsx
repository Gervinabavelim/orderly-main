'use client'

interface DayData {
  date: string
  revenue: number
  orders: number
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split('T')[0]
}

export function RevenueChart({ data }: { data: DayData[] }) {
  if (!data.length) return null

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const maxOrders = Math.max(...data.map((d) => d.orders), 1)
  const totalWeekRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalWeekOrders = data.reduce((sum, d) => sum + d.orders, 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Revenue</h3>
          <span className="text-xs text-muted-foreground">₵{(totalWeekRevenue / 100).toFixed(0)} total</span>
        </div>
        <div className="flex items-end gap-1 sm:gap-1.5 h-28 sm:h-32">
          {data.map((day) => {
            const height = Math.max((day.revenue / maxRevenue) * 100, 4)
            const today = isToday(day.date)
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.revenue > 0 ? `₵${(day.revenue / 100).toFixed(0)}` : '0'}
                </span>
                <div
                  className={`w-full rounded-t-sm transition-all group-hover:opacity-80 ${
                    today
                      ? 'bg-gradient-to-t from-indigo-500 to-indigo-300'
                      : 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                  }`}
                  style={{ height: `${height}%` }}
                />
                <span className={`text-[11px] ${today ? 'text-indigo-400 font-medium' : 'text-muted-foreground/60'}`}>
                  {new Date(day.date).toLocaleDateString('en-GH', { weekday: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Orders</h3>
          <span className="text-xs text-muted-foreground">{totalWeekOrders} total</span>
        </div>
        <div className="flex items-end gap-1 sm:gap-1.5 h-20 sm:h-24">
          {data.map((day) => {
            const height = Math.max((day.orders / maxOrders) * 100, 4)
            const today = isToday(day.date)
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.orders}
                </span>
                <div
                  className={`w-full rounded-t-sm transition-all group-hover:opacity-80 ${
                    today
                      ? 'bg-gradient-to-t from-blue-500 to-blue-300'
                      : 'bg-gradient-to-t from-blue-600 to-blue-400'
                  }`}
                  style={{ height: `${height}%` }}
                />
                <span className={`text-[11px] ${today ? 'text-indigo-400 font-medium' : 'text-muted-foreground/60'}`}>
                  {new Date(day.date).toLocaleDateString('en-GH', { weekday: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
