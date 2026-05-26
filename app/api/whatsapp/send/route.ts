import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { whatsappSendSchema, parseBody } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`wa-send:${user.id}`, 30, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = parseBody(whatsappSendSchema, await request.json())
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 })

  const { phone, message, order_id } = parsed.data

  const messageId = await sendWhatsAppMessage(phone, message)

  if (!messageId) {
    logger.warn('wa-send', 'WhatsApp message failed to send', { phone })
  }

  if (messageId) {
    await supabase.from('whatsapp_messages').insert({
      wa_message_id: messageId,
      order_id: order_id ?? null,
      direction: 'outbound',
      message_type: 'text',
      body: message,
      user_id: user.id,
    })
  }

  return Response.json({ success: true, message_id: messageId })
}
