'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { usarTemaNotificacion } from '@/contexto/TemaNotificacionContexto'
import { usarAuth } from '@/contexto/AuthContexto'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function BotonNotificaciones() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [loading, setLoading] = useState(false)
  const { agregarNotificacion } = usarTemaNotificacion()
  const { usuarioActivo } = usarAuth()

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      // Check if already subscribed
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(subscription !== null)
        })
      })
    }
  }, [])

  const handleSubscribe = async () => {
    if (!usuarioActivo) {
      agregarNotificacion('Tenés que iniciar sesión para activar las notificaciones.', 'warning')
      return
    }

    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado.')
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        throw new Error('Clave VAPID pública no configurada.')
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      })

      // Send subscription to backend
      const res = await fetch('/api/webpush/suscribir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioActivo.usuario,
          subscription: subscription
        })
      })

      if (!res.ok) {
        throw new Error('Error al guardar la suscripción en el servidor.')
      }

      setIsSubscribed(true)
      agregarNotificacion('¡Notificaciones activadas correctamente!', 'success')
      
      // Test notification
      new Notification('¡Chefsy Cadetería!', {
        body: 'Las notificaciones están funcionando.',
        icon: '/icon-192x192.png'
      })

    } catch (error: any) {
      console.error('Error suscribiendo a notificaciones:', error)
      agregarNotificacion(error.message || 'Hubo un error al activar las notificaciones.', 'warning')
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={isSubscribed || loading}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
        isSubscribed 
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
          : 'bg-chefsy hover:bg-chefsy-700 text-white active:scale-95'
      }`}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isSubscribed ? (
        <Bell size={16} />
      ) : (
        <BellOff size={16} />
      )}
      {isSubscribed ? 'Notificaciones Activas' : 'Activar Notificaciones'}
    </button>
  )
}
