'use client'

import { useState, useEffect } from 'react'
import { Toaster, useToasterStore, toast } from 'react-hot-toast'
import ChefsyToast from './ChefsyToast'

export default function ToasterProvider() {
  const [montado, setMontado] = useState(false)
  const { toasts } = useToasterStore()

  useEffect(() => {
    setMontado(true)
  }, [])

  // Nunca más de 3 avisos apilados: los viejos se van con la animación corta.
  useEffect(() => {
    if (!montado) return
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= 3)
      .forEach((t) => toast.dismiss(t.id))
  }, [toasts, montado])

  if (!montado) return null

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
        // La salida dura 120 ms (ver globals.css). Este margen deja que se
        // pinte completa antes de desmontar el nodo.
        removeDelay: 140,
      }}
    >
      {(t) => <ChefsyToast toast={t} />}
    </Toaster>
  )
}
