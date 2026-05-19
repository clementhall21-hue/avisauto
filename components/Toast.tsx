'use client'

import * as ToastPrimitive from '@radix-ui/react-toast'
import { createContext, useContext, useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ToastData {
  message: string
  type?: 'success' | 'error' | 'info'
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<(ToastData & { id: number })[]>([])
  const [counter, setCounter] = useState(0)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = counter + 1
    setCounter(id)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastPrimitive.Provider swipeDirection="down">
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            open={true}
            onOpenChange={() => {}}
            className={cn(
              'fixed bottom-7 left-1/2 -translate-x-1/2 z-[999]',
              'flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl',
              'border text-sm font-medium',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[swipe=end]:animate-out data-[state=closed]:fade-out-80',
              'data-[state=closed]:slide-out-to-bottom-4',
              'data-[state=open]:slide-in-from-bottom-4',
              'transition-all duration-300',
              toast.type === 'error'
                ? 'bg-[#1a1015] border-[rgba(244,63,94,0.3)] text-[#f43f5e]'
                : toast.type === 'info'
                  ? 'bg-[#111827] border-[rgba(99,102,241,0.3)] text-[#818cf8]'
                  : 'bg-[#111827] border-[rgba(52,211,153,0.3)] text-[#34d399]'
            )}
          >
            <span>
              {toast.type === 'error' ? '✕' : toast.type === 'info' ? 'ℹ' : '✓'}
            </span>
            <ToastPrimitive.Title>{toast.message}</ToastPrimitive.Title>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 left-1/2 -translate-x-1/2 p-6 z-[1000] max-w-sm w-full" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
