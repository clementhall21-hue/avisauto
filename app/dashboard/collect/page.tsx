'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Download, FileText, Save, MessageSquare, CheckCircle2, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEstablishment } from '../layout'
import { useToast } from '@/components/Toast'

interface Feedback {
  id: string
  rating: number
  comment: string
  status: 'nouveau' | 'lu' | 'traité'
  created_at: string
}

const STATUS_STYLES: Record<Feedback['status'], { label: string; className: string }> = {
  nouveau: { label: 'Nouveau', className: 'bg-[rgba(244,63,94,0.12)] text-[#E11D48] border-[rgba(244,63,94,0.25)]' },
  lu: { label: 'Lu', className: 'bg-[rgba(245,158,11,0.12)] text-[#B45309] border-[rgba(245,158,11,0.25)]' },
  'traité': { label: 'Traité', className: 'bg-[rgba(52,211,153,0.12)] text-[#0E9F6E] border-[rgba(52,211,153,0.25)]' },
}

export default function CollectPage() {
  const { establishment, setEstablishment } = useEstablishment()
  const { showToast } = useToast()
  const supabase = createClient()

  const [slug, setSlug] = useState('')
  const [googleUrl, setGoogleUrl] = useState('')
  const [accent, setAccent] = useState('#E4572E')
  const [saving, setSaving] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true)
  const publicUrl = useRef('')

  const est = establishment as (typeof establishment & {
    slug?: string | null
    google_review_url?: string | null
    logo_url?: string | null
    accent_color?: string | null
  }) | null

  useEffect(() => {
    if (!est) return
    setSlug(est.slug || '')
    setGoogleUrl(est.google_review_url || '')
    setAccent(est.accent_color || '#E4572E')
  }, [est])

  // Génère le QR (affichage écran, 512px)
  useEffect(() => {
    if (!slug) { setQrDataUrl(''); return }
    publicUrl.current = `${window.location.origin}/r/${slug}`
    QRCode.toDataURL(publicUrl.current, { width: 512, margin: 2, color: { dark: '#0b0f1e', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [slug])

  // Charge les feedbacks privés
  useEffect(() => {
    if (!est?.id) return
    const load = async () => {
      const { data } = await supabase
        .from('feedbacks')
        .select('id, rating, comment, status, created_at')
        .eq('establishment_id', est.id)
        .order('created_at', { ascending: false })
      setFeedbacks((data as Feedback[]) || [])
      setLoadingFeedbacks(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [est?.id])

  const saveSettings = async () => {
    if (!est) return
    const cleanSlug = slug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (!cleanSlug) { showToast('Le lien ne peut pas être vide'); return }

    setSaving(true)
    const { data, error } = await supabase
      .from('establishments')
      .update({ slug: cleanSlug, google_review_url: googleUrl.trim() || null, accent_color: accent })
      .eq('id', est.id)
      .select()
      .single()

    setSaving(false)
    if (error) {
      showToast(error.code === '23505' ? 'Ce lien est déjà pris par un autre établissement' : 'Erreur lors de la sauvegarde')
      return
    }
    setEstablishment(data)
    setSlug(cleanSlug)
    showToast('Paramètres sauvegardés')
  }

  // PNG haute résolution (1024px)
  const downloadPng = async () => {
    if (!publicUrl.current) return
    const dataUrl = await QRCode.toDataURL(publicUrl.current, { width: 1024, margin: 2 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-avis-${slug}.png`
    a.click()
  }

  // PDF A6 prêt à imprimer
  const downloadPdf = async () => {
    if (!publicUrl.current || !est) return
    const { jsPDF } = await import('jspdf')
    const qr = await QRCode.toDataURL(publicUrl.current, { width: 1024, margin: 1 })

    // A6 portrait: 105 × 148 mm
    const doc = new jsPDF({ format: 'a6', unit: 'mm' })
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 105, 148, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(11, 15, 30)
    doc.text('Votre avis compte pour nous', 52.5, 23, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(90, 100, 120)
    doc.text('Partagez votre expérience en quelques secondes', 52.5, 32, { align: 'center' })

    doc.addImage(qr, 'PNG', 22.5, 42, 60, 60)

    doc.setFontSize(10)
    doc.setTextColor(11, 15, 30)
    doc.setFont('helvetica', 'bold')
    const displayName = est.name.length > 40 ? est.name.slice(0, 40) + '…' : est.name
    doc.text(displayName, 52.5, 113, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(150, 155, 170)
    doc.text('Propulsé par StarReviews', 52.5, 140, { align: 'center' })

    doc.save(`qr-avis-${slug}.pdf`)
  }

  const updateFeedbackStatus = async (id: string, status: Feedback['status']) => {
    await supabase.from('feedbacks').update({ status }).eq('id', id)
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)))
  }

  const commented = feedbacks.filter((f) => f.comment.trim().length > 0)
  const ratingOnly = feedbacks.filter((f) => f.comment.trim().length === 0)

  if (!est) return null

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl md:text-2xl font-extrabold mb-1">Collecter des avis</h1>
      <p className="text-sm text-[#666A72] mb-7">
        Posez ce QR code sur vos tables : vos clients laissent un avis Google en quelques secondes,
        et peuvent aussi vous adresser un commentaire privé.
      </p>

      <div className="grid md:grid-cols-2 gap-5 mb-8">
        {/* QR code */}
        <div className="bg-[#FFFFFF] border border-[#ECECEA] rounded-2xl p-6 flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code de votre page d'avis" className="w-52 h-52 rounded-xl" />
              <a
                href={`/r/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#C2481F] hover:text-[#A93F1B] transition-colors"
              >
                <Eye size={13} /> Voir la page publique
              </a>
              <div className="flex gap-2.5 w-full">
                <button
                  onClick={downloadPng}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#E4572E] hover:bg-[#C2481F] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  <Download size={15} /> PNG
                </button>
                <button
                  onClick={downloadPdf}
                  className="flex-1 flex items-center justify-center gap-2 border border-[#D9D9D7] text-[#17181C] hover:border-[#B9B9B7] text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  <FileText size={15} /> PDF à imprimer
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#666A72] py-16 text-center">
              Définissez un lien personnalisé pour générer votre QR code.
            </p>
          )}
        </div>

        {/* Réglages */}
        <div className="bg-[#FFFFFF] border border-[#ECECEA] rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#666A72] mb-1.5">Lien personnalisé</label>
            <div className="flex items-center gap-0 bg-[#FAFAF8] border border-[#E3E3E1] rounded-lg overflow-hidden">
              <span className="text-xs text-[#666A72] pl-3 pr-0.5 select-none whitespace-nowrap">…/r/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="mon-restaurant"
                className="flex-1 bg-transparent text-sm text-[#17181C] py-2.5 pr-3 focus:outline-none min-w-0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#666A72] mb-1.5">Lien d&apos;avis Google</label>
            <input
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              placeholder="https://g.page/r/…/review"
              className="w-full bg-[#FAFAF8] border border-[#E3E3E1] rounded-lg text-sm text-[#17181C] py-2.5 px-3 focus:outline-none focus:border-[#E4572E]"
            />
            <p className="text-[0.7rem] text-[#666A72] mt-1.5 leading-relaxed">
              Sur Google Maps : votre fiche → « Demander des avis » → copiez le lien.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#666A72] mb-1.5">Couleur de votre page</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="w-10 h-10 rounded-lg border border-[#E3E3E1] bg-transparent cursor-pointer p-0.5"
              />
              <span className="text-sm text-[#17181C] font-mono">{accent}</span>
            </div>
            <p className="text-[0.7rem] text-[#666A72] mt-1.5">Utilisée sur la page que vos clients scannent (logo, boutons).</p>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="mt-auto flex items-center justify-center gap-2 bg-[#E4572E] hover:bg-[#C2481F] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            <Save size={15} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Feedbacks privés — seuls ceux avec un commentaire sont listés,
          les notes seules (4-5★ sans message) sont résumées en statistique */}
      <h2 className="text-base font-bold mb-3 flex items-center gap-2">
        <MessageSquare size={16} className="text-[#C2481F]" />
        Retours privés
        {commented.filter((f) => f.status === 'nouveau').length > 0 && (
          <span className="bg-[#f43f5e] text-white text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full leading-none">
            {commented.filter((f) => f.status === 'nouveau').length}
          </span>
        )}
      </h2>

      {ratingOnly.length > 0 && (
        <p className="text-xs text-[#666A72] mb-3">
          ⭐ {ratingOnly.length} note{ratingOnly.length > 1 ? 's' : ''} laissée{ratingOnly.length > 1 ? 's' : ''} via le QR code sans commentaire
          (moyenne {(ratingOnly.reduce((s, f) => s + f.rating, 0) / ratingOnly.length).toFixed(1)}/5)
        </p>
      )}

      {loadingFeedbacks ? (
        <p className="text-sm text-[#666A72]">Chargement…</p>
      ) : commented.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#ECECEA] rounded-2xl p-8 text-center text-sm text-[#666A72]">
          Aucun retour pour le moment. Ils apparaîtront ici dès qu&apos;un client scannera votre QR code.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {commented.map((f) => (
            <div
              key={f.id}
              className="bg-[#FFFFFF] border border-[#ECECEA] rounded-xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[#B45309] text-sm tracking-wide">
                  {'★'.repeat(f.rating)}
                  <span className="text-[rgba(245,158,11,0.25)]">{'★'.repeat(5 - f.rating)}</span>
                </span>
                <span className="text-xs text-[#666A72]">
                  {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`ml-auto text-[0.65rem] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[f.status].className}`}>
                  {STATUS_STYLES[f.status].label}
                </span>
              </div>
              {f.comment && <p className="text-sm text-[#17181C] leading-relaxed">{f.comment}</p>}
              {f.status !== 'traité' && (
                <div className="flex gap-2 mt-1">
                  {f.status === 'nouveau' && (
                    <button
                      onClick={() => updateFeedbackStatus(f.id, 'lu')}
                      className="text-xs text-[#666A72] hover:text-[#17181C] border border-[#E3E3E1] px-2.5 py-1 rounded-md transition-colors"
                    >
                      Marquer comme lu
                    </button>
                  )}
                  <button
                    onClick={() => updateFeedbackStatus(f.id, 'traité')}
                    className="flex items-center gap-1 text-xs text-[#0E9F6E] border border-[rgba(52,211,153,0.25)] px-2.5 py-1 rounded-md hover:bg-[rgba(52,211,153,0.08)] transition-colors"
                  >
                    <CheckCircle2 size={12} /> Traité
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
