'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Loader2, TrendingUp, AlertCircle, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEstablishment, useSubscription } from '../layout'
import CheckoutButton from '@/components/CheckoutButton'

interface Review {
  id: string
  reviewer_name: string
  reviewer_initials: string
  reviewer_color: string
  reviewer_text_color: string
  stars: number
  review_text: string
  review_date: string
  status: string
  ai_reply: string | null
}

const STAR_COLORS = ['#f43f5e', '#f59e0b', '#f59e0b', '#34d399', '#E4572E']

function DonutChart({ percentage }: { percentage: number }) {
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="14" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#E4572E"
        strokeWidth="14"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

export default function AnalyticsPage() {
  const { establishment } = useEstablishment()
  const subscription = useSubscription()
  const isPro = !subscription || subscription.plan === 'pro' || subscription.status === 'trialing'
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState('')

  useEffect(() => {
    if (!establishment) return
    const supabase = createClient()
    supabase
      .from('reviews')
      .select('*')
      .eq('establishment_id', establishment.id)
      .then(({ data }) => {
        setReviews((data as Review[]) || [])
        setLoading(false)
      })
  }, [establishment])

  const totalReviews = reviews.length
  const publishedCount = reviews.filter((r) => r.status === 'published').length
  const responseRate = totalReviews ? Math.round((publishedCount / totalReviews) * 100) : 0
  const avgStars = totalReviews
    ? (reviews.reduce((sum, r) => sum + r.stars, 0) / totalReviews).toFixed(2)
    : '0'

  // Star distribution
  const starDist = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.stars === star).length
    return {
      star,
      count,
      pct: totalReviews ? Math.round((count / totalReviews) * 100) : 0,
    }
  })

  // Chart data
  const chartData = starDist.map((d) => ({ name: `${d.star}★`, count: d.count, pct: d.pct }))

  // Insights
  const negCount = reviews.filter((r) => r.stars <= 2).length
  const fiveStarCount = reviews.filter((r) => r.stars === 5).length
  const recentReviews = reviews.slice(0, 30)
  const recentAvg = recentReviews.length
    ? (recentReviews.reduce((sum, r) => sum + r.stars, 0) / recentReviews.length).toFixed(1)
    : avgStars

  const insights = [
    totalReviews > 0
      ? `Votre note moyenne est de ${avgStars}/5 étoiles sur ${totalReviews} avis.`
      : 'Aucun avis disponible pour le moment.',
    responseRate > 0
      ? `Vous avez répondu à ${responseRate}% de vos avis (${publishedCount} sur ${totalReviews}).`
      : 'Commencez à répondre à vos avis pour améliorer votre réputation.',
    negCount > 0
      ? `${negCount} avis négatif${negCount > 1 ? 's' : ''} (1-2★) mérite${negCount > 1 ? 'nt' : ''} une attention particulière.`
      : 'Aucun avis très négatif — excellent signe pour votre image.',
    fiveStarCount > 0
      ? `${fiveStarCount} client${fiveStarCount > 1 ? 's' : ''} vous ont attribué 5 étoiles — excellent !`
      : 'Encouragez vos clients satisfaits à laisser un avis 5 étoiles.',
  ]

  const topReviews = reviews.filter((r) => r.stars === 5).slice(0, 3)
  const negativeReviews = reviews.filter((r) => r.stars <= 2)

  const handleAnalyze = async () => {
    if (negativeReviews.length === 0) {
      setAnalysis('Aucun avis négatif trouvé. Félicitations pour votre excellente réputation !')
      return
    }
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-negative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviews: negativeReviews.map((r) => ({
            review_text: r.review_text,
            stars: r.stars,
            reviewer_name: r.reviewer_name,
          })),
        }),
      })
      const data = await res.json()
      setAnalysis(data.analysis || 'Analyse non disponible.')
    } catch {
      setAnalysis('Erreur lors de l\'analyse. Vérifiez votre clé Groq.')
    } finally {
      setAnalyzing(false)
    }
  }

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-2xl font-bold text-[#17181C] mb-3">Analytiques Pro</h2>
        <p className="text-[#666A72] text-sm mb-6 max-w-[380px] leading-relaxed">
          Les analytiques détaillées, l&apos;analyse des avis négatifs et les insights IA sont disponibles avec le plan Pro.
        </p>
        <CheckoutButton plan="pro" className="btn-primary">
          Passer au Pro — 79€/mois →
        </CheckoutButton>
        <p className="text-xs text-[#666A72] mt-3">14 jours d&apos;essai gratuit inclus</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#E4572E]" size={28} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#17181C]">Analytiques</h2>
        <p className="text-sm text-[#666A72] mt-1">Données calculées en temps réel depuis vos avis.</p>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Star distribution */}
        <div className="bg-[rgba(0,0,0,0.03)] border border-[#ECECEA] rounded-[14px] p-5">
          <div className="text-xs font-semibold text-[#666A72] uppercase tracking-wider mb-5">
            ⭐ Répartition des notes
          </div>
          {totalReviews === 0 ? (
            <div className="text-[#666A72] text-sm text-center py-8">Aucune donnée disponible</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#666A72', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#FFFFFF', border: '1px solid #E3E3E1', borderRadius: 8, color: '#17181C', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }}
                    formatter={(value: number, name: string, props) => [`${value} avis (${props.payload.pct}%)`, '']}
                  />
                  <Bar dataKey="count" radius={4} maxBarSize={20}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={STAR_COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Detailed breakdown */}
              <div className="mt-4 space-y-2">
                {starDist.map((d) => (
                  <div key={d.star} className="flex items-center gap-3">
                    <span className="text-xs text-[#666A72] w-8">{d.star}★</span>
                    <div className="flex-1 h-1.5 bg-[rgba(0,0,0,0.04)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${d.pct}%`,
                          background: STAR_COLORS[5 - d.star],
                        }}
                      />
                    </div>
                    <span className="text-xs text-[#666A72] w-12 text-right">
                      {d.count} ({d.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Response rate donut */}
        <div className="bg-[rgba(0,0,0,0.03)] border border-[#ECECEA] rounded-[14px] p-5">
          <div className="text-xs font-semibold text-[#666A72] uppercase tracking-wider mb-5">
            📊 Taux de réponse
          </div>
          <div className="flex items-center gap-6">
            <DonutChart percentage={responseRate} />
            <div>
              <div className="text-[2rem] font-extrabold tracking-tight text-[#17181C]">
                {responseRate}%
              </div>
              <div className="text-sm text-[#666A72] mt-1">avis répondus</div>
              <div className="text-xs text-[#666A72] mt-1.5">
                {publishedCount} sur {totalReviews} avis
              </div>
            </div>
          </div>

          {/* Additional stats */}
          <div className="grid grid-cols-2 gap-3 mt-4 md:mt-6">
            <div className="bg-[rgba(0,0,0,0.02)] border border-[rgba(0,0,0,0.04)] rounded-xl p-3">
              <div className="text-xs text-[#666A72] mb-1">Note moyenne</div>
              <div className="text-lg font-bold text-[#17181C]">{avgStars}/5</div>
            </div>
            <div className="bg-[rgba(0,0,0,0.02)] border border-[rgba(0,0,0,0.04)] rounded-xl p-3">
              <div className="text-xs text-[#666A72] mb-1">Total avis</div>
              <div className="text-lg font-bold text-[#17181C]">{totalReviews}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-[rgba(0,0,0,0.03)] border border-[#ECECEA] rounded-[14px] p-5 mb-4">
        <div className="text-xs font-semibold text-[#666A72] uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp size={14} />
          Insights
        </div>
        <div className="flex flex-col gap-2.5">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-start gap-3 text-sm text-[#666A72] bg-[rgba(0,0,0,0.02)] rounded-xl px-4 py-3"
            >
              <span className="text-[#E4572E] mt-0.5 flex-shrink-0">→</span>
              {insight}
            </div>
          ))}
        </div>
      </div>

      {/* Top reviews */}
      {topReviews.length > 0 && (
        <div className="bg-[rgba(0,0,0,0.03)] border border-[#ECECEA] rounded-[14px] p-5 mb-4">
          <div className="text-xs font-semibold text-[#666A72] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award size={14} />
            Meilleurs avis reçus
          </div>
          <div className="flex flex-col gap-3">
            {topReviews.map((review, i) => (
              <div
                key={review.id}
                className="flex items-start gap-3 bg-[rgba(0,0,0,0.02)] rounded-xl px-4 py-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: review.reviewer_color, color: review.reviewer_text_color }}
                >
                  {review.reviewer_initials}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[#17181C]">{review.reviewer_name}</span>
                    <span className="text-amber-400 text-xs">{'★'.repeat(review.stars)}</span>
                  </div>
                  <p className="text-sm text-[#666A72] leading-relaxed line-clamp-2">{review.review_text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negative review analysis */}
      <div className="bg-[rgba(0,0,0,0.03)] border border-[rgba(244,63,94,0.22)] rounded-[14px] p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
          <div>
            <div className="text-xs font-semibold text-[#666A72] uppercase tracking-wider flex items-center gap-2">
              <AlertCircle size={14} />
              Analyse des avis négatifs
            </div>
            <div className="text-xs text-[#666A72] mt-1">
              Groq résume les problèmes récurrents et propose des actions concrètes
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#E4572E] to-[#7c3aed] text-white text-sm font-semibold hover:from-[#C2481F] hover:to-[#E4572E] transition-all disabled:opacity-60"
          >
            {analyzing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Analyse en cours…
              </>
            ) : (
              <>⚡ Analyser avec Groq</>
            )}
          </button>
        </div>

        {analysis ? (
          <div className="bg-[rgba(0,0,0,0.02)] rounded-xl p-4 text-sm text-[#17181C] leading-relaxed whitespace-pre-wrap">
            {analysis}
          </div>
        ) : (
          <div className="text-sm text-[#666A72]">
            Cliquez sur &ldquo;Analyser&rdquo; — Groq lit tous vos avis négatifs et vous dit exactement quoi améliorer.
            {negativeReviews.length > 0 && (
              <span className="ml-1 text-[#B45309]">({negativeReviews.length} avis négatif{negativeReviews.length > 1 ? 's' : ''} détecté{negativeReviews.length > 1 ? 's' : ''})</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
