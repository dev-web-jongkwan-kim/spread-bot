import { createContext, useContext, useState, ReactNode } from 'react'
import Modal, { ModalProps } from '../components/Modal'

interface ModalContextType {
  showModal: (props: Omit<ModalProps, 'isOpen' | 'onClose'>) => Promise<boolean>
  showConfirm: (message: string, title?: string) => Promise<boolean>
  showAlert: (message: string, type?: 'info' | 'success' | 'warning' | 'error', title?: string) => Promise<void>
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalProps & { isOpen: boolean } | null>(null)

  const showModal = (props: Omit<ModalProps, 'isOpen' | 'onClose'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({
        ...props,
        isOpen: true,
        onClose: () => {
          setModal(null)
          resolve(false)
        },
        onConfirm: () => {
          resolve(true)
        },
        onCancel: () => {
          resolve(false)
        },
      })
    })
  }

  const showConfirm = (message: string, title?: string): Promise<boolean> => {
    return showModal({
      message,
      title: title || 'Confirm',
      type: 'confirm',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
    })
  }

  const showAlert = (
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    title?: string,
  ): Promise<void> => {
    return new Promise((resolve) => {
      setModal({
        message,
        title,
        type,
        isOpen: true,
        onClose: () => {
          setModal(null)
          resolve()
        },
      })
    })
  }

  return (
    <ModalContext.Provider value={{ showModal, showConfirm, showAlert }}>
      {children}
      {modal && <Modal {...modal} />}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within ModalProvider')
  }
  return context
}

