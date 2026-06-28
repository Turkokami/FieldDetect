'use client'

import * as Toast from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastMessage {
  id: string
  type: ToastType
  title: string
  description?: string
}

interface ToastContextType {
  toast: (message: Omit<ToastMessage, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within Toaster')
  return ctx
}

const typeStyles: Record<ToastType, string> = {
  success: 'border-l-4 border-green-500 bg-green-50',
  error: 'border-l-4 border-red-500 bg-red-50',
  info: 'border-l-4 border-blue-500 bg-blue-50',
  warning: 'border-l-4 border-yellow-500 bg-yellow-50',
}

const typeTitleStyles: Record<ToastType, string> = {
  success: 'text-green-800',
  error: 'text-red-800',
  info: 'text-blue-800',
  warning: 'text-yellow-800',
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2)
    setToasts((prev) => [...prev, { ...message, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const success = useCallback(
    (title: string, description?: string) => addToast({ type: 'success', title, description }),
    [addToast]
  )
  const error = useCallback(
    (title: string, description?: string) => addToast({ type: 'error', title, description }),
    [addToast]
  )
  const info = useCallback(
    (title: string, description?: string) => addToast({ type: 'info', title, description }),
    [addToast]
  )

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      <Toast.Provider swipeDirection="right">
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
          {toasts.map((t) => (
            <Toast.Root
              key={t.id}
              open={true}
              className={`rounded-lg p-4 shadow-lg ${typeStyles[t.type]} flex items-start justify-between gap-3`}
            >
              <div>
                <Toast.Title className={`text-sm font-semibold ${typeTitleStyles[t.type]}`}>
                  {t.title}
                </Toast.Title>
                {t.description && (
                  <Toast.Description className="text-xs text-gray-600 mt-0.5">
                    {t.description}
                  </Toast.Description>
                )}
              </div>
              <Toast.Close
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-gray-400 hover:text-gray-600 mt-0.5 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Toast.Close>
            </Toast.Root>
          ))}
        </div>
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}
