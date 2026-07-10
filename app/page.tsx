'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import AuthModal from '@/components/AuthModal'

const TONE_RESPONSES: Record<string, { court: string; normal: string; developpe: string; signature: string }> = {
  Professionnel: {
    court: "Merci Laurent pour votre retour. Nous sommes sincèrement désolés que le bruit en soirée ait perturbé votre repos — c'est un point que nous prenons très au sérieux. Des mesures correctives sont en cours et nous espérons vous accueillir à nouveau dans de meilleures conditions.",
    normal: "Merci Laurent pour ce retour constructif. Nous sommes sincèrement désolés que le bruit en soirée ait perturbé votre repos — c'est un point sur lequel nous travaillons activement. Votre confort est notre priorité absolue et nous prenons chaque remarque de ce type très au sérieux. Des actions concrètes sont en cours pour améliorer l'isolation phonique de nos chambres. Nous espérons sincèrement avoir l'occasion de vous accueillir à nouveau et de vous offrir le séjour que vous méritez.",
    developpe: "Merci Laurent pour ce retour constructif. Nous sommes sincèrement désolés que le bruit en soirée ait perturbé votre repos — c'est un point sur lequel nous travaillons activement et qui ne reflète pas les standards que nous nous imposons. Votre confort est notre priorité absolue, et chaque remarque de ce type est transmise directement à la direction et à l'équipe technique. Des actions concrètes sont en cours : renforcement de l'isolation phonique de plusieurs chambres, révision de notre politique de silence à partir de 22h, et mise en place d'un système de signalement en temps réel pour nos clients. Nous aurions aimé que vous puissiez nous alerter pendant votre séjour afin de vous proposer un changement de chambre immédiat. N'hésitez pas à nous contacter directement avant votre prochain passage — nous ferons en sorte que votre expérience soit à la hauteur de vos attentes. Nous vous remercions sincèrement de nous accorder cette confiance.",
    signature: "Cordialement, Sophie — Directrice de l'Hôtel Le Clos",
  },
  Chaleureux: {
    court: "Merci Laurent pour ce retour ! 😊 On est vraiment navrés pour le bruit en soirée — c'est loin de ce qu'on veut offrir. On travaille activement à améliorer ça et on espère vous revoir très bientôt dans de bien meilleures conditions !",
    normal: "Merci beaucoup Laurent pour votre retour ! 😊 On est vraiment navrés pour ce bruit en soirée — c'est loin de l'expérience qu'on souhaite offrir à nos clients et on comprend à quel point ça peut gâcher un séjour. On prend votre remarque très à cœur et on travaille activement à améliorer ça. Malgré ce point, on est vraiment contents que l'ensemble du séjour se soit bien passé. On espère de tout cœur vous revoir bientôt ! 🙏",
    developpe: "Merci beaucoup Laurent pour votre retour ! 😊 On est vraiment navrés pour ce bruit en soirée — c'est loin de l'expérience qu'on souhaite offrir, et on sait à quel point ça peut ruiner une bonne nuit de repos après une longue journée. On prend votre remarque très à cœur : elle a été partagée avec toute l'équipe et a déclenché une vraie réflexion sur nos aménagements. Des travaux d'isolation sont prévus dans les prochaines semaines, et on a aussi renforcé nos consignes de calme en soirée pour l'ensemble du personnel. On aurait vraiment aimé que vous nous en parliez sur place — on vous aurait changé de chambre sans hésiter ! Malgré ce point, on est vraiment contents que le reste du séjour se soit bien passé. On espère de tout cœur vous revoir bientôt pour vous offrir l'expérience qu'on vous doit vraiment. N'hésitez pas à nous écrire avant votre prochaine venue, on s'occupera de tout ! 🙏",
    signature: "À très vite, Sophie & toute l'équipe 💙",
  },
  Empathique: {
    court: "Merci Laurent d'avoir pris le temps de partager votre ressenti. Nous comprenons pleinement que le bruit en soirée ait pu affecter la qualité de votre repos, et nous en sommes sincèrement désolés. Votre confort méritait bien mieux, et nous prenons cette situation très au sérieux.",
    normal: "Merci Laurent d'avoir pris le temps de partager votre ressenti avec nous. Nous comprenons pleinement que le bruit en soirée ait pu affecter la qualité de votre repos, et nous en sommes sincèrement désolés — votre confort méritait bien mieux. Ce type de retour, bien qu'il soit difficile à entendre, est exactement ce dont nous avons besoin pour progresser. Nous travaillons activement à trouver une solution durable pour que cela ne se reproduise plus, et nous espérons pouvoir vous le démontrer lors d'un prochain séjour.",
    developpe: "Merci Laurent d'avoir pris le temps de partager votre ressenti avec nous. Nous comprenons pleinement que le bruit en soirée ait pu affecter la qualité de votre repos, et nous en sommes sincèrement désolés — votre confort méritait bien mieux, et nous n'acceptons pas que l'un de nos clients rentre chez lui avec ce sentiment. Votre retour a été transmis à l'ensemble de l'équipe et a suscité une prise de conscience collective. Nous avons lancé une révision complète de notre dispositif d'isolation phonique et de nos protocoles de soirée. Nous aurions tellement voulu que vous nous en parliez pendant votre séjour — non pas pour minimiser la situation, mais pour pouvoir y remédier immédiatement et vous offrir le repos que vous méritiez. Sachez que ces retours, même difficiles, nous touchent profondément et nous rappellent pourquoi nous faisons ce métier : pour que chaque client reparte avec un vrai sourire. Merci de nous accorder votre confiance malgré tout — nous ferons tout pour la mériter.",
    signature: "Avec toute notre considération, Sophie — L'Hôtel Le Clos",
  },
  Décontracté: {
    court: "Merci Laurent ! Pour le bruit en soirée, on t'entend complètement — c'est clairement pas ce qu'on veut pour nos clients et on bosse dessus. On espère te revoir bientôt avec un séjour bien plus calme, c'est promis ! 👌",
    normal: "Merci Laurent ! Content que le séjour se soit globalement bien passé. Pour le bruit en soirée, on t'entend complètement — c'est vraiment pas ce qu'on veut pour nos clients et on bosse dessus sérieusement. On a déjà lancé quelques chantiers pour améliorer ça. Ton retour nous aide vraiment à avancer, donc merci pour ça. À bientôt, et cette fois ce sera beaucoup plus calme, promis ! 👌",
    developpe: "Merci Laurent ! Content que le séjour se soit globalement bien passé, même si on est vraiment désolés pour le bruit en soirée — c'est clairement pas ce qu'on veut pour nos clients, et on comprend que ça peut vraiment plomber un séjour. On t'entend complètement et ton retour est arrivé directement à la bonne personne. On a déjà plusieurs chantiers en cours : isolation de certaines chambres, consignes plus strictes pour le calme en soirée, et un nouveau système pour signaler ce genre de problème en temps réel. On aurait adoré que tu nous en parles sur place — on t'aurait changé de chambre direct, sans chichi ! Vraiment, c'est grâce à des retours comme le tien qu'on s'améliore, donc merci d'avoir pris le temps. À bientôt, et cette fois ce sera au top du top — garanti ou remboursé (bon, presque 😄) ! 🔥🙌",
    signature: "Sophie de l'Hôtel Le Clos 🙌",
  },
}

const TONE_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  Professionnel: { border: 'rgba(99,102,241,0.4)', text: '#4F46E5', bg: 'rgba(99,102,241,0.08)' },
  Chaleureux: { border: 'rgba(245,158,11,0.4)', text: '#B45309', bg: 'rgba(245,158,11,0.08)' },
  Empathique: { border: 'rgba(167,139,250,0.4)', text: '#7C3AED', bg: 'rgba(167,139,250,0.08)' },
  Décontracté: { border: 'rgba(6,182,212,0.4)', text: '#0E7490', bg: 'rgba(6,182,212,0.08)' },
}

const FEATURES = [
  { icon: '📱', title: 'Collecte d\'avis par QR code', desc: 'Un QR code à poser sur vos tables : vos clients laissent un avis Google en 10 secondes, et peuvent aussi vous glisser un commentaire privé. PDF prêt à imprimer inclus.', color: 'rgba(228,87,46,0.15)', glow: '52,211,153' },
  { icon: '🤖', title: 'Réponses IA personnalisées', desc: '30 réponses/mois en Starter, illimitées en Pro. Chaque réponse est unique et adaptée à votre établissement.', color: 'rgba(99,102,241,0.15)', glow: '99,102,241' },
  { icon: '✍️', title: 'Signature personnalisée', desc: "Définissez le nom sous lequel l'IA signe chaque réponse — votre prénom, le nom de l'établissement, ou tout autre signature qui vous ressemble.", color: 'rgba(6,182,212,0.15)', glow: '6,182,212' },
  { icon: '🎨', title: 'Personnalisation du ton', desc: "Professionnel, chaleureux, empathique — l'IA adopte exactement votre style.", color: 'rgba(167,139,250,0.15)', glow: '167,139,250' },
  { icon: '⚡', title: 'Rapport IA sur vos points faibles', desc: "En un clic, l'IA analyse tous vos avis négatifs et vous génère un rapport clair : ce que vos clients reprochent, les problèmes récurrents, et les actions concrètes à mener pour améliorer votre réputation.", color: 'rgba(244,63,94,0.15)', glow: '244,63,94' },
  { icon: '🛟', title: 'Support prioritaire 7j/7', desc: 'Notre équipe est disponible tous les jours pour vous aider.', color: 'rgba(228,87,46,0.15)', glow: '52,211,153' },
  { icon: '📊', title: 'Tableau de bord unifié', desc: 'Suivez votre note moyenne, le volume d\'avis et votre taux de réponse.', color: 'rgba(245,158,11,0.15)', glow: '245,158,11' },
  { icon: '🔒', title: 'Validation avant publication', desc: 'Chaque réponse peut être relue et modifiée avant publication.', color: 'rgba(244,63,94,0.15)', glow: '244,63,94' },
]


const FAQS = [
  {
    q: 'Comment fonctionne l\'essai gratuit ?',
    a: 'Vous bénéficiez de 14 jours d\'accès complet à toutes les fonctionnalités, sans carte bancaire requise. À la fin de l\'essai, vous choisissez de passer au plan payant ou d\'arrêter.',
  },
  {
    q: 'L\'IA peut-elle vraiment imiter le ton de mon établissement ?',
    a: 'Oui. Vous choisissez parmi 4 tons (Professionnel, Chaleureux, Empathique, Décontracté) et l\'IA adapte chaque réponse au contenu de l\'avis et à votre signature personnalisée.',
  },
  {
    q: 'Comment les avis arrivent-ils dans le dashboard ?',
    a: 'Via Google Sheets (import manuel ou automatique), via notre webhook Zapier, ou en ajoutant des avis manuellement depuis les paramètres. Pour la publication automatique sur Google, une fiche Google My Business active est nécessaire.',
  },
  {
    q: 'Puis-je modifier les réponses avant de les publier ?',
    a: 'Absolument. Chaque réponse IA peut être éditée en ligne avant publication. Vous pouvez aussi activer le mode automatique qui publie après un délai que vous configurez.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Chaque client n\'accède qu\'à ses propres données (Row Level Security Supabase). La clé Groq n\'est jamais exposée côté client. Tout est hébergé sur infrastructure européenne.',
  },
  {
    q: 'Y a-t-il un engagement ?',
    a: 'Aucun engagement. Vous pouvez annuler à tout moment depuis votre espace client. La résiliation est immédiate, sans frais.',
  },
]

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// Ligne épaisse bleu mer entre les sections
function WaveDivider() {
  return (
    <div
      className="w-full h-[6px]"
      style={{ background: 'linear-gradient(90deg,#0C5C6B 0%,#17A2B8 50%,#0C5C6B 100%)' }}
      aria-hidden
    />
  )
}

export default function LandingPage() {
  const [modalType, setModalType] = useState<'login' | 'signup' | null>(null)
  const [activeTone, setActiveTone] = useState('Professionnel')
  const [activeLength, setActiveLength] = useState('Normal')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [['#features', 'Fonctionnalités'], ['#pricing', 'Tarifs'], ['#faq', 'FAQ']] as const

  return (
    <div className="overflow-x-hidden max-w-[100vw] pt-[56px] md:pt-[64px]">
      {/* ── NAV ── */}
      <nav className={`flex items-center justify-between px-4 md:px-12 h-[56px] md:h-[64px] fixed top-0 left-0 right-0 z-[100] transition-shadow duration-300 ${scrolled ? 'shadow-[0_4px_24px_rgba(12,92,107,0.25)]' : ''}`} style={{ background: 'linear-gradient(90deg,#0C5C6B 0%,#0E6E7C 100%)' }}>
        <div className="font-extrabold text-[1.05rem] md:text-[1.35rem] tracking-[-0.03em] text-white flex items-center gap-1.5">
          <span className="text-[#FFB020]">★</span> StarReviews
        </div>
        <ul className="hidden md:flex items-center gap-8 list-none">
          {navLinks.map(([href, label]) => (
            <li key={href}>
              <a href={href} className="text-white/90 hover:text-[#FFD9A8] text-[0.9rem] font-medium transition-colors no-underline">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          {/* Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => setModalType('login')} className="text-white/90 hover:text-white border border-white/40 hover:border-white/70 px-5 py-2 rounded-lg text-[0.88rem] font-medium transition-colors bg-transparent">Connexion</button>
            <button onClick={() => setModalType('signup')} className="btn-primary">Essai gratuit</button>
          </div>
          {/* Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setModalType('login')}
              style={{ fontSize: '0.78rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', padding: '4px 2px', whiteSpace: 'nowrap' }}
            >
              Connexion
            </button>
            <button
              onClick={() => setModalType('signup')}
              style={{ fontSize: '0.72rem', padding: '6px 12px', borderRadius: '8px', background: '#E4572E', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              Essai gratuit
            </button>
          </div>
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1.5 text-white/90 hover:text-white transition-colors"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="5" width="16" height="1.8" rx="0.9" fill="currentColor"/>
              <rect x="2" y="9.1" width="16" height="1.8" rx="0.9" fill="currentColor"/>
              <rect x="2" y="13.2" width="16" height="1.8" rx="0.9" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU OVERLAY ── */}
      <div
        className="fixed inset-0 z-[200] md:hidden"
        style={{
          background: 'rgba(0,0,0,0.5)',
          opacity: mobileMenuOpen ? 1 : 0,
          pointerEvents: mobileMenuOpen ? 'auto' : 'none',
          transition: 'opacity 0.22s ease',
        }}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div
          className="absolute top-0 right-0 bottom-0 w-[260px] bg-white border-l border-[#ECECEA] p-6 flex flex-col gap-1"
          style={{
            transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.28s cubic-bezier(0.32, 0, 0.12, 1)',
            willChange: 'transform',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#ECECEA]">
            <span className="font-extrabold text-lg gradient-text-logo">StarReviews<span style={{ color: '#E4572E' }}>.</span></span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-[#666A72] hover:text-[#17181C] p-1">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {navLinks.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#17181C] hover:text-[#C2481F] text-[1rem] font-medium py-3 px-2 rounded-lg hover:bg-[rgba(0,0,0,0.03)] transition-colors no-underline"
            >
              {label}
            </a>
          ))}
          <div className="mt-4 pt-4 border-t border-[#ECECEA] flex flex-col gap-2">
            <button
              onClick={() => { setMobileMenuOpen(false); setModalType('login') }}
              className="btn-outline w-full py-2.5 text-sm"
            >
              Connexion
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); setModalType('signup') }}
              className="btn-primary w-full py-2.5 text-sm"
            >
              Essai gratuit
            </button>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="text-center px-4 md:px-6 pt-16 md:pt-24 pb-16 md:pb-20 relative">
        {/* Ambiance bord de mer : lumière du soleil + reflets d'eau turquoise */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[860px] h-[460px] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 28% 42%, rgba(20,157,176,0.12) 0%, transparent 58%), radial-gradient(ellipse at 74% 28%, rgba(255,176,32,0.12) 0%, transparent 52%), radial-gradient(ellipse at 55% 80%, rgba(228,87,46,0.06) 0%, transparent 60%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-[rgba(228,87,46,0.08)] border border-[rgba(228,87,46,0.25)] text-[#C2481F] text-[0.75rem] font-semibold px-3.5 py-1.5 rounded-full mb-8 tracking-[0.05em] uppercase"
        >
          <span className="text-[#f59e0b] text-[0.72rem] tracking-tight leading-none" aria-hidden>★★★★★</span>
          Pour les restaurants et hôtels
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="text-[clamp(2rem,8vw,4.5rem)] font-black tracking-[-0.04em] leading-[1.06] max-w-[820px] mx-auto mb-6"
        >
          Faites grimper votre{' '}
          <em
            className="not-italic"
            style={{
              background: 'linear-gradient(135deg, #FFB020 0%, #FF7A50 50%, #E4572E 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            note Google
          </em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[0.95rem] md:text-[1.1rem] text-[#666A72] max-w-[520px] mx-auto mb-8 md:mb-11 leading-[1.6] px-2"
        >
          Un QR code sur vos tables rend l&apos;avis Google immédiat pour vos clients,
          et recueille aussi leurs retours privés. Et l&apos;IA répond à chaque avis
          à votre place, dans votre ton. Le cercle complet, zéro effort.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          <button
            onClick={() => setModalType('signup')}
            className="border-2 border-[#E4572E] text-[#C2481F] hover:bg-[#E4572E] hover:text-white px-6 md:px-8 py-3 md:py-3.5 rounded-[10px] font-semibold text-[0.95rem] md:text-[1rem] transition-all min-h-[44px]"
          >
            Essayer gratuitement
          </button>
          <a
            href="#pricing"
            className="bg-[#E4572E] text-white border-2 border-[#E4572E] hover:bg-[#FF7A50] hover:border-[#FF7A50] px-6 md:px-8 py-3 md:py-3.5 rounded-[10px] font-bold text-[0.95rem] md:text-[1rem] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(228,87,46,0.25)] no-underline inline-flex items-center gap-2 min-h-[44px]"
          >
            Voir les tarifs <span>→</span>
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-4 text-[0.82rem] text-[#666A72]"
        >
          Essai gratuit 14 jours · Aucune carte requise
        </motion.p>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="max-w-[860px] mx-auto mt-12 md:mt-16 px-0 md:px-6"
          style={{ perspective: '1200px' }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          >
          <div
            style={{ transform: 'rotateX(4deg)', transformOrigin: 'top center', background: 'linear-gradient(160deg,#8FD4DA 0%,#CDEAE6 45%,#FBEAD9 100%)' }}
            className="relative rounded-2xl overflow-hidden border border-white shadow-[0_32px_64px_rgba(20,120,140,0.14)]"
          >
            {/* Photo d'ambiance vue mer. Essaie d'abord /hero-mer.jpg (ta propre photo
                si tu la déposes dans public/), puis une photo Unsplash, puis dégradé. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80"
              alt="Terrasse de restaurant avec vue sur la mer"
              className="w-full h-[300px] md:h-[420px] object-cover block"
              data-idx="0"
              onError={(e) => {
                const sources = [
                  '/hero-mer.jpg',
                  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
                ]
                const el = e.currentTarget
                const i = Number(el.dataset.idx || '0')
                if (i < sources.length) {
                  el.dataset.idx = String(i + 1)
                  el.src = sources[i]
                } else {
                  el.style.display = 'none'
                }
              }}
            />
            {/* Carte IA flottante */}
            <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-[320px] bg-white/95 backdrop-blur rounded-2xl border border-[#ECECEA] shadow-[0_16px_40px_rgba(0,0,0,0.18)] p-4 text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-[#E4572E] text-white flex items-center justify-center text-[0.7rem] flex-shrink-0">✨</div>
                <span className="text-[0.72rem] font-semibold text-[#C2481F]">Réponse générée par l&apos;IA</span>
              </div>
              <p className="text-[0.82rem] text-[#17181C] leading-[1.45]">
                «&nbsp;Merci Julie pour ce retour chaleureux&nbsp;! Toute l&apos;équipe est ravie que la terrasse vous ait plu, à très vite&nbsp;!&nbsp;»
              </p>
            </div>
          </div>
          </motion.div>
        </motion.div>
      </section>

      <WaveDivider />

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="max-w-[1100px] mx-auto px-4 md:px-6 py-16 md:py-24" id="how">
        <FadeUp>
          <div className="text-[0.75rem] font-semibold tracking-[0.1em] uppercase text-[#C2481F] mb-3">Simple comme bonjour</div>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.025em] mb-4">Comment ça fonctionne</h2>
          <p className="text-[#666A72] text-[1rem] max-w-[480px] leading-[1.6] mb-14">Trois étapes. Aucune compétence technique requise.</p>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {[
            { n: '1', title: 'Vos clients scannent le QR code à table', desc: 'Laisser un avis Google devient immédiat — plus de clients le font. Ils peuvent aussi vous laisser un commentaire privé pour vous aider à progresser.' },
            { n: '2', title: 'Votre note Google grimpe', desc: 'Plus d\'avis positifs publiés, moins d\'avis négatifs : votre note moyenne monte, et votre établissement ressort dans les recherches.' },
            { n: '3', title: 'L\'IA répond à chaque avis pour vous', desc: 'Chaque avis reçoit une réponse personnalisée, dans votre ton et avec votre signature. Relisez avant publication, ou laissez le mode automatique tout gérer.' },
          ].map((step, i) => (
            <FadeUp key={i} delay={i * 0.1}>
              <div className="bg-white border border-[#ECECEA] rounded-[16px] p-7">
                <div className="w-9 h-9 rounded-full bg-[rgba(228,87,46,0.10)] border border-[rgba(228,87,46,0.3)] flex items-center justify-center text-[0.85rem] font-black text-[#C2481F] mb-4">{step.n}</div>
                <h3 className="text-[1rem] font-bold mb-2">{step.title}</h3>
                <p className="text-[0.87rem] text-[#666A72] leading-[1.65]">{step.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <FadeUp>
            <div className="bg-white border border-[#ECECEA] rounded-[16px] p-7">
              <div className="text-[1.3rem] mb-3.5">👁</div>
              <h4 className="text-[1rem] font-bold mb-2">Mode validation</h4>
              <p className="text-[0.84rem] text-[#666A72] leading-[1.65] mb-5">L'IA rédige la réponse. Vous la relisez, modifiez si besoin, puis publiez d'un clic. Contrôle total.</p>
              <div className="bg-white border border-[#ECECEA] rounded-[10px] p-3.5 text-[0.78rem]">
                <div className="text-[#666A72] mb-1.5">💬 Avis reçu :</div>
                <div className="text-[#17181C] italic mb-2.5">"Très bonne table, rapport qualité-prix excellent."</div>
                <div className="text-[#666A72] mb-1.5">🤖 Réponse générée :</div>
                <div className="text-[#17181C] mb-3">"Merci pour ce retour qui nous fait vraiment plaisir ! C'est exactement ce genre d'expérience que nous cherchons à offrir à chacun de nos clients. Nous transmettrons votre message à toute l'équipe. On vous attend avec impatience pour une prochaine fois !"</div>
                <div className="flex gap-1.5">
                  <span className="bg-[#FAFAF8] text-[#666A72] border border-[#ECECEA] px-2.5 py-0.5 rounded text-[0.72rem]">Publier</span>
                  <span className="bg-[#FAFAF8] text-[#666A72] border border-[#ECECEA] px-2.5 py-0.5 rounded text-[0.72rem]">✏️ Modifier</span>
                </div>
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="rounded-[16px] p-7 border border-[rgba(228,87,46,0.18)]" style={{ background: 'linear-gradient(135deg,rgba(228,87,46,0.05),rgba(255,176,32,0.04))' }}>
              <div className="text-[1.3rem] mb-3.5">🤖</div>
              <h4 className="text-[1rem] font-bold mb-2">Mode automatique</h4>
              <p className="text-[0.84rem] text-[#666A72] leading-[1.65] mb-5">L'IA rédige et publie seule après le délai que vous choisissez. Idéal si vous manquez de temps.</p>
              <div className="bg-white border border-[#ECECEA] rounded-[10px] p-3.5 text-[0.78rem]">
                <div className="text-[#666A72] mb-1.5">💬 Avis reçu :</div>
                <div className="text-[#17181C] italic mb-2.5">"Excellent séjour, personnel aux petits soins !"</div>
                <div className="text-[#666A72] mb-1.5">🤖 Réponse prête :</div>
                <div className="text-[#17181C] mb-3">"Merci infiniment pour ce témoignage ! Toute l'équipe est touchée par vos mots. Votre satisfaction est notre plus belle récompense et nous donne envie de nous surpasser chaque jour. Nous vous souhaitons une excellente continuation et espérons vous revoir très bientôt !"</div>
                <div className="flex items-center gap-2 bg-[rgba(228,87,46,0.08)] border border-[rgba(228,87,46,0.2)] rounded-lg px-3 py-1.5 text-[#C2481F] text-[0.72rem] font-semibold">
                  <span>⏱</span> Publication automatique dans 43min
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <WaveDivider />

      {/* ── TONS ── */}
      <section className="max-w-[1100px] mx-auto px-4 md:px-6 pb-16 md:pb-24">
        <FadeUp>
          <div className="text-[0.75rem] font-semibold tracking-[0.1em] uppercase text-[#0E8C9E] mb-3">Votre voix, votre style</div>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.025em] mb-4">L'IA parle comme vous</h2>
          <p className="text-[#666A72] text-[1rem] max-w-[520px] leading-[1.6] mb-10">Choisissez le ton et la longueur qui correspondent à l'image de votre établissement. Cliquez pour voir la réponse s'adapter en temps réel.</p>
        </FadeUp>

        <FadeUp>
          <div className="bg-white border border-[#ECECEA] rounded-[16px] p-5 mb-5">
            <div className="text-[0.72rem] font-semibold text-[#666A72] uppercase tracking-[0.08em] mb-2">💬 L'avis du client</div>
            <div className="text-[0.95rem] text-[#17181C] italic">"Bon séjour dans l'ensemble, mais la chambre était un peu bruyante le soir."</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[#f59e0b]">★★★★☆</span>
              <span className="text-[0.78rem] text-[#666A72]">Laurent M.</span>
            </div>
          </div>
        </FadeUp>

        <FadeUp>
          {/* Tone selector */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {Object.keys(TONE_RESPONSES).map((tone) => {
              const col = TONE_COLORS[tone]
              const isActive = activeTone === tone
              return (
                <button
                  key={tone}
                  onClick={() => setActiveTone(tone)}
                  className="px-4 py-1.5 rounded-full border text-[0.8rem] font-semibold transition-all"
                  style={{
                    borderColor: isActive ? col.border : '#E3E3E1',
                    color: isActive ? col.text : '#666A72',
                    background: isActive ? col.bg : 'transparent',
                  }}
                >
                  {tone}
                </button>
              )
            })}
          </div>

          {/* Length selector */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="text-[0.72rem] text-[#666A72] font-medium">Longueur :</span>
            {['Court', 'Normal', 'Développé'].map((len) => (
              <button
                key={len}
                onClick={() => setActiveLength(len)}
                className="px-3 py-1 rounded-full border text-[0.75rem] font-medium transition-all"
                style={{
                  borderColor: activeLength === len ? 'rgba(228,87,46,0.4)' : '#E3E3E1',
                  color: activeLength === len ? '#E4572E' : '#666A72',
                  background: activeLength === len ? 'rgba(228,87,46,0.08)' : 'transparent',
                }}
              >
                {len}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTone + activeLength}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="bg-white border border-[#ECECEA] rounded-[14px] p-6"
            >
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span
                  className="px-3 py-0.5 rounded-full text-[0.75rem] font-semibold border"
                  style={{ background: TONE_COLORS[activeTone].bg, color: TONE_COLORS[activeTone].text, borderColor: TONE_COLORS[activeTone].border }}
                >
                  {activeTone}
                </span>
                <span className="px-3 py-0.5 rounded-full text-[0.75rem] font-semibold border border-[rgba(228,87,46,0.3)] bg-[rgba(228,87,46,0.07)] text-[#C2481F]">
                  {activeLength}
                </span>
              </div>
              <div className="text-[0.88rem] text-[#17181C] leading-[1.65]">
                <p>
                  {activeLength === 'Court'
                    ? TONE_RESPONSES[activeTone].court
                    : activeLength === 'Normal'
                    ? TONE_RESPONSES[activeTone].normal
                    : TONE_RESPONSES[activeTone].developpe}
                </p>
                <p className="mt-3 text-[#666A72] italic">{TONE_RESPONSES[activeTone].signature}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </FadeUp>
      </section>

      <WaveDivider />

      {/* ── FEATURES ── */}
      <section className="max-w-[1100px] mx-auto px-4 md:px-6 py-16 md:py-24" id="features">
        <FadeUp>
          <div className="text-[0.75rem] font-semibold tracking-[0.1em] uppercase text-[#0E8C9E] mb-3">Ce que vous gagnez</div>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.025em] mb-4">Tout ce qu'il faut<br />pour briller sur Google</h2>
          <p className="text-[#666A72] text-[1rem] max-w-[480px] leading-[1.6] mb-14">Conçu pour tout établissement avec des avis Google — hôtels, restaurants, commerces, cliniques, garages et bien d&apos;autres.</p>
        </FadeUp>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FadeUp key={i} delay={i * 0.06}>
              <motion.div
                className="bg-white border border-[#ECECEA] rounded-[14px] p-7"
                whileHover={{
                  y: -5,
                  borderColor: `rgba(${f.glow},0.45)`,
                  boxShadow: `0 12px 32px rgba(0,0,0,0.3), 0 0 28px rgba(${f.glow},0.12)`,
                }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[1.3rem] mb-4.5" style={{ background: f.color }}>
                  {f.icon}
                </div>
                <h3 className="text-[1rem] font-semibold mb-2">{f.title}</h3>
                <p className="text-[0.88rem] text-[#666A72] leading-[1.6]">{f.desc}</p>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>


      <WaveDivider />

      {/* ── PRICING ── */}
      <section className="text-center px-4 md:px-6 py-14 md:py-20" id="pricing">
        <FadeUp>
          <div className="text-[0.75rem] font-semibold tracking-[0.1em] uppercase text-[#C2481F] mb-3">Tarifs</div>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.025em] mb-4">Choisissez votre plan</h2>
          <p className="text-[#666A72] text-[0.95rem] mb-12">14 jours d&apos;essai gratuit · Sans carte bancaire · Sans engagement</p>
          <div className="max-w-[860px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-start">
            {/* Starter */}
            <div className="rounded-[20px] md:rounded-[24px] p-6 md:p-8 text-left" style={{ background: '#FFFFFF', border: '1px solid #ECECEA' }}>
              <div className="text-xs font-semibold text-[#666A72] uppercase tracking-widest mb-3">Starter</div>
              <div className="text-[2.8rem] font-bold tracking-[-0.03em] leading-none text-[#17181C]">49€<span className="text-[1rem] font-normal text-[#666A72]">/mois</span></div>
              <div className="text-[#666A72] text-sm mt-1 mb-6">par établissement</div>
              <ul className="space-y-0 mb-8">
                {[
                  ['30 réponses IA par mois', true],
                  ['1 ton disponible (Professionnel)', true],
                  ['Validation avant publication', true],
                  ['Support email', true],
                  ['Mode automatique', false],
                  ['Analytiques & insights', false],
                  ['Analyse avis négatifs IA', false],
                  ['Tous les tons IA', false],
                ].map(([item, included]) => (
                  <li key={item as string} className="flex items-center gap-2.5 text-[0.88rem] py-2 border-b border-[#F0F0EE] last:border-0" style={{ color: included ? '#666A72' : 'rgba(107,110,118,0.4)' }}>
                    <span style={{ color: included ? '#E4572E' : 'rgba(136,146,176,0.3)' }} className="font-bold">{included ? '✓' : '✗'}</span>
                    {item as string}
                  </li>
                ))}
              </ul>
              <button onClick={() => setModalType('signup')} className="w-full py-3.5 rounded-[10px] font-bold text-[0.95rem] transition-all border border-[#E3E3E1] text-[#17181C] hover:border-[#C9C9C7] hover:bg-[rgba(0,0,0,0.03)]">
                Démarrer l&apos;essai gratuit
              </button>
            </div>

            {/* Pro - highlighted */}
            <div className="rounded-[20px] md:rounded-[24px] p-6 md:p-8 text-left relative overflow-hidden" style={{ background: '#FFFFFF', border: '2px solid #E4572E', boxShadow: '0 16px 48px rgba(228,87,46,0.12)' }}>
              <div className="absolute top-[-60px] right-[-60px] w-[180px] h-[180px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(228,87,46,0.10) 0%, transparent 70%)' }} />
              <div className="flex items-center gap-2 mb-3">
                <div className="text-xs font-semibold text-[#C2481F] uppercase tracking-widest">Pro</div>
                <span className="bg-[#E4572E] text-white text-[0.65rem] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">Recommandé</span>
              </div>
              <div className="text-[2.8rem] font-bold tracking-[-0.03em] leading-none text-[#17181C]">79€<span className="text-[1rem] font-normal text-[#666A72]">/mois</span></div>
              <div className="text-[#666A72] text-sm mt-1 mb-6">par établissement</div>
              <ul className="space-y-0 mb-8">
                {[
                  'Réponses illimitées',
                  '4 tons IA (Pro, Chaleureux, Empathique, Décontracté)',
                  'Mode automatique avec délai configurable',
                  'Analytiques & insights complets',
                  'Analyse avis négatifs par IA',
                  'Validation avant publication',
                  'Support prioritaire 7j/7',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-[0.88rem] py-2 border-b border-[#F0F0EE] last:border-0 text-[#666A72]">
                    <span className="text-[#E4572E] font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setModalType('signup')}
                className="w-full py-3.5 rounded-[10px] font-bold text-[0.95rem] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(228,87,46,0.35)]"
                style={{ background: '#E4572E', color: '#fff' }}
              >
                Commencer maintenant →
              </button>
              <button onClick={() => setModalType('signup')} className="block w-full mt-3 text-[0.83rem] text-[#666A72] hover:text-[#17181C] transition-colors bg-transparent border-none font-inherit cursor-pointer">
                14 jours gratuits inclus
              </button>
            </div>
          </div>
        </FadeUp>
      </section>

      <WaveDivider />

      {/* ── FAQ ── */}
      <section className="max-w-[680px] mx-auto px-4 md:px-6 py-12 md:py-16" id="faq">
        <FadeUp>
          <h2 className="text-[clamp(1.8rem,4vw,2.4rem)] font-bold tracking-[-0.025em] text-center mb-12">Questions fréquentes</h2>
        </FadeUp>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <FadeUp key={i} delay={i * 0.04}>
              <div className="bg-white border border-[#ECECEA] rounded-[12px] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-[0.95rem] font-semibold text-[#17181C] hover:text-[#C2481F] transition-colors bg-transparent border-none font-inherit cursor-pointer"
                >
                  {faq.q}
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} className="text-[#666A72] flex-shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-5 pb-4 text-[0.9rem] text-[#666A72] leading-[1.65] border-t border-[#ECECEA] pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="text-center px-4 md:px-6 py-14 md:py-20">
        <FadeUp>
          <div
            className="max-w-[700px] mx-auto rounded-[20px] md:rounded-[24px] p-7 md:p-12 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(228,87,46,0.07), rgba(255,176,32,0.06))', border: '1px solid rgba(228,87,46,0.18)' }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(228,87,46,0.08), transparent 60%)' }} />
            <h2 className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold tracking-[-0.025em] mb-4">Prêt à répondre à tous vos avis ?</h2>
            <p className="text-[#666A72] max-w-[480px] mx-auto">Rejoignez les établissements qui ont automatisé leurs réponses Google et amélioré leur réputation en ligne.</p>
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#ECECEA] px-5 md:px-12 py-6 md:py-8 bg-[#F5F5F3] flex justify-between items-center text-[0.82rem] text-[#666A72] flex-wrap gap-3">
        <div className="font-extrabold text-[1.1rem]">
          <span className="gradient-text-logo">StarReviews</span>
          <span style={{ color: '#E4572E' }}>.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="text-[#666A72] hover:text-[#17181C] transition-colors no-underline">Mentions légales</a>
          <a href="#" className="text-[#666A72] hover:text-[#17181C] transition-colors no-underline">CGU</a>
          <a href="#" className="text-[#666A72] hover:text-[#17181C] transition-colors no-underline">Contact</a>
        </div>
        <div>© 2026 StarReviews. Tous droits réservés.</div>
      </footer>

      {/* ── AUTH MODAL ── */}
      <AuthModal
        open={modalType !== null}
        defaultMode={modalType ?? 'login'}
        onClose={() => setModalType(null)}
      />
    </div>
  )
}
