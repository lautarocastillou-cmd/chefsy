'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { supabaseAnon } from '@/lib/supabase'
import { CANAL_PEDIDOS, crearClienteEscucha } from '@/lib/pedidos-broadcast'
import { 
  Bike, 
  Compass, 
  Navigation, 
  Layers, 
  Sparkles, 
  Eye, 
  Sliders, 
  Activity, 
  BatteryCharging, 
  RotateCw, 
  Building2, 
  Smartphone,
  ChevronDown,
  RefreshCw,
  Search,
  ExternalLink,
  Zap
} from 'lucide-react'
import type { EstiloMapa, ModoCamara } from '@/components/maptest/MapaLibreSeguimiento'

const MapaLibreSeguimiento = dynamic(
  () => import('@/components/maptest/MapaLibreSeguimiento'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <span className="text-sm font-semibold text-emerald-400 tracking-wide">
            Cargando motor WebGL de MapLibre GL...
          </span>
        </div>
      </div>
    ),
  }
)

function MapTestContent() {
  const searchParams = useSearchParams()
  const initialPedidoId = searchParams.get('id') || searchParams.get('pedido') || ''

  // Datos
  const [pedidosActivos, setPedidosActivos] = useState<any[]>([])
  const [cadetesActivos, setCadetesActivos] = useState<any[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)

  // Selección actual
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any | null>(null)
  const [cadeteSeleccionado, setCadeteSeleccionado] = useState<any | null>(null)
  const [inputManualId, setInputManualId] = useState(initialPedidoId)

  // Ref al refetch de detalle, para dispararlo desde el listener de broadcast.
  const actualizarDetallePedidoRef = useRef<(() => Promise<void>) | null>(null)

  // Controles de MapLibre GL (Google HD por defecto para carga ultrarrápida a 60-120 FPS)
  const [estilo, setEstilo] = useState<EstiloMapa>('google-calles')
  const [modoCamara, setModoCamara] = useState<ModoCamara>('piloto')
  const [pitch, setPitch] = useState<number>(55)
  const [edificios3D, setEdificios3D] = useState<boolean>(true)
  const [mostrarControles, setMostrarControles] = useState<boolean>(true)

  // Telemetría en vivo
  const [telemetria, setTelemetria] = useState<{
    fps: number
    speed: number | null
    heading: number | null
    lat: number | null
    lng: number | null
    bateria: number | null
    ultimoReporteMs: number
  }>({
    fps: 60,
    speed: null,
    heading: null,
    lat: null,
    lng: null,
    bateria: null,
    ultimoReporteMs: 0,
  })

  // ── 1. Cargar lista de pedidos y cadetes activos para el selector ─────────────
  const recargarActivos = async () => {
    try {
      const res = await fetch('/api/public/maptest/activos')
      if (res.ok) {
        const data = await res.json()
        setPedidosActivos(data.pedidos || [])
        setCadetesActivos(data.cadetes || [])

        // Si hay un ID en la URL, seleccionarlo automáticamente
        if (initialPedidoId && !pedidoSeleccionado) {
          const match = (data.pedidos || []).find((p: any) => p.id === initialPedidoId)
          if (match) {
            setPedidoSeleccionado(match)
            if (match.cadete_id) {
              const cad = (data.cadetes || []).find((c: any) => c.id === match.cadete_id)
              if (cad) setCadeteSeleccionado(cad)
            }
          }
        }
      }
    } catch (e) {
      console.error('Error cargando activos de maptest:', e)
    } finally {
      setCargandoLista(false)
    }
  }

  useEffect(() => {
    recargarActivos()
    const timer = setInterval(recargarActivos, 4000)
    return () => clearInterval(timer)
  }, [initialPedidoId])

  // ── 2. Cargar detalle si se seleccionó un pedido ─────────────────────────────
  useEffect(() => {
    if (!pedidoSeleccionado?.id) return

    const actualizarDetallePedido = async () => {
      try {
        const res = await fetch(`/api/public/rastreo?id=${pedidoSeleccionado.id}`)
        if (res.ok) {
          const p = await res.json()
          if (p && p.id) {
            setPedidoSeleccionado(p)
            if (p.cadete_coordenadas) {
              setCadeteSeleccionado((prev: any) => ({
                ...(prev || {}),
                id: p.cadete_id || prev?.id,
                lat: p.cadete_coordenadas.latitud,
                lng: p.cadete_coordenadas.longitud,
                heading: prev?.heading,
                speed: prev?.speed,
                bateria: prev?.bateria,
              }))
            }
          }
        }
      } catch (_) {}
    }

    actualizarDetallePedido()
    // Se guarda en un ref para que el listener de broadcast (efecto 3) pueda
    // disparar el refetch sin recrearse en cada cambio del pedido.
    actualizarDetallePedidoRef.current = actualizarDetallePedido
    const interval = setInterval(actualizarDetallePedido, 3000)
    return () => clearInterval(interval)
  }, [pedidoSeleccionado?.id])

  // ── 3. Suscripción en Tiempo Real con Supabase (Cadetes y Pedidos) ───────────
  useEffect(() => {
    const canal = supabaseAnon
      .channel('maptest-realtime-sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cadetes' },
        (payload: any) => {
          const cActualizado = payload.new
          if (!cActualizado) return

          // Actualizar en la lista local
          setCadetesActivos((prev) =>
            prev.map((c) => (c.id === cActualizado.id ? { ...c, ...cActualizado } : c))
          )

          // Si es el cadete actualmente en pantalla, empujar coordenadas inmediatas
          if (cadeteSeleccionado?.id === cActualizado.id || pedidoSeleccionado?.cadete_id === cActualizado.id) {
            setCadeteSeleccionado((prev: any) => ({
              ...(prev || {}),
              ...cActualizado,
              lat: cActualizado.lat,
              lng: cActualizado.lng,
              speed: cActualizado.speed,
              heading: cActualizado.heading,
              bateria: cActualizado.bateria,
            }))
          }
        }
      )
      .subscribe()

    // `pedidos` ya no se escucha con postgres_changes: la tabla está cerrada
    // a `anon`. La señal por broadcast no trae la fila, así que en vez de
    // parchar el estado local se recarga desde la API, que ya devuelve los
    // pedidos con sus datos completos.
    const clientePedidos = crearClienteEscucha()
    const canalPedidos = clientePedidos?.channel(CANAL_PEDIDOS)
      .on('broadcast', { event: 'cambio' }, (mensaje) => {
        const payload = mensaje.payload as { id?: unknown } | undefined
        if (typeof payload?.id !== 'string') return
        if (pedidoSeleccionado?.id && payload.id !== pedidoSeleccionado.id) return
        recargarActivos()
        actualizarDetallePedidoRef.current?.()
      })
      .subscribe()

    return () => {
      supabaseAnon.removeChannel(canal)
      if (canalPedidos) clientePedidos?.removeChannel(canalPedidos)
    }
  }, [cadeteSeleccionado?.id, pedidoSeleccionado?.id, pedidoSeleccionado?.cadete_id])

  // Manejador manual de ID
  const handleBuscarManual = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputManualId.trim()) return

    const matchPedido = pedidosActivos.find((p) => p.id === inputManualId.trim())
    if (matchPedido) {
      setPedidoSeleccionado(matchPedido)
      return
    }

    const matchCadete = cadetesActivos.find((c) => c.id.toLowerCase() === inputManualId.trim().toLowerCase())
    if (matchCadete) {
      setCadeteSeleccionado(matchCadete)
      setPedidoSeleccionado(null)
      return
    }

    // Probar cargarlo directamente desde la API
    fetch(`/api/public/rastreo?id=${inputManualId.trim()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.id) {
          setPedidoSeleccionado(data)
        }
      })
      .catch(() => {})
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white font-sans select-none">
      {/* ── 1. MAPA WEBGL EN PANTALLA COMPLETA ───────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <MapaLibreSeguimiento
          pedido={pedidoSeleccionado}
          cadete={cadeteSeleccionado}
          estilo={estilo}
          modoCamara={modoCamara}
          pitchPersonalizado={pitch}
          mostrarEdificios3D={edificios3D}
          onTelemetriaUpdate={setTelemetria}
        />
      </div>

      {/* ── 2. HEADER SUPERIOR FLOTANTE CON SELECTOR ──────────────────────────── */}
      <header className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 z-40 flex flex-col sm:flex-row items-center justify-between gap-2.5 pointer-events-none">
        {/* Título & Badge Beta */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto w-full sm:w-auto">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-white tracking-wide">Chefsy MapLibre 3D</h1>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-400/30">
                LAB BETA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Motor WebGL con GPU a 60-120 FPS</p>
          </div>
        </div>

        {/* Selector de Pedidos / Cadetes */}
        <div className="flex items-center gap-2 pointer-events-auto w-full sm:w-auto">
          {/* Selector de Pedidos */}
          <div className="relative flex-1 sm:w-64">
            <select
              value={pedidoSeleccionado?.id || ''}
              onChange={(e) => {
                const id = e.target.value
                const p = pedidosActivos.find((item) => item.id === id)
                setPedidoSeleccionado(p || null)
                if (p?.cadete_id) {
                  const c = cadetesActivos.find((item) => item.id === p.cadete_id)
                  if (c) setCadeteSeleccionado(c)
                }
              }}
              className="w-full bg-slate-900/90 backdrop-blur-xl border border-white/15 text-xs text-white rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-emerald-500 shadow-xl cursor-pointer"
            >
              <option value="">
                {cargandoLista ? 'Buscando pedidos activos...' : `📦 Pedidos en curso (${pedidosActivos.length})`}
              </option>
              {pedidosActivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.cliente || 'Sin cliente'} • {p.estado} {p.cadete_nombre ? `(${p.cadete_nombre})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Selector de Cadetes GPS Directos */}
          <div className="relative flex-1 sm:w-48">
            <select
              value={cadeteSeleccionado?.id || ''}
              onChange={(e) => {
                const id = e.target.value
                const c = cadetesActivos.find((item) => item.id === id)
                setCadeteSeleccionado(c || null)
              }}
              className="w-full bg-slate-900/90 backdrop-blur-xl border border-white/15 text-xs text-white rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-emerald-500 shadow-xl cursor-pointer"
            >
              <option value="">
                {`🛵 Cadetes GPS (${cadetesActivos.filter((c) => c.tiene_coordenadas).length})`}
              </option>
              {cadetesActivos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre || c.id} {c.tiene_coordenadas ? '📍 (Online)' : '⚪ (Sin GPS)'}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Botón Refrescar */}
          <button
            onClick={recargarActivos}
            title="Refrescar lista"
            className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {/* ── 3. BARRA INFERIOR DE CONTROLES 3D & CÁMARA ────────────────────────── */}
      <footer className="absolute bottom-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none">
        {/* Toggle para ocultar/mostrar controles en pantallas pequeñas */}
        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/15 p-2 rounded-2xl shadow-2xl flex flex-wrap items-center justify-center gap-2 pointer-events-auto max-w-full">
          {/* Modos de Cámara */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setModoCamara('piloto')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                modoCamara === 'piloto'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Cámara piloto: persigue a la moto y rota con las curvas de la calle"
            >
              <Navigation size={13} />
              <span>Piloto 3D</span>
            </button>

            <button
              onClick={() => setModoCamara('dron')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                modoCamara === 'dron'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Cámara dron: inclinación fija a 45°"
            >
              <Compass size={13} />
              <span>Dron 45°</span>
            </button>

            <button
              onClick={() => setModoCamara('cenital')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                modoCamara === 'cenital'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Cámara 2D: vista plana cenital"
            >
              <Eye size={13} />
              <span>2D</span>
            </button>

            <button
              onClick={() => setModoCamara('todo')}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modoCamara === 'todo'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Auto-encuadre completo (Local, Repartidor y Destino)"
            >
              Encuadre
            </button>

            <button
              onClick={() => setModoCamara('libre')}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modoCamara === 'libre'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Cámara libre: puedes arrastrar y rotar a tu gusto"
            >
              Libre
            </button>
          </div>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          {/* Selector de Estilo */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setEstilo('google-calles')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                estilo === 'google-calles' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-slate-400 hover:text-white'
              }`}
              title="Google Maps Calles HD (Carga instantánea a 60-120 FPS)"
            >
              🗺️ Google HD
            </button>
            <button
              onClick={() => setEstilo('cyber-dark')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                estilo === 'cyber-dark' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
              }`}
              title="ESRI Dark Gray (Oscuro rápido y limpio sin marcas de agua)"
            >
              🌌 Dark
            </button>
            <button
              onClick={() => setEstilo('google-hibrido')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                estilo === 'google-hibrido' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-white'
              }`}
              title="Google Maps Satelital Híbrido"
            >
              🛰️ Satélite
            </button>
            <button
              onClick={() => {
                setEstilo('vector-liberty')
                setEdificios3D(true)
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                estilo === 'vector-liberty' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30' : 'text-slate-400 hover:text-white'
              }`}
              title="OpenFreeMap Liberty (Vectorial con Edificios 3D en relieve)"
            >
              🏙️ 3D Vector
            </button>
            <button
              onClick={() => setEstilo('vector-positron')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                estilo === 'vector-positron' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Vectorial claro minimalista"
            >
              ☀️ Positron
            </button>
          </div>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          {/* Edificios 3D Toggle */}
          <button
            onClick={() => {
              const nuevo = !edificios3D
              setEdificios3D(nuevo)
              if (nuevo && estilo !== 'vector-liberty' && estilo !== 'vector-positron') {
                setEstilo('vector-liberty')
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              edificios3D && (estilo === 'vector-liberty' || estilo === 'vector-positron')
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md shadow-amber-500/10'
                : 'bg-slate-950/60 text-slate-500 border-white/10'
            }`}
            title="Activar/Desactivar relieve de edificios 3D (requiere estilo 3D Vector)"
          >
            <Building2 size={13} />
            <span>Edificios 3D {edificios3D && (estilo === 'vector-liberty' || estilo === 'vector-positron') ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </footer>

      {/* ── 4. HUD FLOTANTE DE TELEMETRÍA (Esquina Superior Derecha) ─────────── */}
      <aside className="absolute top-20 right-3.5 z-40 pointer-events-none flex flex-col items-end gap-2">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 p-3 rounded-2xl shadow-2xl text-left pointer-events-auto min-w-[170px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Activity size={12} className="text-emerald-400" />
              Telemetría WebGL
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Medidor FPS en tiempo real */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <span className="text-slate-400 font-medium">Tasa de cuadros:</span>
            <span className={`font-mono font-black ${telemetria.fps >= 55 ? 'text-emerald-400' : telemetria.fps >= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
              {telemetria.fps} FPS
            </span>
          </div>

          {/* Velocidad */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <span className="text-slate-400 font-medium">Velocidad:</span>
            <span className="font-mono font-bold text-white">
              {telemetria.speed !== null ? `${Math.round(telemetria.speed)} km/h` : 'Estacionado'}
            </span>
          </div>

          {/* Rumbo */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <span className="text-slate-400 font-medium">Rumbo:</span>
            <span className="font-mono font-bold text-teal-300">
              {telemetria.heading !== null ? `${Math.round(telemetria.heading)}°` : '0°'}
            </span>
          </div>

          {/* Batería */}
          {telemetria.bateria !== null && (
            <div className="flex items-center justify-between text-xs py-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <BatteryCharging size={11} className="text-emerald-400" /> Batería:
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {telemetria.bateria}%
              </span>
            </div>
          )}

          {/* Cadete Activo */}
          <div className="mt-2 pt-2 border-t border-white/10 text-[11px]">
            <span className="text-slate-400 block font-medium">Cadete en pantalla:</span>
            <span className="text-emerald-300 font-bold block truncate">
              {cadeteSeleccionado?.nombre || pedidoSeleccionado?.cadete_nombre || 'Esperando selección...'}
            </span>
          </div>
        </div>

        {/* Control deslizante de Pitch / Inclinación */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 px-3 py-2 rounded-2xl shadow-xl pointer-events-auto flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Inclinación:</span>
          <input
            type="range"
            min="0"
            max="70"
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            className="w-24 accent-emerald-500 cursor-pointer"
          />
          <span className="font-mono text-emerald-400 font-bold text-xs w-6 text-right">{pitch}°</span>
        </div>
      </aside>

      {/* ── 5. BADGE DE ESTADO INFORMATIVO ───────────────────────────────────── */}
      {pedidoSeleccionado && (
        <div className="absolute top-20 left-3.5 z-40 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 px-3.5 py-2 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Bike size={16} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                {pedidoSeleccionado.estado === 'en_camino' ? 'En viaje a domicilio' : pedidoSeleccionado.estado}
              </span>
              <span className="text-xs font-bold text-white block">
                {pedidoSeleccionado.cliente || 'Pedido Seleccionado'}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function MapTestPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MapTestContent />
    </Suspense>
  )
}
