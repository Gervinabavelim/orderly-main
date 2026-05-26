import { z } from 'zod'
import type { OrderStatus } from '@/types'

const ORDER_STATUSES: OrderStatus[] = [
  'REQUEST_RECEIVED', 'QUOTED', 'ACCEPTED', 'PAID',
  'SOURCING', 'SOURCING_DELAYED', 'SOURCED',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED',
  'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED',
]

const phone = z.string().trim().min(7).max(20)
const name = z.string().trim().max(200)
const text = z.string().trim().min(1).max(5000)
const shortText = z.string().trim().max(1000)
const uuid = z.string().uuid()
const pesewas = z.number().int().min(0).max(100_000_00) // max GHS 100,000
const imageUrl = z.string().url().max(2048)
const orderStatus = z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]])

export const customerUpdateSchema = z.object({
  name: name.nullable().optional(),
  notes: shortText.nullable().optional(),
}).refine(d => d.name !== undefined || d.notes !== undefined, {
  message: 'No valid fields to update',
})

export const orderCreateSchema = z.object({
  customer_name: name.optional(),
  customer_phone: phone,
  request_text: text,
  delivery_address: shortText.nullable().optional(),
})

export const orderPlaceSchema = z.object({
  customer_name: name.optional(),
  customer_phone: phone,
  request_text: text,
  delivery_address: shortText.nullable().optional(),
  request_images: z.array(imageUrl).max(10).optional().default([]),
})

export const orderUpdateSchema = z.object({
  status: orderStatus.optional(),
  delivery_address: shortText.nullable().optional(),
  delivery_notes: shortText.nullable().optional(),
  cancel_reason: shortText.nullable().optional(),
  refund_amount_pesewas: pesewas.nullable().optional(),
  note: shortText.nullable().optional(),
})

export const quoteSchema = z.object({
  item_cost_pesewas: pesewas,
  service_fee_pesewas: pesewas,
  delivery_fee_pesewas: pesewas,
  quote_note: shortText.nullable().optional(),
})

export const paymentInitSchema = z.object({
  order_id: uuid,
})

export const whatsappSendSchema = z.object({
  phone: phone,
  message: text,
  order_id: uuid.nullable().optional(),
})

export const exportTypeSchema = z.enum(['orders', 'customers']).default('orders')

export const orderQuerySchema = z.object({
  status: orderStatus.optional(),
  customer_id: uuid.optional(),
})

export function csvSanitize(val: string): string {
  let safe = val
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = "'" + safe
  }
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

export function parseBody<T>(schema: z.ZodType<T>, data: unknown): { data: T } | { error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
    return { error: msg }
  }
  return { data: result.data }
}
