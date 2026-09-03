'use client'

import { Toaster } from 'react-hot-toast'

export default function ToasterProvider() {
  return (
    <Toaster
      position="bottom-center"
      gutter={8}
      containerStyle={{
        bottom: 36,
        zIndex: 9999999,
      }}
      toastOptions={{
        duration: 2200,
        style: {
          background: '#0f172a',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '9999px',
          padding: '10px 24px',
          fontSize: '13.5px',
          fontWeight: '600',
          textAlign: 'center',
          maxWidth: '90vw',
          whiteSpace: 'nowrap',
          boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.7), 0 0 15px 0 rgba(0, 0, 0, 0.4)',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff',
          },
        },
      }}
    />
  )
}
