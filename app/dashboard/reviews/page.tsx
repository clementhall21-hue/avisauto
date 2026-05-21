'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, AlertTriangle, Zap, Lock } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useEstablishment, useSubscription } from '../layout'
import ReviewCard, { type Review } from '@/components/ReviewCard'
import { getInitials, getAvatarColor, TONE_COLORS, STATIC_REPLIES } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import UpgradeModal from '@/components/UpgradeModal'

const TONES = ['Professionnel', 'Chaleureux', 'Empathique', 'Décontracté'] as const

const SAMPLE_REVIEWS = [
  {
    reviewer_name: 'Marie Laurent',
    stars: 5,
    review_text: 'Service impeccable, équipe très professionnelle et souriante. La chambre était magnifique et très propre. Je recommande vivement cet hôtel !',
    review_date: 'Il y a 2 jours',
  },
  {
    reviewer_name: 'Thomas Durand',
    stars: 4,
    review_text: "Très bon restaurant, la cuisine était excellente. Le service était un peu lent en salle mais dans l'ensemble une très bonne expérience.",
    review_date: 'Il y a 4 jours',
  },
  {
    reviewer_name: 'Sophie Martin',
    stars: 2,
    review_text: "Déçue par notre séjour. La chambre n'était pas propre à notre arrivée et le petit-déjeuner était froid. Pour le prix, on s'attendait à mieux.",
    review_date: 'Il y a 1 semaine',
  },
  {
    reviewer_name: 'Jean-Pierre Blanc',
    stars: 5,
    review_text: 'Excellent séjour ! Personnel aux petits soins, cadre magnifique. Nous reviendrons certainement. Mention spéciale pour le chef dont la cuisine est divine.',
    review_date: 'Il y a 1 semaine',
  },
  {
    reviewer_name: 'Camille Rousseau',
    stars: 3,
    review_text: 'Hôtel correct pour le prix. Le personnel est sympa mais les équipements commencent à vieillir. La piscine était froide. Vue sur le jardin agréable.',
    review_date: 'Il y a 2 semaines',
  },
  {
    reviewer_name: 'Antoine Girard',
    stars: 1,
    review_text: "Très mauvaise expérience. Nous avons attendu plus d'une heure pour le check-in, la chambre n'était pas celle que nous avions réservée et le wifi ne fonctionnait pas.",
    review_date: 'Il y a 2 semaines',
  },
  {
    reviewer_name: 'Lucie Mercier',
    stars: 5,
    review_text: "Un week-end parfait ! Le spa est incroyable, le personnel aux petits soins. Le petit-déjeuner copieux et délicieux. On revient l'année prochaine c'est certain !",
    review_date: 'Il y a 3 semaines',
  },
  {
    reviewer_name: 'Fabrice Bonnet',
    stars: 4,
    review_text: "Très bonne adresse, restaurant gastronomique de qualité. Le sommelier est particulièrement compétent. Seul bémol : le parking un peu éloigné.",
    review_date: 'Il y a 3 semaines',
  },
  {
    reviewer_name: 'Nathalie Petit',
    stars: 2,
    review_text: "Chambre bruyante donnant sur la rue, impossible de dormir avant minuit. Le ménage n'avait pas été fait correctement à notre arrivée. Dommage car l'emplacement est top.",
    review_date: 'Il y a 1 mois',
  },
  {
    reviewer_name: 'Olivier Leroy',
    stars: 5,
    review_text: "Séjour magique pour notre anniversaire de mariage. La direction nous a offert une bouteille de champagne et surclassé notre chambre. Service 5 étoiles.",
    review_date: 'Il y a 1 mois',
  },
]

export default function ReviewsPage() {
  const { establishment, setPendingCount } = useEstablishment()
  const subscription = useSubscription()
  const isPro = !subscription || subscription.plan === 'pro' || subscription.status === 'trialing'
  const [reviews, setReviews] = useState<Review[]>([])
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set())
  const [tone, setTone] = useState<string>('Professionnel')
  const [search, setSearch] = useState('')
  const [filterStars, setFilterStars] = useState('0')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [hasGroqKey, setHasGroqKey] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [publishingAll, setPublishingAll] = useState(false)
  const { showToast } = useToast()

  const supabase = createClient()

  // Fetch userId on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const generateReply = useCallback(
    async (review: Review, currentTone: string, length: 'short' | 'normal' | 'detailed' = 'normal'): Promise<string | null> => {
      try {
        const res = await fetch('/api/generate-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewText: review.review_text,
            stars: review.stars,
            tone: currentTone,
            hotelName: establishment?.name || 'notre établissement',
            signature: establishment?.signature || '',
            length,
            userId: userId || undefined,
          }),
        })
        if (res.status === 403) {
          const data = await res.json()
          if (data.error === 'LIMIT_REACHED') {
            showToast('Limite de 30 réponses atteinte ce mois-ci. Passez au Pro pour des réponses illimitées.')
            return null
          }
        }
        const data = await res.json()
        return data.reply || ''
      } catch {
        const toneReplies = STATIC_REPLIES[currentTone] || STATIC_REPLIES['Professionnel']
        const key = Math.min(Math.max(review.stars, 1), 5) as keyof typeof toneReplies
        return toneReplies[key] || toneReplies[3]
      }
    },
    [establishment, userId, showToast]
  )

  useEffect(() => {
    if (establishment) {
      setTone(establishment.tone || 'Professionnel')
      setHasGroqKey(!!establishment.groq_api_key || !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    }
  }, [establishment])

  // Refresh quand l'utilisateur revient sur la page (ex: après avoir changé le mode auto dans Paramètres)
  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    const fetchReviews = async () => {
      if (!establishment) return
      setLoading(true)

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('establishment_id', establishment.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      if (data && data.length >= 4) {
        let reviews = data as Review[]

        // Si le mode auto est actif au chargement, programmer les avis en attente
        if (establishment.auto_mode && establishment.publish_delay_sec > 0) {
          const toSchedule = reviews.filter((r) => r.status === 'pending' && r.ai_reply)
          if (toSchedule.length > 0) {
            const scheduledAt = new Date(Date.now() + establishment.publish_delay_sec * 1000).toISOString()
            await supabase
              .from('reviews')
              .update({ status: 'scheduled', scheduled_at: scheduledAt })
              .in('id', toSchedule.map((r) => r.id))
            reviews = reviews.map((r) =>
              toSchedule.find((s) => s.id === r.id)
                ? { ...r, status: 'scheduled' as const, scheduled_at: scheduledAt }
                : r
            )
          }
        }

        setReviews(reviews)
        const pending = reviews.filter((r) => r.status === 'pending').length
        setPendingCount(pending)
        setLoading(false)
        return
      }

      // Seed with sample reviews (if fewer than 4, add missing ones)
      const existing = data?.length || 0
      const toInsert = SAMPLE_REVIEWS.slice(existing)
      const sampleWithColors = toInsert.map((r, i) => {
        const color = getAvatarColor(i)
        return {
          establishment_id: establishment.id,
          reviewer_name: r.reviewer_name,
          reviewer_initials: getInitials(r.reviewer_name),
          reviewer_color: color.bg,
          reviewer_text_color: color.text,
          stars: r.stars,
          review_text: r.review_text,
          review_date: r.review_date,
          status: 'pending' as const,
          source: 'sample',
        }
      })

      const { data: inserted } = await supabase
        .from('reviews')
        .insert(sampleWithColors)
        .select()

      if (inserted) {
        const allReviews = [...(data || []), ...inserted] as Review[]
        setReviews(allReviews)
        setPendingCount(allReviews.filter((r) => r.status === 'pending').length)
      }
      setLoading(false)
    }

    fetchReviews()
  }, [establishment, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate AI replies for pending reviews with no reply
  useEffect(() => {
    const generateMissing = async () => {
      const pending = reviews.filter((r) => r.status === 'pending' && !r.ai_reply)
      for (const review of pending) {
        setGeneratingIds((prev) => new Set(prev).add(review.id))
        const reply = await generateReply(review, tone)
        setGeneratingIds((prev) => {
          const next = new Set(prev)
          next.delete(review.id)
          return next
        })
        if (reply === null) break // limit reached, stop generating
        // Update in DB
        await supabase
          .from('reviews')
          .update({ ai_reply: reply })
          .eq('id', review.id)
        setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, ai_reply: reply } : r)))
      }
    }
    if (reviews.length > 0) generateMissing()
  }, [reviews.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublish = async (id: string) => {
    const publishedAt = new Date().toISOString()

    if (establishment?.auto_mode && establishment.publish_delay_sec > 0) {
      const scheduledAt = new Date(Date.now() + establishment.publish_delay_sec * 1000).toISOString()
      await supabase.from('reviews').update({ status: 'scheduled', scheduled_at: scheduledAt }).eq('id', id)
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'scheduled', scheduled_at: scheduledAt } : r)))
      showToast(`Programmé dans ${Math.round(establishment.publish_delay_sec / 60)}min`)
    } else {
      await supabase.from('reviews').update({ status: 'published', published_at: publishedAt }).eq('id', id)
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'published', published_at: publishedAt } : r)))
      const newPending = reviews.filter((r) => r.id !== id && r.status === 'pending').length
      setPendingCount(newPending)
    }
  }

  const handleRegenerate = async (id: string, length: 'short' | 'normal' | 'detailed' = 'normal') => {
    const review = reviews.find((r) => r.id === id)
    if (!review) return
    setGeneratingIds((prev) => new Set(prev).add(id))
    const reply = await generateReply(review, tone, length)
    setGeneratingIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    if (reply === null) return // limit reached, don't update
    await supabase.from('reviews').update({ ai_reply: reply }).eq('id', id)
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ai_reply: reply } : r)))
  }

  const handleDelete = async (id: string) => {
    const target = reviews.find((r) => r.id === id)

    if (target?.status === 'published') {
      // Remettre en attente plutôt que supprimer
      await supabase.from('reviews').update({
        status: 'pending',
        ai_reply: null,
        published_at: null,
        scheduled_at: null,
      }).eq('id', id)
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, status: 'pending', ai_reply: null, published_at: null, scheduled_at: null } : r))
      setPendingCount((p) => p + 1)
      showToast('Réponse supprimée — avis remis en attente')
    } else {
      await supabase.from('reviews').delete().eq('id', id)
      setReviews((prev) => prev.filter((r) => r.id !== id))
      if (target?.status === 'pending') {
        setPendingCount((p) => Math.max(0, p - 1))
      }
      showToast('Avis supprimé')
    }
  }

  const handleSnooze = async (id: string) => {
    await supabase.from('reviews').update({ status: 'snoozed' }).eq('id', id)
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, status: 'snoozed' as const } : r))
    setPendingCount((p) => Math.max(0, p - 1))
    showToast('Avis mis de côté — retrouvez-le dans "Plus tard"')
  }

  const handleUnsnooze = async (id: string) => {
    await supabase.from('reviews').update({ status: 'pending' }).eq('id', id)
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, status: 'pending' as const } : r))
    setPendingCount((p) => p + 1)
    showToast('Avis remis en attente')
  }

  const handleSaveReply = async (id: string, text: string) => {
    await supabase.from('reviews').update({ ai_reply: text }).eq('id', id)
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ai_reply: text } : r)))
  }

  const handleCancelSchedule = async (id: string) => {
    await supabase.from('reviews').update({ status: 'pending', scheduled_at: null }).eq('id', id)
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'pending', scheduled_at: null } : r)))
    setPendingCount((p) => p + 1)
  }

  const handlePublishNow = async (id: string) => {
    const publishedAt = new Date().toISOString()
    await supabase.from('reviews').update({ status: 'published', published_at: publishedAt, scheduled_at: null }).eq('id', id)
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'published', published_at: publishedAt, scheduled_at: null } : r)))
  }

  const handleToneChange = async (newTone: string) => {
    if (!isPro && newTone !== 'Professionnel') {
      setUpgradeFeature('Les tons IA (Chaleureux, Empathique, Décontracté)')
      setUpgradeModalOpen(true)
      return
    }
    setTone(newTone)
    if (establishment) {
      await supabase.from('establishments').update({ tone: newTone }).eq('id', establishment.id)
    }
  }

  const handlePublishAll = async () => {
    const toPublish = reviews.filter((r) => (r.status === 'pending' || r.status === 'snoozed') && r.ai_reply)
    if (toPublish.length === 0) {
      showToast('Aucun avis avec une réponse prête à publier.')
      return
    }
    setPublishingAll(true)
    const publishedAt = new Date().toISOString()
    await supabase
      .from('reviews')
      .update({ status: 'published', published_at: publishedAt })
      .in('id', toPublish.map((r) => r.id))
    setReviews((prev) =>
      prev.map((r) =>
        toPublish.find((p) => p.id === r.id)
          ? { ...r, status: 'published' as const, published_at: publishedAt }
          : r
      )
    )
    setPendingCount(0)
    setPublishingAll(false)
    showToast(`${toPublish.length} réponse${toPublish.length > 1 ? 's' : ''} publiée${toPublish.length > 1 ? 's' : ''} !`)
  }

  // Filtered reviews
  const filtered = reviews.filter((r) => {
    if (search && !r.review_text.toLowerCase().includes(search.toLowerCase()) && !r.reviewer_name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStars === '5' && r.stars !== 5) return false
    if (filterStars === '4' && r.stars !== 4) return false
    if (filterStars === '3' && r.stars > 3) return false
    if (filterStatus === 'pending' && r.status !== 'pending') return false
    if (filterStatus === 'published' && r.status !== 'published') return false
    if (filterStatus === 'snoozed' && r.status !== 'snoozed') return false
    if (filterStatus === 'all' && r.status === 'snoozed') return false
    return true
  })

  // Stats
  const totalReviews = reviews.length
  const avgStars = totalReviews ? (reviews.reduce((sum, r) => sum + r.stars, 0) / totalReviews).toFixed(1) : '—'
  const publishedCount = reviews.filter((r) => r.status === 'published').length
  const responseRate = totalReviews ? Math.round((publishedCount / totalReviews) * 100) : 0
  const pendingCount_ = reviews.filter((r) => r.status === 'pending').length

  const selectClass =
    'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-[#e8eaf6] px-3 py-2 rounded-lg font-[inherit] text-sm outline-none cursor-pointer'

  return (
    <div>
      <UpgradeModal open={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} feature={upgradeFeature} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-7">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#e8eaf6]">Avis reçus</h2>
          <p className="text-sm text-[#8892b0] mt-1">
            Tous vos avis Google, réponses IA générées automatiquement.
          </p>
          {/* Usage counter for Starter */}
          {!isPro && (
            <div className="mt-2 text-xs text-[#8892b0] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
              <span className="font-semibold text-[#e8eaf6]">{subscription?.ai_replies_count || 0}/30</span> réponses utilisées ce mois
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!hasGroqKey && (
            <div
              className="text-xs bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] text-[#f59e0b] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[rgba(245,158,11,0.15)] transition-colors flex items-center gap-1.5"
              onClick={() => (window.location.href = '/dashboard/settings')}
            >
              <AlertTriangle size={12} />
              Clé Groq manquante — configurer
            </div>
          )}
          {establishment?.auto_mode && isPro && (
            <div className="text-xs font-semibold bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.3)] text-[#34d399] px-3 py-1.5 rounded-full flex items-center gap-1">
              <Zap size={11} />
              Auto actif
            </div>
          )}
          {/* Auto mode banner for Starter */}
          {establishment?.auto_mode && !isPro && (
            <div className="text-xs bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] text-[#f59e0b] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Le mode automatique nécessite le plan Pro —{' '}
              <a href="/api/stripe/create-checkout?plan=pro" className="underline font-semibold hover:text-[#fbbf24]">
                Passer au Pro
              </a>
            </div>
          )}

          {/* Publish all button */}
          {reviews.filter((r) => (r.status === 'pending' || r.status === 'snoozed') && r.ai_reply).length > 0 && !establishment?.auto_mode && (
            <button
              onClick={handlePublishAll}
              disabled={publishingAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed text-white"
              style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}
            >
              <Zap size={12} />
              {publishingAll ? 'Publication…' : `Tout publier (${reviews.filter((r) => (r.status === 'pending' || r.status === 'snoozed') && r.ai_reply).length})`}
            </button>
          )}

          <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 focus-within:border-[rgba(99,102,241,0.5)] transition-colors">
            <Search size={14} className="text-[#8892b0]" />
            <input
              type="text"
              placeholder="Rechercher un avis…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-[#e8eaf6] text-sm placeholder-[#8892b0] w-[180px]"
            />
          </div>

          <select value={filterStars} onChange={(e) => setFilterStars(e.target.value)} className={selectClass}>
            <option value="0">Toutes les notes</option>
            <option value="5">★★★★★</option>
            <option value="4">★★★★</option>
            <option value="3">★★★ et -</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
            <option value="all">Tous les statuts</option>
            <option value="pending">⏳ Sans réponse</option>
            <option value="published">✓ Répondus</option>
            <option value="snoozed">🔖 Plus tard</option>
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Note moyenne', value: avgStars, delta: '⭐', color: 'rgba(99,102,241,0.3)' },
          { label: 'Avis reçus', value: totalReviews || '—', delta: 'total', color: 'rgba(6,182,212,0.3)' },
          { label: 'Taux de réponse', value: totalReviews ? `${responseRate}%` : '—', delta: `${publishedCount} répondus`, color: 'rgba(52,211,153,0.3)' },
          { label: 'Sans réponse', value: pendingCount_ || '—', delta: 'à traiter', color: 'rgba(245,158,11,0.3)' },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 hover:translate-y-[-2px] transition-transform"
            style={{ borderTopColor: stat.color, borderTopWidth: 2 }}
          >
            <div className="text-xs text-[#8892b0] font-medium uppercase tracking-wider mb-1.5">
              {stat.label}
            </div>
            <div className="text-[1.8rem] font-bold tracking-tight text-[#e8eaf6]">{stat.value}</div>
            <div className="text-xs text-[#8892b0] mt-0.5">{stat.delta}</div>
          </div>
        ))}
      </div>

      {/* Tone selector */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-xs text-[#8892b0] font-medium mr-1">Ton IA :</span>
        {TONES.map((t) => {
          const col = TONE_COLORS[t]
          const isActive = tone === t
          const isLocked = !isPro && t !== 'Professionnel'
          return (
            <button
              key={t}
              onClick={() => {
                if (isLocked) {
                  setUpgradeFeature('Les tons IA (Chaleureux, Empathique, Décontracté)')
                  setUpgradeModalOpen(true)
                } else {
                  handleToneChange(t)
                }
              }}
              className="px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5"
              style={{
                borderColor: isLocked ? 'rgba(255,255,255,0.05)' : isActive ? col.border : 'rgba(255,255,255,0.07)',
                color: isLocked ? 'rgba(136,146,176,0.4)' : isActive ? col.text : '#8892b0',
                background: isLocked ? 'transparent' : isActive ? col.bg : 'transparent',
                cursor: isLocked ? 'pointer' : 'pointer',
              }}
            >
              {isLocked && <Lock size={10} />}
              {t}
              {isLocked && (
                <span className="bg-[rgba(99,102,241,0.2)] text-[#818cf8] text-[0.6rem] font-bold px-1 py-0.5 rounded">
                  Pro
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-[38px] h-[38px] rounded-full shimmer" />
                <div className="flex-1">
                  <div className="h-3.5 w-32 rounded shimmer mb-1.5" />
                  <div className="h-2.5 w-20 rounded shimmer" />
                </div>
                <div className="h-3 w-24 rounded shimmer" />
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-3 rounded shimmer" />
                <div className="h-3 rounded shimmer w-4/5" />
                <div className="h-3 rounded shimmer w-3/5" />
              </div>
              <div className="h-[80px] rounded-[10px] shimmer" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🏨</div>
          <h3 className="text-xl font-bold text-[#e8eaf6] mb-2">Bienvenue sur AvisAuto !</h3>
          <p className="text-[#8892b0] text-sm mb-6 max-w-[380px] mx-auto leading-relaxed">
            Commencez par ajouter votre premier avis Google pour voir l&apos;IA générer une réponse automatiquement.
          </p>
          <a href="/dashboard/settings" className="btn-primary text-sm">
            Ajouter un avis →
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8892b0]">
          <div className="text-4xl mb-4">📭</div>
          <div className="font-medium">Aucun avis trouvé</div>
          <div className="text-sm mt-1">
            {search || filterStars !== '0' || filterStatus !== 'all'
              ? 'Modifiez vos filtres pour voir plus de résultats'
              : 'Ajoutez un avis manuellement depuis les Paramètres'}
          </div>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="flex flex-col gap-3.5">
            {filtered.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                tone={tone}
                isGenerating={generatingIds.has(review.id)}
                onPublish={handlePublish}
                onRegenerate={handleRegenerate}
                onDelete={handleDelete}
                onSnooze={handleSnooze}
                onUnsnooze={handleUnsnooze}
                onSaveReply={handleSaveReply}
                onCancelSchedule={handleCancelSchedule}
                onPublishNow={handlePublishNow}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
