import { ImageResponse } from 'next/og'

export const alt = 'Orderly'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: 30,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            marginBottom: 40,
          }}
        >
          <span style={{ fontSize: 56, fontWeight: 800, color: 'white' }}>O</span>
        </div>
        <span
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: 'white',
            marginBottom: 16,
          }}
        >
          Orderly
        </span>
        <span
          style={{
            fontSize: 24,
            color: '#a5b4fc',
            opacity: 0.8,
          }}
        >
          Order any accessory — we source and deliver it to you
        </span>
      </div>
    ),
    { ...size }
  )
}
