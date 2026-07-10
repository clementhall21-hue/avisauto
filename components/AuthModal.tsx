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
      setLoading(false) // évite le rond bloqué si on revient depuis Google
    }
  }, [open, defaultMode])

  // Retour arrière depuis Google (page restaurée du cache) → on débloque le bouton
  useEffect(() => {
    const reset = () => setLoading(false)
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])
  const { showToast } = useToast()

  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Signup fields
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      // signInWithOAuth renvoie l'erreur dans l'objet (pas via throw) :
      // si Google n'est pas activé dans Supabase, on l'affiche clairement.
      if (error) {
        setError(
          /not enabled|unsupported/i.test(error.message)
            ? 'La connexion Google n’est pas encore activée. Réessaie dans un instant.'
            : `Google : ${error.message}`
        )
        setLoading(false)
      }
      // Sinon : redirection vers Google, rien d'autre à faire ici.
    } catch {
      setError('Une erreur est survenue. Réessayez.')
      setLoading(false)
    }
  }

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
        setSentToEmail(signupEmail)
        setEmailSent(true)
      } else {
        // Supabase retourne null user silencieusement pour les emails déjà confirmés
        // On affiche quand même l'écran email pour ne pas révéler si un compte existe
        setSentToEmail(signupEmail)
        setEmailSent(true)
      }
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-[#FAFAF8] border border-[#ECECEA] rounded-lg px-4 py-[11px] text-[#17181C] text-base outline-none transition-colors placeholder-[#666A72] focus:border-[#6366f1]'
  const labelClass = 'block text-xs font-semibold text-[#666A72] mb-1.5'

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[calc(100vw-32px)] max-w-[420px] bg-white border border-[#E3E3E1] rounded-2xl p-6 md:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.14)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-y-auto max-h-[90vh]">
          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-[#666A72] hover:text-[#17181C] transition-colors" aria-label="Fermer">
              <X size={18} />
            </button>
          </Dialog.Close>

          {emailSent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-5">📬</div>
              <Dialog.Title className="text-[1.3rem] font-bold mb-3 text-[#17181C]">
                Vérifiez votre boîte mail
              </Dialog.Title>
              <Dialog.Description className="text-[#666A72] text-sm leading-relaxed mb-4">
                Un email de confirmation a été envoyé à<br />
                <span className="text-[#17181C] font-semibold">{sentToEmail}</span>
              </Dialog.Description>
              <div className="bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] rounded-xl px-4 py-3 text-sm text-[#666A72] mb-6 leading-relaxed">
                👆 <span className="text-[#17181C] font-medium">Cliquez sur le lien dans cet email</span> pour activer votre compte et accéder au tableau de bord.
              </div>
              <p className="text-xs text-[#666A72]">
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
              <Dialog.Title className="text-[1.4rem] font-bold mb-1.5 text-[#17181C]">
                Connexion
              </Dialog.Title>
              <Dialog.Description className="text-[#666A72] text-sm mb-7">
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
                className="w-full bg-[#E4572E] text-white font-bold py-[13px] rounded-[10px] text-[0.95rem] mt-2 hover:bg-[#FF7A50] hover:shadow-[0_6px_20px_rgba(228,87,46,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Se connecter
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[#ECECEA]" />
                <span className="text-xs text-[#666A72]">ou</span>
                <div className="flex-1 h-px bg-[#ECECEA]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-[13px] rounded-[9px] text-[0.95rem] hover:bg-gray-100 transition-all disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.5 40.1 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 36.1 44 30.5 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
                Continuer avec Google
              </button>

              <p className="text-center mt-4 text-sm text-[#666A72]">
                Pas encore de compte ?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError('') }}
                  className="text-[#C2481F] hover:underline"
                >
                  Créer un compte
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup}>
              <Dialog.Title className="text-[1.4rem] font-bold mb-1.5 text-[#17181C]">
                Démarrer l&apos;essai
              </Dialog.Title>
              <Dialog.Description className="text-[#666A72] text-sm mb-7 leading-relaxed">
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
                className="w-full bg-[#E4572E] text-white font-bold py-[13px] rounded-[10px] text-[0.95rem] mt-2 hover:bg-[#FF7A50] hover:shadow-[0_6px_20px_rgba(228,87,46,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Démarrer gratuitement →
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[#ECECEA]" />
                <span className="text-xs text-[#666A72]">ou</span>
                <div className="flex-1 h-px bg-[#ECECEA]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-[13px] rounded-[9px] text-[0.95rem] hover:bg-gray-100 transition-all disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.5 40.1 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 36.1 44 30.5 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
                Continuer avec Google
              </button>

              <p className="text-center mt-4 text-sm text-[#666A72]">
                Déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError('') }}
                  className="text-[#C2481F] hover:underline"
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
