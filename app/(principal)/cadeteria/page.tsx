'use client'

import { usarPedidos } from '@/contexto/PedidosContexto'
import BadgeEstado from '@/components/pedidos/BadgeEstado'
import InfoEntregaPedido from '@/components/pedidos/InfoEntregaPedido'
import { esPedidoDelivery } from '@/lib/entrega'
import { formatearPrecio } from '@/lib/utils'
import Link from 'next/link'
import { MessageCircle, MapPin } from 'lucide-react'
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

export default function PaginaCadeteria() {
  const { pedidos, cambiarEstado } = usarPedidos()
  const { usuarioActivo, estaListoAuth, cerrarSesion } = usarAuth()

  // Cadetería: solo pedidos delivery listos o en reparto
  const pedidosCadeteria = pedidos.filter(
    (p) =>
      esPedidoDelivery(p) &&
      (p.estado === 'listo' || p.estado === 'en_reparto')
  )

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
        {pedidosCadeteria.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            No hay pedidos delivery para repartir en este momento.
          </div>
        ) : (
          pedidosCadeteria.map((pedido) => (
            <div
              key={pedido.id}
              className="bg-white dark:bg-slate-900 border border-chefsy-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 animate-[slideIn_0.2s_ease-out] transition-colors"
            >
              <div className="flex items-center justify-between">
                <BadgeEstado estado={pedido.estado} />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{pedido.hora}</span>
                  <TimerPedido fecha={pedido.fecha} hora={pedido.hora} estado={pedido.estado} />
                </div>
              </div>

              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{pedido.cliente}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-sm text-gray-500 dark:text-slate-400">{pedido.telefono}</span>
                  <a
                    href={redireccionarWhatsApp(pedido.telefono, pedido.cliente)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full transition-colors shrink-0 shadow-sm"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                  {esPedidoDelivery(pedido) && pedido.coordenadas && (
                    <a
                      href={crearEnlaceGoogleMaps(pedido.coordenadas)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full transition-colors shrink-0 shadow-sm"
                    >
                      <MapPin size={12} /> Google Maps
                    </a>
                  )}
                </div>
              </div>

              <InfoEntregaPedido pedido={pedido} destacado />

              <div className="text-sm text-gray-650 dark:text-slate-300 space-y-0.5">
                {pedido.productos.map((producto) => (
                  <p key={producto.id}>
                    {producto.cantidad}× {producto.nombre}
                  </p>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-3">
                <div>
                  <p className="text-xs text-gray-400">Cobrar</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {formatearPrecio(pedido.total)}
                  </p>
                </div>
                <span className="text-sm text-gray-500 dark:text-slate-400 capitalize">{pedido.metodoPago}</span>
              </div>

              {pedido.observaciones && (
                <div className="text-sm text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded px-3 py-2">
                  ⚠️ {pedido.observaciones}
                </div>
              )}

              {pedido.estado === 'listo' && (
                <button
                  onClick={() => cambiarEstado(pedido.id, 'en_reparto')}
                  className="w-full bg-chefsy text-white py-3.5 rounded-md font-semibold text-base hover:bg-chefsy-700"
                >
                  🛵 Iniciar Reparto
                </button>
              )}

              {pedido.estado === 'en_reparto' && (
                <button
                  onClick={() => cambiarEstado(pedido.id, 'entregado')}
                  className="w-full bg-chefsy-500 text-white py-3.5 rounded-md font-semibold text-base hover:bg-chefsy-700"
                >
                  ✓ Marcar como Entregado
                </button>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  )
}
