export function formatCurrency(pesewas: number): string {
  return `GHS ${(pesewas / 100).toFixed(2)}`
}

export function formatOrderNumber(num: number): string {
  return `ORD-${String(num).padStart(4, '0')}`
}

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = '233' + cleaned.slice(1)
  if (!cleaned.startsWith('233')) cleaned = '233' + cleaned
  return '+' + cleaned
}

export function phoneToEmail(phone: string): string {
  return `${phone.replace('+', '')}@customers.orderly.local`
}

export function pesewasFromCedis(cedis: number): number {
  return Math.round(cedis * 100)
}

export function cedisFromPesewas(pesewas: number): number {
  return pesewas / 100
}

export function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })
}
