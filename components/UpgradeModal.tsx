'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import CheckoutButton from './CheckoutButton'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  feature: string
}

const PRO_BENEFITS = [
  'Réponses IA illimitées',
  '4 tons IA (Professionnel, Chaleureux, Empathique, Décontracté)',
  'Mode automatique avec délai configurable',
  'Analytiques & insights complets',
  'Analyse des avis négatifs par IA',
  'Support prioritaire 7j/7',
]

export default function UpgradeModal({ open, onClose, feature }: UpgradeModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[calc(100vw-32px)] max-w-[440px] bg-white border border-[rgba(228,87,46,0.3)] rounded-2xl p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-y-auto max-h-[90vh]">
          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-[#666A72] hover:text-[#17181C] transition-colors" aria-label="Fermer">
              <X size={18} />
            </button>
          </Dialog.Close>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(228,87,46,0.12)] border border-[rgba(228,87,46,0.3)] text-2xl mb-4">
              ✨
            </div>
            <Dialog.Title className="text-xl font-bold text-[#17181C] mb-2">
              Fonctionnalité Pro
            </Dialog.Title>
            <Dialog.Description className="text-[#666A72] text-sm leading-relaxed">
              <span className="text-[#17181C] font-medium">{feature}</span> est disponible avec le plan Pro.
            </Dialog.Description>
          </div>

          <ul className="space-y-2 mb-7">
            {PRO_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5 text-sm text-[#666A72]">
                <span className="text-[#C2481F] font-bold flex-shrink-0">✓</span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <CheckoutButton
              plan="pro"
              className="w-full py-3.5 rounded-[10px] font-bold text-[0.95rem] text-center transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(228,87,46,0.4)] text-white"
              style={{ background: '#E4572E' }}
            >
              Passer au Pro — 79€/mois →
            </CheckoutButton>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-[10px] font-medium text-[0.9rem] text-[#666A72] hover:text-[#17181C] transition-colors border border-[#ECECEA] hover:border-[#D9D9D7] bg-transparent"
            >
              Fermer
            </button>
          </div>

          <p className="text-center text-xs text-[#666A72] mt-3">14 jours d&apos;essai gratuit inclus</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
