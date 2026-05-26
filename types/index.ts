export type OrderStatus =
  | 'REQUEST_RECEIVED' | 'QUOTED' | 'ACCEPTED' | 'PAID'
  | 'SOURCING' | 'SOURCED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED'
  | 'CANCELLED' | 'REFUND_PENDING' | 'REFUNDED'
  | 'SOURCING_DELAYED' | 'DISPUTED'

export type MessageDirection = 'inbound' | 'outbound'
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned' | 'reversed'

export interface Customer {
  id: string
  user_id: string
  phone: string
  name: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  order_number: number
  customer_id: string
  request_text: string
  request_images: string[]
  status: OrderStatus
  item_cost_pesewas: number | null
  service_fee_pesewas: number | null
  delivery_fee_pesewas: number | null
  total_amount_pesewas: number | null
  quote_note: string | null
  payment_reference: string | null
  payment_channel: string | null
  paid_at: string | null
  cancel_reason: string | null
  refund_amount_pesewas: number | null
  refunded_at: string | null
  delivery_address: string | null
  delivery_notes: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
  customer?: Customer
  status_history?: OrderStatusHistory[]
}

export interface OrderStatusHistory {
  id: string
  user_id: string
  order_id: string
  from_status: string | null
  to_status: string
  changed_by: string
  note: string | null
  created_at: string
}

export interface WhatsAppMessage {
  id: string
  user_id: string
  wa_message_id: string | null
  customer_id: string | null
  order_id: string | null
  direction: MessageDirection
  message_type: string
  body: string | null
  media_url: string | null
  raw_payload: Record<string, unknown> | null
  created_at: string
}

export interface PaymentTransaction {
  id: string
  user_id: string
  order_id: string
  paystack_reference: string
  paystack_transaction_id: string | null
  amount_pesewas: number
  currency: string
  channel: string | null
  mobile_money_number: string | null
  status: PaymentStatus
  paystack_payload: Record<string, unknown> | null
  created_at: string
}
