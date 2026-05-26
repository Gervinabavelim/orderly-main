import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://orderly-coral-three.vercel.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/order'],
        disallow: ['/dashboard', '/orders', '/customers', '/reports', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
