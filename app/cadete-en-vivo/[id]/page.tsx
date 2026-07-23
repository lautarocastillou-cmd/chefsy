'use client'

import { use, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Pedido } from '@/tipos'
import { supabaseAnon } from '@/lib/supabase'
import { limpiarPedidoActivo, guardarPedidoActivo } from '@/components/tienda/BotonPedidoFlotante'
import { 
  Flame, 
  UtensilsCrossed, 
  Bike, 
  CheckCircle2, 
  ShoppingBag, 
  WifiOff, 
  AlertCircle, 
  ArrowLeft,
  Package,
} from 'lucide-react'

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

// ── Etiqueta de estado ────────────────────────────────────────────────────────
function EtiquetaEstado({ estado }: { estado: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    nuevo:       { label: 'Recibido',     cls: 'bg-blue-100 text-blue-700' },
    en_cocina:   { label: 'En cocina',    cls: 'bg-amber-100 text-amber-700' },
    listo:       { label: 'Listo',        cls: 'bg-emerald-100 text-emerald-700' },
    en_camino:   { label: 'En camino',    cls: 'bg-green-100 text-green-700' },
    entregado:   { label: 'Entregado',    cls: 'bg-gray-100 text-gray-500' },
    cancelado:   { label: 'Cancelado',    cls: 'bg-red-100 text-red-600' },
  }
  const cfg = configs[estado] || { label: estado, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── Mini resumen de productos de un pedido ────────────────────────────────────
function ResumenProductos({ productos }: { productos: any[] }) {
  if (!productos || productos.length === 0) return null
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
      {productos.map((prod: any, i: number) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <span className="font-black text-[#2A6348] shrink-0 mt-0.5">{prod.cantidad}×</span>
          <span className="text-gray-700 leading-snug">{prod.nombre}</span>
        </div>
      ))}
    </div>
  )
}

// ── Tarjeta de pedido relacionado (apilada) ───────────────────────────────────
function TarjetaPedidoRelacionado({ pedido, index }: { pedido: any; index: number }) {
  const offsetY  = (index + 1) * 10  // desplazamiento vertical
  const scale    = 1 - (index + 1) * 0.035  // escala ligeramente menor
  const opacity  = 1 - (index + 1) * 0.15   // un poco más transparente

  return (
    <div
      className="absolute inset-x-0 top-0 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-4 pointer-events-none"
      style={{
        transform: `translateY(${offsetY}px) scale(${scale})`,
        opacity,
        zIndex: -(index + 1),
        transformOrigin: 'top center',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-gray-400 shrink-0" />
          <span className="text-xs font-bold text-gray-600">
            Pedido adicional
          </span>
        </div>
        <EtiquetaEstado estado={pedido.estado} />
      </div>
      <ResumenProductos productos={pedido.productos || []} />
    </div>
  )
}

export default function CadeteEnVivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: pedidoId } = use(params)

  const [pedido, setPedido]   = useState<Pedido | null>(null)
  const [productos, setProductos] = useState<any[]>([])
  const [pedidosRelacionados, setPedidosRelacionados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]     = useState<string | null>(null)

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
        setProductos(data.productos || [])
        setPedidosRelacionados(data.pedidos_relacionados || [])

        // Sincronizar estado del pedido activo en localStorage
        if (data.estado === 'entregado' || data.estado === 'cancelado') {
          limpiarPedidoActivo()
        } else {
          guardarPedidoActivo({
            id: data.id,
            clienteNombre: data.cliente,
            tipoEntrega: data.tipoEntrega ?? 'delivery',
            estado: data.estado,
          })
        }
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
          fetchUbicacion()
        }
      )
      .subscribe()

    // Polling de respaldo (cada 15s)
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
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-xs w-full flex flex-col items-center gap-3">
          <AlertCircle size={44} className="text-amber-500" />
          <h1 className="text-lg font-bold text-gray-800">Ups...</h1>
          <p className="text-gray-500 text-sm">{error || 'No se encontró el pedido.'}</p>
          <a
            href="https://chefsy.xyz/"
            className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#2A6348] hover:underline"
          >
            <ArrowLeft size={14} />
            <span>Volver a la tienda</span>
          </a>
        </div>
      </div>
    )
  }

  const isTerminado     = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
  const isEnPreparacion = pedido.estado === 'nuevo' || pedido.estado === 'en_cocina' || pedido.estado === 'listo'
  const isEnCamino      = pedido.estado === 'en_camino'
  const tieneUbicacion  = !!(pedido as any).cadete_coordenadas
  const gpsApagado      = (pedido as any).cadete_gps_activo === false && isEnCamino

  // ── Bloque del mapa / estado visual ──────────────────────────────────────────
  const bloqueContenido = gpsApagado ? (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white text-center p-6">
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-lg bg-red-50">
        <WifiOff size={40} className="text-red-500" />
      </div>
      <h2 className="text-lg font-black text-gray-800 mb-2">Señal GPS perdida</h2>
      <p className="text-gray-500 text-sm leading-relaxed max-w-[220px]">
        El cadete está con el GPS apagado o sin señal. De todas formas, tu pedido sigue en camino.
      </p>
    </div>
  ) : tieneUbicacion ? (
    <MapaSeguimiento pedido={pedido} />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white text-center p-6">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-lg ${isTerminado ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        {isTerminado ? (
          <ShoppingBag size={42} className="text-emerald-600" />
        ) : (
          <Flame size={42} className="text-amber-500 animate-pulse" />
        )}
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

  // ── Header del pedido principal con productos ─────────────────────────────────
  const headerInfo = (
    <>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(42,99,72,0.12)' }}>
          {isTerminado ? (
            <CheckCircle2 size={24} className="text-emerald-600" />
          ) : isEnPreparacion ? (
            <UtensilsCrossed size={24} className="text-amber-600" />
          ) : (
            <Bike size={24} className="text-emerald-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-gray-900 text-base leading-tight">
              {isTerminado ? '¡Pedido entregado!' : isEnPreparacion ? 'Preparando tu pedido' : '¡Tu pedido está en camino!'}
            </h1>
            <EtiquetaEstado estado={pedido.estado} />
          </div>
          <p className="text-sm font-semibold truncate" style={{ color: '#2A6348' }}>
            Para {pedido.cliente.split(' ')[0]}
          </p>
        </div>
      </div>

      {/* Resumen de productos del pedido principal */}
      <ResumenProductos productos={productos} />

      {/* Cadete asignado */}
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

  // ── Header con stack de pedidos relacionados ──────────────────────────────────
  const headerConStack = (
    <div
      className="relative"
      style={{
        // Espacio extra abajo para que las tarjetas apiladas no se superpongan al siguiente elemento
        marginBottom: pedidosRelacionados.length > 0 ? `${pedidosRelacionados.length * 10}px` : undefined,
      }}
    >
      {/* Tarjetas de fondo apiladas (de atrás hacia adelante) */}
      {pedidosRelacionados.map((rel, i) => (
        <TarjetaPedidoRelacionado key={rel.id} pedido={rel} index={i} />
      ))}

      {/* Tarjeta principal (al frente) */}
      <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-4">
        {headerInfo}
      </div>
    </div>
  )

  const footerBloque = (
    <div className="flex flex-col items-center gap-2 pt-2 pb-4">
      <a
        href="https://chefsy.xyz/"
        className="inline-flex items-center gap-2 text-white/90 hover:text-white text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/20 transition-all backdrop-blur-md shadow-lg active:scale-95"
      >
        <ArrowLeft size={14} />
        <span>Volver a la tienda</span>
      </a>
      <p className="text-center text-white/30 text-xs font-semibold tracking-wider">Powered by Chefsy</p>
    </div>
  )

  return (
    <>
      {/* ══ MOBILE (< md) ══════════════════════════════════════════ */}
      <div className="md:hidden min-h-screen flex flex-col" style={{ background: BG }}>
        {/* Header superpuesto con stack */}
        <div className="z-50 px-4 pt-5 pb-3">
          {headerConStack}
        </div>

        {/* Mapa: ocupa todo lo que queda */}
        <div className="flex-1 px-4 pb-4 flex flex-col">
          <div className="flex-1 relative w-full min-h-[60vh] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
            {bloqueContenido}
          </div>
        </div>

        {footerBloque}
      </div>

      {/* ══ DESKTOP (≥ md) ════════════════════════════════════════ */}
      <div className="hidden md:flex min-h-screen flex-col items-center justify-center px-8 py-10 gap-6" style={{ background: BG }}>
        <div className="w-full max-w-xl flex flex-col gap-5">
          {headerConStack}

          {/* Mapa rectangular más grande en desktop */}
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20" style={{ height: '480px' }}>
            {bloqueContenido}
          </div>
        </div>

        {footerBloque}
      </div>
    </>
  )
}
