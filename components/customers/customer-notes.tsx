'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'

export function CustomerNotes({ customerId, initialNotes }: { customerId: string; initialNotes: string | null }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (!res.ok) {
        toast.error('Failed to save notes')
        return
      }
      toast.success('Notes saved')
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
      <div className="space-y-2">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this customer..."
          rows={3}
          className="w-full rounded-md bg-muted border border-border text-foreground text-sm p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="flex gap-2">
          <Button size="sm" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 h-8" onClick={save}>
            <Check className="w-3.5 h-3.5 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" variant="outline" className="border-border h-8" onClick={() => { setEditing(false); setNotes(initialNotes ?? '') }}>
            <X className="w-3.5 h-3.5 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="group cursor-pointer rounded-md p-2.5 -m-2.5 hover:bg-muted/50 transition-colors"
      onClick={() => setEditing(true)}
    >
      {initialNotes ? (
        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{initialNotes}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No notes yet. Click to add...</p>
      )}
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
    </div>
  )
}
