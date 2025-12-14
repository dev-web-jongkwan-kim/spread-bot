import { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

export function ToastItem({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, toast.duration || 3000) // 기본 3초

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  }

  const colors = {
    success: 'bg-teal-900/50 border-teal-700/50 text-teal-200',
    error: 'bg-red-900/50 border-red-700/50 text-red-200',
    info: 'bg-blue-900/50 border-blue-700/50 text-blue-200',
    warning: 'bg-amber-900/50 border-amber-700/50 text-amber-200',
  }

  const iconColors = {
    success: 'text-teal-400',
    error: 'text-red-400',
    info: 'text-blue-400',
    warning: 'text-amber-400',
  }

  const Icon = icons[toast.type]

  return (
    <div
      className={`card p-4 border-2 ${colors[toast.type]} shadow-lg min-w-[300px] max-w-md animate-slide-up flex items-start gap-3`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${iconColors[toast.type]} mt-0.5`} />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-h-[80vh] overflow-y-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}


