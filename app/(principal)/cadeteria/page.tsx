'use client'

import { useState, useEffect, useRef } from 'react'
import { Pedido, EstadoPedido, Coordenadas } from '@/tipos'
import { usarPedidos } from '@/contexto/PedidosContexto'
import BadgeEstado from '@/components/pedidos/BadgeEstado'
import InfoEntregaPedido from '@/components/pedidos/InfoEntregaPedido'
import { esPedidoDelivery } from '@/lib/entrega'
import { formatearPrecio, cn } from '@/lib/utils'
import Link from 'next/link'
import { MessageCircle, MapPin, Bike, Phone, RefreshCw, Download, Smartphone } from 'lucide-react'
import { mutate } from 'swr'
import { crearEnlaceGoogleMaps, calcularDistanciaKm } from '@/lib/ubicacion'
import { usarAuth } from '@/contexto/AuthContexto'
import LoginPage from '@/components/auth/LoginPage'
import TimerPedido from '@/components/pedidos/TimerPedido'
import { supabase } from '@/lib/supabase'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import CalculadoraSutil from '@/components/herramientas/CalculadoraSutil'
import SwipeToConfirm from '@/components/ui/SwipeToConfirm'
import BotonNotificaciones from '@/components/cadeteria/BotonNotificaciones'
import PanelDiagnosticoGPS from '@/components/cadeteria/PanelDiagnosticoGPS'


function redireccionarWhatsApp(telefono: string, cliente: string) {
  const numeros = telefono.replace(/\D/g, '')
  let numeroCompleto = numeros
  
  if (numeros.length === 10) {
    numeroCompleto = '549' + numeros
  } else if (numeros.length === 11 && numeros.startsWith('9')) {
    numeroCompleto = '54' + numeros
  } else if (numeros.length === 11 && !numeros.startsWith('54')) {
    if (numeros.startsWith('0')) {
      numeroCompleto = '549' + numeros.slice(1)
    }
  } else if (numeros.length === 13 && numeros.startsWith('00')) {
    numeroCompleto = numeros.slice(2)
  }
  
  const mensaje = encodeURIComponent('Hola, estoy en camino!')
  return `https://wa.me/${numeroCompleto}?text=${mensaje}`
}

function TarjetaPedidoCadete({
  pedido,
  cambiarEstado,
}: {
  pedido: Pedido
  cambiarEstado: (id: string, estado: EstadoPedido, mostrarDeshacer?: boolean) => void
}) {
  const [metodoOriginal, setMetodoOriginal] = useState<string | null>(null)

  useEffect(() => {
    const key = `original-pago-${pedido.id}`
    const guardado = localStorage.getItem(key)
    
    if (guardado) {
      const esGuardadoInvalido = guardado.toLowerCase().replace(/_/g, ' ') === 'sin especificar'
      const esNuevoValido = pedido.metodoPago.toLowerCase().replace(/_/g, ' ') !== 'sin especificar'
      
      if (esGuardadoInvalido && esNuevoValido) {
        localStorage.setItem(key, pedido.metodoPago)
        setMetodoOriginal(pedido.metodoPago)
      } else {
        setMetodoOriginal(guardado)
      }
    } else {
      localStorage.setItem(key, pedido.metodoPago)
      setMetodoOriginal(pedido.metodoPago)
    }
  }, [pedido.id, pedido.metodoPago])

  const entregarPedido = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
      
      cambiarEstado(pedido.id, 'entregado', false)
      localStorage.removeItem(`original-pago-${pedido.id}`)
    } catch (e) {
      alert('Error al intentar marcar como entregado. Reintentá.')
      throw e
    }
  }

  const cambioMetodo = metodoOriginal && metodoOriginal !== pedido.metodoPago

  const marcarComoListo = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100])
      }
      cambiarEstado(pedido.id, 'listo', false)
    } catch (e) {
      alert('Error al marcar como listo. Reintentá.')
      throw e
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-chefsy-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 animate-[slideIn_0.2s_ease-out] transition-colors">
      {/* Cabecera del pedido: Cliente y Estado */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-extrabold text-gray-900 dark:text-slate-100 leading-snug">{pedido.cliente}</p>
          <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[11px] text-gray-500 dark:text-slate-400 font-medium">
            <span>{pedido.telefono === 'Sin especificar' ? 'Tel: Sin especificar' : `Tel: ${pedido.telefono}`}</span>
            <span className="text-gray-300 dark:text-slate-700">•</span>
            <span>{pedido.hora}</span>
          </div>
        </div>
        <div className="shrink-0">
          <BadgeEstado estado={pedido.estado} />
        </div>
      </div>

      {/* Línea de Tiempos del Pedido */}
      <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl p-2 flex items-center justify-between gap-2 transition-all">
        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Tiempos</span>
        <TimerPedido pedido={pedido} />
      </div>

      {/* Acciones de Contacto y Navegación */}
      <div className="flex flex-wrap items-center gap-2">
        {pedido.telefono !== 'Sin especificar' && (
          <>
            <a
              href={`tel:${pedido.telefono.replace(/\D/g, '')}`}
              className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors shrink-0 shadow-sm"
            >
              <Phone size={12} /> Llamar
            </a>
            <a
              href={redireccionarWhatsApp(pedido.telefono, pedido.cliente)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors shrink-0 shadow-sm"
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
          </>
        )}
        {esPedidoDelivery(pedido) && (pedido.coordenadas || pedido.direccion) && (
          <a
            href={crearEnlaceGoogleMaps(pedido.coordenadas, pedido.direccion)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors shrink-0 shadow-sm"
          >
            <MapPin size={12} /> Google Maps
          </a>
        )}
      </div>

      <InfoEntregaPedido pedido={pedido} destacado />

      <div className="text-sm text-gray-650 dark:text-slate-300 space-y-0.5">
        {pedido.productos.map((producto) => {
          const esBebida =
            producto.categoriaId === 'bebidas' ||
            producto.idCatalogo?.startsWith('bebidas-') ||
            /coca|fanta|sprite|agua|cerveza|bebida|aquarius|gaseosa/i.test(producto.nombre)
          return (
            <p
              key={producto.id}
              className={esBebida ? "text-red-600 dark:text-red-400 animate-pulse" : ""}
            >
              {producto.cantidad}× {producto.nombre}
            </p>
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-3">
        <div>
          <p className="text-xs text-gray-400">Cobrar</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
            {formatearPrecio(pedido.total)}
          </p>
          {pedido.costoEnvio && (
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              (Incluye {formatearPrecio(pedido.costoEnvio)} envío)
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-500 dark:text-slate-400 capitalize font-semibold block">
            {pedido.metodoPago}
          </span>
          {pedido.metodoPago === 'transferencia' && (
            <div className="mt-1">
              {pedido.pago_confirmado ? (
                <span className="inline-flex items-center bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  ✅ PAGADO
                </span>
              ) : (
                <span className="inline-flex items-center bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                  ❌ Pendiente Impactar
                </span>
              )}
            </div>
          )}
          {cambioMetodo && (
            <p className="text-[10px] font-black text-red-600 dark:text-red-400 animate-pulse mt-0.5">
              ⚠️ ¡MÉTODO CAMBIÓ! (Era: {metodoOriginal.toUpperCase()})
            </p>
          )}
        </div>
      </div>

      {pedido.observaciones && (
        <div className="text-sm text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded px-3 py-2">
          ⚠️ {pedido.observaciones}
        </div>
      )}

      {/* Barra verde: el cadete puede marcar como LISTO él mismo */}
      {pedido.estado === 'en_cocina' && (
        <div className="pt-2 pb-1">
          <SwipeToConfirm
            key={`listo-${pedido.id}-${pedido.estado}`}
            onConfirm={marcarComoListo}
            texto="DESLIZÁ >"
            variante="verde"
          />
        </div>
      )}

      {/* Estado "En Camino" con opción a entregar (cuando está listo para el cadete, ya está en camino hacia el cliente) */}
      {(pedido.estado === 'listo' || pedido.estado === 'en_camino') && (
        <div className="pt-2 pb-1 flex flex-col gap-2">
          <div className="w-full text-center py-2 bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 uppercase tracking-widest text-xs animate-pulse">
            En Camino
          </div>
          <SwipeToConfirm
            key={`entrega-${pedido.id}-${pedido.estado}`}
            onConfirm={entregarPedido}
            texto="Deslizá para Entregar"
            variante="rojo"
          />
        </div>
      )}
    </div>
  )
}

export default function PaginaCadeteria() {
  const { pedidos, cambiarEstado, dbEstado, configuracionOperativa } = usarPedidos()
  const { usuarioActivo, estaListoAuth, cerrarSesion } = usarAuth()
  const [errorGps, setErrorGps] = useState<string | null>(null)

  // Estado GPS de los cadetes activos (para el admin)
  const [estadoGpsCadetes, setEstadoGpsCadetes] = useState<Record<string, { activo: boolean; hace: string }>>({})

  // Polling del estado GPS de cadetes activos (solo para admin)
  useEffect(() => {
    if (!usuarioActivo || usuarioActivo.rol !== 'admin') return

    const consultarEstadoGps = async () => {
      try {
        const res = await supabase
          .from('cadetes')
          .select('id, nombre, updated_at, gps_activo')
          .eq('activo', true)
        
        if (res.data) {
          const ahora = Date.now()
          const nuevoEstado: Record<string, { activo: boolean; hace: string }> = {}
          
          for (const c of res.data) {
            const updatedAt = c.updated_at ? new Date(c.updated_at).getTime() : 0
            const segundos = Math.floor((ahora - updatedAt) / 1000)
            const gpsActivo = c.gps_activo !== false && segundos < 120 // más de 2min = sin señal
            
            let hace = ''
            if (segundos < 60) hace = `${segundos}s`
            else if (segundos < 3600) hace = `${Math.floor(segundos / 60)}min`
            else hace = `+1h`

            nuevoEstado[c.id] = { activo: gpsActivo, hace }
          }
          setEstadoGpsCadetes(nuevoEstado)
        }
      } catch (_) {}
    }

    consultarEstadoGps()
    const intervalo = setInterval(consultarEstadoGps, 15000) // cada 15s
    return () => clearInterval(intervalo)
  }, [usuarioActivo])

  // Guardar última ubicación y marca de tiempo para el control/throttling de GPS
  const ultimasCoordenadasRef = useRef<Coordenadas | null>(null)
  const ultimaActualizacionGpsRef = useRef<number>(0)

  // Cadetería: solo pedidos delivery listos o en preparación de este cadete (o todos si es admin)
  const pedidosCadeteria = pedidos.filter(
    (p) =>
      esPedidoDelivery(p) &&
      (p.estado === 'en_cocina' || p.estado === 'listo' || p.estado === 'en_camino') &&
      (usuarioActivo?.rol === 'admin' || p.cadete_id === usuarioActivo?.usuario)
  )

  const pedidosListos = pedidosCadeteria.filter(p => p.estado === 'listo' || p.estado === 'en_camino')
  const hayPedidosListos = pedidosListos.length > 0
  const [pestaña, setPestaña] = useState<'activos' | 'historial'>('activos')
  const [alertaVisibility, setAlertaVisibility] = useState(false)

  const pedidosListosRef = useRef<Pedido[]>([])

  useEffect(() => {
    pedidosListosRef.current = pedidosListos
  }, [pedidosListos])

  // Mantener la pantalla encendida (WakeLock) durante el reparto
  useEffect(() => {
    let wakeLock: any = null

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && hayPedidosListos) {
          wakeLock = await (navigator as any).wakeLock.request('screen')
        }
      } catch (err) {
        console.error('Error al pedir WakeLock:', err)
      }
    }

    if (hayPedidosListos && usuarioActivo && usuarioActivo.rol !== 'admin') {
      requestWakeLock()
    } else if (wakeLock) {
      wakeLock.release().catch(console.error)
      wakeLock = null
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hayPedidosListos) {
        requestWakeLock()
        setAlertaVisibility(false)
      } else if (document.visibilityState === 'hidden' && hayPedidosListos) {
        // Mostrar alerta si minimiza la app en pleno reparto
        setAlertaVisibility(true)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 500])
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wakeLock !== null) {
        wakeLock.release().catch(console.error)
      }
    }
  }, [hayPedidosListos, usuarioActivo])

  // Seguimiento GPS en tiempo real
  useEffect(() => {
    // Si no es el cadete o no hay pedidos listos, no rastrear
    if (!usuarioActivo || usuarioActivo.rol === 'admin' || !hayPedidosListos) {
      setErrorGps(null)
      // Detección de App Nativa (Expo) para detener
      if (typeof window !== 'undefined' && (window as any).isNativeApp && (window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'STOP_TRACKING' }));
      }
      // Resetear referencias al detener el rastreo
      ultimasCoordenadasRef.current = null
      ultimaActualizacionGpsRef.current = 0
      return
    }

    // Forzar actualización inmediata en el primer tick del nuevo rastreo
    ultimasCoordenadasRef.current = null
    ultimaActualizacionGpsRef.current = 0

    let watchId: number

    const iniciarRastreo = async () => {
      // Detección de App Nativa (Expo) para iniciar rastreo
      if (typeof window !== 'undefined' && (window as any).isNativeApp && (window as any).ReactNativeWebView) {
        console.log('App Nativa Detectada: Delegando el rastreo a Expo (Segundo Plano)')
        ;(window as any).ReactNativeWebView.postMessage(JSON.stringify({ 
          type: 'START_TRACKING', 
          cadeteId: usuarioActivo.usuario 
        }));
        return; // La cáscara nativa se encarga
      }

      if (!('geolocation' in navigator)) {
        setErrorGps('La geolocalización no está soportada en este navegador.')
        return
      }

      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          // Filtro Anti-Saltos: Ignorar lecturas con precisión peor a 40 metros
          if (position.coords.accuracy > 40) {
            console.log('Lectura GPS ignorada por baja precisión:', position.coords.accuracy)
            return
          }

          setErrorGps(null)
          const coords = {
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
          }

          const ahora = Date.now()
          const tiempoTranscurrido = ahora - ultimaActualizacionGpsRef.current

          // 1. Throttling de tiempo: límite máximo de una actualización cada 8 segundos
          if (tiempoTranscurrido < 8000) {
            return
          }

          // 2. Filtro de distancia: solo actualizar si se movió más de 10 metros (0.01 km)
          if (ultimasCoordenadasRef.current) {
            const distanciaKm = calcularDistanciaKm(ultimasCoordenadasRef.current, coords)
            if (distanciaKm < 0.01) {
              return
            }
          }

          // Guardar referencias del último envío exitoso
          ultimasCoordenadasRef.current = coords
          ultimaActualizacionGpsRef.current = ahora

          // Usar la referencia más reciente de pedidos listos para evitar el cierre de estado (stale closure)
          const pedidosIds = pedidosListosRef.current.map(p => p.id)
          if (pedidosIds.length === 0) return

          try {
            const respuesta = await fetch('/api/admin/pedidos', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                accion: 'actualizar_gps',
                ids: pedidosIds,
                cadete_coordenadas: coords
              })
            })

            if (!respuesta.ok) {
              const errorData = await respuesta.json().catch(() => ({}))
              throw new Error(errorData.error || `Error del servidor: ${respuesta.status}`)
            }
          } catch (e) {
            console.error('Error enviando coordenadas de cadete', e)
          }
        },
        (error) => {
          console.error('Error obteniendo ubicación', error)
          const mensajes: Record<number, string> = {
            1: 'Permiso de ubicación denegado. Habilitá el acceso al GPS en la barra del navegador para poder transmitir tu recorrido.',
            2: 'Ubicación no disponible. Asegurá de tener el GPS activado o de que el emulador esté enviando coordenadas.',
            3: 'Tiempo de espera agotado al buscar señal GPS. Reintentando...',
          }
          setErrorGps(mensajes[error.code] || 'Error al obtener la ubicación.')
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      )
    }

    iniciarRastreo()

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [usuarioActivo, hayPedidosListos])

  // Recaudación y conteo del cadete (entregados hoy)
  const hoy = obtenerFechaNegocio()
  const pedidosEntregadosHoy = pedidos.filter(
    (p) =>
      esPedidoDelivery(p) &&
      p.estado === 'entregado' &&
      p.fecha === hoy &&
      (usuarioActivo?.rol === 'admin' || p.cadete_id === usuarioActivo?.usuario)
  )
  const cantidadEnvios = pedidosEntregadosHoy.length
  const recaudacionEnvios = pedidosEntregadosHoy.reduce((acc, curr) => acc + (curr.costoEnvio || 0), 0)
  const montoBaseCadete = (configuracionOperativa as any)?.montoBaseCadete ?? 4000
  const totalConBase = recaudacionEnvios + montoBaseCadete

  if (!estaListoAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chefsy-50">
        <div className="w-10 h-10 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!usuarioActivo) {
    return <LoginPage />
  }

  const esAdmin = usuarioActivo.rol === 'admin'

  return (
    <div className={esAdmin ? "min-h-full pb-8" : "min-h-screen bg-chefsy-50"}>
      {esAdmin ? (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
              <Bike size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 leading-tight">Cadetería</h1>
              <p className="text-xs text-gray-400 dark:text-slate-400">
                Pedidos asignados y listos para reparto (Solo Delivery)
              </p>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider select-none border transition-all duration-300",
              dbEstado === 'conectado'
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                : dbEstado === 'desconectado'
                  ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 animate-pulse"
                  : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30"
            )}>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                dbEstado === 'conectado'
                  ? "bg-emerald-500 animate-pulse"
                  : dbEstado === 'desconectado'
                    ? "bg-red-500"
                    : "bg-slate-400"
              )} />
              <span>
                {dbEstado === 'conectado' ? 'ONLINE' : dbEstado === 'desconectado' ? 'SIN BASE DE DATOS' : 'CONECTANDO...'}
              </span>
            </div>
          </div>
          <a
            href="/api/cadeteria/descargar-apk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5 shadow-sm border border-emerald-500/30 shrink-0"
            title="Descargar última versión APK compilada por GitHub Actions"
          >
            <Download size={14} />
            <span>Descargar APK Cadete</span>
          </a>
        </div>
      ) : (
        <header className="bg-chefsy border-b border-chefsy-700 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-xl">
              <Bike size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Cadetería</h1>
              <p className="text-xs text-chefsy-200">Solo delivery</p>
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider select-none border transition-all duration-300",
              dbEstado === 'conectado'
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                : dbEstado === 'desconectado'
                  ? "bg-red-950/40 text-red-400 border-red-900/40 animate-pulse"
                  : "bg-slate-850/40 text-slate-400 border-slate-700/40"
            )}>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                dbEstado === 'conectado'
                  ? "bg-emerald-400 animate-pulse"
                  : dbEstado === 'desconectado'
                    ? "bg-red-500"
                    : "bg-slate-400"
              )} />
              <span>
                {dbEstado === 'conectado' ? 'ONLINE' : dbEstado === 'desconectado' ? 'SIN BASE' : 'CONECTANDO'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/cadeteria/descargar-apk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 shadow-sm border border-emerald-500/30"
              title="Descargar última versión APK de Cadetería"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Descargar</span> APK
            </a>
            <button
              onClick={() => mutate('pedidosActivos')}
              className="text-xs bg-chefsy-600 hover:bg-chefsy-500 text-white font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            >
              <RefreshCw size={14} />
              Actualizar
            </button>
            {usuarioActivo?.rol !== 'admin' && <BotonNotificaciones />}
            <button
              onClick={cerrarSesion}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>
      )}

      <main className={esAdmin ? "max-w-xl mx-auto space-y-4" : "max-w-md mx-auto p-4 space-y-4"}>
        {alertaVisibility && (
          <div className="bg-red-600 text-white p-4 rounded-2xl text-sm font-bold flex items-start gap-2.5 shadow-xl animate-bounce">
            <span className="text-xl shrink-0">🚨</span>
            <div>
              <p className="text-lg">¡CUIDADO!</p>
              <p className="mt-1 font-medium text-red-100">Minimizaste la app. El GPS del cliente se detuvo. Por favor, mantené esta pantalla abierta mientras estés en camino para no fallarle al cliente.</p>
            </div>
          </div>
        )}
        
        {errorGps && (
          <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5 shadow-sm animate-[pulse_2s_infinite]">
            <span className="text-base shrink-0">⚠️</span>
            <div>
              <p className="font-bold">Advertencia de Ubicación:</p>
              <p className="mt-0.5 leading-relaxed">{errorGps}</p>
            </div>
          </div>
        )}
        {!esAdmin && (
          <>
            <div className="bg-gradient-to-r from-chefsy-800 to-chefsy-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden mb-3 animate-[slideIn_0.25s_ease-out]">
              <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                <Bike size={120} />
              </div>
              <div className="relative z-10">
                <h2 className="text-lg font-bold">
                  {usuarioActivo.usuario === 'paulo' ? '¡Hola, Paulo! 👋' : `¡Hola, ${usuarioActivo.nombre}! 👋`}
                </h2>
                <p className="text-xs text-chefsy-100 mt-1">Recordá, nunca te cortes solo!.</p>
                {pedidosListos.length > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded text-[10px] font-bold tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    MANTENIENDO PANTALLA ACTIVA PARA GPS
                  </div>
                )}
              </div>
            </div>

            {/* Cartel de Recaudación, Base Fija y Envíos Hechos */}
            <div className="grid grid-cols-2 gap-3 mb-4 animate-[slideIn_0.25s_ease-out]">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm flex flex-col gap-0.5 transition-colors">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Viajes Entregados</span>
                <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">{cantidadEnvios} {cantidadEnvios === 1 ? 'viaje' : 'viajes'}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">Entregas hechas hoy</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm flex flex-col gap-0.5 transition-colors">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recaudado Viajes</span>
                <span className="text-base font-extrabold text-slate-700 dark:text-slate-300">{formatearPrecio(recaudacionEnvios)}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">Por costo de envíos</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm flex flex-col gap-0.5 transition-colors">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Base Cadete</span>
                <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">{formatearPrecio(montoBaseCadete)}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">Base fija configurada</span>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-3.5 rounded-2xl shadow-sm flex flex-col gap-0.5 transition-colors">
                <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Total a Cobrar</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-300">{formatearPrecio(totalConBase)}</span>
                <span className="text-[9px] text-emerald-700 dark:text-emerald-500 font-medium">Viajes + Base</span>
              </div>
            </div>
            {/* Tabs para Cadete */}
            <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl mb-4 animate-[slideIn_0.25s_ease-out]">
              <button
                onClick={() => setPestaña('activos')}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                  pestaña === 'activos' 
                    ? "bg-white dark:bg-slate-700 text-chefsy-800 dark:text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Activos ({pedidosCadeteria.length})
              </button>
              <button
                onClick={() => setPestaña('historial')}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                  pestaña === 'historial' 
                    ? "bg-white dark:bg-slate-700 text-chefsy-800 dark:text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Entregados ({pedidosEntregadosHoy.length})
              </button>
            </div>
          </>
        )}

        {esAdmin && Object.keys(estadoGpsCadetes).length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">📡 Estado GPS Cadetes</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(estadoGpsCadetes).map(([id, estado]) => (
                <div
                  key={id}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    estado.activo
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                      : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                  )}
                >
                  <span className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    estado.activo ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  )} />
                  <span>{id}</span>
                  <span className="opacity-60 text-[10px]">
                    {estado.activo ? `hace ${estado.hace}` : `Sin señal (${estado.hace})`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel de Diagnóstico GPS Detallado — solo para admins */}
        {esAdmin && <PanelDiagnosticoGPS />}

        {esAdmin || pestaña === 'activos' ? (
          pedidosCadeteria.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">
              No hay pedidos delivery para repartir en este momento.
            </div>
          ) : (
            pedidosCadeteria.map((pedido) => (
              <TarjetaPedidoCadete key={pedido.id} pedido={pedido} cambiarEstado={cambiarEstado} />
            ))
          )
        ) : null}

        {!esAdmin && pestaña === 'historial' && (
          pedidosEntregadosHoy.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">
              Aún no tenés pedidos entregados hoy.
            </div>
          ) : (
            <div className="space-y-3 animate-[slideIn_0.15s_ease-out]">
              {pedidosEntregadosHoy.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{p.cliente}</p>
                    <p className="text-[11px] text-slate-500 truncate">{p.direccion}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate italic">
                      {p.productos.map(prod => `${prod.cantidad}x ${prod.nombre}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{formatearPrecio(p.total)}</p>
                    <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                      Envío: {formatearPrecio(p.costoEnvio || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>
      <CalculadoraSutil />
    </div>
  )
}
