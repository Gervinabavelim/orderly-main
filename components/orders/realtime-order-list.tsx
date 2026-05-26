'use client'

import { useRealtimeOrders } from '@/hooks/use-realtime-orders'
import { OrderList } from './order-list'
import type { Order } from '@/types'

export function RealtimeOrderList({ initialOrders }: { initialOrders: Order[] }) {
  const orders = useRealtimeOrders(initialOrders)
  return <OrderList orders={orders} />
}
