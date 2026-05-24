import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'StarReviews — Répondez à vos avis Google en un clic',
  description:
    'StarReviews génère automatiquement des réponses IA personnalisées à vos avis Google. Spécialement conçu pour les hôtels et restaurants.',
  keywords: ['avis google', 'réponse automatique', 'hôtel', 'restaurant', 'IA', 'reputation'],
  openGraph: {
    title: 'StarReviews — Répondez à vos avis Google en un clic',
    description:
      'Générez des réponses IA personnalisées à vos avis Google. Essai gratuit 14 jours.',
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
      <body className="font-sans bg-navy text-white-custom min-h-screen overflow-x-hidden antialiased">
        {children}
      </body>
    </html>
  )
}
