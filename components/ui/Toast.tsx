'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { colors } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  function remove(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const iconMap = {
    success: <CheckCircle className="w-4 h-4" style={{ color: colors.success }} />,
    error: <AlertTriangle className="w-4 h-4" style={{ color: colors.danger }} />,
    info: <Info className="w-4 h-4" style={{ color: colors.info }} />,
  }

  const bgMap = {
    success: colors.successLight,
    error: colors.dangerLight,
    info: colors.infoLight,
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg min-w-[280px] max-w-sm',
              'animate-in slide-in-from-right duration-300'
            )}
            style={{ backgroundColor: bgMap[t.type], borderColor: `${colors.border}` }}
          >
            {iconMap[t.type]}
            <p className="text-sm font-medium text-[#1E293B] flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-[#94A3B8] hover:text-[#1E293B]">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
