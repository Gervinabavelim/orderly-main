import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(`upload:${ip}`, 15, 60_000)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const formData = await request.formData()
  const files = formData.getAll('files') as File[]

  if (!files.length) {
    return Response.json({ error: 'No files provided' }, { status: 400 })
  }

  if (files.length > 5) {
    return Response.json({ error: 'Maximum 5 images allowed' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const urls: string[] = []

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      return Response.json({ error: `${file.name} is not an image` }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: `${file.name} exceeds 5MB limit` }, { status: 400 })
    }

    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif']
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return Response.json({ error: `${file.name} has an unsupported file type` }, { status: 400 })
    }
    const path = `orders/${randomUUID()}.${ext}`

    const { error } = await supabase.storage
      .from('order-images')
      .upload(path, file, { contentType: file.type })

    if (error) {
      logger.error('upload', 'File upload failed', { fileName: file.name, error: error.message })
      return Response.json({ error: `Failed to upload ${file.name}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('order-images')
      .getPublicUrl(path)

    urls.push(urlData.publicUrl)
  }

  logger.info('upload', 'Files uploaded', { count: urls.length, ip })
  return Response.json({ urls })
}
