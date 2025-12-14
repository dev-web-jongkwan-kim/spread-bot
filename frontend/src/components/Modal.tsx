import { useEffect, ReactNode } from 'react'
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm'
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  children?: ReactNode
}

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  confirm: AlertCircle,
}

const colorMap = {
  info: 'text-teal-400',
  success: 'text-teal-400',
  warning: 'text-amber-400',
  error: 'text-coral-400',
  confirm: 'text-teal-400',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  children,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const Icon = iconMap[type]
  const iconColor = colorMap[type]

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div className="relative bg-neutral-800 rounded-2xl shadow-soft-xl border border-neutral-700/50 max-w-md w-full animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-neutral-700/50">
          <div className="flex items-start gap-4 flex-1">
            <div className={`flex-shrink-0 ${iconColor}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-neutral-50 mb-1">
                  {title}
                </h3>
              )}
              <p className="text-sm text-neutral-300">{message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {children && <div className="p-6">{children}</div>}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-700/50">
          {type === 'confirm' && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={type === 'confirm' ? handleConfirm : onClose}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              type === 'confirm'
                ? 'bg-teal-600 hover:bg-teal-500 text-white hover:scale-105 active:scale-95'
                : type === 'error'
                ? 'bg-coral-600 hover:bg-coral-500 text-white'
                : type === 'success'
                ? 'bg-teal-500 hover:bg-teal-400 text-white'
                : 'bg-teal-700 hover:bg-teal-600 text-white'
            }`}
          >
            {type === 'confirm' ? confirmText : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}

