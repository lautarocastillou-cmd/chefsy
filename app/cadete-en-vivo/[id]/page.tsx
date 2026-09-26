'use client'

import { use, useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Pedido } from '@/tipos'
import { supabaseAnon } from '@/lib/supabase'
import { formatearPrecio } from '@/lib/utils'
import { resolverDireccionHumana, esEnlaceOCoordenadas } from '@/lib/ubicacion'
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
  MessageCircle,
  ChevronUp,
  ChevronDown,
  MapPin,
  CreditCard,
  FileText,
  DollarSign,
} from 'lucide-react'

const MapaSeguimiento = dynamic(
  () => import('@/components/ubicacion/MapaSeguimiento'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 animate-pulse">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-9 h-9 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <span className="text-xs text-emerald-400/90 font-semibold tracking-wide">Iniciando vista satelital en vivo...</span>
        </div>
      </div>
    )
  }
)

const WHATSAPP_NUMERO = '5493834225445'

// ── Badge de estado ─────────────────────────────────────────────────────────
function EtiquetaEstado({ estado }: { estado: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    nuevo:     { label: 'Recibido',     cls: 'bg-blue-950/80 text-blue-300 border border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.25)]' },
    en_cocina: { label: 'En cocina',    cls: 'bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]' },
    listo:     { label: 'Listo',        cls: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]' },
    en_camino: { label: 'En camino',    cls: 'bg-green-950/80 text-green-300 border border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.25)]' },
    entregado: { label: 'Entregado ✓',  cls: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]' },
    cancelado: { label: 'Cancelado',    cls: 'bg-rose-950/80 text-rose-300 border border-rose-500/40' },
  }
  const c = cfg[estado] ?? { label: estado, cls: 'bg-slate-800 text-slate-300 border border-slate-600' }
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
    <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
      {productos.map((p: any, i: number) => (
        <div key={i} className="flex items-start justify-between gap-2 text-xs">
          <div className="flex items-start gap-2 min-w-0">
            <span className="font-black shrink-0 mt-0.5 text-emerald-400">{p.cantidad}×</span>
            <span className="text-slate-200 leading-snug truncate">{p.nombre}</span>
          </div>
          {p.precio ? (
            <span className="text-emerald-400 font-mono text-[11px] shrink-0 font-bold">
              {formatearPrecio(p.precio * p.cantidad)}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

// ── Tarjeta apilada de pedido adicional ─────────────────────────────────────
interface PedidoExtra { id: string; estado: string; productos: any[] }

function TarjetaApilada({ data, index }: { data: PedidoExtra; index: number }) {
  const translateY = (index + 1) * 8
  const scale      = 1 - (index + 1) * 0.04
  const opacity    = 1 - (index + 1) * 0.25

  return (
    <div
      className="absolute inset-x-0 top-0 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-3 pointer-events-none shadow-2xl text-white"
      style={{
        transform: `translateY(${translateY}px) scale(${scale})`,
        transformOrigin: 'top center',
        opacity,
        zIndex: 10 - (index + 1),
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-300">Pedido adicional</span>
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
  const [paradasPrevias, setParadasPrevias] = useState(0)
  const [totalParadas, setTotalParadas]     = useState(1)
  const [paradaActual, setParadaActual]     = useState(1)
  const [esProximaEntrega, setEsProximaEntrega] = useState(true)
  const [bottomSheetAbierto, setBottomSheetAbierto] = useState(false)
  const [direccionLegible, setDireccionLegible] = useState<string>('')
  const fetchPrincipalRef = useRef<(() => void) | null>(null)
  const intervaloRef = useRef<NodeJS.Timeout | null>(null)

  // ── Resolver dirección legible humana si es un enlace o coordenadas ─────────
  useEffect(() => {
    if (!pedido?.direccion) {
      setDireccionLegible('')
      return
    }

    if (!esEnlaceOCoordenadas(pedido.direccion)) {
      setDireccionLegible(pedido.direccion)
      return
    }

    let cancelado = false
    resolverDireccionHumana(pedido.direccion, pedido.coordenadas).then((dir) => {
      if (!cancelado && dir) {
        setDireccionLegible(dir)
      }
    })

    return () => {
      cancelado = true
    }
  }, [pedido?.direccion, pedido?.coordenadas])

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
          telefono: data.telefono ?? '',
          estado: data.estado,
          cadete_nombre: data.cadete_nombre ?? null,
          cadete_coordenadas: (data.estado === 'entregado' || data.estado === 'cancelado') ? null : (data.cadete_coordenadas ?? null),
          cadete_volviendo_al_local: false,
          coordenadas: data.destino_coordenadas ?? null,
          local_coordenadas: data.local_coordenadas ?? null,
          tipoEntrega: data.tipoEntrega ?? 'delivery',
          productos: data.productos || [],
          total: data.total ?? 0,
          metodoPago: data.metodoPago ?? 'efectivo',
          direccion: data.direccion ?? '',
          observaciones: data.observaciones ?? '',
          costoEnvio: data.costoEnvio ?? 0,
          hora: data.hora ?? '',
          paradas_previas: (data.estado === 'entregado' || data.estado === 'cancelado') ? 0 : (data.paradas_previas ?? 0),
          total_paradas: (data.estado === 'entregado' || data.estado === 'cancelado') ? 1 : (data.total_paradas ?? 1),
          parada_actual: data.parada_actual ?? 1,
          es_proxima_entrega: (data.estado === 'entregado' || data.estado === 'cancelado') ? true : (data.es_proxima_entrega ?? true),
          itinerario_paradas: (data.estado === 'entregado' || data.estado === 'cancelado') ? [] : (data.itinerario_paradas ?? []),
        } as unknown as Pedido)
        setProductos(data.productos || [])
        setCadeteOcupadoEnOtroViaje(Boolean(data.cadete_ocupado_en_otro_viaje))
        setParadasPrevias(Number(data.paradas_previas ?? 0))
        setTotalParadas(Number(data.total_paradas ?? 1))
        setParadaActual(Number(data.parada_actual ?? 1))
        setEsProximaEntrega(Boolean(data.es_proxima_entrega ?? true))

        // Sincronizar localStorage y suspender polling si el pedido finalizó
        if (data.estado === 'entregado' || data.estado === 'cancelado') {
          limpiarPedidoActivo(pedidoId)
          if (intervaloRef.current) {
            clearInterval(intervaloRef.current)
            intervaloRef.current = null
          }
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

    fetchPrincipalRef.current = fetchPrincipal
    fetchPrincipal()

    const canal = supabaseAnon
      .channel(`rastreo-${pedidoId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoId}` }, fetchPrincipal)
      .subscribe()

    // Polling inteligente cada 4 segundos
    const intervalo = setInterval(fetchPrincipal, 4000)
    intervaloRef.current = intervalo

    const onReconectar = () => fetchPrincipal()
    window.addEventListener('online', onReconectar)
    window.addEventListener('focus', onReconectar)

    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current)
        intervaloRef.current = null
      }
      clearInterval(intervalo)
      window.removeEventListener('online', onReconectar)
      window.removeEventListener('focus', onReconectar)
      supabaseAnon.removeChannel(canal)
    }
  }, [pedidoId])

  // ── Suscripción en tiempo real al lote de pedidos del cadete ─────────────────
  // Si en /cadeteria se reordenan las posiciones (orden_entrega), este listener
  // detecta la actualización al instante y recalcula la ruta en el mapa en vivo.
  const nombreCadeteAsignado = (pedido?.estado === 'entregado' || pedido?.estado === 'cancelado')
    ? null
    : pedido?.cadete_nombre
  useEffect(() => {
    if (!nombreCadeteAsignado) return

    const canalCadete = supabaseAnon
      .channel(`cadete-recorrido-${nombreCadeteAsignado}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `cadete_nombre=eq.${nombreCadeteAsignado}`,
        },
        () => {
          fetchPrincipalRef.current?.()
        }
      )
      .subscribe()

    return () => {
      supabaseAnon.removeChannel(canalCadete)
    }
  }, [nombreCadeteAsignado])

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

    cargarExtras()
    const t = setInterval(cargarExtras, 20000)
    return () => clearInterval(t)
  }, [pedidoId])

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (cargando) return (
    <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-950 text-white z-50">
      <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
      <p className="text-white/70 text-sm font-medium animate-pulse">Buscando tu pedido...</p>
    </div>
  )

  if (error || !pedido) return (
    <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center p-6 bg-slate-950 text-white z-50">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center max-w-xs w-full flex flex-col items-center gap-3">
        <AlertCircle size={44} className="text-amber-500" />
        <h1 className="text-lg font-bold text-white">Ups...</h1>
        <p className="text-slate-400 text-sm">{error || 'No se encontró el pedido.'}</p>
        <a href="https://chefsy.xyz/" className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300">
          <ArrowLeft size={14} /><span>Volver a la tienda</span>
        </a>
      </div>
    </div>
  )

  const isTerminado     = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
  const isEnPreparacion = ['nuevo', 'en_cocina', 'listo'].includes(pedido.estado)
  const isEnCamino      = pedido.estado === 'en_camino'
  const gpsApagado      = (pedido as any).cadete_gps_activo === false && isEnCamino
  const cadeteNombre    = pedido.cadete_nombre || 'El cadete'

  const idCorto = pedidoId ? pedidoId.slice(0, 5).toUpperCase() : ''
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(`Hola! Tengo una consulta sobre mi pedido #${idCorto}`)}`

  // ── Mapa interactivo + Overlays contextuales en tiempo real ─────────────────
  const bloqueContenido = (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* El mapa siempre está presente y activo ocupando el 100% */}
      <MapaSeguimiento pedido={pedido} />

      {/* Overlay: Señal GPS pausada */}
      {gpsApagado && (
        <div className="absolute inset-x-3 top-24 sm:top-28 z-[400] max-w-md mx-auto bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-red-500/30 flex items-center gap-2.5 animate-in slide-in-from-top-4">
          <WifiOff size={18} className="text-red-400 shrink-0" />
          <span className="text-xs font-bold text-slate-200">
            {cadeteNombre} está en camino (señal GPS momentáneamente pausada).
          </span>
        </div>
      )}

      {/* Overlay: Cadete con entregas previas en la zona */}
      {paradasPrevias > 0 && !isTerminado ? (
        <div className="absolute inset-x-3 bottom-20 sm:bottom-24 z-[400] max-w-md mx-auto bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-amber-500/30 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Bike size={22} className="animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-black text-amber-200">
              ¡{cadeteNombre} está realizando {paradasPrevias === 1 ? '1 entrega previa' : `${paradasPrevias} entregas previas`} en tu zona!
            </h3>
            <p className="text-[11px] text-amber-300/80">
              Tu pedido es la <strong>Parada #{paradaActual} de {totalParadas}</strong>. Podés seguir la ubicación del cadete en vivo en el mapa. Apenas se dirija a tu casa, te avisaremos.
            </p>
          </div>
        </div>
      ) : esProximaEntrega && isEnCamino && !gpsApagado ? (
        <div className="absolute inset-x-3 bottom-20 sm:bottom-24 z-[400] max-w-md mx-auto bg-emerald-950/90 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-500/30 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Bike size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-black text-emerald-300">¡{cadeteNombre} va directo a tu casa!</h3>
            <p className="text-[11px] text-emerald-200/90">Tu domicilio es el próximo destino en su recorrido.</p>
          </div>
        </div>
      ) : cadeteOcupadoEnOtroViaje && !isEnCamino && !isTerminado ? (
        <div className="absolute inset-x-3 bottom-20 sm:bottom-24 z-[400] max-w-md mx-auto bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-amber-500/30 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Bike size={22} className="animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-black text-amber-200">
              ¡{cadeteNombre} está completando una entrega cercana!
            </h3>
            <p className="text-[11px] text-amber-300/80">
              Tu pedido ya está listo. Apenas termine ese reparto, sale directo hacia tu casa.
            </p>
          </div>
        </div>
      ) : null}

      {/* Overlay: Cocina / Preparación */}
      {isEnPreparacion && !cadeteOcupadoEnOtroViaje && paradasPrevias === 0 && (
        <div className="absolute inset-x-3 bottom-20 sm:bottom-24 z-[400] max-w-md mx-auto bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-white/10 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Flame size={22} className="animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-black text-white">
              {pedido.estado === 'listo' ? '¡Tu pedido ya está listo!' : 'Preparando tu pedido en cocina'}
            </h3>
            <p className="text-[11px] text-slate-300">
              {pedido.estado === 'listo' 
                ? (pedido.cadete_nombre ? `${pedido.cadete_nombre} lo retirará en breve para el reparto.` : 'Esperando asignación de cadete para el despacho.')
                : 'Te avisaremos en vivo cuando el repartidor salga hacia tu domicilio.'}
            </p>
          </div>
        </div>
      )}

      {/* Overlay: Pedido Entregado */}
      {isTerminado && (
        <div className="absolute inset-x-3 bottom-20 sm:bottom-24 z-[400] max-w-md mx-auto bg-emerald-950/90 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-500/30 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-black text-emerald-300">¡Pedido entregado con éxito!</h3>
            <p className="text-[11px] text-emerald-200/90">¡Muchas gracias por elegir Chefsy! Que lo disfrutes.</p>
          </div>
        </div>
      )}
    </div>
  )

  // ── Header del pedido principal ─────────────────────────────────────────────
  const headerPrincipal = (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/20 border border-emerald-500/30">
          {isTerminado     ? <CheckCircle2 size={22} className="text-emerald-400" />
           : isEnPreparacion ? <UtensilsCrossed size={22} className="text-amber-400" />
           : <Bike size={22} className="text-emerald-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-white text-sm sm:text-base leading-tight">
              {isTerminado
                ? '¡Pedido entregado con éxito!'
                : isEnCamino
                ? (paradasPrevias > 0
                    ? `¡${cadeteNombre} en viaje con paradas!`
                    : `¡${cadeteNombre} en camino!`)
                : cadeteOcupadoEnOtroViaje
                ? `¡${cadeteNombre} en otra entrega!`
                : isEnPreparacion
                ? 'Preparando pedido'
                : 'Procesando pedido'}
            </h1>
            <EtiquetaEstado estado={pedido.estado} />
          </div>
          <p className="text-xs font-semibold truncate text-emerald-400">
            Para {pedido.cliente.split(' ')[0]}
          </p>
        </div>
      </div>

      {/* Cadete asignado */}
      {pedido.cadete_nombre && !isTerminado && (
        <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap text-xs">
          <span className="font-medium text-slate-400">Cadete asignado:</span>
          <span className="font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-xs">
            <Bike className="w-3.5 h-3.5" />
            <span>{pedido.cadete_nombre}</span>
          </span>
        </div>
      )}

      {/* Indicador de Parada / Entrega Conjunta */}
      {totalParadas > 1 && !isTerminado && (
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap text-xs">
          <span className="font-medium text-slate-400">Recorrido:</span>
          <span className={`font-bold px-2 py-0.5 rounded-lg flex items-center gap-1.5 shadow-xs border text-[11px] ${
            esProximaEntrega
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
          }`}>
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {esProximaEntrega
                ? 'Próxima parada (destino actual)'
                : `Parada ${paradaActual} de ${totalParadas} (${paradasPrevias} antes)`}
            </span>
          </span>
        </div>
      )}
    </>
  )

  // ── Stack de tarjetas (principal + adicionales) ─────────────────────────────
  const stackMarginBottom = pedidosExtra.length * 10

  const headerConStack = (
    <div className="relative" style={{ marginBottom: stackMarginBottom }}>
      {/* Tarjetas de fondo */}
      {[...pedidosExtra].reverse().map((extra, i) => (
        <TarjetaApilada
          key={extra.id}
          data={extra}
          index={pedidosExtra.length - 1 - i}
        />
      ))}
      {/* Tarjeta principal cápsula glassmorphism */}
      <div className="relative bg-slate-950/85 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 p-3.5 sm:p-4 text-white" style={{ zIndex: 20 }}>
        {headerPrincipal}
      </div>
    </div>
  )

  // ── BottomSheet Desplegable de Detalles ──────────────────────────────────────
  const bottomSheet = (
    <div className="w-full bg-slate-950/90 backdrop-blur-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-white/10 overflow-hidden transition-all duration-300 text-white">
      {/* Barra de arrastre visual móvil */}
      <div className="w-full flex justify-center pt-2 pb-0.5 sm:hidden cursor-pointer" onClick={() => setBottomSheetAbierto(!bottomSheetAbierto)}>
        <div className="w-10 h-1 bg-white/20 rounded-full" />
      </div>

      {/* Barra superior de despliegue / Toque táctil */}
      <button
        type="button"
        onClick={() => setBottomSheetAbierto(!bottomSheetAbierto)}
        className="w-full px-4 py-2.5 sm:py-3 hover:bg-white/5 flex items-center justify-between gap-3 border-b border-white/10 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30">
            <ShoppingBag size={16} />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-white block">
              {bottomSheetAbierto ? 'Ocultar detalle' : 'Ver detalle del pedido'}
            </span>
            <span className="text-[11px] font-bold text-emerald-400">
              {productos.length} {productos.length === 1 ? 'producto' : 'productos'} • {formatearPrecio(pedido.total || 0)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
            {bottomSheetAbierto ? 'Cerrar' : 'Desplegar'}
          </span>
          <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 shadow-xs">
            {bottomSheetAbierto ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>
      </button>

      {/* Contenido expandible */}
      {bottomSheetAbierto && (
        <div className="p-4 space-y-3.5 animate-in slide-in-from-bottom-2 duration-200 max-h-[50vh] overflow-y-auto">
          {/* Dirección y Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {pedido.direccion && (
              <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
                <MapPin size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Entrega en</span>
                  <span className="font-semibold text-slate-200 leading-tight block truncate" title={direccionLegible || pedido.direccion}>
                    {direccionLegible || (esEnlaceOCoordenadas(pedido.direccion) ? 'Ubicación seleccionada en el mapa' : pedido.direccion)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
              <CreditCard size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Método de pago</span>
                <span className="font-semibold text-slate-200 capitalize block">{pedido.metodoPago || 'Efectivo'}</span>
              </div>
            </div>
          </div>

          {/* Observaciones / Aclaraciones de cocina */}
          {pedido.observaciones && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-xs flex items-start gap-2">
              <FileText size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Aclaración</span>
                <span className="text-amber-200/90 font-medium leading-tight">{pedido.observaciones}</span>
              </div>
            </div>
          )}

          {/* Lista de Productos detallada */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Artículos</span>
            <ResumenProductos productos={productos} />
          </div>

          {/* Desglose de totales */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">Total a pagar:</span>
            <span className="text-base font-black font-mono text-emerald-400">{formatearPrecio(pedido.total || 0)}</span>
          </div>

          {/* Acciones: WhatsApp y Volver */}
          <div className="flex flex-col gap-2 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <MessageCircle size={16} />
              <span>¿Dudas con tu pedido? Escribinos por WhatsApp</span>
            </a>

            <div className="flex items-center justify-between pt-1">
              <a
                href="https://chefsy.xyz/"
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-medium transition-colors"
              >
                <ArrowLeft size={13} /><span>Volver a la tienda</span>
              </a>
              <span className="text-slate-500 text-[10px]">Powered by Chefsy</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* 1. Capa 0: Mapa interactivo Fullscreen 100% de la pantalla */}
      <div className="absolute inset-0 w-full h-full z-0">
        {bloqueContenido}
      </div>

      {/* 2. Capa Superior: Cápsula flotante del Header / Estado */}
      <div className="fixed top-3 sm:top-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-30 pointer-events-auto">
        {headerConStack}
      </div>

      {/* 3. Botones Flotantes Rápidos (cuando el bottomSheet está cerrado) */}
      {!bottomSheetAbierto && (
        <div className="fixed bottom-16 sm:bottom-20 right-3.5 z-20 flex flex-col items-end gap-2 pointer-events-auto">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white bg-emerald-600/90 hover:bg-emerald-500 backdrop-blur-md px-3.5 py-2 rounded-full text-xs font-bold shadow-xl border border-emerald-400/30 transition-all active:scale-95 cursor-pointer"
          >
            <MessageCircle size={15} />
            <span className="hidden xs:inline">WhatsApp</span>
          </a>

          <a
            href="https://chefsy.xyz/"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-semibold border border-white/10 shadow-lg transition-colors cursor-pointer"
          >
            <ArrowLeft size={12} /><span>Tienda</span>
          </a>
        </div>
      )}

      {/* 4. Capa Inferior: BottomSheet Desplegable estilo Drawer */}
      <div className="fixed bottom-0 sm:bottom-4 inset-x-0 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-30 pointer-events-auto">
        {bottomSheet}
      </div>
    </div>
  )
}

