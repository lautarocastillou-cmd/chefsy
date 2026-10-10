'use client'

// ─────────────────────────────────────────────────────
// components/cadeteria/TarjetaPedidoCadete.tsx
// Tarjeta de pedido para el flujo de cadetería (contacto, navegación,
// tiempos, cobro y cambios de estado por swipe).
// Extraída de app/(principal)/cadeteria/page.tsx para reutilizarla
// en la Cadetería unificada.
// ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Pedido, EstadoPedido } from '@/tipos'
import BadgeEstado from '@/components/pedidos/BadgeEstado'
import InfoEntregaPedido from '@/components/pedidos/InfoEntregaPedido'
import { esPedidoDelivery } from '@/lib/entrega'
import { formatearPrecio } from '@/lib/utils'
import { MessageCircle, MapPin, Phone, AlertTriangle, Camera } from 'lucide-react'
import StreetViewFachada from '@/components/ubicacion/StreetViewFachada'
import { crearEnlaceGoogleMaps, esEnlaceOCoordenadas } from '@/lib/ubicacion'
import TimerPedido from '@/components/pedidos/TimerPedido'
import SwipeToConfirm from '@/components/ui/SwipeToConfirm'
import { notificarError } from '@/lib/notificaciones'

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

export interface PropsTarjetaPedidoCadete {
  pedido: Pedido
  cambiarEstado: (id: string, estado: EstadoPedido, mostrarDeshacer?: boolean) => void
  esAdmin?: boolean
  posicionParada?: number
  totalParadas?: number
  distanciaLocalTexto?: string
  onAbrirOrganizar?: () => void
}

export default function TarjetaPedidoCadete({
  pedido,
  cambiarEstado,
  esAdmin,
  posicionParada,
  totalParadas,
  distanciaLocalTexto,
  onAbrirOrganizar,
}: PropsTarjetaPedidoCadete) {
  const [metodoOriginal, setMetodoOriginal] = useState<string | null>(null)
  const [mostrarFachada, setMostrarFachada] = useState(false)

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
      notificarError('Error al intentar marcar como entregado. Reintentá.')
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
      notificarError('Error al marcar como listo. Reintentá.')
      throw e
    }
  }

  return (
    <div
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 240px',
      }}
      className="bg-white dark:bg-slate-900 border border-chefsy-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 animate-[slideIn_0.2s_ease-out] transition-colors"
    >
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

      {/* Indicador de Parada / Turno del Recorrido */}
      {totalParadas !== undefined && totalParadas > 1 && (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl p-2.5 flex items-center justify-between gap-2 transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                  Parada {posicionParada} de {totalParadas}
                </span>
                {pedido.orden_entrega != null ? (
                  <span className="text-[9px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded font-bold">
                    Turno Manual
                  </span>
                ) : (
                  <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded font-bold">
                    Por cercanía {distanciaLocalTexto ? `(${distanciaLocalTexto})` : ''}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                {posicionParada === 1
                  ? 'Próxima parada (destino actual del cadete)'
                  : `Entrega #${posicionParada} (el cliente sabe que tiene ${Number(posicionParada) - 1} entrega${Number(posicionParada) - 1 === 1 ? '' : 's'} antes)`}
              </p>
            </div>
          </div>

          {esAdmin && onAbrirOrganizar && (
            <button
              type="button"
              onClick={onAbrirOrganizar}
              className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              Cambiar turno
            </button>
          )}
        </div>
      )}

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
        {esPedidoDelivery(pedido) && pedido.coordenadas && (
          <button
            type="button"
            onClick={() => setMostrarFachada(true)}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold px-2.5 py-1.5 rounded-full transition-colors shrink-0 shadow-sm border border-slate-600 cursor-pointer active:scale-95"
            title="Ver fotografía de la fachada de la casa en Street View"
          >
            <Camera size={12} className="text-emerald-400" /> Fachada
          </button>
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
                  PAGADO
                </span>
              ) : (
                <span className="inline-flex items-center bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                  Pendiente Impactar
                </span>
              )}
            </div>
          )}
          {cambioMetodo && (
            <p className="text-[10px] font-black text-red-600 dark:text-red-400 animate-pulse mt-0.5">
              ¡MÉTODO CAMBIÓ! (Era: {metodoOriginal.toUpperCase()})
            </p>
          )}
        </div>
      </div>

      {pedido.observaciones && (
        <div className="text-sm text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded px-3 py-2 flex items-start gap-1.5">
          <AlertTriangle size={14} className="shrink-0 text-amber-500 mt-0.5" />
          <span>{pedido.observaciones}</span>
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
      {mostrarFachada && pedido.coordenadas && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-3 sm:p-4 animate-in fade-in"
          onClick={() => setMostrarFachada(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-4 space-y-3 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-extrabold text-white text-sm">
                Fachada • {pedido.cliente}
              </h3>
              <button
                type="button"
                onClick={() => setMostrarFachada(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <StreetViewFachada
              lat={pedido.coordenadas.latitud}
              lng={pedido.coordenadas.longitud}
              modoCadete={true}
              titulo={`Frente del domicilio de ${pedido.cliente}`}
              subtitulo={esEnlaceOCoordenadas(pedido.direccion) ? 'Ubicación seleccionada en el mapa' : (pedido.direccion || 'Sin dirección especificada')}
            />
          </div>
        </div>
      )}
    </div>
  )
}
