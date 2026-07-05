import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'StarReviews — Faites grimper votre note Google',
  description:
    'QR code sur vos tables, avis positifs sur Google, clients mécontents captés en privé, réponses automatiques par IA. Pour les restaurants et hôtels.',
  keywords: ['avis google', 'réponse automatique', 'hôtel', 'restaurant', 'IA', 'reputation', 'QR code'],
  openGraph: {
    title: 'StarReviews — Faites grimper votre note Google',
    description:
      'QR code sur vos tables, avis positifs sur Google, réponses automatiques par IA. Essai gratuit 14 jours.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${inter.variable} dark`}>
      <body className="font-sans bg-[#FAFAF8] text-[#17181C] min-h-screen overflow-x-hidden antialiased">
        {children}
      </body>
    </html>
  )
}
