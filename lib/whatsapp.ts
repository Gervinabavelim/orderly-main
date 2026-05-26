const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0'

export interface ParsedWhatsAppMessage {
  from: string
  name: string
  messageId: string
  timestamp: number
  type: 'text' | 'image' | 'interactive' | 'button'
  text?: string
  imageUrl?: string
  buttonPayload?: string
}

export function parseWebhookPayload(body: unknown): ParsedWhatsAppMessage | null {
  try {
    const data = body as Record<string, unknown>
    const entry = (data.entry as Array<Record<string, unknown>>)?.[0]
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0]
    const value = changes?.value as Record<string, unknown>
    const messages = value?.messages as Array<Record<string, unknown>>

    if (!messages?.length) return null

    const msg = messages[0]
    const contacts = value?.contacts as Array<Record<string, unknown>>
    const contact = contacts?.[0]

    const from = (msg.from as string) ?? ''
    const name = (contact?.profile as Record<string, unknown>)?.name as string ?? ''
    const messageId = (msg.id as string) ?? ''
    const timestamp = parseInt(msg.timestamp as string, 10) || 0

    const msgType = msg.type as string

    if (msgType === 'text') {
      const textObj = msg.text as Record<string, unknown>
      return {
        from: '+' + from,
        name,
        messageId,
        timestamp,
        type: 'text',
        text: textObj?.body as string,
      }
    }

    if (msgType === 'image') {
      const imageObj = msg.image as Record<string, unknown>
      return {
        from: '+' + from,
        name,
        messageId,
        timestamp,
        type: 'image',
        text: imageObj?.caption as string,
        imageUrl: imageObj?.id as string,
      }
    }

    if (msgType === 'interactive') {
      const interactive = msg.interactive as Record<string, unknown>
      const buttonReply = interactive?.button_reply as Record<string, unknown>
      return {
        from: '+' + from,
        name,
        messageId,
        timestamp,
        type: 'interactive',
        buttonPayload: buttonReply?.id as string,
        text: buttonReply?.title as string,
      }
    }

    return {
      from: '+' + from,
      name,
      messageId,
      timestamp,
      type: 'text',
      text: `[Unsupported message type: ${msgType}]`,
    }
  } catch {
    return null
  }
}

export async function sendWhatsAppMessage(phone: string, text: string): Promise<string | null> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) return null

  const cleanPhone = phone.replace('+', '')

  const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'text',
      text: { body: text },
    }),
  })

  if (!res.ok) return null

  const data = await res.json() as { messages?: Array<{ id: string }> }
  return data.messages?.[0]?.id ?? null
}

export async function sendWhatsAppButtons(
  phone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<string | null> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) return null

  const cleanPhone = phone.replace('+', '')

  const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    }),
  })

  if (!res.ok) return null

  const data = await res.json() as { messages?: Array<{ id: string }> }
  return data.messages?.[0]?.id ?? null
}
