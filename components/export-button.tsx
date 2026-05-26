'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function ExportButton({ type }: { type: 'orders' | 'customers' }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="border-border text-foreground/80 hover:text-foreground h-9 touch-manipulation"
      onClick={() => {
        window.location.href = `/api/orders/export?type=${type}`
      }}
    >
      <Download className="w-3.5 h-3.5 mr-1.5" />
      Export CSV
    </Button>
  )
}
