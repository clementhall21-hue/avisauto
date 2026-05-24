'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEstablishment, type Establishment } from '../layout'
import { useToast } from '@/components/Toast'
import { TONE_COLORS, getInitials, getAvatarColor } from '@/lib/utils'

const TONES = ['Professionnel', 'Chaleureux', 'Empathique', 'Décontracté'] as const
const DELAY_OPTIONS = [
  { label: 'Immédiat', seconds: 0 },
  { label: '30 min', seconds: 1800 },
  { label: '45 min', seconds: 2700 },
  { label: '1 heure', seconds: 3600 },
  { label: '1h 30', seconds: 5400 },
  { label: '2 heures', seconds: 7200 },
]

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0 border"
      style={{
        background: checked ? 'rgba(52,211,153,0.2)' : '#2d3748',
        borderColor: checked ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.07)',
      }}
    >
      <span
        className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all"
        style={{
          left: checked ? '22px' : '3px',
          background: checked ? '#34d399' : '#8892b0',
        }}
      />
    </button>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl transition-transform hover:scale-110 bg-transparent border-none cursor-pointer p-0"
          style={{ color: n <= (hover || value) ? '#f59e0b' : 'rgba(245,158,11,0.2)' }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// ── ADMIN PANEL ──────────────────────────────────────────────
function AdminPanel({ establishment, onClose }: { establishment: any; onClose: () => void }) {
  const { setEstablishment } = useEstablishment()
  const { showToast } = useToast()
  const supabase = createClient()
  const [hotelName, setHotelName] = useState(establishment?.name || '')
  const [groqKey, setGroqKey] = useState('')
  const [groqStatus, setGroqStatus] = useState('')
  const [sheetId, setSheetId] = useState('1tDrvICHjclxGi2iGsYsDk9nbqV6Pm-1pMK9hiGvWrkY')
  const [sheetStatus, setSheetStatus] = useState('')
  const [zapierUrl, setZapierUrl] = useState(establishment?.zapier_webhook_url || '')
  const [zapierTriggers, setZapierTriggers] = useState<Record<string, boolean>>({ new_review: true, negative: true, published: false, ...establishment?.zapier_triggers })
  const [zapierLog, setZapierLog] = useState<string[]>([])
  const [zapierTestStatus, setZapierTestStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const saveHotelName = async () => {
    setSaving(true)
    const { data } = await supabase.from('establishments').update({ name: hotelName }).eq('id', establishment.id).select().single()
    if (data) { setEstablishment(data); showToast('Nom sauvegardé') }
    setSaving(false)
  }

  const testGroqKey = async () => {
    if (!groqKey.startsWith('gsk_')) {
      setGroqStatus('⚠️ La clé doit commencer par gsk_')
      return
    }
    setGroqStatus('⏳ Test en cours…')
    try {
      const res = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewText: 'Test', stars: 5, tone: 'Professionnel', hotelName: 'Test', signature: '', groqApiKeyOverride: groqKey }),
      })
      const data = await res.json()
      if (data.reply) {
        setGroqStatus('✅ Clé valide — Groq connecté !')
        await supabase.from('establishments').update({ groq_api_key: groqKey }).eq('id', establishment.id)
        showToast('Clé Groq sauvegardée')
      } else {
        setGroqStatus('❌ Clé invalide ou erreur API')
      }
    } catch {
      setGroqStatus('❌ Erreur réseau')
    }
  }

  const syncSheets = async () => {
    setSheetStatus('⏳ Synchronisation…')
    try {
      const res = await fetch('/api/sync-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId }),
      })
      const data = await res.json()
      if (data.reviews?.length > 0) {
        setSheetStatus(`✅ ${data.reviews.length} avis importés`)
      } else {
        setSheetStatus('✅ Sheet lu — aucun nouvel avis')
      }
    } catch {
      setSheetStatus('❌ Erreur lors de la synchronisation')
    }
  }

  const saveZapierConfig = async () => {
    await supabase.from('establishments').update({
      zapier_webhook_url: zapierUrl,
      zapier_triggers: zapierTriggers,
    }).eq('id', establishment.id)
    showToast('Config Zapier sauvegardée')
  }

  const testZapier = async () => {
    if (!zapierUrl.includes('hooks.zapier.com')) {
      setZapierTestStatus('⚠️ URL invalide')
      return
    }
    setZapierTestStatus('⏳ Envoi…')
    try {
      await fetch('/api/zapier/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: zapierUrl, payload: { event: 'test', message: 'StarReviews test webhook' } }),
      })
      setZapierTestStatus('✅ Webhook envoyé')
      setZapierLog((prev) => [`[${new Date().toLocaleTimeString('fr-FR')}] ✅ Test envoyé`, ...prev.slice(0, 9)])
    } catch {
      setZapierTestStatus('❌ Erreur')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">⚙️ Administration</h2>
          <p className="text-sm text-[#8892b0] mt-1">Accès réservé — configuration technique.</p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.07)] bg-transparent text-[#8892b0] hover:text-[#e8eaf6] hover:border-[rgba(255,255,255,0.2)] transition-colors text-sm font-inherit cursor-pointer min-h-[40px]"
        >
          ← Retour
        </button>
      </div>

      <div className="flex flex-col gap-3.5 max-w-[520px]">
        {/* Hotel name */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-5 md:p-6">
          <h3 className="text-[0.95rem] font-bold mb-1.5">🏨 Nom de l'établissement</h3>
          <p className="text-xs text-[#8892b0] mb-3">Utilisé par l'IA dans les réponses aux avis.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              placeholder="Ex : Hôtel du Soleil"
              className="flex-1 min-w-0 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] focus:border-[#6366f1] rounded-lg px-3.5 py-2.5 text-sm text-[#e8eaf6] outline-none transition-colors placeholder-[#8892b0]"
            />
            <button
              onClick={saveHotelName}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg border border-[#6366f1] bg-[rgba(99,102,241,0.1)] text-[#818cf8] text-sm font-semibold hover:bg-[rgba(99,102,241,0.2)] transition-colors disabled:opacity-50 cursor-pointer font-inherit whitespace-nowrap min-h-[44px]"
            >
              Sauver
            </button>
          </div>
        </div>

        {/* Groq key */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(99,102,241,0.3)] rounded-[14px] p-5 md:p-6">
          <h3 className="text-[0.95rem] font-bold mb-1.5">🔑 Clé API Groq</h3>
          <p className="text-xs text-[#8892b0] mb-3">Moteur IA. Gratuit sur console.groq.com. Stockée côté serveur uniquement.</p>
          <div className="flex gap-2 mb-2">
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_xxxx…"
              className="flex-1 min-w-0 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] focus:border-[#6366f1] rounded-lg px-3.5 py-2.5 text-sm text-[#e8eaf6] outline-none transition-colors placeholder-[#8892b0] font-mono"
            />
            <button
              onClick={testGroqKey}
              className="px-4 py-2.5 rounded-lg border border-[#6366f1] bg-[rgba(99,102,241,0.1)] text-[#818cf8] text-sm font-semibold hover:bg-[rgba(99,102,241,0.2)] transition-colors cursor-pointer font-inherit whitespace-nowrap min-h-[44px]"
            >
              Tester
            </button>
          </div>
          {groqStatus && (
            <p className={`text-xs mt-1 ${groqStatus.startsWith('✅') ? 'text-[#34d399]' : groqStatus.startsWith('⚠️') ? 'text-[#f59e0b]' : 'text-[#f87171]'}`}>
              {groqStatus}
            </p>
          )}
        </div>

        {/* Google Sheets */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-5 md:p-6">
          <h3 className="text-[0.95rem] font-bold mb-1.5">📊 Google Sheets</h3>
          <p className="text-xs text-[#8892b0] mb-3">Importez vos avis depuis un Google Sheet (colonnes: ID, Nom, Étoiles, Texte, Date).</p>
          <div className="bg-[rgba(255,255,255,0.03)] rounded-lg px-3 py-2 mb-3 text-xs text-[#8892b0] break-all font-mono overflow-hidden">
            ID : <span className="text-[#e8eaf6] break-all">{sheetId}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="ID du Google Sheet"
              className="flex-1 min-w-0 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] focus:border-[#34d399] rounded-lg px-3.5 py-2.5 text-sm text-[#e8eaf6] outline-none transition-colors placeholder-[#8892b0]"
            />
            <button
              onClick={syncSheets}
              className="px-4 py-2.5 rounded-lg border border-[#34d399] bg-[rgba(52,211,153,0.08)] text-[#34d399] text-sm font-semibold hover:bg-[rgba(52,211,153,0.15)] transition-colors cursor-pointer font-inherit whitespace-nowrap min-h-[44px]"
            >
              ↻ Sync
            </button>
          </div>
          {sheetStatus && (
            <p className={`text-xs mt-2 ${sheetStatus.startsWith('✅') ? 'text-[#34d399]' : sheetStatus.startsWith('⏳') ? 'text-[#8892b0]' : 'text-[#f87171]'}`}>
              {sheetStatus}
            </p>
          )}
        </div>

        {/* Zapier */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[0.95rem] font-bold">⚡ Zapier</h3>
              <p className="text-xs text-[#8892b0] mt-0.5">Notifications et automatisations avancées.</p>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold border ${zapierUrl.includes('hooks.zapier.com') ? 'bg-[rgba(52,211,153,0.12)] text-[#34d399] border-[rgba(52,211,153,0.25)]' : 'bg-[rgba(250,204,21,0.12)] text-[#facc15] border-[rgba(250,204,21,0.2)]'}`}
            >
              {zapierUrl.includes('hooks.zapier.com') ? '✓ Configuré' : '⚙️ Non configuré'}
            </span>
          </div>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={zapierUrl}
              onChange={(e) => { setZapierUrl(e.target.value); }}
              placeholder="https://hooks.zapier.com/…"
              className="flex-1 min-w-0 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] focus:border-[#6366f1] rounded-lg px-3.5 py-2.5 text-xs text-[#e8eaf6] outline-none transition-colors placeholder-[#8892b0] font-mono"
            />
            <button
              onClick={testZapier}
              className="px-4 py-2.5 rounded-lg border border-[#6366f1] bg-[rgba(99,102,241,0.1)] text-[#818cf8] text-sm font-semibold hover:bg-[rgba(99,102,241,0.2)] transition-colors cursor-pointer font-inherit whitespace-nowrap min-h-[44px]"
            >
              ▶ Tester
            </button>
          </div>
          {zapierTestStatus && <p className="text-xs text-[#8892b0] mb-3">{zapierTestStatus}</p>}

          <div className="flex flex-col gap-1.5 mb-3">
            {[
              { key: 'new_review', label: '🆕 Nouvel avis' },
              { key: 'negative', label: '⚠️ Avis négatif (1-2★)' },
              { key: 'published', label: '✅ Réponse publiée' },
            ].map((t) => (
              <label key={t.key} className="flex items-center justify-between bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2.5 cursor-pointer text-sm">
                {t.label}
                <input
                  type="checkbox"
                  checked={zapierTriggers[t.key as keyof typeof zapierTriggers]}
                  onChange={(e) => setZapierTriggers((p) => ({ ...p, [t.key]: e.target.checked }))}
                  className="accent-[#6366f1]"
                />
              </label>
            ))}
          </div>

          <button
            onClick={saveZapierConfig}
            className="w-full py-2 rounded-lg border border-[#6366f1] bg-[rgba(99,102,241,0.1)] text-[#818cf8] text-sm font-semibold hover:bg-[rgba(99,102,241,0.2)] transition-colors cursor-pointer font-inherit mb-3"
          >
            Sauvegarder la config
          </button>

          <div className="bg-[rgba(0,0,0,0.2)] rounded-lg p-2.5 min-h-[40px] max-h-[100px] overflow-y-auto font-mono text-xs text-[#8892b0] leading-[1.7]">
            {zapierLog.length > 0 ? zapierLog.map((l, i) => <div key={i}>{l}</div>) : 'Aucun envoi pour l\'instant.'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN SETTINGS PAGE ────────────────────────────────────────
export default function SettingsPage() {
  const { establishment, setEstablishment } = useEstablishment()
  const { showToast } = useToast()
  const supabase = createClient()

  const [tone, setTone] = useState('Professionnel')
  const [signature, setSignature] = useState('')
  const [autoMode, setAutoMode] = useState(false)
  const [delaySec, setDelaySec] = useState(0)
  const [customH, setCustomH] = useState(0)
  const [customM, setCustomM] = useState(0)
  const [showCustom, setShowCustom] = useState(false)
  const [showConfirmAutoImmediat, setShowConfirmAutoImmediat] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)

  // Add review form
  const [reviewerName, setReviewerName] = useState('')
  const [reviewStars, setReviewStars] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [addingReview, setAddingReview] = useState(false)

  useEffect(() => {
    if (establishment) {
      setTone(establishment.tone || 'Professionnel')
      setSignature(establishment.signature || '')
      setAutoMode(establishment.auto_mode || false)
      setDelaySec(establishment.publish_delay_sec || 0)
    }
  }, [establishment])

  const save = async (updates: Partial<Establishment>) => {
    if (!establishment) return
    const { data } = await supabase.from('establishments').update(updates).eq('id', establishment.id).select().single()
    if (data) setEstablishment(data)
  }

  const handleToneChange = async (t: string) => {
    setTone(t)
    await save({ tone: t })
    showToast(`Ton "${t}" sauvegardé`)
  }

  const handleSignatureBlur = async () => {
    await save({ signature })
    showToast('Signature sauvegardée')
  }

  const handleAutoMode = async (v: boolean) => {
    if (v && delaySec === 0) {
      setShowConfirmAutoImmediat(true)
      return
    }
    await applyAutoMode(v)
  }

  const applyAutoMode = async (v: boolean) => {
    setAutoMode(v)
    await save({ auto_mode: v })

    if (v) {
      const { data: pendingReviews } = await supabase
        .from('reviews')
        .select('id')
        .eq('status', 'pending')
        .not('ai_reply', 'is', null)

      if (pendingReviews && pendingReviews.length > 0) {
        if (delaySec === 0) {
          const publishedAt = new Date().toISOString()
          await supabase
            .from('reviews')
            .update({ status: 'published', published_at: publishedAt, scheduled_at: null })
            .in('id', pendingReviews.map((r) => r.id))
          showToast(`Mode automatique activé — ${pendingReviews.length} avis publiés immédiatement`)
        } else {
          const scheduledAt = new Date(Date.now() + delaySec * 1000).toISOString()
          await supabase
            .from('reviews')
            .update({ status: 'scheduled', scheduled_at: scheduledAt })
            .in('id', pendingReviews.map((r) => r.id))
          showToast(`Mode automatique activé — ${pendingReviews.length} avis programmés dans ${Math.round(delaySec / 60)} min`)
        }
      } else {
        showToast('Mode automatique activé')
      }
    } else {
      // Remettre les avis programmés en attente
      const { data: scheduledReviews } = await supabase
        .from('reviews')
        .select('id')
        .eq('status', 'scheduled')

      if (scheduledReviews && scheduledReviews.length > 0) {
        await supabase
          .from('reviews')
          .update({ status: 'pending', scheduled_at: null })
          .in('id', scheduledReviews.map((r) => r.id))
        showToast(`Mode automatique désactivé — ${scheduledReviews.length} avis remis en attente`)
      } else {
        showToast('Mode automatique désactivé')
      }
    }
  }

  const handleDelay = async (sec: number) => {
    setDelaySec(sec)
    setShowCustom(false)
    await save({ publish_delay_sec: sec })
    showToast('Délai sauvegardé')
  }

  const handleCustomDelay = async () => {
    const sec = customH * 3600 + customM * 60
    await handleDelay(sec)
  }

  const delayLabel = () => {
    const opt = DELAY_OPTIONS.find((o) => o.seconds === delaySec)
    if (opt) return opt.label
    const h = Math.floor(delaySec / 3600)
    const m = Math.floor((delaySec % 3600) / 60)
    return h > 0 ? `${h}h ${m}min` : `${m} min`
  }

  const checkAdminPassword = async () => {
    try {
      const res = await fetch('/api/admin/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      })
      const data = await res.json()
      if (data.ok) {
        setShowAdmin(true)
        setShowAdminPrompt(false)
        setAdminError('')
      } else {
        setAdminError('Mot de passe incorrect')
      }
    } catch {
      // In dev, allow if password matches fallback
      setAdminError('Erreur de vérification')
    }
  }

  const handleAddReview = async () => {
    if (!reviewerName.trim() || !reviewText.trim() || !establishment) return
    setAddingReview(true)
    const color = getAvatarColor(Math.floor(Math.random() * 6))
    const newReview = {
      establishment_id: establishment.id,
      reviewer_name: reviewerName,
      reviewer_initials: getInitials(reviewerName),
      reviewer_color: color.bg,
      reviewer_text_color: color.text,
      stars: reviewStars,
      review_text: reviewText,
      review_date: 'À l\'instant',
      status: 'pending' as const,
      source: 'manual',
    }
    const { data } = await supabase.from('reviews').insert(newReview).select().single()
    if (data) {
      // Generate AI reply
      try {
        const res = await fetch('/api/generate-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewText,
            stars: reviewStars,
            tone: establishment.tone,
            hotelName: establishment.name,
            signature: establishment.signature,
          }),
        })
        const { reply } = await res.json()
        if (reply) await supabase.from('reviews').update({ ai_reply: reply }).eq('id', data.id)
      } catch {}
      showToast('Avis ajouté avec réponse IA')
      setReviewerName('')
      setReviewText('')
      setReviewStars(5)
    }
    setAddingReview(false)
  }

  if (showAdmin && establishment) return <AdminPanel establishment={establishment} onClose={() => setShowAdmin(false)} />

  return (
    <div>
      {/* Confirmation modale — mode auto immédiat */}
      {showConfirmAutoImmediat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 max-w-[420px] w-full shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <div className="text-3xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-[#e8eaf6] mb-2">Publication immédiate</h3>
            <p className="text-sm text-[#8892b0] leading-relaxed mb-6">
              Tous les avis en attente de validation vont être <span className="text-[#f59e0b] font-semibold">publiés immédiatement</span>. Vous ne pourrez plus les vérifier avant publication.<br /><br />
              Êtes-vous sûr de vouloir activer le mode automatique immédiat ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmAutoImmediat(false)}
                className="flex-1 border border-[rgba(255,255,255,0.1)] text-[#8892b0] hover:text-[#e8eaf6] py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  setShowConfirmAutoImmediat(false)
                  await applyAutoMode(true)
                }}
                className="flex-1 bg-[rgba(244,63,94,0.15)] border border-[rgba(244,63,94,0.3)] text-[#f43f5e] hover:bg-[rgba(244,63,94,0.25)] py-2.5 rounded-lg text-sm font-bold transition-colors"
              >
                Oui, publier tout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Paramètres</h2>
          <p className="text-sm text-[#8892b0] mt-1">Personnalisez votre expérience StarReviews.</p>
        </div>
        <button
          onClick={() => setShowAdminPrompt(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.07)] bg-transparent text-[#8892b0] hover:text-[#e8eaf6] hover:border-[rgba(255,255,255,0.2)] text-sm transition-colors cursor-pointer font-inherit min-h-[40px]"
        >
          🔧 Accès admin
        </button>
      </div>

      {/* Admin password prompt */}
      {showAdminPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="bg-[#111827] border border-[rgba(255,255,255,0.1)] rounded-[20px] p-10 w-full max-w-[400px] relative shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <button onClick={() => setShowAdminPrompt(false)} className="absolute top-4 right-4 text-[#8892b0] hover:text-[#e8eaf6] bg-transparent border-none cursor-pointer text-xl">✕</button>
            <h3 className="text-[1.2rem] font-bold mb-2">Accès administrateur</h3>
            <p className="text-sm text-[#8892b0] mb-6">Entrez le mot de passe admin pour accéder à la configuration technique.</p>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkAdminPassword()}
              placeholder="Mot de passe admin"
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] focus:border-[#6366f1] rounded-lg px-4 py-3 text-sm text-[#e8eaf6] outline-none transition-colors placeholder-[#8892b0] mb-2"
            />
            {adminError && <p className="text-xs text-[#f87171] mb-3">{adminError}</p>}
            <button
              onClick={checkAdminPassword}
              className="w-full py-3 rounded-lg font-bold text-sm cursor-pointer font-inherit mt-2"
              style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: '#0b0f1e', border: 'none' }}
            >
              Accéder
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3.5 max-w-[520px]">

        {/* Tone */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-5 md:p-6">
          <h3 className="text-[0.95rem] font-bold mb-1.5">🎨 Ton des réponses</h3>
          <p className="text-xs text-[#8892b0] mb-3.5">Comment l'IA s'exprime dans vos réponses.</p>
          <div className="flex gap-2 flex-wrap">
            {TONES.map((t) => {
              const col = TONE_COLORS[t]
              const isActive = tone === t
              return (
                <button
                  key={t}
                  onClick={() => handleToneChange(t)}
                  className="px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer font-inherit"
                  style={{
                    borderColor: isActive ? col.border : 'rgba(255,255,255,0.07)',
                    color: isActive ? col.text : '#8892b0',
                    background: isActive ? col.bg : 'transparent',
                  }}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        {/* Signature */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-5 md:p-6">
          <h3 className="text-[0.95rem] font-bold mb-1.5">✍️ Signature</h3>
          <p className="text-xs text-[#8892b0] mb-3">Ajoutée automatiquement à la fin de chaque réponse.</p>
          <input
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            onBlur={handleSignatureBlur}
            placeholder="Ex : L'équipe Hôtel du Soleil"
            className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] focus:border-[#6366f1] rounded-lg px-3.5 py-2.5 text-sm text-[#e8eaf6] outline-none transition-colors placeholder-[#8892b0]"
          />
          {signature && (
            <p className="text-xs text-[#8892b0] mt-2">Aperçu : <span className="text-[#e8eaf6]">…réponse\n— {signature}</span></p>
          )}
        </div>

        {/* Auto mode */}
        <div
          className="bg-[rgba(255,255,255,0.03)] border rounded-[14px] p-5 md:p-6 transition-colors"
          style={{ borderColor: autoMode ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.07)' }}
        >
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="text-[0.95rem] font-bold mb-1.5">🤖 Mode automatique</h3>
              <p className="text-xs text-[#8892b0] leading-relaxed">L'IA répond seule à chaque nouvel avis selon le délai configuré. Aucune action requise.</p>
            </div>
            <ToggleSwitch checked={autoMode} onChange={handleAutoMode} />
          </div>
          {autoMode && (
            <div className="mt-3 bg-[rgba(52,211,153,0.06)] border border-[rgba(52,211,153,0.18)] rounded-lg px-3 py-2.5 text-xs text-[#34d399]">
              ✅ Actif — les réponses sont publiées automatiquement selon le délai ci-dessous.
            </div>
          )}
        </div>

        {/* Delay */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(99,102,241,0.25)] rounded-[14px] p-5 md:p-6">
          <h3 className="text-[0.95rem] font-bold mb-1.5">⏱ Délai de publication</h3>
          <p className="text-xs text-[#8892b0] leading-relaxed mb-4">Un délai de 30–60 min rend la réponse indiscernable d'une réponse humaine.</p>
          <div className="flex gap-2 flex-wrap mb-3 overflow-x-auto pb-1">
            {DELAY_OPTIONS.map((opt) => (
              <button
                key={opt.seconds}
                onClick={() => handleDelay(opt.seconds)}
                className="px-4 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer font-inherit whitespace-nowrap"
                style={{
                  borderColor: delaySec === opt.seconds && !showCustom ? '#6366f1' : 'rgba(255,255,255,0.07)',
                  color: delaySec === opt.seconds && !showCustom ? '#818cf8' : '#8892b0',
                  background: delaySec === opt.seconds && !showCustom ? 'rgba(99,102,241,0.12)' : 'transparent',
                }}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="px-4 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer font-inherit whitespace-nowrap"
              style={{
                borderColor: showCustom ? '#6366f1' : 'rgba(255,255,255,0.07)',
                color: showCustom ? '#818cf8' : '#8892b0',
                background: showCustom ? 'rgba(99,102,241,0.12)' : 'transparent',
              }}
            >
              Personnalisé…
            </button>
          </div>

          {showCustom && (
            <div className="mb-3">
              <div className="text-xs text-[#8892b0] mb-2 font-medium">Délai personnalisé :</div>
              <div className="flex gap-2 items-center flex-wrap">
                <div className="flex items-center gap-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2">
                  <input type="number" min={0} max={23} value={customH} onChange={(e) => setCustomH(Number(e.target.value))} className="w-11 bg-transparent border-none text-[#e8eaf6] text-[1rem] font-bold outline-none text-center" />
                  <span className="text-xs text-[#8892b0]">h</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2">
                  <input type="number" min={0} max={59} value={customM} onChange={(e) => setCustomM(Number(e.target.value))} className="w-11 bg-transparent border-none text-[#e8eaf6] text-[1rem] font-bold outline-none text-center" />
                  <span className="text-xs text-[#8892b0]">min</span>
                </div>
                <button
                  onClick={handleCustomDelay}
                  className="px-4 py-2 rounded-lg border-none font-bold text-sm cursor-pointer font-inherit"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: '#fff' }}
                >
                  Appliquer
                </button>
              </div>
            </div>
          )}

          <div className="bg-[rgba(99,102,241,0.07)] border border-[rgba(99,102,241,0.2)] rounded-[10px] px-3.5 py-3 text-xs text-[#818cf8] leading-relaxed">
            ⚡ <strong>{delayLabel()}</strong>
            {delaySec === 0 ? ' — La réponse est publiée dès qu\'elle est générée.' : ` — La réponse sera publiée ${delayLabel()} après génération.`}
          </div>
        </div>

        {/* Add review manually */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-5 md:p-6">
          <h3 className="text-[0.95rem] font-bold mb-1.5">➕ Ajouter un avis manuellement</h3>
          <p className="text-xs text-[#8892b0] mb-4">L'IA générera automatiquement une réponse.</p>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="Nom du client"
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] focus:border-[#6366f1] rounded-lg px-3.5 py-2.5 text-sm text-[#e8eaf6] outline-none transition-colors placeholder-[#8892b0]"
            />
            <div>
              <div className="text-xs text-[#8892b0] mb-1.5">Note</div>
              <StarRating value={reviewStars} onChange={setReviewStars} />
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Texte de l'avis…"
              rows={3}
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] focus:border-[#6366f1] rounded-lg px-3.5 py-2.5 text-sm text-[#e8eaf6] outline-none transition-colors placeholder-[#8892b0] resize-none"
            />
            <button
              onClick={handleAddReview}
              disabled={addingReview || !reviewerName.trim() || !reviewText.trim()}
              className="w-full py-2.5 rounded-lg font-bold text-sm cursor-pointer font-inherit disabled:opacity-50 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: '#e8eaf6', border: 'none' }}
            >
              {addingReview ? '⏳ Génération…' : '+ Ajouter cet avis'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
