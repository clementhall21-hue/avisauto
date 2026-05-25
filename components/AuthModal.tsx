'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './Toast'
import { getInitials, getAvatarColor } from '@/lib/utils'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  defaultMode?: 'login' | 'signup'
}

export default function AuthModal({ open, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [sentToEmail, setSentToEmail] = useState('')

  useEffect(() => {
    if (open) {
      setMode(defaultMode)
      setError('')
      setEmailSent(false)
    }
  }, [open, defaultMode])
  const { showToast } = useToast()

  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Signup fields
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      if (authError) {
        setError('Email ou mot de passe incorrect.')
        return
      }

      showToast('Connexion réussie ! Redirection…')
      onClose()
      window.location.href = '/dashboard'
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!name.trim() || !businessName.trim() || !signupEmail.trim() || signupPassword.length < 6) {
      setError('Veuillez remplir tous les champs (mot de passe : 6 caractères min).')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { data, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: { full_name: name, business_name: businessName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('user already exists')) {
          setError('Un compte existe déjà avec cet email. Connectez-vous à la place.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (data.user) {
        if (data.session) {
          // Email confirmation disabled — user is immediately logged in
          await supabase.from('establishments').insert({
            user_id: data.user.id,
            name: businessName,
            signature: name,
            tone: 'Professionnel',
          })
          await supabase.from('subscriptions').insert({
            user_id: data.user.id,
            status: 'trialing',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
        }
        // Always show email confirmation screen
        setSentToEmail(signupEmail)
        setEmailSent(true)
      } else {
        // Supabase retourne null user quand l'email existe déjà (rate limit ou compte existant)
        setError('Un compte existe déjà avec cet email. Connectez-vous à la place.')
      }
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-[11px] text-[#e8eaf6] text-base outline-none transition-colors placeholder-[#8892b0] focus:border-[#6366f1]'
  const labelClass = 'block text-xs font-semibold text-[#8892b0] mb-1.5'

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[calc(100vw-32px)] max-w-[420px] bg-[#111827] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 md:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.6)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-y-auto max-h-[90vh]">
          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-[#8892b0] hover:text-[#e8eaf6] transition-colors" aria-label="Fermer">
              <X size={18} />
            </button>
          </Dialog.Close>

          {emailSent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-5">📬</div>
              <Dialog.Title className="text-[1.3rem] font-bold mb-3 text-[#e8eaf6]">
                Vérifiez votre boîte mail
              </Dialog.Title>
              <Dialog.Description className="text-[#8892b0] text-sm leading-relaxed mb-4">
                Un email de confirmation a été envoyé à<br />
                <span className="text-[#e8eaf6] font-semibold">{sentToEmail}</span>
              </Dialog.Description>
              <div className="bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] rounded-xl px-4 py-3 text-sm text-[#8892b0] mb-6 leading-relaxed">
                👆 <span className="text-[#e8eaf6] font-medium">Cliquez sur le lien dans cet email</span> pour activer votre compte et accéder au tableau de bord.
              </div>
              <p className="text-xs text-[#8892b0]">
                Pas reçu ? Vérifiez vos spams ou{' '}
                <button
                  type="button"
                  onClick={() => setEmailSent(false)}
                  className="text-[#6366f1] hover:underline"
                >
                  réessayez
                </button>
              </p>
            </div>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin}>
              <Dialog.Title className="text-[1.4rem] font-bold mb-1.5 text-[#e8eaf6]">
                Connexion
              </Dialog.Title>
              <Dialog.Description className="text-[#8892b0] text-sm mb-7">
                Accédez à votre tableau de bord
              </Dialog.Description>

              <div className="mb-4">
                <label className={labelClass}>E-mail</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="vous@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className={labelClass}>Mot de passe</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="mb-4 text-xs text-[#f43f5e] bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.2)] rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-br from-[#6366f1] to-[#7c3aed] text-[#0b0f1e] font-bold py-[13px] rounded-[9px] text-[0.95rem] mt-2 hover:from-[#818cf8] hover:to-[#6366f1] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Se connecter
              </button>

              <p className="text-center mt-4 text-sm text-[#8892b0]">
                Pas encore de compte ?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError('') }}
                  className="text-[#34d399] hover:underline"
                >
                  Créer un compte
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup}>
              <Dialog.Title className="text-[1.4rem] font-bold mb-1.5 text-[#e8eaf6]">
                Démarrer l&apos;essai
              </Dialog.Title>
              <Dialog.Description className="text-[#8892b0] text-sm mb-7 leading-relaxed">
                14 jours gratuits · Sans carte bancaire · Annulation en 1 clic
              </Dialog.Description>

              <div className="mb-4">
                <label className={labelClass}>Votre nom</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Marie Dupont"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className={labelClass}>Nom de l&apos;établissement</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Hôtel du Soleil"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label className={labelClass}>E-mail professionnel</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="contact@hotel-soleil.fr"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label className={labelClass}>Mot de passe</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="mb-4 text-xs text-[#f43f5e] bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.2)] rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-br from-[#6366f1] to-[#7c3aed] text-[#0b0f1e] font-bold py-[13px] rounded-[9px] text-[0.95rem] mt-2 hover:from-[#818cf8] hover:to-[#6366f1] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Démarrer gratuitement →
              </button>

              <p className="text-center mt-4 text-sm text-[#8892b0]">
                Déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError('') }}
                  className="text-[#34d399] hover:underline"
                >
                  Se connecter
                </button>
              </p>
            </form>
          ) }
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
