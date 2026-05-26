'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrderStatusBadge } from './order-status-badge'
import { formatCurrency, formatOrderNumber, timeAgo } from '@/lib/format'
import { STATUS_TRANSITIONS, STATUS_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import type { Order, OrderStatus } from '@/types'
import { MessageCircle, ChevronRight, ShoppingBag, CheckSquare, Square, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'

function QuickAction({ orderId, currentStatus }: { orderId: string; currentStatus: OrderStatus }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const transitions = STATUS_TRANSITIONS[currentStatus]
  const nextStatus = transitions[0]

  if (!nextStatus) return null

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to update')
        return
      }
      toast.success(`Updated to ${STATUS_LABELS[nextStatus]}`)
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (currentStatus === 'REQUEST_RECEIVED') return null

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="px-3 py-2 sm:px-2.5 sm:py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors shrink-0 touch-manipulation"
    >
      {loading ? '...' : STATUS_LABELS[nextStatus]}
    </button>
  )
}

export function OrderList({ orders, showBulk = false }: { orders: Order[]; showBulk?: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const router = useRouter()

  const commonTransitions = useMemo(() => {
    if (selected.size === 0) return []
    const selectedOrders = orders.filter((o) => selected.has(o.id))
    const transitionSets = selectedOrders.map((o) => STATUS_TRANSITIONS[o.status])
    return transitionSets.reduce((common, transitions) =>
      common.filter((t) => transitions.includes(t))
    )
  }, [selected, orders])

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === orders.length) setSelected(new Set())
    else setSelected(new Set(orders.map((o) => o.id)))
  }

  async function bulkUpdate(newStatus: OrderStatus) {
    setBulkLoading(true)
    let success = 0
    let failed = 0

    for (const id of selected) {
      try {
        const res = await fetch(`/api/orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        if (res.ok) success++
        else failed++
      } catch {
        failed++
      }
    }

    if (success > 0) toast.success(`${success} order${success > 1 ? 's' : ''} updated to ${STATUS_LABELS[newStatus]}`)
    if (failed > 0) toast.error(`${failed} order${failed > 1 ? 's' : ''} failed to update`)
    setSelected(new Set())
    setBulkLoading(false)
    router.refresh()
  }

  if (!orders.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No orders found</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Orders will appear here as they come in</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {showBulk && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button type="button" onClick={selectAll} className="flex items-center gap-1.5 hover:text-foreground transition-colors touch-manipulation py-1">
            {selected.size === orders.length ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
            {selected.size === orders.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex-wrap">
          <span className="text-sm font-medium text-indigo-400">{selected.size} selected</span>
          <button type="button" title="Clear selection" onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground touch-manipulation">
            <X className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          {commonTransitions.map((status) => (
            <Button
              key={status}
              size="sm"
              disabled={bulkLoading}
              className={status === 'CANCELLED'
                ? 'bg-red-600 hover:bg-red-700 h-7 text-xs'
                : 'bg-indigo-600 hover:bg-indigo-700 h-7 text-xs'}
              onClick={() => bulkUpdate(status)}
            >
              {bulkLoading ? '...' : STATUS_LABELS[status]}
            </Button>
          ))}
          {commonTransitions.length === 0 && (
            <span className="text-xs text-muted-foreground">No common status transitions</span>
          )}
        </div>
      )}

      {orders.map((order, i) => (
        <div
          key={order.id}
          className={`bg-card border rounded-lg hover:border-border transition-colors animate-fade-in-up stagger-${Math.min(i + 1, 5)} ${
            selected.has(order.id) ? 'border-indigo-500/50' : 'border-border'
          }`}
        >
          <div className="flex">
            {showBulk && (
              <button
                type="button"
                onClick={(e) => toggleSelect(order.id, e)}
                className="flex items-center px-3 shrink-0 touch-manipulation"
              >
                {selected.has(order.id)
                  ? <CheckSquare className="w-4 h-4 text-indigo-400" />
                  : <Square className="w-4 h-4 text-muted-foreground" />}
              </button>
            )}
            <Link href={`/orders/${order.id}`} className="block p-4 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {formatOrderNumber(order.order_number)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{order.request_text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.customer?.name ?? order.customer?.phone ?? 'Unknown'} &middot; {timeAgo(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {order.total_amount_pesewas ? (
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(order.total_amount_pesewas)}
                    </span>
                  ) : null}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                </div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2 px-4 pb-3 -mt-1">
            {order.customer?.phone && (
              <a
                href={`https://wa.me/${order.customer.phone.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 active:bg-green-500/30 transition-colors touch-manipulation"
              >
                <MessageCircle className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                WhatsApp
              </a>
            )}
            <QuickAction orderId={order.id} currentStatus={order.status} />
          </div>
        </div>
      ))}
    </div>
  )
}
