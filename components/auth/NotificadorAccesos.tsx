'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ShieldAlert, Check, X } from 'lucide-react'

interface Peticion {
  clientId: string
  timestamp: number
}

export default function NotificadorAccesos() {
  const [peticiones, setPeticiones] = useState<Peticion[]>([])

  useEffect(() => {
    const channel = supabase.channel('canal_autorizaciones')

    channel
      .on('broadcast', { event: 'peticion_acceso' }, (payload) => {
        const data = payload.payload as Peticion
        setPeticiones(prev => {
          // Si ya existe, actualizamos el timestamp
          const index = prev.findIndex(p => p.clientId === data.clientId)
          if (index > -1) {
            const nuevas = [...prev]
            nuevas[index].timestamp = data.timestamp
            return nuevas
          }
          return [...prev, data]
        })
      })
      .subscribe()

    // Limpiar peticiones viejas (si pasaron más de 10 segundos sin ping, asumimos que se fue)
    const intervalLimpieza = setInterval(() => {
      setPeticiones(prev => prev.filter(p => Date.now() - p.timestamp < 10000))
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(intervalLimpieza)
    }
  }, [])

  const responder = async (clientId: string, estado: 'aprobado' | 'rechazado') => {
    const channel = supabase.channel('canal_autorizaciones')
    await channel.send({
      type: 'broadcast',
      event: `respuesta_${clientId}`,
      payload: { estado }
    })
    
    // Remover de la lista local
    setPeticiones(prev => prev.filter(p => p.clientId !== clientId))
  }

  if (peticiones.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full">
      {peticiones.map(pet => (
        <div key={pet.clientId} className="bg-slate-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10 rounded-2xl p-4 flex flex-col gap-3 animate-in slide-in-from-right fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="bg-amber-500/20 p-2 rounded-xl text-amber-500 shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Intento de Acceso</h4>
              <p className="text-slate-400 text-xs mt-0.5">Alguien quiere entrar al panel. Si no sos vos o un empleado, rechazalo.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => responder(pet.clientId, 'rechazado')}
              className="flex-1 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/50 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <X size={14} /> Denegar
            </button>
            <button
              onClick={() => responder(pet.clientId, 'aprobado')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Check size={14} /> Permitir
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
