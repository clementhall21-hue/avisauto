'use client'

import { useRef, useState } from 'react'

interface Props {
  establishmentId: string
  name: string
  logoUrl: string | null
  googleReviewUrl: string | null
}

// Parcours mobile-first :
// 1. Notation 1-5 étoiles (gros boutons tactiles)
// 2a. 4-5★ → bouton Google mis en avant
// 2b. 1-3★ → feedback privé mis en avant, lien Google visible dessous
//     (le lien Google reste visible pour tous — pas de review gating)

export default function RatingFlow({ establishmentId, name, logoUrl, googleReviewUrl }: Props) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [error, setError] = useState('')

  const isNegative = rating >= 1 && rating <= 3
  // Une seule trace "note seule" par visite, même si le client corrige sa note
  const autoLogged = useRef(false)

  const submitRating = async (n: number) => {
    setRating(n)
    // Changer de note ré-ouvre le parcours (feedback, erreurs)
    setFeedbackSent(false)
    setError('')
    // Les notes 4-5 sont enregistrées immédiatement (pas de champ commentaire).
    if (n >= 4 && !autoLogged.current) {
      autoLogged.current = true
      fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishmentId, rating: n }),
      }).catch(() => {})
    }
  }

  const submitFeedback = async () => {
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishmentId, rating, comment: comment.trim() }),
      })
      if (!res.ok) throw new Error()
      setFeedbackSent(true)
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setSending(false)
    }
  }

  const googleButton = googleReviewUrl && (
    <a
      href={googleReviewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={
        rating >= 4
          ? 'block w-full text-center bg-[#4285F4] text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform'
          : 'block w-full text-center text-[#4285F4] font-semibold text-sm py-3'
      }
    >
      {rating >= 4 ? '⭐ Laisser un avis sur Google' : 'Laisser un avis sur Google'}
    </a>
  )

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center px-5 py-10 text-slate-800">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        {/* Logo + nom */}
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={name} className="w-20 h-20 rounded-2xl object-cover shadow-md" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-md">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-extrabold text-center tracking-tight">{name}</h1>

        <p className="text-lg text-slate-500 text-center">
          {rating === 0 ? 'Comment s’est passée votre visite ?' : 'Touchez une étoile pour modifier votre note'}
        </p>

        {/* Étoiles — toujours affichées et cliquables, la note reste modifiable */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
              aria-pressed={rating >= n}
              onClick={() => submitRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="text-5xl leading-none p-1.5 active:scale-90 transition-transform"
              style={{ color: n <= (hover || rating) ? '#f59e0b' : '#cbd5e1' }}
            >
              ★
            </button>
          ))}
        </div>

        {rating > 0 && (
          <div className="w-full flex flex-col gap-5 items-center">

            {isNegative && !feedbackSent && (
              <div className="w-full bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3">
                <p className="font-semibold text-slate-700">Dites-nous ce qui n&apos;a pas été</p>
                <p className="text-sm text-slate-500">
                  Votre message est envoyé directement au gérant pour améliorer votre prochaine visite.
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Racontez-nous…"
                  className="w-full border border-slate-200 rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  onClick={submitFeedback}
                  disabled={sending || comment.trim().length === 0}
                  className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {sending ? 'Envoi…' : 'Envoyer au gérant'}
                </button>
              </div>
            )}

            {isNegative && feedbackSent && (
              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                <p className="font-semibold text-emerald-700">Merci pour votre retour 🙏</p>
                <p className="text-sm text-emerald-600 mt-1">Le gérant en prendra connaissance rapidement.</p>
              </div>
            )}

            {rating >= 4 && (
              <p className="text-slate-500 text-center">
                Merci ! Un avis Google nous aide énormément 🙏
              </p>
            )}

            {/* Lien Google — toujours visible, quel que soit la note */}
            {googleButton}
          </div>
        )}
      </div>

      <footer className="mt-auto pt-10 text-xs text-slate-400">
        Propulsé par StarReviews
      </footer>
    </main>
  )
}
