import { STATUS_LABELS } from '@/lib/constants'

import type { OrderStatusHistory, OrderStatus } from '@/types'
import {
  ShoppingBag, FileText, ThumbsUp, CreditCard, Search, Package,
  Truck, CheckCircle, XCircle, RotateCcw, AlertTriangle, Ban
} from 'lucide-react'

const STATUS_ICON: Record<string, { icon: typeof ShoppingBag; color: string }> = {
  REQUEST_RECEIVED: { icon: ShoppingBag, color: 'text-blue-400 bg-blue-400/10' },
  QUOTED: { icon: FileText, color: 'text-yellow-400 bg-yellow-400/10' },
  ACCEPTED: { icon: ThumbsUp, color: 'text-orange-400 bg-orange-400/10' },
  PAID: { icon: CreditCard, color: 'text-green-400 bg-green-400/10' },
  SOURCING: { icon: Search, color: 'text-purple-400 bg-purple-400/10' },
  SOURCING_DELAYED: { icon: AlertTriangle, color: 'text-amber-400 bg-amber-400/10' },
  SOURCED: { icon: Package, color: 'text-indigo-400 bg-indigo-400/10' },
  OUT_FOR_DELIVERY: { icon: Truck, color: 'text-cyan-400 bg-cyan-400/10' },
  DELIVERED: { icon: CheckCircle, color: 'text-green-400 bg-green-400/10' },
  COMPLETED: { icon: CheckCircle, color: 'text-indigo-400 bg-indigo-400/10' },
  CANCELLED: { icon: XCircle, color: 'text-red-400 bg-red-400/10' },
  REFUND_PENDING: { icon: RotateCcw, color: 'text-indigo-400 bg-indigo-400/10' },
  REFUNDED: { icon: RotateCcw, color: 'text-indigo-400 bg-indigo-400/10' },
  DISPUTED: { icon: Ban, color: 'text-red-400 bg-red-400/10' },
}

function formatChangedBy(value: string): string {
  if (value === 'system' || value === 'webhook') return value
  if (value.includes('@')) return value.split('@')[0]
  if (value.length > 20) return 'admin'
  return value
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function OrderTimeline({ history }: { history: OrderStatusHistory[] }) {
  if (!history.length) return null

  return (
    <div className="space-y-0">
      {history.map((entry, i) => {
        const meta = STATUS_ICON[entry.to_status] ?? { icon: ShoppingBag, color: 'text-gray-400 bg-gray-400/10' }
        const Icon = meta.icon
        const [iconColor, iconBg] = meta.color.split(' ')

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
              </div>
              {i < history.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
            </div>
            <div className="pb-4 pt-0.5">
              <p className="text-sm font-medium text-foreground">
                {STATUS_LABELS[entry.to_status as OrderStatus] ?? entry.to_status}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatTimestamp(entry.created_at)} &middot; {formatChangedBy(entry.changed_by)}
              </p>
              {entry.note && <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
