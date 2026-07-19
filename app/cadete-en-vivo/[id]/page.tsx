'use client'

import { use, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Pedido } from '@/tipos'

import { supabaseAnon } from '@/lib/supabase'

// Leaflet pesa ~150KB — cargarlo de forma lazy para no bloquear el render inicial
const MapaSeguimiento = dynamic(
  () => import('@/components/ubicacion/MapaSeguimiento'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-chefsy border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2A6348', borderTopColor: 'transparent' }} />
          <span className="text-xs text-slate-400 font-medium">Cargando mapa...</span>
        </div>
      </div>
    )
  }
)

const BG = 'linear-gradient(150deg, #2A6348 0%, #1a3d2e 100%)'

export default function CadeteEnVivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: pedidoId } = use(params)

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pedidoId) return

    const fetchUbicacion = async () => {
      try {
        const res = await fetch(`/api/public/rastreo?id=${pedidoId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al obtener la ubicación')
        setPedido({
          id: data.id,
          cliente: data.cliente,
          estado: data.estado,
          cadete_nombre: data.cadete_nombre ?? null,
          cadete_coordenadas: data.cadete_coordenadas ?? null,
          coordenadas: data.destino_coordenadas ?? null,
          local_coordenadas: data.local_coordenadas ?? null,
          tipoEntrega: data.tipoEntrega ?? 'delivery',
          productos: [],
          total: 0,
          metodoPago: 'efectivo',
          telefono: '',
          direccion: '',
        } as unknown as Pedido)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setCargando(false)
      }
    }

    fetchUbicacion()
    
    // Suscripción en tiempo real a Supabase para actualización instantánea
    const canal = supabaseAnon
      .channel(`public-rastreo-${pedidoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `id=eq.${pedidoId}`,
        },
        () => {
          fetchUbicacion() // Si hay un cambio en el pedido, pedimos los datos actualizados
        }
      )
      .subscribe()

    // Polling de respaldo (cada 15s) por si los WebSockets de Supabase se duermen o fallan
    const intervalo = setInterval(fetchUbicacion, 15000)
    
    return () => {
      clearInterval(intervalo)
      supabaseAnon.removeChannel(canal)
    }
  }, [pedidoId])

  if (cargando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: BG }}>
        <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        <p className="text-white/70 text-sm font-medium animate-pulse">Buscando tu pedido...</p>
      </div>
    )
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: BG }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-xs w-full">
          <div className="text-5xl mb-3">😕</div>
          <h1 className="text-lg font-bold text-gray-800 mb-1">Ups...</h1>
          <p className="text-gray-500 text-sm">{error || 'No se encontró el pedido.'}</p>
        </div>
      </div>
    )
  }

  const isTerminado   = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
  const isEnPreparacion = pedido.estado === 'nuevo' || pedido.estado === 'en_cocina' || pedido.estado === 'listo'
  const isEnCamino    = pedido.estado === 'en_camino'
  const tieneUbicacion = !!(pedido as any).cadete_coordenadas
  const gpsApagado = (pedido as any).cadete_gps_activo === false && isEnCamino

  // ── Bloque del mapa / estado visual ──────────────────────────
  const bloqueContenido = gpsApagado ? (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white text-center p-6">
      <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-4 shadow-lg bg-red-50">
        📍
      </div>
      <h2 className="text-lg font-black text-gray-800 mb-2">
        Señal GPS perdida
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed max-w-[220px]">
        El cadete está con el GPS apagado o sin señal. De todas formas, tu pedido sigue en camino.
      </p>
    </div>
  ) : tieneUbicacion ? (
    <MapaSeguimiento pedido={pedido} />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white text-center p-6">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-4 shadow-lg ${isTerminado ? 'bg-green-50' : 'bg-orange-50'}`}>
        {isTerminado ? '🛍️' : '🔥'}
      </div>
      <h2 className="text-lg font-black text-gray-800 mb-2">
        {isTerminado ? '¡Que lo disfrutes!' : 'Cocinando con amor'}
      </h2>
      <p className="text-gray-400 text-sm leading-relaxed max-w-[220px]">
        {isTerminado
          ? 'El pedido fue entregado. ¡Gracias por elegir Chefsy!'
          : 'Te avisamos cuando el cadete salga a entregar.'}
      </p>
    </div>
  )

  // ── Header info ───────────────────────────────────────────────
  const headerInfo = (
    <>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl shrink-0"
          style={{ background: 'rgba(42,99,72,0.12)' }}>
          {isTerminado ? '🎉' : isEnPreparacion ? '🧑‍🍳' : '🛵'}
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-gray-900 text-base leading-tight">
            {isTerminado ? '¡Pedido entregado!' : isEnPreparacion ? 'Preparando tu pedido' : '¡Tu pedido está en camino!'}
          </h1>
          <p className="text-sm font-semibold truncate" style={{ color: '#2A6348' }}>
            Para {pedido.cliente.split(' ')[0]}
          </p>
        </div>
      </div>
      {isEnCamino && pedido.cadete_nombre && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">Cadete asignado:</span>
          <span className="text-sm font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-md">
            {pedido.cadete_nombre}
          </span>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* ══ MOBILE (< md) ══════════════════════════════════════════ */}
      <div className="md:hidden min-h-screen flex flex-col" style={{ background: BG }}>
        {/* Header superpuesto */}
        <div className="z-50 px-4 pt-5 pb-3">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-4">
            {headerInfo}
          </div>
        </div>

        {/* Mapa: ocupa todo lo que queda */}
        <div className="flex-1 px-4 pb-4 flex flex-col">
          <div className="flex-1 relative w-full min-h-[60vh] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
            {bloqueContenido}
          </div>
        </div>

        <p className="text-center text-white/30 text-xs font-semibold pb-4 tracking-wider">Powered by Chefsy</p>
      </div>

      {/* ══ DESKTOP (≥ md) ════════════════════════════════════════ */}
      <div className="hidden md:flex min-h-screen flex-col items-center justify-center px-8 py-10 gap-6" style={{ background: BG }}>
        <div className="w-full max-w-xl flex flex-col gap-5">
          {/* Header */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
            {headerInfo}
          </div>

          {/* Mapa rectangular más grande en desktop */}
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20" style={{ height: '480px' }}>
            {bloqueContenido}
          </div>
        </div>

        <p className="text-white/30 text-xs font-semibold tracking-wider">Powered by Chefsy</p>
      </div>
    </>
  )
}
