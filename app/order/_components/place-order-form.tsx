'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, ImagePlus, X } from 'lucide-react'

const MAX_FILE_SIZE = 5 * 1024 * 1024

function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<File> {
  return new Promise((resolve) => {
    if (file.size <= 500 * 1024) { resolve(file); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return }
          resolve(new File([blob], file.name, { type: outputType }))
        },
        outputType,
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function PlaceOrderForm({ onTrackOrder }: { onTrackOrder?: (orderNumber: number) => void }) {
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loadingText, setLoadingText] = useState('Placing Order...')
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [images])

  const validateFiles = useCallback((files: File[]): File[] => {
    const valid: File[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} is too large (${formatSize(file.size)}). Max 5MB.`)
        continue
      }
      valid.push(file)
    }
    return valid
  }, [])

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    const valid = validateFiles(Array.from(e.target.files ?? []))
    setImages((prev) => [...prev, ...valid].slice(0, 5))
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setUploadProgress(0)
    setLoadingText(images.length > 0 ? 'Compressing photos...' : 'Placing Order...')
    setLoading(true)

    const form = new FormData(e.currentTarget)

    let imageUrls: string[] = []
    if (images.length > 0) {
      setUploadProgress(10)
      const compressed = await Promise.all(images.map((f) => compressImage(f)))

      setLoadingText(`Uploading ${compressed.length} photo${compressed.length > 1 ? 's' : ''}...`)
      setUploadProgress(30)
      const uploadData = new FormData()
      compressed.forEach((file) => uploadData.append('files', file))

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        })

        setUploadProgress(70)

        if (!uploadRes.ok) {
          const data = await uploadRes.json()
          setError(data.error ?? 'Failed to upload images')
          setLoading(false)
          return
        }

        const { urls } = await uploadRes.json()
        imageUrls = urls
      } catch {
        setError('Upload failed. Check your internet connection and try again.')
        setLoading(false)
        return
      }
    }

    setLoadingText('Placing Order...')
    setUploadProgress(85)

    const res = await fetch('/api/orders/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: form.get('customer_name'),
        customer_phone: form.get('customer_phone'),
        request_text: form.get('request_text'),
        delivery_address: form.get('delivery_address'),
        request_images: imageUrls,
      }),
    })

    setUploadProgress(100)
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    setOrderNumber(data.order_number)
    setImages([])
    setLoading(false)
  }

  if (orderNumber) {
    return (
      <Card className="bg-card border-border text-center mt-4">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/20">
            <CheckCircle className="h-8 w-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Order Placed!</h2>
            <p className="text-muted-foreground mt-2">
              Your order number is{' '}
              <span className="text-foreground font-mono font-bold">
                ORD-{String(orderNumber).padStart(4, '0')}
              </span>
            </p>
            <p className="text-muted-foreground text-sm mt-3">
              We&apos;ll review your request and send you a quote shortly via WhatsApp.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {onTrackOrder && (
              <Button
                onClick={() => onTrackOrder(orderNumber)}
                className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700"
              >
                Track This Order
              </Button>
            )}
            <Button
              onClick={() => {
                setOrderNumber(null)
                setError('')
              }}
              className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700"
            >
              Place Another Order
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border mt-4">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_name" className="text-foreground/80">Your Name</Label>
            <Input
              id="customer_name"
              name="customer_name"
              placeholder="Kofi Mensah"
              autoComplete="name"
              className="bg-muted border-border text-foreground text-base h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_phone" className="text-foreground/80">Phone Number *</Label>
            <Input
              id="customer_phone"
              name="customer_phone"
              type="tel"
              inputMode="tel"
              required
              placeholder="0241234567"
              autoComplete="tel"
              className="bg-muted border-border text-foreground text-base h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="request_text" className="text-foreground/80">What do you need? *</Label>
            <textarea
              id="request_text"
              name="request_text"
              required
              rows={3}
              placeholder="e.g. 2 bags of rice from Melcom, size 12 Nike Air Max from Accra Mall..."
              className="w-full rounded-md border border-border bg-muted px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground/80">Photos of item (optional)</Label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {images.map((file, i) => (
                <div key={i} className="relative group">
                  <img
                    src={previews[i]}
                    alt={file.name}
                    className="h-16 w-16 sm:h-18 sm:w-18 rounded-lg object-cover border border-border"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 rounded-b-lg px-1 py-0.5">
                    <p className="text-[9px] text-foreground/80 text-center truncate">{formatSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label={`Remove ${file.name}`}
                    title={`Remove ${file.name}`}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 flex items-center justify-center touch-manipulation"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Add photo"
                  title="Add photo"
                  className="h-16 w-16 sm:h-18 sm:w-18 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-muted-foreground active:border-indigo-500 transition-colors touch-manipulation"
                >
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Up to 5 images, max 5MB each</p>
            <input
              ref={fileRef}
              id="photo_upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              onChange={handleFiles}
              className="hidden"
              aria-label="Upload photos"
              title="Upload photos"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery_address" className="text-foreground/80">Delivery Address</Label>
            <Input
              id="delivery_address"
              name="delivery_address"
              placeholder="Osu, Oxford Street"
              autoComplete="street-address"
              className="bg-muted border-border text-foreground text-base h-11"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="space-y-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 h-12 text-base relative overflow-hidden"
            >
              {loading && (
                <div
                  className="absolute inset-y-0 left-0 bg-white/10 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
              <span className="relative">{loading ? loadingText : 'Place Order'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
