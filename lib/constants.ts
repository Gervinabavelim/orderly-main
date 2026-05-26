import type { OrderStatus } from '@/types'

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  REQUEST_RECEIVED: ['QUOTED', 'CANCELLED'],
  QUOTED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PAID', 'CANCELLED'],
  PAID: ['SOURCING', 'CANCELLED', 'REFUND_PENDING'],
  SOURCING: ['SOURCED', 'SOURCING_DELAYED', 'CANCELLED', 'REFUND_PENDING'],
  SOURCED: ['OUT_FOR_DELIVERY', 'CANCELLED', 'REFUND_PENDING'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DISPUTED'],
  DELIVERED: ['COMPLETED', 'DISPUTED'],
  COMPLETED: [],
  CANCELLED: ['REFUND_PENDING'],
  REFUND_PENDING: ['REFUNDED'],
  REFUNDED: [],
  SOURCING_DELAYED: ['SOURCING', 'SOURCED', 'CANCELLED', 'REFUND_PENDING'],
  DISPUTED: ['REFUND_PENDING', 'DELIVERED', 'COMPLETED'],
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  REQUEST_RECEIVED: 'Request Received',
  QUOTED: 'Quoted',
  ACCEPTED: 'Accepted',
  PAID: 'Paid',
  SOURCING: 'Sourcing',
  SOURCED: 'Sourced',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUND_PENDING: 'Refund Pending',
  REFUNDED: 'Refunded',
  SOURCING_DELAYED: 'Sourcing Delayed',
  DISPUTED: 'Disputed',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  REQUEST_RECEIVED: 'bg-blue-500/15 text-blue-400',
  QUOTED: 'bg-yellow-500/15 text-yellow-400',
  ACCEPTED: 'bg-orange-500/15 text-orange-400',
  PAID: 'bg-green-500/15 text-green-400',
  SOURCING: 'bg-purple-500/15 text-purple-400',
  SOURCED: 'bg-indigo-500/15 text-indigo-400',
  OUT_FOR_DELIVERY: 'bg-cyan-500/15 text-cyan-400',
  DELIVERED: 'bg-green-500/15 text-green-400',
  COMPLETED: 'bg-gray-500/15 text-gray-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
  REFUND_PENDING: 'bg-indigo-500/15 text-indigo-400',
  REFUNDED: 'bg-indigo-500/15 text-indigo-400',
  SOURCING_DELAYED: 'bg-amber-500/15 text-amber-400',
  DISPUTED: 'bg-red-500/15 text-red-400',
}

export const ACTIVE_STATUSES: OrderStatus[] = [
  'REQUEST_RECEIVED', 'QUOTED', 'ACCEPTED', 'PAID',
  'SOURCING', 'SOURCED', 'OUT_FOR_DELIVERY', 'SOURCING_DELAYED',
]

export const ALL_STATUSES: OrderStatus[] = [
  'REQUEST_RECEIVED', 'QUOTED', 'ACCEPTED', 'PAID',
  'SOURCING', 'SOURCING_DELAYED', 'SOURCED',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED',
  'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED',
]

export function getOrderPlacedMessage(name: string, orderNumber: string): string {
  return `Hi ${name}! Your order ${orderNumber} has been placed successfully. We'll review your request and get back to you with a quote shortly. Thank you for choosing Orderly!`
}

export function getStatusNotificationMessage(
  status: OrderStatus,
  vars: { name?: string; orderNumber?: string; total?: string; reason?: string }
): string | null {
  const { name = 'Customer', orderNumber = '', total = '', reason = '' } = vars

  const messages: Partial<Record<OrderStatus, string>> = {
    REQUEST_RECEIVED: `Hi ${name}! Your order ${orderNumber} has been received. We'll review and send you a quote shortly.`,
    QUOTED: `Hi ${name}! Here's your quote for ${orderNumber}. Total: GHS ${total}. Reply to confirm or cancel.`,
    PAID: `Payment of GHS ${total} received for ${orderNumber}! We're now sourcing your items.`,
    SOURCING_DELAYED: `Update on ${orderNumber}: sourcing is taking a bit longer. We're still working on it and will update you soon.`,
    SOURCED: `Good news! Items for ${orderNumber} have been sourced and are ready for delivery.`,
    OUT_FOR_DELIVERY: `Your order ${orderNumber} is out for delivery! You should receive it shortly.`,
    DELIVERED: `${orderNumber} has been delivered. Thank you for shopping with us!`,
    CANCELLED: `${orderNumber} has been cancelled.${reason ? ' Reason: ' + reason : ''}`,
    REFUND_PENDING: `A refund for ${orderNumber} is being processed. We'll notify you when it's complete.`,
    REFUNDED: `Your refund for ${orderNumber} has been sent. Sorry for the inconvenience!`,
  }

  return messages[status] ?? null
}
