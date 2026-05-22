'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface CheckoutButtonProps {
  plan?: 'starter' | 'pro'
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
  asLink?: boolean
}

export default function CheckoutButton({ plan = 'pro', className, style, children, asLink }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stripe/create-checkout?plan=${plan}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Stripe error:', data)
        alert(`Erreur : ${data.error || JSON.stringify(data)}`)
      }
    } catch (err) {
      console.error(err)
      alert('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const Tag = asLink ? 'a' : 'button'

  return (
    <Tag
      onClick={handleClick}
      className={className}
      style={{ cursor: loading ? 'wait' : 'pointer', ...style }}
    >
      {loading ? (
        <span className="flex items-center gap-2 justify-center">
          <Loader2 size={14} className="animate-spin" />
          Chargement…
        </span>
      ) : children}
    </Tag>
  )
}
