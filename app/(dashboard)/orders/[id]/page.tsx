import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { OrderActions } from '@/components/orders/order-actions'
import { QuoteForm } from '@/components/orders/quote-form'
import { OrderTimeline } from '@/components/orders/order-timeline'
import { WhatsAppTemplates } from '@/components/orders/whatsapp-templates'
import { formatCurrency, formatOrderNumber } from '@/lib/format'
import type { Order, OrderStatusHistory } from '@/types'
import Link from 'next/link'
import { ArrowLeft, Phone, MessageCircle, Truck } from 'lucide-react'
import { DeliveryInfo } from '@/components/orders/delivery-info'

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, customer:customers(*)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const { data: history } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  const o = order as Order

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/orders" className="flex items-center gap-1 text-muted-foreground hover:text-foreground mt-1 shrink-0">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm sm:hidden">Back</span>
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold">{formatOrderNumber(o.order_number)}</h1>
            <OrderStatusBadge status={o.status} />
          </div>
          {o.customer && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {o.customer.name ?? 'Unknown'} &middot;{' '}
              <a href={`https://wa.me/${o.customer.phone.replace('+', '')}`} className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {o.customer.phone}
              </a>
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Customer Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground whitespace-pre-wrap">{o.request_text}</p>
              {o.request_images?.length > 0 && (
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {o.request_images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`Request image ${i + 1}`}
                        className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg object-cover border border-border hover:border-indigo-500 transition-colors"
                      />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {o.status === 'REQUEST_RECEIVED' && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Send Quote</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteForm orderId={o.id} />
              </CardContent>
            </Card>
          )}

          {o.total_amount_pesewas && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Quote Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item Cost</span>
                    <span className="text-foreground">{formatCurrency(o.item_cost_pesewas ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="text-foreground">{formatCurrency(o.service_fee_pesewas ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="text-foreground">{formatCurrency(o.delivery_fee_pesewas ?? 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <span className="text-foreground/80">Total</span>
                    <span className="text-foreground">{formatCurrency(o.total_amount_pesewas)}</span>
                  </div>
                  {o.quote_note && (
                    <p className="text-xs text-muted-foreground pt-1">{o.quote_note}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {o.payment_reference && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="text-foreground font-mono text-xs">{o.payment_reference}</span>
                  </div>
                  {o.payment_channel && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Channel</span>
                      <span className="text-foreground">{o.payment_channel}</span>
                    </div>
                  )}
                  {o.paid_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid At</span>
                      <span className="text-foreground">{new Date(o.paid_at).toLocaleString('en-GH')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                Delivery Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryInfo orderId={o.id} address={o.delivery_address} notes={o.delivery_notes} />
            </CardContent>
          </Card>

          {o.status === 'DISPUTED' && (() => {
            const disputeEntry = (history as OrderStatusHistory[])?.find(h => h.to_status === 'DISPUTED')
            return disputeEntry?.note ? (
              <Card className="bg-card border-border border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-sm text-red-400">Dispute Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{disputeEntry.note}</p>
                </CardContent>
              </Card>
            ) : null
          })()}

          {o.status === 'CANCELLED' && o.cancel_reason && (
            <Card className="bg-card border-border border-red-500/30">
              <CardHeader>
                <CardTitle className="text-sm text-red-400">Cancellation Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{o.cancel_reason}</p>
              </CardContent>
            </Card>
          )}

          {(o.status === 'REFUND_PENDING' || o.status === 'REFUNDED') && o.refund_amount_pesewas && (
            <Card className="bg-card border-border border-indigo-500/30">
              <CardHeader>
                <CardTitle className="text-sm text-indigo-400">
                  {o.status === 'REFUNDED' ? 'Refund Completed' : 'Refund Pending'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refund Amount</span>
                    <span className="text-foreground font-medium">{formatCurrency(o.refund_amount_pesewas)}</span>
                  </div>
                  {o.total_amount_pesewas && o.refund_amount_pesewas < o.total_amount_pesewas && (
                    <p className="text-xs text-muted-foreground">Partial refund ({Math.round(o.refund_amount_pesewas / o.total_amount_pesewas * 100)}% of total)</p>
                  )}
                  {o.refunded_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Refunded At</span>
                      <span className="text-foreground">{new Date(o.refunded_at).toLocaleString('en-GH')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderActions orderId={o.id} currentStatus={o.status} totalAmountPesewas={o.total_amount_pesewas} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {o.customer && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Quick Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WhatsAppTemplates
                  customerPhone={o.customer.phone}
                  customerName={o.customer.name ?? ''}
                  orderNumber={o.order_number}
                  status={o.status}
                  total={o.total_amount_pesewas ? (o.total_amount_pesewas / 100).toFixed(2) : undefined}
                />
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline history={(history as OrderStatusHistory[]) ?? []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
