import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Essai gratuit encore valide (statut trialing ET date de fin non dépassée)
export function isTrialActive(sub: { status: string; trial_ends_at: string | null }): boolean {
  return (
    sub.status === 'trialing' &&
    (!sub.trial_ends_at || new Date(sub.trial_ends_at).getTime() > Date.now())
  )
}

export const AVATAR_COLORS = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#fee2e2', text: '#991b1b' },
]

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function formatCountdown(scheduledAt: string): string {
  const diff = new Date(scheduledAt).getTime() - Date.now()
  if (diff <= 0) return 'À publier'
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const remainM = m % 60
  if (h > 0) return `${h}h ${remainM}min`
  return `${m}min`
}

export const TONE_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  Professionnel: { border: '#34d399', text: '#0E9F6E', bg: 'rgba(52,211,153,0.1)' },
  Chaleureux: { border: '#f59e0b', text: '#B45309', bg: 'rgba(245,158,11,0.1)' },
  Empathique: { border: '#a78bfa', text: '#7C3AED', bg: 'rgba(167,139,250,0.1)' },
  Décontracté: { border: '#06b6d4', text: '#0E7490', bg: 'rgba(6,182,212,0.1)' },
}

export const STATIC_REPLIES: Record<string, Record<number, string>> = {
  Professionnel: {
    5: "Merci sincèrement pour ce témoignage élogieux. Votre satisfaction est notre priorité et nous sommes ravis d'avoir répondu à vos attentes. Nous espérons avoir le plaisir de vous accueillir à nouveau très prochainement.",
    4: "Merci pour ce retour constructif. Nous prenons note de vos remarques et mettons tout en œuvre pour améliorer encore votre expérience. Nous vous souhaitons de nous rendre visite à nouveau.",
    3: "Merci pour votre avis. Nous prenons note de vos observations et travaillons continuellement à améliorer nos services. N'hésitez pas à nous contacter directement pour que nous puissions vous apporter une réponse adaptée.",
    2: "Nous vous remercions d'avoir partagé votre expérience et nous sommes sincèrement désolés qu'elle n'ait pas été à la hauteur de vos attentes. Nous prenons vos remarques très au sérieux et souhaitons vous offrir une expérience bien meilleure à l'avenir.",
    1: "Merci de nous avoir communiqué votre expérience. Nous sommes vraiment désolés et souhaitons comprendre ce qui s'est passé pour y remédier. Pourriez-vous nous contacter directement afin que nous puissions trouver une solution ?",
  },
  Chaleureux: {
    5: "Merci beaucoup pour ce super retour ! 😊 Ça nous touche vraiment et ça motive toute l'équipe. On espère vous revoir très bientôt !",
    4: "Merci pour ce retour ! 😊 On est ravis que votre séjour/repas se soit bien passé. On prend note de vos suggestions pour faire encore mieux la prochaine fois !",
    3: "Merci pour votre retour honnête ! On est un peu déçus de ne pas avoir atteint toutes vos attentes, mais on prend ça à cœur. On vous promet de faire mieux !",
    2: "Merci de nous avoir dit ça, même si c'est difficile à entendre. 😔 On est vraiment désolés ! On aimerait beaucoup qu'on puisse en discuter pour arranger les choses.",
    1: "Merci d'avoir pris le temps de nous écrire, et on s'excuse sincèrement ! 😔 Ce n'est vraiment pas ce qu'on souhaitait pour vous. Est-ce qu'on peut vous recontacter pour arranger ça ?",
  },
  Empathique: {
    5: "Merci du fond du cœur pour ce témoignage. Savoir que votre expérience a été aussi positive nous touche profondément. Nous serons toujours là pour vous accueillir dans les meilleures conditions.",
    4: "Merci d'avoir pris le temps de partager votre vécu avec nous. Votre retour nous aide à nous améliorer et nous sommes heureux que l'essentiel ait répondu à vos attentes.",
    3: "Merci de nous avoir fait part de votre ressenti. Nous comprenons que votre expérience n'ait pas été parfaite et nous en sommes sincèrement désolés. Votre avis compte énormément pour nous.",
    2: "Nous sommes vraiment touchés — dans le mauvais sens du terme — d'apprendre que votre expérience a été décevante. Votre bien-être est notre priorité et nous souhaitons faire mieux pour vous.",
    1: "Votre expérience nous préoccupe profondément et nous vous présentons nos sincères excuses. Nous aimerions comprendre ce qui s'est passé pour ne pas laisser cette situation sans suite.",
  },
  Décontracté: {
    5: "Merci, ça fait vraiment plaisir ! 🙌 Content(e) que tout se soit bien passé. On se retrouve bientôt j'espère !",
    4: "Top, merci pour le retour ! On note vos remarques pour s'améliorer. À bientôt !",
    3: "Merci pour l'honnêteté ! On fait de notre mieux et on va bosser pour que la prochaine fois soit au top.",
    2: "Aïe, désolé pour ça ! Ce n'est vraiment pas ce qu'on voulait. On aimerait en parler avec vous pour arranger les choses.",
    1: "Désolé vraiment, ça ne devrait pas se passer comme ça. Contactez-nous, on va trouver une solution ensemble.",
  },
}
