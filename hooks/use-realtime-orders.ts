'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Order } from '@/types'

export function useRealtimeOrders(initialOrders: Order[]) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const supabase = createClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])

  const playSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Nk4x8aF5jcICRm5eMdGRfaXuKlpOJeW1mb3yHj46HfXJtdH+IiYaBfHl6f4OEg4B+fX1+gIGBgH9+fn5/gICAgH9/f3+AgIB/f39/f4CAgICAf39/gICAgICAf4CAgICAgICAgICAgICAgICAgICAf4CAgICAgICAgICAgICAf39/f3+AgICAgH9/f39/gIB/f39/f3+AgICAf39/f4CAgIB/f39/gICAgH9/f4CAgICAgICAgICAgICAgICAgICAgICAgICAgICA')
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    } catch {}
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            setOrders((prev) => [newOrder, ...prev])
            playSound()
            toast('New order received!', {
              description: `Order #${newOrder.order_number} — ${newOrder.request_text?.slice(0, 50)}`,
              action: {
                label: 'View',
                onClick: () => {
                  window.location.href = `/orders/${newOrder.id}`
                },
              },
            })
          }

          if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === (payload.new as Order).id ? { ...o, ...(payload.new as Partial<Order>) } : o
              )
            )
          }

          if (payload.eventType === 'DELETE') {
            setOrders((prev) =>
              prev.filter((o) => o.id !== (payload.old as { id: string }).id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, playSound])

  return orders
}
