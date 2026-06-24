'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LoginPage from './LoginPage'

export default function VerificadorLogin() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [estado, setEstado] = useState<'esperando' | 'aprobado' | 'rechazado'>('esperando')
  const [clientId] = useState(() => Math.random().toString(36).substring(2, 15) + Date.now().toString(36))
  
  const accesoSecreto = searchParams.get('acceso')

  useEffect(() => {
    // Si usó el link secreto o ya está aprobado o rechazado, no hacer nada
    if (accesoSecreto === 'coquisan' || estado === 'aprobado' || estado === 'rechazado') return

    const channel = supabase.channel('canal_autorizaciones')
    let interval: NodeJS.Timeout

    channel
      .on('broadcast', { event: `respuesta_${clientId}` }, (payload) => {
        if (payload.payload.estado === 'aprobado') {
          setEstado('aprobado')
        } else {
          setEstado('rechazado')
          router.push('/')
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Enviar ping cada 3 segundos para que los admins online lo vean
          interval = setInterval(() => {
            channel.send({
              type: 'broadcast',
              event: 'peticion_acceso',
              payload: { clientId, timestamp: Date.now() }
            })
          }, 3000)
        }
      })

    return () => {
      if (interval) clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [clientId, accesoSecreto, estado, router])

  // Si tiene el acceso secreto o el admin lo aprobó
  if (accesoSecreto === 'coquisan' || estado === 'aprobado') {
    return <LoginPage />
  }

  // Falso 404
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0d] text-white p-4 font-sans">
      <h1 className="text-[10rem] font-bebas leading-none tracking-wider text-slate-800 select-none">404</h1>
      <p className="text-xl text-slate-500 font-medium mb-8 text-center uppercase tracking-widest select-none">
        Not Found
      </p>
      <button 
        onClick={() => router.push('/')}
        className="px-6 py-3 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-semibold tracking-wide text-sm"
      >
        VOLVER A LA TIENDA
      </button>
    </div>
  )
}
