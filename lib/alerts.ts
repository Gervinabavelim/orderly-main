import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { logger } from '@/lib/logger'

const recentAlerts = new Map<string, number>()
const COOLDOWN_MS = 5 * 60 * 1000 // 5 min per alert type

export async function alert(source: string, message: string, meta?: Record<string, unknown>) {
  logger.error(source, message, meta)

  const ownerPhone = process.env.ALERT_PHONE_NUMBER
  if (!ownerPhone) return

  const now = Date.now()
  const lastSent = recentAlerts.get(source) ?? 0
  if (now - lastSent < COOLDOWN_MS) return

  recentAlerts.set(source, now)

  const details = meta ? Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n') : ''
  const text = `⚠️ ALERT: ${source}\n${message}${details ? '\n\n' + details : ''}`

  try {
    await sendWhatsAppMessage(ownerPhone, text)
  } catch {
    logger.error('alerts', 'Failed to send alert via WhatsApp', { source, message })
  }
}
