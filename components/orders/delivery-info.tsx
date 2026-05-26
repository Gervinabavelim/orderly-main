'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { MapPin, Pencil, Check, X } from 'lucide-react'

export function DeliveryInfo({
  orderId,
  address,
  notes,
}: {
  orderId: string
  address: string | null
  notes: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [editAddress, setEditAddress] = useState(address ?? '')
  const [editNotes, setEditNotes] = useState(notes ?? '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_address: editAddress || null,
          delivery_notes: editNotes || null,
        }),
      })
      if (!res.ok) {
        toast.error('Failed to save delivery info')
        return
      }
      toast.success('Delivery info updated')
      setEditing(false)
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-foreground/80 text-xs">Delivery Address</Label>
          <Input
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
            placeholder="e.g. 15 Independence Ave, Accra"
            className="bg-muted border-border text-foreground text-sm h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground/80 text-xs">Delivery Notes</Label>
          <Input
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="e.g. Call before delivery, gate code 1234"
            className="bg-muted border-border text-foreground text-sm h-10"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 h-8" onClick={save}>
            <Check className="w-3.5 h-3.5 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" variant="outline" className="border-border h-8" onClick={() => setEditing(false)}>
            <X className="w-3.5 h-3.5 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="group cursor-pointer rounded-md p-2 -m-2 hover:bg-muted/50 transition-colors"
      onClick={() => setEditing(true)}
    >
      {address || notes ? (
        <div className="space-y-1.5">
          {address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground/80">{address}</span>
            </div>
          )}
          {notes && (
            <p className="text-xs text-muted-foreground pl-5.5">{notes}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" />
          No delivery info. Click to add...
        </p>
      )}
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
    </div>
  )
}
