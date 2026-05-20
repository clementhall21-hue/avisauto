import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { STATIC_REPLIES } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reviewText, stars, tone = 'Professionnel', hotelName = 'notre établissement', signature = '', length = 'normal' } = body

    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      const toneReplies = STATIC_REPLIES[tone] || STATIC_REPLIES['Professionnel']
      const starKey = Math.min(Math.max(Math.round(stars), 1), 5) as 1 | 2 | 3 | 4 | 5
      let reply = toneReplies[starKey] || toneReplies[3]
      if (signature) reply += `\n— ${signature}`
      return NextResponse.json({ reply, fallback: true })
    }

    const groq = new Groq({ apiKey })

    const toneDescriptions: Record<string, string> = {
      Professionnel: 'professionnel, courtois et formel. Utilisez un langage soutenu.',
      Chaleureux: 'chaleureux, amical et enthousiaste. Utilisez des émojis avec parcimonie.',
      Empathique: 'empathique, bienveillant et compréhensif. Montrez de la compassion.',
      Décontracté: 'décontracté, naturel et accessible. Parlez simplement et sans formalité excessive.',
    }

    const lengthInstructions: Record<string, string> = {
      short: '- Longueur : 1 à 2 phrases maximum. Sois très concis et direct.',
      normal: '- Longueur : 2 à 4 phrases. Réponse équilibrée et complète.',
      detailed: `- Longueur : 5 à 8 phrases minimum. Développe vraiment la réponse :
  * Remercie en personnalisant selon les détails de l'avis
  * Adresse chaque point soulevé par le client (positif ou négatif)
  * Si négatif : excuse-toi sincèrement, explique les mesures prises ou à venir, propose un contact direct
  * Si positif : partage l'enthousiasme, cite des détails de l'avis, invite à revenir avec une offre spécifique
  * Termine par une phrase chaleureuse et personnalisée
  * La réponse doit vraiment montrer que tu as lu l'avis en détail`,
    }

    const toneDesc = toneDescriptions[tone] || toneDescriptions['Professionnel']
    const lengthDesc = lengthInstructions[length] || lengthInstructions['normal']
    const starsText = '★'.repeat(stars) + '☆'.repeat(5 - stars)

    const systemPrompt = `Tu es l'assistant de réputation en ligne de ${hotelName}, un établissement hôtelier ou de restauration français.
Ton rôle est de rédiger des réponses aux avis Google des clients.

Règles IMPORTANTES :
- Ton : ${toneDesc}
${lengthDesc}
- La réponse doit être en français
- Personnalise la réponse selon le contenu de l'avis
- Si l'avis est positif (4-5 étoiles) : remercie chaleureusement et invite à revenir
- Si l'avis est négatif (1-2 étoiles) : excuse-toi, montre de l'empathie, propose de contacter directement
- Si l'avis est mitigé (3 étoiles) : remercie, reconnais les points négatifs, engage à améliorer
- Ne jamais promettre de remboursement ou de geste commercial
- Ne jamais mentionner de concurrents
- Commence directement par la réponse, sans introduction comme "Voici ma réponse" ou "Réponse:"
${signature ? `- Terminer par : "— ${signature}"` : ''}
- Ne pas inventer des détails qui ne sont pas dans l'avis`

    const maxTokens = length === 'short' ? 120 : length === 'detailed' ? 600 : 300

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Avis Google reçu (${starsText} - ${stars}/5 étoiles) :\n"${reviewText}"\n\nRédige une réponse appropriée.`,
        },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    })

    let reply = completion.choices[0]?.message?.content?.trim() || ''

    if (!reply) {
      const toneReplies = STATIC_REPLIES[tone] || STATIC_REPLIES['Professionnel']
      const starKey = Math.min(Math.max(Math.round(stars), 1), 5) as 1 | 2 | 3 | 4 | 5
      reply = toneReplies[starKey] || toneReplies[3]
      if (signature) reply += `\n— ${signature}`
    }

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('generate-reply error:', error)
    return NextResponse.json({ error: 'Failed to generate reply' }, { status: 500 })
  }
}
