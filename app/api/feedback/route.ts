import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Insertion publique d'un feedback depuis /r/[slug].
// Passe par le service role : la clé anon n'a aucun droit sur feedbacks,
// donc impossible de lire ou d'insérer en masse depuis le client.

const MAX_COMMENT_LENGTH = 2000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { establishmentId, rating, comment } = body as {
      establishmentId?: string
      rating?: number
      comment?: string
    }

    if (
      !establishmentId ||
      typeof rating !== 'number' ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Vérifie que l'établissement existe (évite les inserts orphelins forgés)
    const { data: est } = await supabase
      .from('establishments')
      .select('id')
      .eq('id', establishmentId)
      .maybeSingle()

    if (!est) {
      return NextResponse.json({ error: 'Établissement introuvable' }, { status: 404 })
    }

    const { error } = await supabase.from('feedbacks').insert({
      establishment_id: establishmentId,
      rating,
      comment: (comment ?? '').slice(0, MAX_COMMENT_LENGTH),
    })

    if (error) {
      console.error('feedback insert error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }
}
