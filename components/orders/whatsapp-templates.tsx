'use client'

import { useState } from 'react'
import { MessageCircle, Send, Copy, Check } from 'lucide-react'
import { formatOrderNumber } from '@/lib/format'
import type { OrderStatus } from '@/types'

interface Props {
  customerPhone: string
  customerName: string
  orderNumber: number
  status: OrderStatus
  total?: string
}

function getTemplates(name: string, orderNum: string, status: OrderStatus, total?: string) {
  const templates: { label: string; message: string; show: boolean }[] = [
    {
      label: 'Greeting',
      message: `Hi ${name}! Thank you for your order ${orderNum} with Orderly. We're reviewing your request now.`,
      show: status === 'REQUEST_RECEIVED',
    },
    {
      label: 'Need More Details',
      message: `Hi ${name}, regarding your order ${orderNum} — could you please share more details about what you need? (size, color, brand preference, etc.)`,
      show: status === 'REQUEST_RECEIVED',
    },
    {
      label: 'Quote Sent',
      message: `Hi ${name}! We've sent you a quote for ${orderNum}${total ? ` — Total: GHS ${total}` : ''}. Please check and confirm so we can start getting your items.`,
      show: status === 'QUOTED',
    },
    {
      label: 'Payment Reminder',
      message: `Hi ${name}, just a friendly reminder about your order ${orderNum}. Please make payment so we can start sourcing your items. Let us know if you have any questions!`,
      show: ['QUOTED', 'ACCEPTED'].includes(status),
    },
    {
      label: 'Items Ready',
      message: `Good news ${name}! The items for ${orderNum} are ready. We'll be delivering them to you soon!`,
      show: ['SOURCED'].includes(status),
    },
    {
      label: 'Out for Delivery',
      message: `Hi ${name}, your order ${orderNum} is on the way! Please make sure someone is available to receive it.`,
      show: status === 'OUT_FOR_DELIVERY',
    },
    {
      label: 'Delivery Delay',
      message: `Hi ${name}, there's a slight delay with your order ${orderNum}. We sincerely apologize and will deliver as soon as possible. Thank you for your patience!`,
      show: ['OUT_FOR_DELIVERY', 'SOURCING', 'SOURCING_DELAYED'].includes(status),
    },
    {
      label: 'Thank You',
      message: `Thank you for shopping with Orderly, ${name}! We hope you love your items from ${orderNum}. Please reach out if you need anything else!`,
      show: ['DELIVERED', 'COMPLETED'].includes(status),
    },
    {
      label: 'Custom Message',
      message: `Hi ${name}, regarding your order ${orderNum} — `,
      show: true,
    },
  ]

  return templates.filter((t) => t.show)
}

export function WhatsAppTemplates({ customerPhone, customerName, orderNumber, status, total }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const name = customerName || 'Customer'
  const orderNum = formatOrderNumber(orderNumber)
  const templates = getTemplates(name, orderNum, status, total)
  const waBase = `https://wa.me/${customerPhone.replace('+', '')}`

  function copyMessage(message: string, idx: number) {
    navigator.clipboard.writeText(message)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="space-y-2">
      {templates.map((tpl, i) => (
        <div key={i} className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{tpl.label}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => copyMessage(tpl.message, i)}
                className="p-2 sm:p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted transition-colors touch-manipulation"
                title="Copy message"
              >
                {copiedIdx === i ? <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-green-400" /> : <Copy className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
              </button>
              <a
                href={`${waBase}?text=${encodeURIComponent(tpl.message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-2 sm:py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 active:bg-green-500/30 transition-colors touch-manipulation"
              >
                <Send className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                Send
              </a>
            </div>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{tpl.message}</p>
        </div>
      ))}
    </div>
  )
}
