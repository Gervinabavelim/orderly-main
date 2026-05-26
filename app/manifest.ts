import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Orderly',
    short_name: 'Orderly',
    description: 'Order any accessory and we\'ll source and deliver it to you.',
    start_url: '/order',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#6366f1',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
