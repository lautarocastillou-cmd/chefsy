'use client'

import { use, useEffect, useState } from 'react'
import MapaSeguimiento from '@/components/ubicacion/MapaSeguimiento'
import { Pedido } from '@/tipos'
import Link from 'next/link'

export default function CadeteEnVivoPage({ params }: { params: Promise<{ id: string }> }) {
  // En Next.js 15+ params es una Promise — usar React.use() para leerlo
  const { id: pedidoId } = use(params)

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pedidoId) return
    let intervalo: NodeJS.Timeout

    const fetchUbicacion = async () => {
      try {
        const res = await fetch(`/api/public/rastreo?id=${pedidoId}`)
        const data = await res.json()
        
        if (!res.ok) throw new Error(data.error || 'Error al obtener la ubicación')
        
        // Mapear los datos públicos a un objeto parcial compatible con Pedido
        setPedido({
          id: data.id,
          cliente: data.cliente,
          estado: data.estado,
          cadete_nombre: data.cadete_nombre ?? null,
          cadete_coordenadas: data.cadete_coordenadas ?? null,
          coordenadas: data.destino_coordenadas ?? null,
          local_coordenadas: data.local_coordenadas ?? null,
          tipoEntrega: data.tipoEntrega ?? 'delivery',
          // Campos requeridos por el tipo Pedido pero irrelevantes acá
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

    // Actualizar ubicación cada 5 segundos si el pedido está activo
    intervalo = setInterval(() => {
      fetchUbicacion()
    }, 5000)

    return () => clearInterval(intervalo)
  }, [pedidoId])

  if (cargando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #2A6348 0%, #1e4a34 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p className="text-white/80 animate-pulse font-medium">Buscando tu pedido...</p>
      </div>
    )
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #2A6348 0%, #1e4a34 100%)' }}>
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Ups...</h1>
          <p className="text-gray-500 text-sm">{error || 'No se encontró el pedido.'}</p>
        </div>
      </div>
    )
  }

  // Vista según el estado del pedido
  const isTerminado = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
  const isEnPreparacion = pedido.estado === 'nuevo' || pedido.estado === 'en_cocina' || pedido.estado === 'listo'
  const isEnCamino = pedido.estado === 'en_camino'
  const tieneUbicacionCadete = !!(pedido as any).cadete_coordenadas

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 gap-5" style={{ background: 'linear-gradient(135deg, #2A6348 0%, #1e4a34 100%)' }}>

      {/* Header card */}
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl shrink-0" style={{ background: 'rgba(42,99,72,0.12)' }}>
            {isTerminado ? '🎉' : isEnPreparacion ? '🧑‍🍳' : '🛵'}
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-900 leading-tight text-base">
              {isTerminado ? '¡Pedido entregado!' : 
               isEnPreparacion ? 'Preparando tu pedido' : 
               '¡Tu pedido está en camino!'}
            </h1>
            <p className="text-sm font-medium truncate" style={{ color: '#2A6348' }}>
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
      </div>

      {/* Mapa cuadrado */}
      <div className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
        {tieneUbicacionCadete ? (
          <MapaSeguimiento pedido={pedido} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white p-6 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-4 shadow-lg ${isTerminado ? 'bg-green-50' : 'bg-orange-50'}`}>
              {isTerminado ? '🛍️' : '🔥'}
            </div>
            <h2 className="text-xl font-black text-gray-800 mb-2">
              {isTerminado ? '¡Que lo disfrutes!' : 'Cocinando con amor'}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-[200px]">
              {isTerminado 
                ? 'El pedido fue entregado. ¡Gracias por elegir Chefsy!' 
                : 'Te avisamos cuando el cadete salga a entregar.'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-white/40 text-xs font-semibold tracking-wider">Powered by Chefsy</p>
    </div>
  )
}
