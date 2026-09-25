'use client'

import { useEffect } from 'react'
import { Toaster, useToasterStore, toast } from 'react-hot-toast'

export default function ToasterProvider() {
  const { toasts } = useToasterStore()

  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= 3)
      .forEach((t) => toast.dismiss(t.id))
  }, [toasts])
  return (
    <Toaster
      position="bottom-center"
      gutter={10}
      containerStyle={{
        bottom: 84,
        zIndex: 9999999,
      }}
      toastOptions={{
        duration: 2800,
        style: {
          background: '#0f172a',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: '16px',
          padding: '11px 20px',
          fontSize: '13.5px',
          fontWeight: '600',
          textAlign: 'center',
          maxWidth: '92vw',
          lineHeight: '1.4',
          boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.7), 0 0 15px 0 rgba(0, 0, 0, 0.4)',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
        },
      }}
    />
  )
}
