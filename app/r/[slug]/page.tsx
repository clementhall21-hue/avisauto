import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import RatingFlow from './RatingFlow'

// Page publique de collecte d'avis — scannée depuis un QR code à table.
// Lecture via service role en ne sélectionnant que les colonnes publiques :
// aucune policy anon sur establishments, les colonnes sensibles restent inaccessibles.

export const dynamic = 'force-dynamic'

async function getEstablishment(slug: string) {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('establishments')
    .select('id, name, logo_url, google_review_url')
    .eq('slug', slug)
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const est = await getEstablishment(params.slug)
  return {
    title: est ? `Votre avis — ${est.name}` : 'Établissement introuvable',
    robots: { index: false },
  }
}

export default async function PublicReviewPage({ params }: { params: { slug: string } }) {
  const est = await getEstablishment(params.slug)
  if (!est) notFound()

  return (
    <RatingFlow
      establishmentId={est.id}
      name={est.name}
      logoUrl={est.logo_url}
      googleReviewUrl={est.google_review_url}
    />
  )
}
