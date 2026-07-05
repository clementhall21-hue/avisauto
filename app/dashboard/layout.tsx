'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, BarChart2, Settings, Menu, X, LogOut, CheckCircle, QrCode } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import CheckoutButton from '@/components/CheckoutButton'

export interface Establishment {
  id: string
  name: string
  signature: string
  tone: string
  auto_mode: boolean
  publish_delay_sec: number
  groq_api_key: string | null
  zapier_webhook_url: string | null
  zapier_triggers: Record<string, boolean>
  slug: string | null
  google_review_url: string | null
  logo_url: string | null
}

export type SubscriptionState = {
  status: string
  trial_ends_at: string | null
  plan: string | null
  ai_replies_count: number
  ai_replies_reset_at: string | null
}

interface EstablishmentContextType {
  establishment: Establishment | null
  setEstablishment: (e: Establishment) => void
  pendingCount: number
  setPendingCount: React.Dispatch<React.SetStateAction<number>>
  subscription: SubscriptionState | null
}

export const EstablishmentContext = createContext<EstablishmentContextType>({
  establishment: null,
  setEstablishment: () => {},
  pendingCount: 0,
  setPendingCount: () => { return },
  subscription: null,
})

export function useEstablishment() {
  return useContext(EstablishmentContext)
}

export function useSubscription() {
  return useContext(EstablishmentContext).subscription
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null)
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const { showToast } = useToast()

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      setUserEmail(user.email || '')
      setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilisateur')

      // Fetch establishment
      const { data: est } = await supabase
        .from('establishments')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (est) {
        setEstablishment(est as Establishment)
      }

      // Fetch subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_ends_at, plan, ai_replies_count, ai_replies_reset_at')
        .eq('user_id', user.id)
        .single()

      if (sub) setSubscription(sub as SubscriptionState)
    }
    init()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    showToast('Déconnexion réussie')
    router.push('/')
  }

  const navItems = [
    {
      href: '/dashboard/reviews',
      label: 'Avis reçus',
      icon: LayoutDashboard,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { href: '/dashboard/collect', label: 'Collecter des avis', icon: QrCode, badge: null },
    { href: '/dashboard/analytics', label: 'Analytiques', icon: BarChart2, badge: null },
    { href: '/dashboard/settings', label: 'Paramètres', icon: Settings, badge: null },
  ]

  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const sidebarContent = (
    <>
      {/* Hotel name */}
      {establishment?.name && (
        <div className="text-xs font-semibold text-[#666A72] px-3.5 pb-3.5 border-b border-[#ECECEA] mb-2 truncate">
          {establishment.name}
        </div>
      )}

      {/* Nav items */}
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all mb-1',
              isActive
                ? 'bg-[rgba(228,87,46,0.10)] text-[#C2481F] border-l-2 border-[#E4572E]'
                : 'text-[#666A72] hover:bg-[rgba(0,0,0,0.03)] hover:text-[#17181C]'
            )}
          >
            <item.icon size={16} />
            {item.label}
            {item.badge != null && (
              <span className="ml-auto bg-[#f43f5e] text-white text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}

      {/* Plan status */}
      <div className="mt-auto pt-6">
        {subscription?.status === 'trialing' && trialDaysLeft !== null ? (
          <div className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-xl p-3.5 text-sm">
            <div className="text-[#B45309] font-semibold mb-1 text-xs">⏳ Essai gratuit</div>
            <div className="text-[#666A72] text-xs">{trialDaysLeft} jour{trialDaysLeft !== 1 ? 's' : ''} restant{trialDaysLeft !== 1 ? 's' : ''}</div>
            <CheckoutButton
              plan="pro"
              className="mt-2 block text-center text-xs font-semibold text-[#E4572E] hover:text-[#C2481F] transition-colors bg-transparent border-none w-full"
            >
              Passer au plan payant →
            </CheckoutButton>
          </div>
        ) : subscription?.plan === 'starter' ? (
          <div className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-xl p-3.5 text-sm">
            <div className="text-[#B45309] font-semibold mb-1 flex items-center gap-1 text-xs">
              <CheckCircle size={12} /> Plan Starter
            </div>
            <div className="text-[#666A72] text-xs">49€/mois · {subscription.ai_replies_count || 0}/30 réponses</div>
            <CheckoutButton
              plan="pro"
              className="mt-2 block text-center text-xs font-semibold text-[#E4572E] hover:text-[#C2481F] transition-colors bg-transparent border-none w-full"
            >
              Passer au Pro →
            </CheckoutButton>
          </div>
        ) : (
          <div className="bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)] rounded-xl p-3.5 text-sm">
            <div className="text-[#0E9F6E] font-semibold mb-1 flex items-center gap-1 text-xs">
              <CheckCircle size={12} /> Plan Pro
            </div>
            <div className="text-[#666A72] text-xs">79€/mois · Illimité</div>
          </div>
        )}
      </div>
    </>
  )

  return (
    <EstablishmentContext.Provider value={{ establishment, setEstablishment, pendingCount, setPendingCount, subscription }}>
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col overflow-x-hidden">
        {/* Top nav */}
        <nav className="flex items-center justify-between pl-4 pr-6 md:px-9 h-[60px] border-b border-[#ECECEA] bg-[rgba(255,255,255,0.96)] sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-[#666A72] hover:text-[#17181C] transition-colors p-1"
            >
              <Menu size={20} />
            </button>
            <Link href="/" className="font-extrabold text-[1.25rem] tracking-[-0.03em]">
              <span className="text-[#17181C]">StarReviews</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-[#666A72]">
              Bonjour, <span className="text-[#17181C] font-medium">{userName}</span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 border border-[#ECECEA] text-[#666A72] hover:text-[#17181C] hover:border-[#D0D0CE] px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </nav>

        {/* Mobile overlay */}
        <div
          className="fixed inset-0 z-[200] md:hidden"
          style={{
            background: 'rgba(0,0,0,0.6)',
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? 'auto' : 'none',
            transition: 'opacity 0.22s ease',
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-0 left-0 bottom-0 w-[240px] bg-white border-r border-[#ECECEA] p-4 flex flex-col gap-1"
            style={{
              transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.28s cubic-bezier(0.32, 0, 0.12, 1)',
              willChange: 'transform',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#ECECEA]">
              <span className="font-extrabold text-lg text-[#17181C]">StarReviews.</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-[#666A72] hover:text-[#17181C]"
              >
                <X size={18} />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>

        {/* Main layout */}
        <div className="flex flex-1">
          {/* Sidebar (desktop) */}
          <aside className="hidden md:flex flex-col w-[220px] border-r border-[#ECECEA] p-4 min-h-[calc(100vh-60px)] sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Content */}
          <main className="flex-1 p-4 md:p-9 overflow-x-hidden min-w-0">
            {children}
          </main>
        </div>
      </div>
    </EstablishmentContext.Provider>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </ToastProvider>
  )
}
