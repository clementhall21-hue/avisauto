import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reviews } = body as { reviews: Array<{ review_text: string; stars: number; reviewer_name: string }> }

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ analysis: 'Aucun avis négatif à analyser.' })
    }

    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        analysis: `Analyse de ${reviews.length} avis négatifs :\n\nLes points récurrents dans ces avis semblent concerner la qualité du service et l'attente. Il serait utile de travailler sur la formation du personnel et la gestion des temps de réponse. Une attention particulière aux avis 1-2 étoiles permettrait d'identifier les problèmes systémiques.`,
        fallback: true,
      })
    }

    const groq = new Groq({ apiKey })

    const reviewsText = reviews
      .map((r, i) => `Avis ${i + 1} (${r.stars}★) - ${r.reviewer_name}: "${r.review_text}"`)
      .join('\n\n')

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en management hôtelier et en gestion de la réputation en ligne.
Analyse les avis négatifs d'un établissement et fournis :
1. Les 3 problèmes les plus récurrents (avec exemples)
2. L'impact sur la réputation
3. 3 actions concrètes et prioritaires pour s'améliorer
Sois précis, concret et actionnable. Réponds en français.
IMPORTANT : N'utilise aucune mise en forme markdown. Pas d'astérisques, pas de gras, pas de titres avec #. Écris en texte brut uniquement, avec des chiffres et des retours à la ligne.`,
        },
        {
          role: 'user',
          content: `Voici les avis négatifs reçus récemment :\n\n${reviewsText}\n\nAnalyse ces avis et fournis des recommandations d'amélioration.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 800,
    })

    const analysis = completion.choices[0]?.message?.content?.trim() || 'Analyse non disponible.'

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('analyze-negative error:', error)
    return NextResponse.json({ error: 'Failed to analyze reviews' }, { status: 500 })
  }
}
