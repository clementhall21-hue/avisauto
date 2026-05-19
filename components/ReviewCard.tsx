'use client'

import { useState, useRef, useEffect } from 'react'
import { Copy, Edit2, Trash2, Check, RotateCcw, Clock, Send } from 'lucide-react'
import { cn, TONE_COLORS, formatCountdown } from '@/lib/utils'
import { useToast } from './Toast'

export interface Review {
  id: string
  reviewer_name: string
  reviewer_initials: string
  reviewer_color: string
  reviewer_text_color: string
  stars: number
  review_text: string
  review_date: string
  status: 'pending' | 'scheduled' | 'published'
  ai_reply: string | null
  published_at?: string | null
  scheduled_at?: string | null
}

interface ReviewCardProps {
  review: Review
  tone: string
  isGenerating?: boolean
  onPublish: (id: string) => Promise<void>
  onRegenerate: (id: string) => Promise<void>
  onDelete: (id: string) => void
  onSaveReply: (id: string, text: string) => Promise<void>
  onCancelSchedule: (id: string) => Promise<void>
  onPublishNow: (id: string) => Promise<void>
}

export default function ReviewCard({
  review,
  tone,
  isGenerating = false,
  onPublish,
  onRegenerate,
  onDelete,
  onSaveReply,
  onCancelSchedule,
  onPublishNow,
}: ReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(review.ai_reply || '')
  const [countdown, setCountdown] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const editRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    setEditText(review.ai_reply || '')
  }, [review.ai_reply])

  useEffect(() => {
    if (review.status !== 'scheduled' || !review.scheduled_at) return
    const update = () => setCountdown(formatCountdown(review.scheduled_at!))
    update()
    const interval = setInterval(update, 10000)
    return () => clearInterval(interval)
  }, [review.status, review.scheduled_at])

  const handleCopy = () => {
    if (review.ai_reply) {
      navigator.clipboard.writeText(review.ai_reply)
      showToast('Réponse copiée !')
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setTimeout(() => {
      if (editRef.current) {
        editRef.current.focus()
        const range = document.createRange()
        range.selectNodeContents(editRef.current)
        range.collapse(false)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }, 50)
  }

  const handleSaveEdit = async () => {
    const text = editRef.current?.innerText || ''
    setEditText(text)
    setIsEditing(false)
    await onSaveReply(review.id, text)
    showToast('Réponse modifiée')
  }

  const handlePublish = async () => {
    setActionLoading('publish')
    try {
      await onPublish(review.id)
      showToast('Réponse publiée !')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRegenerate = async () => {
    setActionLoading('regen')
    try {
      await onRegenerate(review.id)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePublishNow = async () => {
    setActionLoading('publishnow')
    try {
      await onPublishNow(review.id)
      showToast('Publié maintenant !')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelSchedule = async () => {
    setActionLoading('cancel')
    try {
      await onCancelSchedule(review.id)
      showToast('Programmation annulée')
    } finally {
      setActionLoading(null)
    }
  }

  const toneColor = TONE_COLORS[tone] || TONE_COLORS['Professionnel']
  const stars = review.stars || 5

  return (
    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-5 hover:border-[rgba(99,102,241,0.25)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div
            className="w-[38px] h-[38px] rounded-full flex items-center justify-center font-bold text-[0.9rem] flex-shrink-0"
            style={{ background: review.reviewer_color, color: review.reviewer_text_color }}
          >
            {review.reviewer_initials}
          </div>
          <div>
            <div className="font-semibold text-sm text-[#e8eaf6]">{review.reviewer_name}</div>
            <div className="text-xs text-[#8892b0]">{review.review_date}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Stars */}
          <span className="text-sm tracking-wide">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={i < stars ? 'text-amber-400' : 'text-amber-400/20'}>
                ★
              </span>
            ))}
          </span>

          {/* Status badge */}
          {review.status === 'published' && (
            <span className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-md bg-[rgba(52,211,153,0.12)] text-[#34d399] border border-[rgba(52,211,153,0.25)]">
              ✓ Publié
            </span>
          )}
          {review.status === 'scheduled' && (
            <span className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-md bg-[rgba(99,102,241,0.12)] text-[#818cf8] border border-[rgba(99,102,241,0.25)] flex items-center gap-1">
              <Clock size={10} />
              Programmé
            </span>
          )}
          {review.status === 'pending' && (
            <span className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-md bg-[rgba(245,158,11,0.12)] text-[#f59e0b] border border-[rgba(245,158,11,0.25)]">
              ⏳ En attente
            </span>
          )}
        </div>
      </div>

      {/* Review text */}
      <p className="text-sm text-[#8892b0] leading-relaxed mb-3.5">{review.review_text}</p>

      {/* Scheduled countdown */}
      {review.status === 'scheduled' && review.scheduled_at && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.25)] text-[#818cf8] text-xs font-semibold px-3 py-1 rounded-full">
            <Clock size={11} />
            Publication dans {countdown}
          </span>
          <button
            onClick={handlePublishNow}
            disabled={!!actionLoading}
            className="text-xs text-[#34d399] border border-[rgba(52,211,153,0.3)] px-2.5 py-1 rounded-full hover:bg-[rgba(52,211,153,0.08)] transition-colors disabled:opacity-50"
          >
            Publier maintenant
          </button>
          <button
            onClick={handleCancelSchedule}
            disabled={!!actionLoading}
            className="text-xs text-[#8892b0] border border-[rgba(255,255,255,0.07)] px-2.5 py-1 rounded-full hover:text-[#e8eaf6] hover:border-[rgba(255,255,255,0.2)] transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Published date */}
      {review.status === 'published' && review.published_at && (
        <div className="text-xs text-[#8892b0] mb-3 flex items-center gap-1">
          <Check size={11} className="text-[#34d399]" />
          Publié le{' '}
          {new Date(review.published_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      )}

      {/* AI Response block */}
      {isGenerating ? (
        <div className="bg-[rgba(52,211,153,0.05)] border border-[rgba(52,211,153,0.2)] rounded-[10px] px-4 py-3">
          <div className="text-xs font-bold text-[#34d399] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse-dot" />
            IA · {tone}
          </div>
          <div className="flex items-center gap-1.5 text-[#34d399] text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] inline-block animate-[dotBounce_1.2s_infinite_ease-in-out]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] inline-block animate-[dotBounce_1.2s_0.2s_infinite_ease-in-out]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] inline-block animate-[dotBounce_1.2s_0.4s_infinite_ease-in-out]" />
            <span className="ml-1 text-xs opacity-70">Génération en cours…</span>
          </div>
        </div>
      ) : review.ai_reply ? (
        <div className="bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.2)] rounded-[10px] px-4 py-3">
          <div className="text-[0.7rem] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: toneColor.text }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: toneColor.text }} />
            IA · {tone}
          </div>

          {isEditing ? (
            <div
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              className="text-sm text-[#e8eaf6] leading-relaxed outline-none border border-[#6366f1] rounded-lg px-3 py-2 min-h-[60px] whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: editText }}
            />
          ) : (
            <p className="text-sm text-[#e8eaf6] leading-relaxed whitespace-pre-wrap">{review.ai_reply}</p>
          )}
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {review.status === 'pending' && (
          <button
            onClick={handlePublish}
            disabled={!!actionLoading || !review.ai_reply}
            className="flex items-center gap-1.5 px-3.5 py-[6px] rounded-[7px] text-xs font-semibold bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.25)] text-[#34d399] hover:bg-[rgba(52,211,153,0.18)] transition-colors disabled:opacity-40"
          >
            {actionLoading === 'publish' ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <Send size={11} />
            )}
            Publier
          </button>
        )}

        <button
          onClick={handleRegenerate}
          disabled={!!actionLoading}
          className="flex items-center gap-1.5 px-3.5 py-[6px] rounded-[7px] text-xs font-semibold border border-[rgba(255,255,255,0.07)] text-[#8892b0] hover:text-[#e8eaf6] hover:border-[rgba(255,255,255,0.2)] transition-colors disabled:opacity-40"
        >
          {actionLoading === 'regen' ? (
            <span className="animate-spin text-xs">⟳</span>
          ) : (
            <RotateCcw size={11} />
          )}
          Régénérer
        </button>

        {isEditing ? (
          <button
            onClick={handleSaveEdit}
            className="flex items-center gap-1.5 px-3.5 py-[6px] rounded-[7px] text-xs font-semibold border border-[rgba(99,102,241,0.5)] text-[#818cf8] bg-[rgba(99,102,241,0.1)] hover:bg-[rgba(99,102,241,0.2)] transition-colors"
          >
            <Check size={11} />
            Valider
          </button>
        ) : (
          <button
            onClick={handleEdit}
            disabled={!review.ai_reply}
            className="flex items-center gap-1.5 px-3.5 py-[6px] rounded-[7px] text-xs font-semibold border border-[rgba(255,255,255,0.07)] text-[#8892b0] hover:text-[#e8eaf6] hover:border-[rgba(255,255,255,0.2)] transition-colors disabled:opacity-40"
          >
            <Edit2 size={11} />
            Modifier
          </button>
        )}

        <button
          onClick={handleCopy}
          disabled={!review.ai_reply}
          className="flex items-center gap-1.5 px-3.5 py-[6px] rounded-[7px] text-xs font-semibold border border-[rgba(255,255,255,0.07)] text-[#8892b0] hover:text-[#e8eaf6] hover:border-[rgba(255,255,255,0.2)] transition-colors disabled:opacity-40"
          title="Copier la réponse"
        >
          <Copy size={11} />
          Copier
        </button>

        <button
          onClick={() => onDelete(review.id)}
          className="flex items-center gap-1.5 px-3.5 py-[6px] rounded-[7px] text-xs font-semibold border border-[rgba(255,255,255,0.07)] text-[#8892b0] hover:text-[#f43f5e] hover:border-[rgba(244,63,94,0.3)] transition-colors ml-auto"
          title="Supprimer"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}
