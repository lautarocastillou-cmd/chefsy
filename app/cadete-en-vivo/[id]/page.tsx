'use client'

import { useEffect, useState } from 'react'
import MapaSeguimiento from '@/components/ubicacion/MapaSeguimiento'
import { Pedido } from '@/tipos'
import Link from 'next/link'

export default function CadeteEnVivoPage({ params }: { params: { id: string } }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let intervalo: NodeJS.Timeout

    const fetchUbicacion = async () => {
      try {
        const res = await fetch(`/api/public/rastreo?id=${params.id}`)
        const data = await res.json()
        
        if (!res.ok) throw new Error(data.error || 'Error al obtener la ubicación')
        
        // Mapear los datos públicos a un objeto parcial compatible con Pedido
        setPedido({
          ...data,
          // Rellenamos campos requeridos por el tipo Pedido pero irrelevantes acá
          productos: [], 
          total: 0,
          metodoPago: 'efectivo',
          telefono: '',
          direccion: '',
          tipoEntrega: data.tipoEntrega,
          coordenadas: data.destino_coordenadas,
          // cadete_coordenadas ya viene en data si está en camino
        } as Pedido)

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
  }, [params.id])

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-gray-500 animate-pulse font-medium">Buscando tu pedido...</p>
      </div>
    )
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-gray-100">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Ups...</h1>
          <p className="text-gray-500">{error || 'No se encontró el pedido.'}</p>
        </div>
      </div>
    )
  }

  // Vista según el estado del pedido
  const isTerminado = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
  const isEnPreparacion = pedido.estado === 'nuevo' || pedido.estado === 'en_cocina' || pedido.estado === 'listo'
  const isEnCamino = pedido.estado === 'en_camino'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Header flotante */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-4 pointer-events-auto max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-xl shrink-0">
              {isTerminado ? '🎉' : isEnPreparacion ? '🧑‍🍳' : '🛵'}
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">
                {isTerminado ? '¡Pedido entregado!' : 
                 isEnPreparacion ? 'Preparando tu pedido' : 
                 '¡Tu pedido está en camino!'}
              </h1>
              <p className="text-sm text-gray-500 font-medium truncate">
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
      </div>

      {/* Contenido principal (Mapa o Estado visual) */}
      <div className="flex-1 w-full relative">
        {isEnCamino ? (
          <div className="absolute inset-0">
            <MapaSeguimiento pedido={pedido} />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl mb-6 shadow-xl ${isTerminado ? 'bg-green-50 shadow-green-100' : 'bg-orange-50 shadow-orange-100'}`}>
              {isTerminado ? '🛍️' : '🔥'}
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2 text-center">
              {isTerminado ? '¡Que lo disfrutes!' : 'Cocinando con amor'}
            </h2>
            <p className="text-gray-500 text-center max-w-xs leading-relaxed">
              {isTerminado 
                ? 'El pedido ya fue entregado en tu domicilio. Gracias por elegir Chefsy.' 
                : 'Nuestro equipo está preparando todo. Apenas salga el cadete, vas a poder rastrearlo en vivo por acá.'}
            </p>
          </div>
        )}
      </div>

      {/* Footer Powered By */}
      <div className="absolute bottom-4 left-0 right-0 z-50 text-center pointer-events-none">
        <span className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-gray-400 shadow-sm">
          Powered by Chefsy
        </span>
      </div>
    </div>
  )
}
