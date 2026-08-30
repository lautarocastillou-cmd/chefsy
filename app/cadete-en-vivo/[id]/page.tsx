'use client'

import { use, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Pedido } from '@/tipos'
import { supabaseAnon } from '@/lib/supabase'
import { limpiarPedidoActivo, guardarPedidoActivo, leerTodosPedidosActivos } from '@/components/tienda/BotonPedidoFlotante'
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

const MapaSeguimiento = dynamic(
  () => import('@/components/ubicacion/MapaSeguimiento'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2A6348', borderTopColor: 'transparent' }} />
          <span className="text-xs text-slate-400 font-medium">Cargando mapa...</span>
        </div>
      </div>
    )
  }
)

const BG = 'linear-gradient(150deg, #2A6348 0%, #1a3d2e 100%)'

// ── Badge de estado ─────────────────────────────────────────────────────────
function EtiquetaEstado({ estado }: { estado: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    nuevo:     { label: 'Recibido',  cls: 'bg-blue-100 text-blue-700' },
    en_cocina: { label: 'En cocina', cls: 'bg-amber-100 text-amber-700' },
    listo:     { label: 'Listo',     cls: 'bg-emerald-100 text-emerald-700' },
    en_camino: { label: 'En camino', cls: 'bg-green-100 text-green-700' },
    entregado: { label: 'Entregado', cls: 'bg-gray-100 text-gray-500' },
    cancelado: { label: 'Cancelado', cls: 'bg-red-100 text-red-600' },
  }
  const c = cfg[estado] ?? { label: estado, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${c.cls}`}>
      {c.label}
    </span>
  )
}

// ── Lista de productos ──────────────────────────────────────────────────────
function ResumenProductos({ productos }: { productos: any[] }) {
  if (!productos || productos.length === 0) return null
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
      {productos.map((p: any, i: number) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <span className="font-black shrink-0 mt-0.5" style={{ color: '#2A6348' }}>{p.cantidad}×</span>
          <span className="text-gray-700 leading-snug">{p.nombre}</span>
        </div>
      ))}
    </div>
  )
}

// ── Tarjeta apilada de pedido adicional ─────────────────────────────────────
interface PedidoExtra { id: string; estado: string; productos: any[] }

function TarjetaApilada({ data, index }: { data: PedidoExtra; index: number }) {
  // Cada tarjeta está 12px más abajo y es ligeramente más pequeña
  const translateY = (index + 1) * 12
  const scale      = 1 - (index + 1) * 0.04
  const opacity    = 1 - (index + 1) * 0.18

  return (
    <div
      className="absolute inset-x-0 top-0 bg-white rounded-2xl border border-white/40 p-4 pointer-events-none shadow-md"
      style={{
        transform: `translateY(${translateY}px) scale(${scale})`,
        transformOrigin: 'top center',
        opacity,
        zIndex: 10 - (index + 1),
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-gray-400 shrink-0" />
          <span className="text-xs font-bold text-gray-500">Pedido adicional</span>
        </div>
        <EtiquetaEstado estado={data.estado} />
      </div>
      <ResumenProductos productos={data.productos} />
    </div>
  )
}

export default function CadeteEnVivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: pedidoId } = use(params)

  const [pedido, setPedido]           = useState<Pedido | null>(null)
  const [productos, setProductos]     = useState<any[]>([])
  const [pedidosExtra, setPedidosExtra] = useState<PedidoExtra[]>([])
  const [cargando, setCargando]       = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [cadeteOcupadoEnOtroViaje, setCadeteOcupadoEnOtroViaje] = useState(false)

  // ── Fetch del pedido principal ──────────────────────────────────────────────
  useEffect(() => {
    if (!pedidoId) return

    const fetchPrincipal = async () => {
      try {
        const res  = await fetch(`/api/public/rastreo?id=${pedidoId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al obtener el pedido')

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
        setCadeteOcupadoEnOtroViaje(Boolean(data.cadete_ocupado_en_otro_viaje))

        // Sincronizar localStorage
        if (data.estado === 'entregado' || data.estado === 'cancelado') {
          limpiarPedidoActivo(pedidoId)
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

    fetchPrincipal()

    const canal = supabaseAnon
      .channel(`rastreo-${pedidoId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoId}` }, fetchPrincipal)
      .subscribe()

    // Polling inteligente cada 5 segundos
    const intervalo = setInterval(fetchPrincipal, 5000)

    // Re-sincronizar al volver a la pestaña o recuperar conexión a internet
    const onReconectar = () => fetchPrincipal()
    window.addEventListener('online', onReconectar)
    window.addEventListener('focus', onReconectar)

    return () => {
      clearInterval(intervalo)
      window.removeEventListener('online', onReconectar)
      window.removeEventListener('focus', onReconectar)
      supabaseAnon.removeChannel(canal)
    }
  }, [pedidoId])

  // ── Fetch de los pedidos adicionales (desde localStorage) ───────────────────
  useEffect(() => {
    const cargarExtras = async () => {
      const todos = leerTodosPedidosActivos()
      const otros = todos.filter(p => p.id !== pedidoId)
      if (otros.length === 0) { setPedidosExtra([]); return }

      const resultados = await Promise.all(
        otros.map(async (p) => {
          try {
            const res  = await fetch(`/api/public/rastreo?id=${p.id}`)
            if (!res.ok) return null
            const data = await res.json()
            // Si está terminado, limpiar del localStorage
            if (data.estado === 'entregado' || data.estado === 'cancelado') {
              limpiarPedidoActivo(p.id)
              return null
            }
            return { id: data.id, estado: data.estado, productos: data.productos || [] }
          } catch { return null }
        })
      )
      setPedidosExtra(resultados.filter(Boolean) as PedidoExtra[])
    }

    // Cargar cuando montan y cada 20s
    cargarExtras()
    const t = setInterval(cargarExtras, 20000)
    return () => clearInterval(t)
  }, [pedidoId])

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (cargando) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: BG }}>
      <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      <p className="text-white/70 text-sm font-medium animate-pulse">Buscando tu pedido...</p>
    </div>
  )

  if (error || !pedido) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: BG }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-xs w-full flex flex-col items-center gap-3">
        <AlertCircle size={44} className="text-amber-500" />
        <h1 className="text-lg font-bold text-gray-800">Ups...</h1>
        <p className="text-gray-500 text-sm">{error || 'No se encontró el pedido.'}</p>
        <a href="https://chefsy.xyz/" className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#2A6348] hover:underline">
          <ArrowLeft size={14} /><span>Volver a la tienda</span>
        </a>
      </div>
    </div>
  )

  const isTerminado     = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
  const isEnPreparacion = ['nuevo', 'en_cocina', 'listo'].includes(pedido.estado)
  const isEnCamino      = pedido.estado === 'en_camino'
  const tieneUbicacion  = !!(pedido as any).cadete_coordenadas
  const gpsApagado      = (pedido as any).cadete_gps_activo === false && isEnCamino
  const cadeteNombre    = pedido.cadete_nombre || 'El cadete'

  // ── Mapa interactivo + Overlays contextuales en tiempo real ─────────────────
  const bloqueContenido = (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* El mapa siempre está presente y activo ocupando el 100% */}
      <MapaSeguimiento pedido={pedido} />

      {/* Overlay: Señal GPS pausada */}
      {gpsApagado && (
        <div className="absolute inset-x-3 top-3 z-[400] bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-xl border border-red-200 dark:border-red-900/50 flex items-center gap-2.5 animate-in slide-in-from-top-4">
          <WifiOff size={18} className="text-red-500 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {cadeteNombre} está en camino (señal GPS momentáneamente pausada).
          </span>
        </div>
      )}

      {/* Overlay: Cadete en viaje previo antes de salir con este pedido */}
      {cadeteOcupadoEnOtroViaje && !isEnCamino && (
        <div className="absolute inset-x-3 bottom-3 z-[400] bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-2xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <Bike size={22} className="animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-black text-amber-900 dark:text-amber-200">
              ¡{cadeteNombre} está completando una entrega cercana!
            </h3>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Tu pedido ya está listo. Apenas termine ese reparto, sale directo hacia tu casa.
            </p>
          </div>
        </div>
      )}

      {/* Overlay: Cocina / Preparación */}
      {isEnPreparacion && !cadeteOcupadoEnOtroViaje && (
        <div className="absolute inset-x-3 bottom-3 z-[400] bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Flame size={22} className="animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">
              {pedido.estado === 'listo' ? '¡Tu pedido ya está listo!' : 'Preparando tu pedido en cocina'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {pedido.estado === 'listo' 
                ? (pedido.cadete_nombre ? `${pedido.cadete_nombre} lo retirará en breve para el reparto.` : 'Esperando asignación de cadete para el despacho.')
                : 'Te avisaremos en vivo cuando el repartidor salga hacia tu domicilio.'}
            </p>
          </div>
        </div>
      )}

      {/* Overlay: Pedido Entregado */}
      {isTerminado && (
        <div className="absolute inset-x-3 bottom-3 z-[400] bg-emerald-600 text-white rounded-2xl p-3.5 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-black">¡Pedido entregado con éxito!</h3>
            <p className="text-[11px] text-emerald-100">¡Muchas gracias por elegir Chefsy! Que lo disfrutes.</p>
          </div>
        </div>
      )}
    </div>
  )

  // ── Header del pedido principal ─────────────────────────────────────────────
  const headerPrincipal = (
    <>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(42,99,72,0.12)' }}>
          {isTerminado     ? <CheckCircle2 size={24} className="text-emerald-600" />
           : isEnPreparacion ? <UtensilsCrossed size={24} className="text-amber-600" />
           : <Bike size={24} className="text-emerald-600" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-gray-900 text-base leading-tight">
              {isTerminado
                ? '¡Pedido entregado!'
                : isEnCamino
                ? `¡${cadeteNombre} está en camino a tu dirección!`
                : cadeteOcupadoEnOtroViaje
                ? `¡${cadeteNombre} está en otro viaje!`
                : isEnPreparacion
                ? 'Preparando tu pedido'
                : 'Procesando tu pedido'}
            </h1>
            <EtiquetaEstado estado={pedido.estado} />
          </div>
          <p className="text-sm font-semibold truncate" style={{ color: '#2A6348' }}>
            Para {pedido.cliente.split(' ')[0]}
          </p>
        </div>
      </div>

      {/* Productos */}
      <ResumenProductos productos={productos} />

      {/* Cadete asignado */}
      {pedido.cadete_nombre && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500">Cadete asignado:</span>
          <span className="text-xs font-bold text-[#2A6348] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
            <span>🛵</span>
            <span>{pedido.cadete_nombre}</span>
          </span>
        </div>
      )}
    </>
  )

  // ── Stack de tarjetas (principal + adicionales) ─────────────────────────────
  // El margen inferior evita que las tarjetas apiladas tapen el mapa
  const stackMarginBottom = pedidosExtra.length * 12

  const headerConStack = (
    <div className="relative" style={{ marginBottom: stackMarginBottom }}>
      {/* Tarjetas de fondo (de la más al fondo a la más cercana) */}
      {[...pedidosExtra].reverse().map((extra, i) => (
        <TarjetaApilada
          key={extra.id}
          data={extra}
          index={pedidosExtra.length - 1 - i}
        />
      ))}
      {/* Tarjeta principal encima */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-white/20 p-4" style={{ zIndex: 20 }}>
        {headerPrincipal}
      </div>
    </div>
  )

  const footerBloque = (
    <div className="flex flex-col items-center gap-2 pt-2 pb-4">
      <a
        href="https://chefsy.xyz/"
        className="inline-flex items-center gap-2 text-white/90 hover:text-white text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/20 transition-all shadow-lg active:scale-95 cursor-pointer"
      >
        <ArrowLeft size={14} /><span>Volver a la tienda</span>
      </a>
      <p className="text-center text-white/30 text-xs font-semibold tracking-wider">Powered by Chefsy</p>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-3 sm:p-5 md:py-8" style={{ background: BG }}>
      <div className="w-full max-w-xl flex flex-col gap-3 sm:gap-4 flex-1 h-full justify-between">
        {/* Tarjetas de información y estado */}
        <div className="z-20 w-full pt-1 sm:pt-0 shrink-0">
          {headerConStack}
        </div>

        {/* Contenedor adaptativo del Mapa interactivo (100% de alto y ancho) */}
        <div className="w-full flex-1 relative min-h-[360px] sm:min-h-[440px] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-100 dark:bg-slate-900">
          {bloqueContenido}
        </div>

        {/* Footer */}
        <div className="shrink-0">
          {footerBloque}
        </div>
      </div>
    </div>
  )
}
