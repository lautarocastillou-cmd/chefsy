'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, CheckCircle2, Truck } from 'lucide-react'

export default function RastreadorPedido() {
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const [notificacion, setNotificacion] = useState<{ id: number, texto: string } | null>(null)

  useEffect(() => {
    // Al cargar, buscamos si hay un pedido pendiente en localStorage
    const storedId = localStorage.getItem('chefsy_ultimo_pedido_id')
    if (storedId) {
      setPedidoId(storedId)
    }
  }, [])

  useEffect(() => {
    if (!pedidoId) return

    // Suscribirse a cambios en el pedido específico usando Realtime de Supabase
    const canal = supabase
      .channel(`rastreador-${pedidoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `id=eq.${pedidoId}`,
        },
        (payload: any) => {
          const newData = payload.new as { notificacion_manual?: string | null }
          
          if (newData && newData.notificacion_manual) {
            // El mensaje puede venir con un timestamp separado por '|' para forzar el evento UPDATE
            const textoReal = newData.notificacion_manual.split('|')[0]
            // Mostrar la notificación recibida
            setNotificacion({ id: Date.now(), texto: textoReal })
            
            // Opcional: auto-ocultar después de unos segundos
            // setTimeout(() => setNotificacion(null), 10000)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [pedidoId])

  if (!notificacion) return null

  const esEnCamino = notificacion.texto.toLowerCase().includes('camino')

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200/50 p-4 w-full max-w-sm pointer-events-auto animate-in slide-in-from-top-10 fade-in duration-500">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-inner ${esEnCamino ? 'bg-orange-100 text-orange-600' : 'bg-chefsy-100 text-chefsy-600'}`}>
            {esEnCamino ? <Truck size={24} /> : <CheckCircle2 size={24} />}
          </div>
          
          <div className="flex-1 pt-1">
            <h4 className="text-base font-black text-slate-800 mb-1">¡Aviso de tu pedido!</h4>
            <p className="text-sm font-medium text-slate-600 leading-snug">
              {notificacion.texto}
            </p>
          </div>

          <button 
            onClick={() => setNotificacion(null)}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
