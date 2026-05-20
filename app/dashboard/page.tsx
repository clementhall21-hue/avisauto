'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart2, Settings, Star, MessageSquare, TrendingUp, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEstablishment } from './layout'

interface Review {
  id: string
  reviewer_name: string
  stars: number
  review_text: string
  status: 'pending' | 'scheduled' | 'published'
  created_at: string
}

export default function DashboardPage() {
  const { establishment } = useEstablishment()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'vous')
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!establishment) return
    const fetchReviews = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('reviews')
        .select('id, reviewer_name, stars, review_text, status, created_at')
        .eq('establishment_id', establishment.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setReviews((data || []) as Review[])
      setLoading(false)
    }
    fetchReviews()
  }, [establishment])

  const totalReviews = reviews.length
  const avgStars = totalReviews ? (reviews.reduce((s, r) => s + r.stars, 0) / totalReviews).toFixed(1) : '—'
  const published = reviews.filter((r) => r.status === 'published').length
  const pending = reviews.filter((r) => r.status === 'pending').length
  const responseRate = totalReviews ? Math.round((published / totalReviews) * 100) : 0
  const recent = reviews.slice(0, 5)

  const stats = [
    { label: 'Note moyenne', value: avgStars, icon: Star, color: 'rgba(99,102,241,0.3)', iconColor: '#818cf8' },
    { label: 'Total avis', value: totalReviews || '—', icon: MessageSquare, color: 'rgba(6,182,212,0.3)', iconColor: '#06b6d4' },
    { label: 'Taux de réponse', value: totalReviews ? `${responseRate}%` : '—', icon: TrendingUp, color: 'rgba(52,211,153,0.3)', iconColor: '#34d399' },
    { label: 'En attente', value: pending || '—', icon: Clock, color: 'rgba(245,158,11,0.3)', iconColor: '#f59e0b' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-[#e8eaf6]">
          Bonjour{userName ? `, ${userName}` : ''} 👋
        </h2>
        <p className="text-sm text-[#8892b0] mt-1">
          {establishment?.name ? `Tableau de bord — ${establishment.name}` : 'Voici un aperçu de votre activité.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {loading
          ? [1,2,3,4].map((i) => (
              <div key={i} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
                <div className="h-3 w-20 rounded shimmer mb-3" />
                <div className="h-8 w-16 rounded shimmer mb-1" />
                <div className="h-2.5 w-12 rounded shimmer" />
              </div>
            ))
          : stats.map((stat, i) => (
              <div
                key={i}
                className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 hover:translate-y-[-2px] transition-transform"
                style={{ borderTopColor: stat.color, borderTopWidth: 2 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-[#8892b0] font-medium uppercase tracking-wider">{stat.label}</div>
                  <stat.icon size={14} style={{ color: stat.iconColor }} />
                </div>
                <div className="text-[1.8rem] font-bold tracking-tight text-[#e8eaf6]">{stat.value}</div>
              </div>
            ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="md:col-span-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <h3 className="font-semibold text-[#e8eaf6] mb-4 text-sm">Activité récente</h3>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full shimmer flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-32 rounded shimmer mb-1.5" />
                    <div className="h-2.5 w-48 rounded shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-8 text-[#8892b0]">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">Aucun avis pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((r) => (
                <Link
                  key={r.id}
                  href="/dashboard/reviews"
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-[#e8eaf6] group-hover:text-[#818cf8] transition-colors truncate">{r.reviewer_name}</span>
                      <span className="text-xs text-amber-400 flex-shrink-0">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                    </div>
                    <p className="text-xs text-[#8892b0] truncate">{r.review_text.slice(0, 80)}{r.review_text.length > 80 ? '…' : ''}</p>
                  </div>
                  <span className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${
                    r.status === 'published' ? 'bg-[rgba(52,211,153,0.12)] text-[#34d399] border border-[rgba(52,211,153,0.25)]' :
                    r.status === 'scheduled' ? 'bg-[rgba(99,102,241,0.12)] text-[#818cf8] border border-[rgba(99,102,241,0.25)]' :
                    'bg-[rgba(245,158,11,0.12)] text-[#f59e0b] border border-[rgba(245,158,11,0.25)]'
                  }`}>
                    {r.status === 'published' ? '✓ Publié' : r.status === 'scheduled' ? '⏱ Programmé' : '⏳ En attente'}
                  </span>
                </Link>
              ))}
            </div>
          )}
          {recent.length > 0 && (
            <Link href="/dashboard/reviews" className="block mt-4 text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors text-center">
              Voir tous les avis →
            </Link>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
            <h3 className="font-semibold text-[#e8eaf6] mb-4 text-sm">Actions rapides</h3>
            <div className="space-y-2.5">
              <Link
                href="/dashboard/reviews"
                className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] hover:bg-[rgba(99,102,241,0.15)] transition-colors group"
              >
                <BarChart2 size={16} className="text-[#818cf8]" />
                <div>
                  <div className="text-sm font-medium text-[#e8eaf6]">Gérer les avis</div>
                  {pending > 0 && <div className="text-xs text-[#f59e0b]">{pending} en attente</div>}
                </div>
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <Settings size={16} className="text-[#8892b0]" />
                <div className="text-sm font-medium text-[#e8eaf6]">Paramètres</div>
              </Link>
            </div>
          </div>

          {pending > 0 && (
            <div className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-xl p-4">
              <div className="text-xs font-semibold text-[#f59e0b] mb-1">⏳ {pending} avis en attente</div>
              <p className="text-xs text-[#8892b0] mb-3">Des avis n&apos;ont pas encore reçu de réponse.</p>
              <Link href="/dashboard/reviews" className="text-xs font-semibold text-[#6366f1] hover:text-[#818cf8] transition-colors">
                Répondre maintenant →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
