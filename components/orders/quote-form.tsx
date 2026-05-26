'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function QuoteForm({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [itemCost, setItemCost] = useState('')
  const [serviceFee, setServiceFee] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [note, setNote] = useState('')

  const total = (parseFloat(itemCost) || 0) + (parseFloat(serviceFee) || 0) + (parseFloat(deliveryFee) || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (total <= 0) {
      toast.error('Total must be greater than 0')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_cost_pesewas: Math.round((parseFloat(itemCost) || 0) * 100),
          service_fee_pesewas: Math.round((parseFloat(serviceFee) || 0) * 100),
          delivery_fee_pesewas: Math.round((parseFloat(deliveryFee) || 0) * 100),
          quote_note: note || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to send quote')
        return
      }

      toast.success('Quote sent to customer via WhatsApp')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Item Cost (GHS)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={itemCost}
            onChange={(e) => setItemCost(e.target.value)}
            placeholder="0.00"
            className="bg-muted border-border text-foreground"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Service Fee (GHS)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={serviceFee}
            onChange={(e) => setServiceFee(e.target.value)}
            placeholder="0.00"
            className="bg-muted border-border text-foreground"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Delivery (GHS)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            placeholder="0.00"
            className="bg-muted border-border text-foreground"
            required
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">Note (optional)</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Item found at Makola Market"
          className="bg-muted border-border text-foreground"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total: <span className="text-foreground font-semibold">GHS {total.toFixed(2)}</span>
        </p>
        <Button type="submit" disabled={loading} className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700">
          {loading ? 'Sending...' : 'Send Quote'}
        </Button>
      </div>
    </form>
  )
}
