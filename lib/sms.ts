const HUBTEL_API_URL = 'https://smsc.hubtel.com/v1/messages/send'

export async function sendSMS(phone: string, message: string): Promise<boolean> {
  const clientId = process.env.HUBTEL_CLIENT_ID
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET
  const senderId = process.env.HUBTEL_SENDER_ID || 'LadiesLoft'

  if (!clientId || !clientSecret) return false

  const cleanPhone = phone.replace('+', '')

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(HUBTEL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      From: senderId,
      To: cleanPhone,
      Content: message,
    }),
  })

  return res.ok
}
