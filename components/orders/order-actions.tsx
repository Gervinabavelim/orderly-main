'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STATUS_TRANSITIONS, STATUS_LABELS } from '@/lib/constants'
import type { OrderStatus } from '@/types'
import { toast } from 'sonner'

const ACTION_STYLES: Partial<Record<OrderStatus, string>> = {
  QUOTED: 'bg-yellow-600 hover:bg-yellow-700',
  SOURCING: 'bg-purple-600 hover:bg-purple-700',
  SOURCED: 'bg-indigo-600 hover:bg-indigo-700',
  OUT_FOR_DELIVERY: 'bg-cyan-600 hover:bg-cyan-700',
  DELIVERED: 'bg-green-600 hover:bg-green-700',
  COMPLETED: 'bg-gray-600 hover:bg-gray-700',
  CANCELLED: 'bg-red-600 hover:bg-red-700',
  REFUND_PENDING: 'bg-indigo-600 hover:bg-indigo-700',
  REFUNDED: 'bg-indigo-600 hover:bg-indigo-700',
}

type PromptTarget = 'REFUND_PENDING' | 'CANCELLED' | 'DISPUTED' | null

export function OrderActions({
  orderId,
  currentStatus,
  totalAmountPesewas,
}: {
  orderId: string
  currentStatus: OrderStatus
  totalAmountPesewas: number | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [promptFor, setPromptFor] = useState<PromptTarget>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const transitions = STATUS_TRANSITIONS[currentStatus]

  if (!transitions.length) return null

  const primary = transitions[0]
  const secondary = transitions.slice(1)

  function handleClick(status: OrderStatus) {
    if (status === 'REFUND_PENDING') {
      setRefundAmount(totalAmountPesewas ? (totalAmountPesewas / 100).toFixed(2) : '')
      setPromptFor('REFUND_PENDING')
    } else if (status === 'CANCELLED') {
      setCancelReason('')
      setPromptFor('CANCELLED')
    } else if (status === 'DISPUTED') {
      setDisputeReason('')
      setPromptFor('DISPUTED')
    } else {
      handleTransition(status)
    }
  }

  async function handleTransition(newStatus: OrderStatus, extra?: Record<string, unknown>) {
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...extra }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to update status')
        return
      }

      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`)
      setPromptFor(null)
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(null)
    }
  }

  function submitRefund() {
    const cedis = parseFloat(refundAmount)
    if (isNaN(cedis) || cedis <= 0) {
      toast.error('Enter a valid refund amount')
      return
    }
    const maxCedis = totalAmountPesewas ? totalAmountPesewas / 100 : Infinity
    if (cedis > maxCedis) {
      toast.error(`Refund cannot exceed GHS ${maxCedis.toFixed(2)}`)
      return
    }
    handleTransition('REFUND_PENDING', { refund_amount_pesewas: Math.round(cedis * 100) })
  }

  function submitCancel() {
    handleTransition('CANCELLED', { cancel_reason: cancelReason || undefined })
  }

  function submitDispute() {
    if (!disputeReason.trim()) {
      toast.error('Please provide a reason for the dispute')
      return
    }
    handleTransition('DISPUTED', { note: disputeReason })
  }

  if (promptFor === 'REFUND_PENDING') {
    return (
      <div className="space-y-3">
        <Label className="text-foreground/80">Refund Amount (GHS)</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          max={totalAmountPesewas ? totalAmountPesewas / 100 : undefined}
          value={refundAmount}
          onChange={(e) => setRefundAmount(e.target.value)}
          placeholder="0.00"
          className="bg-muted border-border text-foreground text-base h-11"
        />
        {totalAmountPesewas && (
          <p className="text-xs text-muted-foreground">
            Max: GHS {(totalAmountPesewas / 100).toFixed(2)} (full order total)
          </p>
        )}
        <div className="flex gap-2">
          <Button
            disabled={loading !== null}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-11 touch-manipulation"
            onClick={submitRefund}
          >
            {loading ? 'Processing...' : 'Initiate Refund'}
          </Button>
          <Button
            variant="outline"
            className="border-border text-foreground/80 h-11 touch-manipulation"
            onClick={() => setPromptFor(null)}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (promptFor === 'DISPUTED') {
    return (
      <div className="space-y-3">
        <Label className="text-foreground/80">Dispute Reason</Label>
        <Input
          value={disputeReason}
          onChange={(e) => setDisputeReason(e.target.value)}
          placeholder="e.g. Item not as described, damaged on arrival"
          className="bg-muted border-border text-foreground text-base h-11"
        />
        <div className="flex gap-2">
          <Button
            disabled={loading !== null}
            className="flex-1 bg-red-600 hover:bg-red-700 h-11 touch-manipulation"
            onClick={submitDispute}
          >
            {loading ? 'Submitting...' : 'Submit Dispute'}
          </Button>
          <Button
            variant="outline"
            className="border-border text-foreground/80 h-11 touch-manipulation"
            onClick={() => setPromptFor(null)}
          >
            Back
          </Button>
        </div>
      </div>
    )
  }

  if (promptFor === 'CANCELLED') {
    return (
      <div className="space-y-3">
        <Label className="text-foreground/80">Cancellation Reason (optional)</Label>
        <Input
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="e.g. Customer changed their mind"
          className="bg-muted border-border text-foreground text-base h-11"
        />
        <div className="flex gap-2">
          <Button
            disabled={loading !== null}
            className="flex-1 bg-red-600 hover:bg-red-700 h-11 touch-manipulation"
            onClick={submitCancel}
          >
            {loading ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
          <Button
            variant="outline"
            className="border-border text-foreground/80 h-11 touch-manipulation"
            onClick={() => setPromptFor(null)}
          >
            Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Button
        disabled={loading !== null}
        className={`w-full h-12 text-base touch-manipulation ${ACTION_STYLES[primary] ?? 'bg-gray-600 hover:bg-gray-700'}`}
        onClick={() => handleClick(primary)}
      >
        {loading === primary ? 'Updating...' : STATUS_LABELS[primary]}
      </Button>
      {secondary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {secondary.map((status) => (
            <Button
              key={status}
              size="sm"
              variant="outline"
              disabled={loading !== null}
              className={status === 'CANCELLED'
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 h-10 touch-manipulation'
                : status === 'REFUND_PENDING'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 h-10 touch-manipulation'
                : status === 'DISPUTED'
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 h-10 touch-manipulation'
                : 'border-border text-foreground/80 hover:text-foreground h-10 touch-manipulation'}
              onClick={() => handleClick(status)}
            >
              {loading === status ? '...' : STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
