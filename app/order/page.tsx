'use client'

import { useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ShoppingBag, MessageCircle } from 'lucide-react'
import PlaceOrderForm from './_components/place-order-form'
import TrackOrder from './_components/track-order'

function OrderPageContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'place' | 'track'>(
    searchParams.get('tab') === 'track' ? 'track' : 'place'
  )
  const [trackSearch, setTrackSearch] = useState('')

  const handleTrackOrder = useCallback((orderNumber: number) => {
    const search = `ORD-${String(orderNumber).padStart(4, '0')}`
    setTrackSearch(search)
    setTab('track')
  }, [])

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center animate-fade-in-up">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 animate-float">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Orderly</h1>
          <p className="text-sm text-indigo-300/60 mt-1">
            Place a new order or track an existing one
          </p>
        </div>

        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
          <button
            type="button"
            onClick={() => setTab('place')}
            className={`flex-1 py-3 rounded-md text-sm font-medium transition-all touch-manipulation ${
              tab === 'place'
                ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Place Order
          </button>
          <button
            type="button"
            onClick={() => { setTab('track'); setTrackSearch('') }}
            className={`flex-1 py-3 rounded-md text-sm font-medium transition-all touch-manipulation ${
              tab === 'track'
                ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Track Order
          </button>
        </div>

        {tab === 'place' ? (
          <PlaceOrderForm onTrackOrder={handleTrackOrder} />
        ) : (
          <TrackOrder initialSearch={trackSearch} />
        )}

        <div className="text-center pt-2">
          <a
            href="https://wa.me/233241234567"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-400 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Chat with us on WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

export default function OrderPage() {
  return (
    <Suspense>
      <OrderPageContent />
    </Suspense>
  )
}
