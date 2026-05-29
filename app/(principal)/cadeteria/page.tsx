'use client'

import { useState, useEffect, useRef } from 'react'
import { Pedido, EstadoPedido, Coordenadas } from '@/tipos'
import { usarPedidos } from '@/contexto/PedidosContexto'
import BadgeEstado from '@/components/pedidos/BadgeEstado'
import InfoEntregaPedido from '@/components/pedidos/InfoEntregaPedido'
import { esPedidoDelivery } from '@/lib/entrega'
import { formatearPrecio, cn } from '@/lib/utils'
import Link from 'next/link'
import { MessageCircle, MapPin, Bike, Phone } from 'lucide-react'
import { crearEnlaceGoogleMaps, calcularDistanciaKm } from '@/lib/ubicacion'
import { usarAuth } from '@/contexto/AuthContexto'
import LoginPage from '@/components/auth/LoginPage'
import TimerPedido from '@/components/pedidos/TimerPedido'
import { supabase } from '@/lib/supabase'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import CalculadoraSutil from '@/components/herramientas/CalculadoraSutil'

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
  
  const mensaje = encodeURIComponent(`¡Hola ${cliente}! Soy el repartidor de Chefsy, estoy en camino con tu pedido. 🛵`)
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
      setMetodoOriginal(guardado)
    } else {
      localStorage.setItem(key, pedido.metodoPago)
      setMetodoOriginal(pedido.metodoPago)
    }
  }, [pedido.id, pedido.metodoPago])

  const handleCambiarEstado = (id: string, nuevoEstado: EstadoPedido) => {
    let mensaje = ''
    if (nuevoEstado === 'en_reparto') {
      mensaje = '¿Estás seguro de iniciar el reparto de este pedido?'
    } else if (nuevoEstado === 'entregado') {
      mensaje = '¿Confirmás que entregaste este pedido exitosamente al cliente?'
    }

    if (mensaje && !window.confirm(mensaje)) {
      return
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (nuevoEstado === 'en_reparto') {
        navigator.vibrate([100, 50, 100])
      } else if (nuevoEstado === 'entregado') {
        navigator.vibrate([200, 100, 200])
      }
    }

    if (nuevoEstado === 'entregado' || nuevoEstado === 'cancelado') {
      localStorage.removeItem(`original-pago-${pedido.id}`)
    }
    // Pasamos false para que NO aparezca el botón de "Deshacer" al cadete
    cambiarEstado(id, nuevoEstado, false)
  }

  const cambioMetodo = metodoOriginal && metodoOriginal !== pedido.metodoPago

  return (
    <div className="bg-white dark:bg-slate-900 border border-chefsy-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 animate-[slideIn_0.2s_ease-out] transition-colors">
      {/* Cabecera del pedido: Cliente y Estado */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-extrabold text-gray-900 dark:text-slate-100 leading-snug">{pedido.cliente}</p>
          <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[11px] text-gray-500 dark:text-slate-400 font-medium">
            <span>{pedido.telefono}</span>
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
        {esPedidoDelivery(pedido) && pedido.coordenadas && (
          <a
            href={crearEnlaceGoogleMaps(pedido.coordenadas)}
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

      {pedido.estado === 'listo' && (
        <button
          onClick={() => handleCambiarEstado(pedido.id, 'en_reparto')}
          className="w-full bg-chefsy text-white py-3.5 rounded-md font-semibold text-base hover:bg-chefsy-700"
        >
          🛵 Iniciar Reparto
        </button>
      )}

      {pedido.estado === 'en_reparto' && (
        <button
          onClick={() => handleCambiarEstado(pedido.id, 'entregado')}
          className="w-full bg-chefsy-500 text-white py-3.5 rounded-md font-semibold text-base hover:bg-chefsy-700"
        >
          ✓ Marcar como Entregado
        </button>
      )}
    </div>
  )
}

export default function PaginaCadeteria() {
  const { pedidos, cambiarEstado, dbEstado } = usarPedidos()
  const { usuarioActivo, estaListoAuth, cerrarSesion } = usarAuth()
  const [errorGps, setErrorGps] = useState<string | null>(null)

  // Guardar última ubicación y marca de tiempo para el control/throttling de GPS
  const ultimasCoordenadasRef = useRef<Coordenadas | null>(null)
  const ultimaActualizacionGpsRef = useRef<number>(0)

  // Cadetería: solo pedidos delivery listos, en reparto o en preparación de este cadete (o todos si es admin)
  const pedidosCadeteria = pedidos.filter(
    (p) =>
      esPedidoDelivery(p) &&
      (p.estado === 'en_cocina' || p.estado === 'listo' || p.estado === 'en_reparto') &&
      (usuarioActivo?.rol === 'admin' || p.cadete_id === usuarioActivo?.usuario)
  )

  const pedidosEnReparto = pedidosCadeteria.filter(p => p.estado === 'en_reparto')
  const [pestaña, setPestaña] = useState<'activos' | 'historial'>('activos')

  // Seguimiento GPS en tiempo real
  useEffect(() => {
    // Si no es el cadete o no hay pedidos en reparto, no rastrear
    if (!usuarioActivo || usuarioActivo.rol === 'admin' || pedidosEnReparto.length === 0) {
      setErrorGps(null)
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
      if (!('geolocation' in navigator)) {
        setErrorGps('La geolocalización no está soportada en este navegador.')
        return
      }

      watchId = navigator.geolocation.watchPosition(
        async (position) => {
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

          // Actualizar las coordenadas en supabase para todos los pedidos activos en reparto
          const pedidosIds = pedidosEnReparto.map(p => p.id)
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
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
      )
    }

    iniciarRastreo()

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [usuarioActivo, pedidosEnReparto.length])

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
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">🛵 Cadetería</h1>
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
        </div>
      ) : (
        <header className="bg-chefsy border-b border-chefsy-700 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-white">🛵 Cadetería</h1>
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
          <button
            onClick={cerrarSesion}
            className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1"
          >
            Cerrar Sesión
          </button>
        </header>
      )}

      <main className={esAdmin ? "max-w-xl mx-auto space-y-4" : "max-w-md mx-auto p-4 space-y-4"}>
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
                  {usuarioActivo.usuario === 'paulo' ? '¡Hola, Paulo! 👋' : usuarioActivo.usuario === 'cufa' ? '¡Hola, Cufa! 👋' : `¡Hola, ${usuarioActivo.nombre}! 👋`}
                </h2>
                <p className="text-xs text-chefsy-100 mt-1">Recordá, nunca te cortes solo!.</p>
              </div>
            </div>

            {/* Cartel de Recaudación y Envíos Hechos */}
            <div className="grid grid-cols-2 gap-3.5 mb-4 animate-[slideIn_0.25s_ease-out]">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col gap-1 transition-colors">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recaudación Envíos</span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-450">{formatearPrecio(recaudacionEnvios)}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Monto de envío acumulado</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col gap-1 transition-colors">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Envíos Entregados</span>
                <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{cantidadEnvios} {cantidadEnvios === 1 ? 'envío' : 'envíos'}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Entregas hechas hoy</span>
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
