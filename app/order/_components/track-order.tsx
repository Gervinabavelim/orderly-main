'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import type { OrderStatus } from '@/types'
import { Search, Package, ArrowLeft, CheckCircle2, Circle, MapPin, CreditCard } from 'lucide-react'

interface TrackedOrder {
  id: string
  order_number: number
  request_text: string
  request_images: string[]
  status: OrderStatus
  total_amount_pesewas: number | null
  delivery_address: string | null
  created_at: string
  updated_at: string
  customer: { name: string | null; phone: string } | null
  status_history: { to_status: string; note: string | null; created_at: string }[]
}

const CUSTOMER_STEPS = [
  { label: 'Order Received', description: 'We got your request', statuses: ['REQUEST_RECEIVED'] },
  { label: 'Processing', description: 'Preparing your quote', statuses: ['QUOTED', 'ACCEPTED', 'PAID'] },
  { label: 'Getting Your Items', description: 'Sourcing and picking up', statuses: ['SOURCING', 'SOURCING_DELAYED', 'SOURCED'] },
  { label: 'On the Way', description: 'Out for delivery', statuses: ['OUT_FOR_DELIVERY'] },
  { label: 'Delivered', description: 'Order complete!', statuses: ['DELIVERED', 'COMPLETED'] },
]

function getCustomerStep(status: OrderStatus): number {
  for (let i = 0; i < CUSTOMER_STEPS.length; i++) {
    if (CUSTOMER_STEPS[i].statuses.includes(status)) return i
  }
  return -1
}

function getStatusMessage(status: OrderStatus): string {
  const messages: Partial<Record<OrderStatus, string>> = {
    REQUEST_RECEIVED: 'We have received your order and will review it shortly.',
    QUOTED: 'We have sent you a quote. Please check your WhatsApp.',
    ACCEPTED: 'Quote accepted! Please make payment to proceed.',
    PAID: 'Payment received! We are now getting your items.',
    SOURCING: 'We are picking up your items. Hang tight!',
    SOURCING_DELAYED: 'Sourcing is taking a bit longer. We\'ll update you soon.',
    SOURCED: 'Your items are ready and will be dispatched soon.',
    OUT_FOR_DELIVERY: 'Your order is on its way to you!',
    DELIVERED: 'Your order has been delivered. Thank you!',
    COMPLETED: 'Order complete. Thank you for shopping with us!',
    CANCELLED: 'This order has been cancelled.',
    REFUND_PENDING: 'Your refund is being processed.',
    REFUNDED: 'Your refund has been sent.',
  }
  return messages[status] ?? ''
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GH', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function TrackOrder({ initialSearch }: { initialSearch?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const didAutoSearch = useRef(false)

  useEffect(() => {
    if (initialSearch && !didAutoSearch.current) {
      didAutoSearch.current = true
      setSearchValue(initialSearch)
      doSearch(initialSearch)
    }
  }, [initialSearch])

  async function doSearch(input: string) {
    setLoading(true)
    setError('')
    setOrders(null)

    const value = input.trim()
    const isPhone = /^0\d+$/.test(value) || /^\+?\d{10,}$/.test(value)
    const isOrderNum = /^\d+$/.test(value) || /^ORD-/i.test(value)

    let param: string
    if (value.toUpperCase().startsWith('ORD-')) {
      param = `order_number=${value.replace(/^ORD-/i, '')}`
    } else if (isPhone && !isOrderNum) {
      param = `phone=${value}`
    } else if (/^\d{1,4}$/.test(value)) {
      param = `order_number=${value}`
    } else {
      param = `phone=${value}`
    }

    const res = await fetch(`/api/orders/track?${param}`)
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    if (!data.orders?.length) {
      setError('No orders found. Check your phone number or order number and try again.')
      setLoading(false)
      return
    }

    setOrders(data.orders)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    doSearch(searchValue)
  }

  if (orders && orders.length > 0) {
    return (
      <div className="space-y-4 mt-4 animate-fade-in-up">
        <button
          type="button"
          onClick={() => { setOrders(null); setError(''); setSearchValue(''); didAutoSearch.current = false }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground active:text-foreground transition-colors py-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Search again
        </button>

        {orders.map((order) => {
          const currentStep = getCustomerStep(order.status)
          const isCancelled = ['CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED'].includes(order.status)

          return (
            <Card key={order.id} className="bg-card border-border overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500/10 to-blue-600/10 border-b border-border px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/20">
                      <Package className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold">
                        ORD-{String(order.order_number).padStart(4, '0')}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  {order.total_amount_pesewas ? (
                    <p className="text-foreground font-semibold">
                      GHS {(order.total_amount_pesewas / 100).toFixed(2)}
                    </p>
                  ) : null}
                </div>
              </div>

              <CardContent className="px-5 py-5 space-y-5">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-foreground">{order.request_text}</p>
                  {order.request_images?.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {order.request_images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={`Item ${i + 1}`}
                            className="h-16 w-16 rounded-lg object-cover border border-border shrink-0"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {order.delivery_address && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {order.delivery_address}
                    </div>
                  )}
                </div>

                {isCancelled ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                    <p className="text-red-400 font-medium text-sm">
                      {getStatusMessage(order.status)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {CUSTOMER_STEPS.map((step, i) => {
                      const isCompleted = i < currentStep
                      const isCurrent = i === currentStep
                      const isPending = i > currentStep

                      return (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            {isCompleted ? (
                              <CheckCircle2 className="h-6 w-6 text-indigo-500 shrink-0" />
                            ) : isCurrent ? (
                              <div className="h-6 w-6 rounded-full border-2 border-indigo-500 bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse-soft" />
                              </div>
                            ) : (
                              <Circle className="h-6 w-6 text-muted-foreground/40 shrink-0" />
                            )}
                            {i < CUSTOMER_STEPS.length - 1 && (
                              <div className={`w-0.5 h-8 my-1 ${isCompleted ? 'bg-indigo-500' : 'bg-border'}`} />
                            )}
                          </div>
                          <div className={`pt-0.5 ${isPending ? 'opacity-40' : ''}`}>
                            <p className={`text-sm font-medium ${isCurrent ? 'text-indigo-400' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {step.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {!isCancelled && (
                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3">
                    <p className="text-sm text-indigo-300/80">{getStatusMessage(order.status)}</p>
                  </div>
                )}

                {['QUOTED', 'ACCEPTED'].includes(order.status) && order.total_amount_pesewas && (
                  <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-4 text-center space-y-2">
                    <CreditCard className="h-5 w-5 text-yellow-400 mx-auto" />
                    <p className="text-sm text-yellow-300/80">
                      Payment of <span className="font-semibold text-foreground">GHS {(order.total_amount_pesewas / 100).toFixed(2)}</span> is required to proceed
                    </p>
                    <p className="text-xs text-muted-foreground">Please check your WhatsApp for payment instructions</p>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground/60 text-center">
                  Last updated {formatDate(order.updated_at)}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="bg-card border-border mt-4">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter your phone number or order number to track your order
            </p>
            <Input
              id="search_value"
              name="search_value"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              required
              placeholder="e.g. 0241234567 or ORD-0001"
              className="bg-muted border-border text-foreground text-base h-12"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 h-12 text-base"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Searching...' : 'Track Order'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
