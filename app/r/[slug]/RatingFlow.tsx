'use client'

import { useRef, useState } from 'react'

interface Props {
  establishmentId: string
  name: string
  logoUrl: string | null
  googleReviewUrl: string | null
  accentColor: string
}

// Page publique de collecte (direction « Signal »).
// Conforme aux règles Google : AUCUN filtrage selon la note.
// Tout le monde voit le même bouton « Avis Google » en avant, et tout le
// monde peut, en option, laisser un commentaire privé au gérant.
// Aucune police ni image externe (rapide en 4G).

export default function RatingFlow({ establishmentId, name, logoUrl, googleReviewUrl, accentColor }: Props) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [showComment, setShowComment] = useState(false)
  const [sending, setSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)

  // Une seule trace « note seule » par visite, même si le client corrige sa note
  const autoLogged = useRef(false)

  const submitRating = (n: number) => {
    setRating(n)
    setError('')
    if (!autoLogged.current) {
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

  return (
    <main className="min-h-[100dvh] bg-white text-[#17181C] flex flex-col items-center px-6 pt-12 pb-8">
      <style>{`
        @keyframes star-pop { 0% { transform: scale(1); } 45% { transform: scale(1.35); } 100% { transform: scale(1); } }
        @keyframes rise-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .star-lit { animation: star-pop .35s ease; }
        .rise { animation: rise-in .3s ease both; }
        @media (prefers-reduced-motion: reduce) {
          .star-lit, .rise { animation: none; }
        }
      `}</style>

      <div className="w-full max-w-md flex flex-col items-center">
        {/* Barre d'accent */}
        <div className="h-1.5 w-14 rounded-full mb-9" style={{ background: accentColor }} aria-hidden />

        {/* Logo */}
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={name} className="w-[84px] h-[84px] rounded-[26px] object-cover" />
        ) : (
          <div
            className="w-[84px] h-[84px] rounded-[26px] flex items-center justify-center text-4xl font-extrabold text-white"
            style={{ background: accentColor }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <h1 className="text-[1.9rem] font-extrabold tracking-[-0.03em] text-center mt-5 leading-tight">{name}</h1>

        <p className="text-[#71747E] text-center mt-2 mb-7">
          {rating === 0 ? 'Comment s’est passée votre visite ?' : 'Touchez une étoile pour modifier votre note'}
        </p>

        {/* Étoiles — toujours cliquables */}
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const lit = n <= (hover || rating)
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} étoile${n > 1  ? 's' : ''}`}
                aria-pressed={rating >= n}
                onClick={() => submitRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className={`text-[46px] leading-none p-1.5 active:scale-90 transition-transform ${lit && rating >= n ? 'star-lit' : ''}`}
                style={{ color: lit ? '#FFB020' : '#E8E8EA' }}
              >
                ★
              </button>
            )
          })}
        </div>

        {rating > 0 && (
          <div className="rise w-full flex flex-col gap-4 mt-7">
            <p className="text-[#55585F] text-center">Merci pour votre note ! 🙏</p>

            {/* Bouton Google — identique pour toutes les notes, mis en avant */}
            {googleReviewUrl && (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-[#17181C] text-white font-bold text-base py-[17px] rounded-2xl active:scale-[0.98] transition-transform"
              >
                Laisser un avis sur Google →
              </a>
            )}

            {/* Commentaire privé — proposé à tous, en option, en secondaire */}
            {!feedbackSent ? (
              !showComment ? (
                <button
                  onClick={() => setShowComment(true)}
                  className="text-sm text-[#71747E] underline underline-offset-4 decoration-[#D5D6DA] py-1"
                >
                  Laisser un mot au gérant (privé)
                </button>
              ) : (
                <div className="w-full bg-[#F7F7F5] rounded-[20px] p-5 flex flex-col gap-3">
                  <p className="font-bold">Un mot pour le gérant</p>
                  <p className="text-sm text-[#55585F] leading-relaxed -mt-1.5">
                    Ce message est privé — il aide l&apos;équipe à s&apos;améliorer et n&apos;est pas publié.
                  </p>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    rows={4}
                    placeholder="Votre message…"
                    className="w-full rounded-[14px] p-3 text-base bg-white resize-none focus:outline-none transition-colors"
                    style={{ border: `2px solid ${focused ? accentColor : '#E8E8EA'}` }}
                  />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <button
                    onClick={submitFeedback}
                    disabled={sending || comment.trim().length === 0}
                    className="w-full text-white font-bold py-[15px] rounded-[14px] text-[0.95rem] disabled:opacity-40 active:scale-[0.98] transition-transform"
                    style={{ background: accentColor }}
                  >
                    {sending ? 'Envoi…' : 'Envoyer au gérant'}
                  </button>
                </div>
              )
            ) : (
              <div className="rise w-full bg-[#F7F7F5] rounded-[20px] p-6 text-center">
                <p className="font-bold text-lg">Merci pour votre retour 🙏</p>
                <p className="text-sm text-[#55585F] mt-1">Le gérant en prendra connaissance rapidement.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="mt-auto pt-10 text-xs text-[#B4B6BC]">Propulsé par StarReviews</footer>
    </main>
  )
}
