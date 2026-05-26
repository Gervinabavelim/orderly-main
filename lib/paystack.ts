import { createHmac } from 'crypto'

const PAYSTACK_BASE = 'https://api.paystack.co'

interface InitializePaymentParams {
  amount_pesewas: number
  email: string
  reference: string
  currency: 'GHS'
  metadata: Record<string, unknown>
  channels?: string[]
}

interface InitializePaymentResponse {
  authorization_url: string
  access_code: string
  reference: string
}

export async function initializePayment(
  params: InitializePaymentParams
): Promise<InitializePaymentResponse | null> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) return null

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amount_pesewas,
      email: params.email,
      reference: params.reference,
      currency: params.currency,
      metadata: params.metadata,
      channels: params.channels ?? ['mobile_money'],
    }),
  })

  if (!res.ok) return null

  const data = (await res.json()) as { status: boolean; data: InitializePaymentResponse }
  if (!data.status) return null

  return data.data
}

export async function verifyTransaction(reference: string) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) return null

  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })

  if (!res.ok) return null

  const data = (await res.json()) as { status: boolean; data: Record<string, unknown> }
  if (!data.status) return null

  return data.data
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) return false

  const hash = createHmac('sha512', secretKey).update(body).digest('hex')
  return hash === signature
}
