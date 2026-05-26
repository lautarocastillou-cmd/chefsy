'use client'

import { Pedido } from '@/tipos'
import { formatearPrecio } from '@/lib/utils'
import {
  obtenerEtiquetaAccionEstado,
  obtenerSiguienteEstado,
} from '@/lib/entrega'
import { usarPedidos } from '@/contexto/PedidosContexto'
import BadgeEstado from './BadgeEstado'
import InfoEntregaPedido from './InfoEntregaPedido'
import TimerPedido from './TimerPedido'
import { Copy, Check, Printer } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const etiquetaMetodoPago: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

const bordesPorEstado: Record<Pedido['estado'], string> = {
  nuevo:      'border-l-[3px] border-l-blue-500',
  en_cocina:  'border-l-[3px] border-l-orange-500',
  listo:      'border-l-[3px] border-l-amber-500',
  en_reparto: 'border-l-[3px] border-l-purple-500',
  entregado:  'border-l-[3px] border-l-green-500',
  cancelado:  'border-l-[3px] border-l-red-500',
}

interface PropsTarjetaPedido {
  pedido: Pedido
  soloLectura?: boolean
}

export default function TarjetaPedido({ pedido, soloLectura = false }: PropsTarjetaPedido) {
  const { cambiarEstado, editarPedido } = usarPedidos()
  const siguienteEstado = obtenerSiguienteEstado(pedido.estado, pedido.tipoEntrega)
  const [copiado, setCopiado] = useState(false)
  const [editandoNota, setEditandoNota] = useState(false)
  const [notaTemporal, setNotaTemporal] = useState(pedido.observaciones || '')

  useEffect(() => {
    setNotaTemporal(pedido.observaciones || '')
  }, [pedido.observaciones])

  const esFinal = pedido.estado === 'entregado' || pedido.estado === 'cancelado'

  const manejarAvance = () => {
    if (siguienteEstado) cambiarEstado(pedido.id, siguienteEstado)
  }

  const manejarCancelacion = () => {
    cambiarEstado(pedido.id, 'cancelado')
  }

  const copiarParaWhatsApp = () => {
    const productosText = pedido.productos.map(p => `${p.cantidad}x ${p.nombre}`).join('\n')
    
    let direccionTexto = `📍 ${pedido.direccion || pedido.tipoEntrega}`
    if (pedido.coordenadas) {
      direccionTexto += `\n🗺️ Mapa: https://www.google.com/maps?q=${pedido.coordenadas.latitud},${pedido.coordenadas.longitud}`
    }

    const texto = `*Pedido de ${pedido.cliente}*
📞 ${pedido.telefono}
${direccionTexto}

*Detalle:*
${productosText}

💵 Total: ${formatearPrecio(pedido.total)} (${etiquetaMetodoPago[pedido.metodoPago]})
${pedido.observaciones ? `💬 ${pedido.observaciones}` : ''}`.trim()

    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const imprimirComanda = () => {
    window.open(`/imprimir/${pedido.id}`, '_blank', 'width=400,height=600')
  }

  return (
    <div className={cn(
      "bg-white border border-slate-100 hover:border-slate-200 rounded-xl p-3 flex flex-col gap-2.5 shadow-sm hover:shadow transition-all duration-200 relative overflow-hidden",
      bordesPorEstado[pedido.estado]
    )}>
      {/* Cabecera del pedido */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-gray-900 text-sm truncate" title={pedido.cliente}>
            {pedido.cliente}
          </span>
          <span className="text-[10px] text-gray-400 truncate shrink-0">
            ({pedido.telefono})
          </span>
          <div className="flex items-center gap-0.5 shrink-0 ml-1">
            <button 
              onClick={copiarParaWhatsApp}
              className="text-gray-400 hover:text-chefsy-600 transition-colors p-0.5"
              title="Copiar para WhatsApp"
            >
              {copiado ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            </button>
            <button 
              onClick={imprimirComanda}
              className="text-gray-400 hover:text-chefsy-600 transition-colors p-0.5"
              title="Imprimir Comanda"
            >
              <Printer size={12} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-gray-400">{pedido.hora}</span>
          <TimerPedido fecha={pedido.fecha} hora={pedido.hora} estado={pedido.estado} />
          <BadgeEstado estado={pedido.estado} />
        </div>
      </div>

      {/* Tipo de entrega e info geográfica */}
      <InfoEntregaPedido pedido={pedido} />

      {/* Lista de productos (muy compacta) */}
      <div className="border-t border-slate-100 pt-2 space-y-0.5">
        {pedido.productos.map((producto) => (
          <div key={producto.id} className="flex justify-between text-xs py-0.5">
            <span className="text-gray-600 font-medium truncate max-w-[200px]" title={`${producto.cantidad}x ${producto.nombre}`}>
              <span className="font-bold text-chefsy-700 mr-1">{producto.cantidad}×</span> 
              {producto.nombre}
            </span>
            <span className="text-gray-400 font-mono shrink-0 ml-2">
              {formatearPrecio(producto.precio * producto.cantidad)}
            </span>
          </div>
        ))}
      </div>

      {/* Resumen de Costos y Pago (una sola línea con selector interactivo) */}
      <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-gray-500">
          <select
            value={pedido.metodoPago}
            onChange={(e) => {
              const nuevoMetodo = e.target.value as any
              editarPedido({ ...pedido, metodoPago: nuevoMetodo })
            }}
            disabled={soloLectura}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border-none outline-none cursor-pointer transition-colors"
          >
            <option value="efectivo">💵 Efectivo</option>
            <option value="tarjeta">💳 Tarjeta</option>
            <option value="transferencia">📱 Transf.</option>
          </select>
          {pedido.costoEnvio !== undefined && pedido.costoEnvio > 0 && (
            <span className="text-blue-600 font-medium text-[11px]">
              + Envío ({formatearPrecio(pedido.costoEnvio)})
            </span>
          )}
          {!pedido.observaciones && !editandoNota && !soloLectura && (
            <button
              onClick={() => {
                setNotaTemporal('')
                setEditandoNota(true)
              }}
              className="text-[10px] text-chefsy-700 hover:text-chefsy-800 bg-chefsy-50 hover:bg-chefsy-100 px-1.5 py-0.5 rounded transition-colors font-medium ml-1"
            >
              + Nota
            </button>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-gray-400 mr-1.5 font-normal">Total</span>
          <span className="font-bold text-gray-900 text-sm">{formatearPrecio(pedido.total)}</span>
        </div>
      </div>

      {/* Editor de Notas / Observaciones inline */}
      {editandoNota ? (
        <div className="flex flex-col gap-1.5 border border-slate-200 bg-slate-50 rounded-lg p-2 animate-[slideIn_0.15s_ease-out]">
          <textarea
            value={notaTemporal}
            onChange={(e) => setNotaTemporal(e.target.value)}
            placeholder="Detalles del pago, débito, mitad/mitad, etc..."
            className="w-full text-xs p-1.5 border border-slate-200 rounded focus:outline-none focus:border-chefsy text-slate-700 bg-white"
            rows={2}
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => {
                setEditandoNota(false)
                setNotaTemporal(pedido.observaciones || '')
              }}
              className="px-2 py-0.5 border border-slate-200 text-slate-500 rounded text-[10px] hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                editarPedido({ ...pedido, observaciones: notaTemporal.trim() || undefined })
                setEditandoNota(false)
              }}
              className="px-2.5 py-0.5 bg-chefsy text-white rounded text-[10px] font-semibold hover:bg-chefsy-700"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        pedido.observaciones && (
          <div
            onClick={() => {
              if (!soloLectura) {
                setNotaTemporal(pedido.observaciones || '')
                setEditandoNota(true)
              }
            }}
            className={cn(
              "text-[11px] leading-relaxed text-amber-800 bg-amber-50/70 border border-amber-100/50 rounded-md px-2 py-1.5 flex items-start gap-1 relative group",
              !soloLectura && "cursor-pointer hover:bg-amber-100/50 transition-colors"
            )}
            title={!soloLectura ? "Haz clic para editar la nota" : undefined}
          >
            <span className="shrink-0">💬</span>
            <p className="flex-1 pr-8">{pedido.observaciones}</p>
            {!soloLectura && (
              <span className="text-[9px] text-amber-600 underline opacity-0 group-hover:opacity-100 absolute right-2 top-1.5 transition-opacity duration-150">
                Editar
              </span>
            )}
          </div>
        )
      )}

      {/* Botones de acción */}
      {!soloLectura && !esFinal && (
        <div className="flex gap-1.5 border-t border-slate-100 pt-2">
          {siguienteEstado ? (
            <>
              <button
                onClick={manejarAvance}
                className="flex-1 px-3 py-1.5 bg-chefsy text-white text-xs font-semibold rounded-md hover:bg-chefsy-700 transition-colors shadow-sm active:scale-[0.98]"
              >
                {obtenerEtiquetaAccionEstado(siguienteEstado, pedido.tipoEntrega)}
              </button>
              <button
                onClick={manejarCancelacion}
                className="px-2.5 py-1.5 border border-red-100 text-red-500 hover:text-red-650 text-xs font-medium rounded-md hover:bg-red-50 hover:border-red-200 transition-colors shrink-0"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={manejarCancelacion}
              className="w-full px-3 py-1.5 border border-red-100 text-red-550 text-xs font-medium rounded-md hover:bg-red-50 transition-colors"
            >
              Cancelar Pedido
            </button>
          )}
        </div>
      )}
    </div>
  )
}
