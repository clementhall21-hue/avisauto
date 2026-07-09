'use client'

import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Loader2, Plus, Trash2, Sparkles, Store, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEstablishment } from '../layout'
import { useToast } from '@/components/Toast'

interface Snapshot {
  rating: number | null
  review_count: number | null
  captured_at: string
}

interface Competitor {
  id: string
  name: string
  is_self: boolean
  competitor_snapshots: Snapshot[]
}

const LINE_COLORS = ['#E4572E', '#4F46E5', '#0E9F6E', '#B45309', '#7C3AED', '#0E7490']

function sortSnaps(snaps: Snapshot[]): Snapshot[] {
  return [...snaps].sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime())
}

export default function CompetitorsPage() {
  const { establishment } = useEstablishment()
  const { showToast } = useToast()
  const supabase = createClient()

  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [selfInput, setSelfInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [addingSelf, setAddingSelf] = useState(false)
  const [insight, setInsight] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const refreshData = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/competitors/refresh', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Erreur', 'error')
        return
      }
      if (data.errors?.length) {
        showToast(data.errors[0], 'error')
      } else {
        showToast(`${data.updated} fiche${data.updated > 1 ? 's' : ''} actualisée${data.updated > 1 ? 's' : ''}`)
      }
      await load()
    } catch {
      showToast('Erreur réseau', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  const load = async () => {
    if (!establishment) return
    const { data } = await supabase
      .from('competitors')
      .select('id, name, is_self, competitor_snapshots ( rating, review_count, captured_at )')
      .eq('establishment_id', establishment.id)
      .order('created_at', { ascending: true })
    setCompetitors((data as Competitor[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishment?.id])

  const self = competitors.find((c) => c.is_self) || null
  const rivals = competitors.filter((c) => !c.is_self)

  const addPlace = async (value: string, isSelf: boolean) => {
    const setBusy = isSelf ? setAddingSelf : setAdding
    setBusy(true)
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: value, isSelf }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Erreur', 'error')
        return
      }
      showToast(isSelf ? 'Votre fiche est suivie' : 'Concurrent ajouté')
      if (isSelf) setSelfInput('')
      else setInput('')
      await load()
    } catch {
      showToast('Erreur réseau', 'error')
    } finally {
      setBusy(false)
    }
  }

  const removeCompetitor = async (id: string) => {
    await supabase.from('competitors').delete().eq('id', id)
    setCompetitors((prev) => prev.filter((c) => c.id !== id))
  }

  const runInsight = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/competitor-insight', { method: 'POST' })
      const data = await res.json()
      setInsight(data.insight || data.error || 'Analyse non disponible.')
    } catch {
      setInsight('Erreur lors de l’analyse.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Lignes du tableau : dernier snapshot avec données + delta depuis le précédent.
  // Postgres renvoie les numeric en texte → Number() systématique.
  const rows = useMemo(() => {
    return competitors.map((c) => {
      const snaps = sortSnaps(c.competitor_snapshots || []).filter(
        (s) => s.rating != null || s.review_count != null
      )
      const last = snaps[snaps.length - 1]
      const prev = snaps[snaps.length - 2]
      return {
        id: c.id,
        name: c.name,
        isSelf: c.is_self,
        rating: last?.rating != null ? Number(last.rating) : null,
        reviews: last?.review_count != null ? Number(last.review_count) : null,
        gained: last && prev ? Number(last.review_count ?? 0) - Number(prev.review_count ?? 0) : null,
      }
    }).sort((a, b) => (b.isSelf ? 1 : 0) - (a.isSelf ? 1 : 0))
  }, [competitors])

  const rivalRows = rows.filter((r) => !r.isSelf && r.rating !== null)
  const avgRivalRating = rivalRows.length
    ? rivalRows.reduce((s, r) => s + (r.rating ?? 0), 0) / rivalRows.length
    : null
  const selfRow = rows.find((r) => r.isSelf)
  const aboveAverage = selfRow?.rating != null && avgRivalRating != null
    ? selfRow.rating >= avgRivalRating
    : null

  // Données des graphiques : une colonne par date (jour), une série par lieu
  const chartData = useMemo(() => {
    const byDate: Record<string, Record<string, number | string>> = {}
    for (const c of competitors) {
      for (const s of c.competitor_snapshots || []) {
        const day = new Date(s.captured_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        byDate[day] = byDate[day] || { date: day, _ts: new Date(s.captured_at).getTime() }
        if (s.review_count != null) byDate[day][`avis_${c.name}`] = Number(s.review_count)
        if (s.rating != null) byDate[day][`note_${c.name}`] = Number(s.rating)
      }
    }
    return Object.values(byDate).sort((a, b) => (a._ts as number) - (b._ts as number))
  }, [competitors])

  const hasHistory = chartData.length >= 2

  const inputClass =
    'flex-1 bg-white border border-[#E3E3E1] rounded-lg px-3.5 py-2.5 text-sm text-[#17181C] outline-none focus:border-[#E4572E] transition-colors min-w-0'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#E4572E]" size={28} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl md:text-2xl font-extrabold mb-1">Mes concurrents</h1>
      <p className="text-sm text-[#666A72] mb-7">
        Comparez votre fiche Google à celles de vos concurrents directs — note, volume d&apos;avis, dynamique.
        Les données se rafraîchissent automatiquement chaque semaine.
      </p>

      {/* Ma fiche */}
      {!self && (
        <div className="bg-[rgba(228,87,46,0.05)] border border-[rgba(228,87,46,0.25)] rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 font-bold text-sm mb-1.5">
            <Store size={15} className="text-[#C2481F]" /> Commencez par votre propre fiche
          </div>
          <p className="text-xs text-[#666A72] mb-3">
            Indiquez le nom de votre établissement tel qu&apos;il apparaît sur Google Maps (ex&nbsp;: «&nbsp;Hôtel Le Clos Marseille&nbsp;»), ou collez le lien de votre fiche.
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              value={selfInput}
              onChange={(e) => setSelfInput(e.target.value)}
              placeholder="Nom + ville, ou lien Google Maps"
              className={inputClass}
            />
            <button
              onClick={() => selfInput.trim() && addPlace(selfInput, true)}
              disabled={addingSelf || !selfInput.trim()}
              className="flex items-center gap-2 bg-[#E4572E] hover:bg-[#C2481F] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {addingSelf ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Suivre ma fiche
            </button>
          </div>
        </div>
      )}

      {/* Ajout concurrent */}
      <div className="bg-white border border-[#ECECEA] rounded-2xl p-5 mb-5">
        <div className="font-bold text-sm mb-1.5">Ajouter un concurrent ({rivals.length}/5)</div>
        <p className="text-xs text-[#666A72] mb-3">
          Nom + ville (ex&nbsp;: «&nbsp;La Table de Marius Marseille&nbsp;»), lien Google Maps ou Place ID.
        </p>
        <div className="flex gap-2 flex-wrap">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && input.trim() && rivals.length < 5 && !adding) addPlace(input, false) }}
            placeholder="Nom + ville, ou lien Google Maps"
            className={inputClass}
            disabled={rivals.length >= 5}
          />
          <button
            onClick={() => addPlace(input, false)}
            disabled={adding || !input.trim() || rivals.length >= 5}
            className="flex items-center gap-2 bg-[#E4572E] hover:bg-[#C2481F] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Ajouter
          </button>
        </div>
        {rivals.length >= 5 && (
          <p className="text-xs text-[#B45309] mt-2">Limite de 5 concurrents atteinte — supprimez-en un pour en suivre un autre.</p>
        )}
      </div>

      {/* Tableau comparatif */}
      {rows.length > 0 && (
        <div className="bg-white border border-[#ECECEA] rounded-2xl p-5 mb-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="font-bold text-sm">Comparatif</div>
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs text-[#666A72] hover:text-[#C2481F] border border-[#E3E3E1] hover:border-[rgba(228,87,46,0.4)] px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Actualisation…' : 'Actualiser les données'}
              </button>
            </div>
            {aboveAverage !== null && (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  aboveAverage
                    ? 'bg-[rgba(34,197,94,0.10)] text-[#0E9F6E] border-[rgba(34,197,94,0.3)]'
                    : 'bg-[rgba(244,63,94,0.08)] text-[#E11D48] border-[rgba(244,63,94,0.25)]'
                }`}
              >
                {aboveAverage
                  ? `✓ Au-dessus de la moyenne concurrents (${avgRivalRating!.toFixed(1)}★)`
                  : `⚠ En-dessous de la moyenne concurrents (${avgRivalRating!.toFixed(1)}★)`}
              </span>
            )}
          </div>
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-xs text-[#666A72] uppercase tracking-wide">
                <th className="pb-2 font-semibold">Établissement</th>
                <th className="pb-2 font-semibold">Note</th>
                <th className="pb-2 font-semibold">Avis</th>
                <th className="pb-2 font-semibold">Depuis dernier relevé</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-t border-[#F0F0EE] ${r.isSelf ? 'bg-[rgba(228,87,46,0.05)]' : ''}`}
                >
                  <td className="py-2.5 pr-3 font-medium">
                    {r.name}
                    {r.isSelf && <span className="ml-2 text-[0.65rem] font-bold text-[#C2481F] uppercase">Vous</span>}
                  </td>
                  <td className="py-2.5 pr-3">
                    {r.rating != null ? (
                      <span className="font-semibold">{r.rating.toFixed(1)} <span className="text-[#f59e0b]">★</span></span>
                    ) : '—'}
                  </td>
                  <td className="py-2.5 pr-3">{r.reviews ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    {r.gained == null ? (
                      <span className="text-xs text-[#666A72]">1er relevé</span>
                    ) : r.gained > 0 ? (
                      <span className="text-[#0E9F6E] font-semibold">+{r.gained}</span>
                    ) : (
                      <span className="text-[#666A72]">{r.gained}</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => removeCompetitor(r.id)}
                      className="text-[#666A72] hover:text-[#E11D48] transition-colors p-1"
                      aria-label={`Supprimer ${r.name}`}
                      title={r.isSelf ? 'Supprimer pour choisir une autre fiche' : `Supprimer ${r.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Évolution */}
      {rows.length > 0 && (
        <div className="bg-white border border-[#ECECEA] rounded-2xl p-5 mb-5">
          <div className="font-bold text-sm mb-4">Évolution du volume d&apos;avis</div>
          {hasHistory ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <XAxis dataKey="date" tick={{ fill: '#666A72', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666A72', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E3E3E1', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {competitors.map((c, i) => (
                  <Line
                    key={c.id}
                    type="monotone"
                    dataKey={`avis_${c.name}`}
                    name={c.is_self ? `${c.name} (vous)` : c.name}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={c.is_self ? 3 : 1.8}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[#666A72] py-6 text-center">
              L&apos;historique se construit semaine après semaine — le graphique apparaîtra après le prochain relevé automatique (lundi matin).
            </p>
          )}
        </div>
      )}

      {/* Insight IA */}
      {rows.length > 0 && (
        <div className="bg-white border border-[#ECECEA] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="font-bold text-sm flex items-center gap-2">
              <Sparkles size={15} className="text-[#C2481F]" /> Analyse IA
            </div>
            <button
              onClick={runInsight}
              disabled={analyzing}
              className="flex items-center gap-2 bg-[#E4572E] hover:bg-[#C2481F] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {analyzing ? (<><Loader2 size={14} className="animate-spin" /> Analyse…</>) : 'Analyser ma position'}
            </button>
          </div>
          {insight ? (
            <p className="text-sm text-[#17181C] leading-relaxed bg-[rgba(0,0,0,0.02)] rounded-xl p-4">{insight}</p>
          ) : (
            <p className="text-sm text-[#666A72]">
              L&apos;IA résume votre position face à vos concurrents et vous dit quoi faire pour creuser l&apos;écart.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
