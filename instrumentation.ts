export function register() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DEFAULT_OWNER_USER_ID',
    'PAYSTACK_SECRET_KEY',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'HUBTEL_CLIENT_ID',
    'HUBTEL_CLIENT_SECRET',
    'HUBTEL_SENDER_ID',
  ]

  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
