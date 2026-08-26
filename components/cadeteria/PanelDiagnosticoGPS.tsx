"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  MapPin,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Navigation,
  Zap,
  ChevronDown,
  ChevronUp,
  Package,
  Signal,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CadeteDiagnostico {
  id: string
  nombre: string
  gps_activo: boolean
  gps_activo_db: boolean
  lat: number | null
  lng: number | null
  accuracy: number | null   // metros
  speed: number | null       // m/s
  heading: number | null     // 0-360
  bateria: number | null     // 0-100
  updated_at: string | null
  segundos_offline: number | null
  pedidos_activos: { id: string; cliente: string; estado: string }[]
}

interface MetaDiagnostico {
  timestamp: string
  latencia_ms: number
  total_cadetes: number
  cadetes_activos: number
  cadetes_offline: number
}

interface EventoGPS {
  ts: string          // HH:MM:SS
  cadeteId: string
  nombre: string
  tipo: "conectado" | "desconectado" | "bateria_baja" | "precision_mala" | "velocidad_alta"
  detalle: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function horaActual() {
  return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function formatearSegundos(segundos: number | null): string {
  if (segundos === null) return "—"
  if (segundos < 60) return `${segundos}s`
  if (segundos < 3600) return `${Math.floor(segundos / 60)}m ${segundos % 60}s`
  return `+1h`
}

function formatearVelocidad(ms: number | null): string {
  if (ms === null) return "—"
  return `${(ms * 3.6).toFixed(1)} km/h`
}

function formatearPrecision(m: number | null): string {
  if (m === null) return "—"
  return `±${m.toFixed(0)}m`
}

function direccionBrujula(deg: number | null): string {
  if (deg === null) return "—"
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]
  return dirs[Math.round(deg / 45) % 8]
}

function colorBateria(pct: number | null): string {
  if (pct === null) return "text-slate-400"
  if (pct <= 15) return "text-red-500"
  if (pct <= 30) return "text-amber-500"
  return "text-emerald-500"
}

function badgeEstado(estado: string) {
  const map: Record<string, { label: string; cls: string }> = {
    en_camino: { label: "🛵 En camino", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    listo:     { label: "✅ Listo",     cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    en_cocina: { label: "🍳 En cocina", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  }
  const info = map[estado] ?? { label: estado, cls: "bg-slate-100 text-slate-600 border-slate-200" }
  return (
    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", info.cls)}>
      {info.label}
    </span>
  )
}

const ICON_EVENTO: Record<EventoGPS["tipo"], string> = {
  conectado:      "✅",
  desconectado:   "🔴",
  bateria_baja:   "🔋",
  precision_mala: "📡",
  velocidad_alta: "💨",
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PanelDiagnosticoGPS() {
  const [cadetes, setCadetes] = useState<CadeteDiagnostico[]>([])
  const [meta, setMeta] = useState<MetaDiagnostico | null>(null)
  const [cargando, setCargando] = useState(true)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null)
  const [intervalo, setIntervalo] = useState<10 | 30 | 60>(10)
  const [eventos, setEventos] = useState<EventoGPS[]>([])
  const [pingMs, setPingMs] = useState<number | null>(null)
  const [pingCargando, setPingCargando] = useState(false)
  const [expandido, setExpandido] = useState(true)
  const [logExpandido, setLogExpandido] = useState(true)
  const [cadetesExpandidos, setCadetesExpandidos] = useState<Record<string, boolean>>({})

  // Snapshot anterior para detectar cambios
  const snapPrevio = useRef<Record<string, { gps_activo: boolean; bateria: number | null; accuracy: number | null }>>({})

  const detectarEventos = useCallback((nuevos: CadeteDiagnostico[]) => {
    const ahora = horaActual()
    const nuevosEventos: EventoGPS[] = []

    for (const c of nuevos) {
      const prev = snapPrevio.current[c.id]
      if (!prev) continue // primera carga, sin comparación

      // GPS desconectado / reconectado
      if (prev.gps_activo && !c.gps_activo) {
        nuevosEventos.push({
          ts: ahora, cadeteId: c.id, nombre: c.nombre,
          tipo: "desconectado",
          detalle: `Sin señal GPS${c.segundos_offline ? ` (offline ${formatearSegundos(c.segundos_offline)})` : ""}`,
        })
      } else if (!prev.gps_activo && c.gps_activo) {
        nuevosEventos.push({
          ts: ahora, cadeteId: c.id, nombre: c.nombre,
          tipo: "conectado",
          detalle: "GPS reconectado",
        })
      }

      // Batería baja (umbral 20% y solo al cruzar)
      if (c.bateria !== null && prev.bateria !== null) {
        if (prev.bateria > 20 && c.bateria <= 20) {
          nuevosEventos.push({
            ts: ahora, cadeteId: c.id, nombre: c.nombre,
            tipo: "bateria_baja",
            detalle: `Batería al ${c.bateria}%`,
          })
        }
      }

      // Precisión degradada (>50m y solo al cruzar)
      if (c.accuracy !== null && prev.accuracy !== null) {
        if (prev.accuracy <= 50 && c.accuracy > 50) {
          nuevosEventos.push({
            ts: ahora, cadeteId: c.id, nombre: c.nombre,
            tipo: "precision_mala",
            detalle: `Precisión degradada: ${formatearPrecision(c.accuracy)}`,
          })
        }
      }
    }

    if (nuevosEventos.length > 0) {
      setEventos(prev => [...nuevosEventos, ...prev].slice(0, 100))
    }

    // Actualizar snapshot
    const nuevoSnap: typeof snapPrevio.current = {}
    for (const c of nuevos) {
      nuevoSnap[c.id] = { gps_activo: c.gps_activo, bateria: c.bateria, accuracy: c.accuracy }
    }
    snapPrevio.current = nuevoSnap
  }, [])

  const obtenerDatos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gps-diagnostico", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      detectarEventos(data.cadetes || [])
      setCadetes(data.cadetes || [])
      setMeta(data.meta || null)
      setUltimaActualizacion(horaActual())
    } catch {
      // silencioso
    } finally {
      setCargando(false)
    }
  }, [detectarEventos])

  const hacerPing = async () => {
    setPingCargando(true)
    const t0 = performance.now()
    try {
      await fetch("/api/admin/gps-diagnostico", { cache: "no-store" })
      setPingMs(Math.round(performance.now() - t0))
    } catch {
      setPingMs(null)
    } finally {
      setPingCargando(false)
    }
  }

  // Primera carga
  useEffect(() => { obtenerDatos() }, [obtenerDatos])

  // Auto-refresh
  useEffect(() => {
    const id = setInterval(obtenerDatos, intervalo * 1000)
    return () => clearInterval(id)
  }, [intervalo, obtenerDatos])

  // ── Estadísticas de resumen ────────────────────────────────────────────────
  const activos = cadetes.filter(c => c.gps_activo).length
  const offline = cadetes.filter(c => !c.gps_activo).length
  const latenciaPromedio = cadetes.length > 0
    ? Math.round(cadetes.filter(c => c.segundos_offline !== null).reduce((s, c) => s + (c.segundos_offline ?? 0), 0) / cadetes.filter(c => c.segundos_offline !== null).length)
    : null
  const bateriaCritica = cadetes
    .filter(c => c.bateria !== null)
    .sort((a, b) => (a.bateria ?? 100) - (b.bateria ?? 100))[0]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header del panel */}
      <div className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#3d3d3d] rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setExpandido(e => !e)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-[#252525] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">🛰️ Diagnóstico GPS en Vivo</p>
              <p className="text-[10px] text-slate-400">
                {ultimaActualizacion ? `Actualizado a las ${ultimaActualizacion}` : "Cargando..."} · Auto-refresh {intervalo}s
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activos > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activos} online
              </span>
            )}
            {offline > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-2 py-1 rounded-full border border-red-200 dark:border-red-900/40">
                <WifiOff size={10} />
                {offline} offline
              </span>
            )}
            {expandido ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </div>
        </button>

        {expandido && (
          <div className="border-t border-slate-100 dark:border-[#3d3d3d] p-5 space-y-5">
            
            {/* Controles */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Intervalo:</span>
                {([10, 30, 60] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setIntervalo(s)}
                    className={cn(
                      "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all",
                      intervalo === s
                        ? "bg-indigo-600 text-white border-indigo-700"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    {s}s
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={obtenerDatos}
                  className="flex items-center gap-1.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-all"
                >
                  <RefreshCw size={11} className={cargando ? "animate-spin" : ""} />
                  Actualizar ahora
                </button>
                <button
                  onClick={hacerPing}
                  disabled={pingCargando}
                  className="flex items-center gap-1.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/40 transition-all disabled:opacity-50"
                >
                  <Zap size={11} className={pingCargando ? "animate-pulse" : ""} />
                  Ping
                  {pingMs !== null && (
                    <span className={cn(
                      "font-black ml-0.5",
                      pingMs < 300 ? "text-emerald-600" : pingMs < 800 ? "text-amber-600" : "text-red-600"
                    )}>
                      {pingMs}ms
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                  <Wifi size={10} /> GPS Activo
                </p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{activos}</p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-500">de {cadetes.length} cadetes</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3">
                <p className="text-[10px] font-bold text-red-600 dark:text-red-500 uppercase tracking-wider flex items-center gap-1">
                  <WifiOff size={10} /> Offline
                </p>
                <p className="text-2xl font-black text-red-700 dark:text-red-400 mt-1">{offline}</p>
                <p className="text-[9px] text-red-600 dark:text-red-500">sin señal GPS</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl p-3">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-wider flex items-center gap-1">
                  <Signal size={10} /> Latencia API
                </p>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                  {meta ? `${meta.latencia_ms}ms` : "—"}
                </p>
                <p className="text-[9px] text-blue-600 dark:text-blue-500">respuesta del servidor</p>
              </div>
              <div className={cn(
                "border rounded-xl p-3",
                bateriaCritica && (bateriaCritica.bateria ?? 100) <= 15
                  ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40"
                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40"
              )}>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Battery size={10} /> Batería Más Baja
                </p>
                {bateriaCritica ? (
                  <>
                    <p className={cn("text-2xl font-black mt-1", colorBateria(bateriaCritica.bateria))}>
                      {bateriaCritica.bateria}%
                    </p>
                    <p className="text-[9px] text-slate-500">{bateriaCritica.nombre}</p>
                  </>
                ) : (
                  <p className="text-2xl font-black text-slate-400 mt-1">—</p>
                )}
              </div>
            </div>

            {/* Tabla de cadetes */}
            {cargando && cadetes.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Cargando datos GPS...
              </div>
            ) : cadetes.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No hay cadetes registrados</div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Detalle por Cadete
                </p>
                {cadetes.map(c => {
                  const open = cadetesExpandidos[c.id] ?? false
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "border rounded-xl overflow-hidden transition-all",
                        c.gps_activo
                          ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10"
                          : "border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10"
                      )}
                    >
                      {/* Fila principal */}
                      <button
                        onClick={() => setCadetesExpandidos(prev => ({ ...prev, [c.id]: !open }))}
                        className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Estado GPS */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {c.gps_activo ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <AlertTriangle size={14} className="text-red-500 animate-pulse" />
                          )}
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{c.nombre}</span>
                          <span className="text-[9px] font-bold text-slate-400">({c.id})</span>
                        </div>

                        {/* Última señal */}
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                          <Clock size={10} />
                          <span>
                            {c.gps_activo
                              ? <span className="text-emerald-600 font-bold">Activo · {formatearSegundos(c.segundos_offline)} atrás</span>
                              : <span className="text-red-600 font-bold animate-pulse">Sin señal · {formatearSegundos(c.segundos_offline)}</span>
                            }
                          </span>
                        </div>

                        {/* Batería */}
                        {c.bateria !== null && (
                          <div className={cn("flex items-center gap-1 text-[10px] font-bold shrink-0", colorBateria(c.bateria))}>
                            {c.bateria <= 15 ? <BatteryLow size={10} /> : <Battery size={10} />}
                            {c.bateria}%
                          </div>
                        )}

                        {/* Precisión */}
                        {c.accuracy !== null && (
                          <div className={cn(
                            "flex items-center gap-1 text-[10px] font-bold shrink-0",
                            c.accuracy <= 20 ? "text-emerald-600" : c.accuracy <= 50 ? "text-amber-600" : "text-red-600"
                          )}>
                            <MapPin size={10} />
                            {formatearPrecision(c.accuracy)}
                          </div>
                        )}

                        {/* Pedidos */}
                        {c.pedidos_activos.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 shrink-0">
                            <Package size={10} />
                            {c.pedidos_activos.length} pedido{c.pedidos_activos.length > 1 ? "s" : ""}
                          </div>
                        )}

                        <div className="ml-auto shrink-0">
                          {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </div>
                      </button>

                      {/* Detalle expandido */}
                      {open && (
                        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-white dark:bg-[#1a1a1a] space-y-3">
                          {/* Grid de métricas */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              {
                                label: "Coordenadas",
                                value: c.lat !== null && c.lng !== null
                                  ? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`
                                  : "Sin coordenadas",
                                icon: <MapPin size={11} />,
                                link: c.lat !== null && c.lng !== null
                                  ? `https://www.google.com/maps?q=${c.lat},${c.lng}`
                                  : null,
                              },
                              { label: "Precisión GPS", value: formatearPrecision(c.accuracy), icon: <Signal size={11} />, link: null },
                              { label: "Velocidad", value: formatearVelocidad(c.speed), icon: <Activity size={11} />, link: null },
                              { label: "Dirección", value: c.heading !== null ? `${c.heading.toFixed(0)}° ${direccionBrujula(c.heading)}` : "—", icon: <Navigation size={11} />, link: null },
                              { label: "Batería", value: c.bateria !== null ? `${c.bateria}%` : "No reportada", icon: <Battery size={11} />, link: null },
                              { label: "Última señal", value: c.updated_at ? new Date(c.updated_at).toLocaleTimeString("es-AR") : "—", icon: <Clock size={11} />, link: null },
                              { label: "GPS DB (crudo)", value: c.gps_activo_db ? "true" : "false", icon: <Wifi size={11} />, link: null },
                              { label: "Offline hace", value: formatearSegundos(c.segundos_offline), icon: <Clock size={11} />, link: null },
                            ].map(({ label, value, icon, link }) => (
                              <div key={label} className="bg-slate-50 dark:bg-[#252525] rounded-lg p-2.5 border border-slate-100 dark:border-[#3d3d3d]">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                                  {icon} {label}
                                </p>
                                {link ? (
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 underline underline-offset-2 break-all"
                                  >
                                    {value}
                                  </a>
                                ) : (
                                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 break-all">{value}</p>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Pedidos activos */}
                          {c.pedidos_activos.length > 0 && (
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Pedidos asignados</p>
                              <div className="space-y-1">
                                {c.pedidos_activos.map(p => (
                                  <div key={p.id} className="flex items-center justify-between bg-slate-50 dark:bg-[#252525] border border-slate-100 dark:border-[#3d3d3d] rounded-lg px-2.5 py-1.5">
                                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{p.cliente}</span>
                                    {badgeEstado(p.estado)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Meta info */}
            {meta && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 border-t border-slate-100 dark:border-[#3d3d3d] pt-3">
                <span>🕒 Servidor: {new Date(meta.timestamp).toLocaleTimeString("es-AR")}</span>
                <span>⚡ Latencia API: {meta.latencia_ms}ms</span>
                <span>👥 Total cadetes: {meta.total_cadetes}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log de eventos en vivo */}
      <div className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#3d3d3d] rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setLogExpandido(e => !e)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-[#252525] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 p-2 rounded-xl">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">📋 Log de Eventos GPS</p>
              <p className="text-[10px] text-slate-400">
                {eventos.length > 0 ? `${eventos.length} evento${eventos.length > 1 ? "s" : ""} detectado${eventos.length > 1 ? "s" : ""}` : "Sin eventos aún"}
              </p>
            </div>
          </div>
          {logExpandido ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {logExpandido && (
          <div className="border-t border-slate-100 dark:border-[#3d3d3d]">
            {eventos.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <p className="mb-1">🟢 Sin eventos detectados</p>
                <p>Los cambios de estado GPS aparecerán aquí automáticamente.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#3d3d3d] max-h-64 overflow-y-auto">
                {eventos.map((e, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 px-5 py-2.5 text-xs",
                      e.tipo === "desconectado" && "bg-red-50/50 dark:bg-red-950/10",
                      e.tipo === "conectado" && "bg-emerald-50/50 dark:bg-emerald-950/10",
                      e.tipo === "bateria_baja" && "bg-amber-50/50 dark:bg-amber-950/10",
                    )}
                  >
                    <span className="font-mono text-slate-400 shrink-0 pt-px">{e.ts}</span>
                    <span className="shrink-0">{ICON_EVENTO[e.tipo]}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">{e.nombre}</span>
                    <span className="text-slate-500 dark:text-slate-400">{e.detalle}</span>
                  </div>
                ))}
              </div>
            )}
            {eventos.length > 0 && (
              <div className="px-5 py-2 border-t border-slate-100 dark:border-[#3d3d3d] flex justify-end">
                <button
                  onClick={() => setEventos([])}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors"
                >
                  Limpiar log
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
