'use client'

import { Toaster } from 'react-hot-toast'

export default function ToasterProvider() {
  return (
    <Toaster
      position="bottom-center"
      gutter={8}
      containerStyle={{
        bottom: 36,
        left: 0,
        right: 0,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 999999,
      }}
      toastOptions={{
        duration: 2200,
        style: {
          background: '#0b1120',
          color: '#f8fafc',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: '9999px',
          padding: '10px 22px',
          fontSize: '13px',
          fontWeight: '600',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          margin: '0 auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
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
