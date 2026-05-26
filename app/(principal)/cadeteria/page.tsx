'use client'

import { useState, useEffect } from 'react'
import { Pedido, EstadoPedido } from '@/tipos'
import { usarPedidos } from '@/contexto/PedidosContexto'
import BadgeEstado from '@/components/pedidos/BadgeEstado'
import InfoEntregaPedido from '@/components/pedidos/InfoEntregaPedido'
import { esPedidoDelivery } from '@/lib/entrega'
import { formatearPrecio } from '@/lib/utils'
import Link from 'next/link'
import { MessageCircle, MapPin, Bike } from 'lucide-react'
import { crearEnlaceGoogleMaps } from '@/lib/ubicacion'
import { usarAuth } from '@/contexto/AuthContexto'
import LoginPage from '@/components/auth/LoginPage'
import TimerPedido from '@/components/pedidos/TimerPedido'

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
  cambiarEstado: (id: string, estado: EstadoPedido) => void
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
    if (nuevoEstado === 'entregado' || nuevoEstado === 'cancelado') {
      localStorage.removeItem(`original-pago-${pedido.id}`)
    }
    cambiarEstado(id, nuevoEstado)
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
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-500 dark:text-slate-400 capitalize font-semibold">
            {pedido.metodoPago}
          </span>
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
  const { pedidos, cambiarEstado } = usarPedidos()
  const { usuarioActivo, estaListoAuth, cerrarSesion } = usarAuth()

  // Cadetería: solo pedidos delivery listos o en reparto
  const pedidosCadeteria = pedidos.filter(
    (p) =>
      esPedidoDelivery(p) &&
      (p.estado === 'listo' || p.estado === 'en_reparto')
  )

  // Recaudación y conteo del cadete (entregados hoy)
  const hoy = new Date().toISOString().split('T')[0]
  const pedidosEntregadosHoy = pedidos.filter(
    (p) =>
      esPedidoDelivery(p) &&
      p.estado === 'entregado' &&
      p.fecha === hoy
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
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">🛵 Cadetería</h1>
            <p className="text-xs text-gray-400 dark:text-slate-400">
              Pedidos asignados y listos para reparto (Solo Delivery)
            </p>
          </div>
        </div>
      ) : (
        <header className="bg-chefsy border-b border-chefsy-700 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-white">🛵 Cadetería</h1>
            <p className="text-xs text-chefsy-200">Solo delivery</p>
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
        {!esAdmin && (
          <>
            <div className="bg-gradient-to-r from-chefsy-800 to-chefsy-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden mb-3 animate-[slideIn_0.25s_ease-out]">
              <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                <Bike size={120} />
              </div>
              <div className="relative z-10">
                <h2 className="text-lg font-bold">¡Hola, cadete! 👋</h2>
                <p className="text-xs text-chefsy-100 mt-1">¿Listo para salir a la calle? Repartí con cuidado.</p>
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
          </>
        )}

        {pedidosCadeteria.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            No hay pedidos delivery para repartir en este momento.
          </div>
        ) : (
          pedidosCadeteria.map((pedido) => (
            <TarjetaPedidoCadete key={pedido.id} pedido={pedido} cambiarEstado={cambiarEstado} />
          ))
        )}
      </main>
    </div>
  )
}
