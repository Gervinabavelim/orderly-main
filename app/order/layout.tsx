import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Place an Order',
  description: 'Order any accessory and we\'ll source and deliver it to you in Ghana. Fast, easy, and reliable.',
  openGraph: {
    title: 'Orderly — Place Your Order',
    description: 'Order any accessory and we\'ll source and deliver it to you. Fast, easy, and reliable!',
    type: 'website',
  },
}

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children
}
