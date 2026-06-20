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
import { Copy, Check, Printer, MapPin, X, Trash2, Pencil, Undo2, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import MapaSeguimiento from '@/components/ubicacion/MapaSeguimiento'
import FormularioPedido from './FormularioPedido'

const etiquetaMetodoPago: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

const bordesPorEstado: Record<Pedido['estado'], string> = {
  nuevo:      'border-l-[3px] border-l-blue-500',
  en_cocina:  'border-l-[3px] border-l-orange-500',
  listo:      'border-l-[3px] border-l-amber-500',
  entregado:  'border-l-[3px] border-l-green-500',
  cancelado:  'border-l-[3px] border-l-red-500',
}

interface PropsTarjetaPedido {
  pedido: Pedido
  soloLectura?: boolean
}

export default function TarjetaPedido({ pedido, soloLectura = false }: PropsTarjetaPedido) {
  const { cambiarEstado, editarPedido, eliminarPedido, marcarPagoConfirmado, asignarCadete, cambiarMetodoPago, revertirEstado, cadetes } = usarPedidos()
  const siguienteEstado = obtenerSiguienteEstado(pedido.estado, pedido.tipoEntrega)
  const [copiado, setCopiado] = useState(false)
  const [editandoNota, setEditandoNota] = useState(false)
  const [notaTemporal, setNotaTemporal] = useState(pedido.observaciones || '')
  const [verMapa, setVerMapa] = useState(false)
  const [editandoPedidoCompleto, setEditandoPedidoCompleto] = useState(false)
  const [menuNotificacionesAbierto, setMenuNotificacionesAbierto] = useState(false)

  useEffect(() => {
    setNotaTemporal(pedido.observaciones || '')
  }, [pedido.observaciones])

  const [esAtrasado, setEsAtrasado] = useState(false)

  useEffect(() => {
    const calcularAtraso = () => {
      const ahora = Date.now()
      let fechaInicio: string | null | undefined = null
      let limiteMs = 0

      if (pedido.estado === 'nuevo') {
        fechaInicio = pedido.created_at
        limiteMs = 1 * 60 * 1000 // 1 min
      } else if (pedido.estado === 'en_cocina') {
        fechaInicio = pedido.cocina_at || pedido.created_at
        limiteMs = 45 * 60 * 1000 // 45 min
      } else if (pedido.estado === 'listo') {
        fechaInicio = pedido.listo_at || pedido.cocina_at || pedido.created_at
        limiteMs = 10 * 60 * 1000 // 10 min
      }

      if (!fechaInicio) {
        setEsAtrasado(false)
        return
      }

      const startMs = new Date(fechaInicio).getTime()
      setEsAtrasado(ahora - startMs >= limiteMs)
    }

    calcularAtraso()
    const interval = setInterval(calcularAtraso, 10000) // Recalcular cada 10 segundos
    return () => clearInterval(interval)
  }, [pedido])

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

  const enviarNotificacion = (mensaje: string) => {
    editarPedido({
      ...pedido,
      notificacion_manual: `${mensaje}|${Date.now()}`
    })
    setMenuNotificacionesAbierto(false)
    // Mostramos un alert o toast local para feedback del admin
    alert(`Notificación enviada al cliente: "${mensaje}"`)
  }

  const imprimirComanda = () => {
    window.open(`/imprimir/${pedido.id}`, '_blank', 'width=400,height=600')
  }

  return (
    <div className={cn(
      "bg-white dark:bg-[#252525] border border-slate-100 dark:border-[#3d3d3d] hover:border-slate-200 dark:hover:border-[#4d4d4d] rounded-xl p-3 flex flex-col gap-2.5 shadow-sm hover:shadow transition-all duration-200 relative overflow-hidden",
      bordesPorEstado[pedido.estado],
      esAtrasado && "border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
    )}>
      {/* Cabecera del pedido: Cliente y Estado */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-extrabold text-slate-800 dark:text-[#e6e6e6] text-sm truncate leading-snug" title={pedido.cliente}>
            {pedido.cliente}
          </h4>
          <div className="flex items-center flex-wrap gap-1.5 mt-1 text-xs text-slate-500 dark:text-[#a8a8a8] font-medium">
            <span>{pedido.telefono === 'Sin especificar' ? 'Tel: Sin especificar' : `Tel: ${pedido.telefono}`}</span>
            <span className="text-slate-300 dark:text-[#686868]">•</span>
            <span>{pedido.hora}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <BadgeEstado estado={pedido.estado} />
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setEditandoPedidoCompleto(true)}
              className="text-slate-450 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all p-1 rounded-md border border-slate-100 dark:border-[#3d3d3d] bg-white dark:bg-[#2f2f2f] shadow-sm"
              title="Editar Pedido"
            >
              <Pencil size={11} />
            </button>
            {pedido.estado !== 'nuevo' && pedido.estado !== 'cancelado' && (
              <button 
                onClick={() => {
                  if (window.confirm('¿Seguro que querés revertir este pedido al estado anterior?')) {
                    revertirEstado(pedido.id)
                  }
                }}
                className="text-orange-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all p-1 rounded-md border border-orange-100 dark:border-orange-900/50 bg-white dark:bg-[#2f2f2f] shadow-sm"
                title="Revertir al estado anterior"
              >
                <Undo2 size={11} />
              </button>
            )}
            <button 
              onClick={() => {
                if (window.confirm('¿Estás seguro de eliminar este pedido para siempre? (Esta acción no se puede deshacer)')) {
                  eliminarPedido(pedido.id)
                }
              }}
              className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all p-1 rounded-md border border-red-100 dark:border-red-900/50 bg-white dark:bg-[#2f2f2f] shadow-sm"
              title="Eliminar Pedido Definitivamente"
            >
              <Trash2 size={11} />
            </button>
            <button 
              onClick={copiarParaWhatsApp}
              className="text-slate-450 hover:text-chefsy hover:bg-slate-100 dark:hover:bg-[#3a3a3a] transition-all p-1 rounded-md border border-slate-100 dark:border-[#3d3d3d] bg-white dark:bg-[#2f2f2f] shadow-sm"
              title="Copiar para WhatsApp"
            >
              {copiado ? <Check size={11} className="text-green-500" /> : <Copy size={11} className="dark:text-[#a8a8a8]" />}
            </button>
            <button 
              onClick={imprimirComanda}
              className="text-slate-450 hover:text-chefsy hover:bg-slate-100 dark:hover:bg-[#3a3a3a] transition-all p-1 rounded-md border border-slate-100 dark:border-[#3d3d3d] bg-white dark:bg-[#2f2f2f] shadow-sm"
              title="Imprimir Comanda"
            >
              <Printer size={11} className="dark:text-[#a8a8a8]" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setMenuNotificacionesAbierto(!menuNotificacionesAbierto)}
                className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 transition-all p-1 rounded-md border border-yellow-100 dark:border-yellow-900/50 bg-white dark:bg-[#2f2f2f] shadow-sm"
                title="Avisar al cliente por la App"
              >
                <Bell size={11} className="dark:text-yellow-400" />
              </button>
              
              {menuNotificacionesAbierto && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#3d3d3d] rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-50 overflow-hidden flex flex-col">
                  <button onClick={() => enviarNotificacion('¡Tu pedido está en cocina! 🍳')} className="text-left px-3 py-2.5 text-[11px] font-bold text-slate-700 dark:text-[#e6e6e6] hover:bg-slate-50 dark:hover:bg-[#2a2a2a] border-b border-slate-100 dark:border-[#333] transition-colors">
                    Avisar: En Cocina
                  </button>
                  <button onClick={() => enviarNotificacion('¡Tu pedido está en camino! 🛵')} className="text-left px-3 py-2.5 text-[11px] font-bold text-slate-700 dark:text-[#e6e6e6] hover:bg-slate-50 dark:hover:bg-[#2a2a2a] border-b border-slate-100 dark:border-[#333] transition-colors">
                    Avisar: En Camino
                  </button>
                  <button onClick={() => enviarNotificacion('¡Tu pedido está listo para retirar! 🏪')} className="text-left px-3 py-2.5 text-[11px] font-bold text-slate-700 dark:text-[#e6e6e6] hover:bg-slate-50 dark:hover:bg-[#2a2a2a] transition-colors">
                    Avisar: Listo / Retiro
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Línea de Tiempos del Pedido */}
      <div className={cn(
        "bg-slate-50/70 dark:bg-[#2f2f2f] border border-slate-100/50 dark:border-[#3d3d3d] rounded-xl p-2 flex items-center justify-between gap-2 transition-all",
        esAtrasado && "bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30"
      )}>
        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#686868] tracking-wider flex items-center gap-1.5">
          {esAtrasado && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
          Tiempos
        </span>
        <TimerPedido pedido={pedido} />
      </div>

      {/* Tipo de entrega e info geográfica */}
      <InfoEntregaPedido pedido={pedido} />

      {/* Lista de productos (muy compacta) */}
      <div className="border-t border-slate-100 dark:border-[#3d3d3d] pt-2 space-y-0.5">
        {pedido.productos.map((producto) => (
          <div key={producto.id} className="flex justify-between text-xs py-0.5">
            <span className="text-gray-600 dark:text-[#a8a8a8] font-medium truncate max-w-[200px]" title={`${producto.cantidad}x ${producto.nombre}`}>
              <span className="font-bold text-chefsy-700 dark:text-chefsy-300 mr-1">{producto.cantidad}×</span> 
              {producto.nombre}
            </span>
            <span className="text-gray-400 dark:text-[#686868] font-mono shrink-0 ml-2">
              {formatearPrecio(producto.precio * producto.cantidad)}
            </span>
          </div>
        ))}
      </div>

      {/* Resumen de Costos y Pago (una sola línea con selector interactivo) */}
      <div className="border-t border-slate-100 dark:border-[#3d3d3d] pt-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-gray-500">
          <select
            value={pedido.metodoPago}
            onChange={(e) => {
              const nuevoMetodo = e.target.value as any
              cambiarMetodoPago(pedido.id, nuevoMetodo)
            }}
            disabled={soloLectura}
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border-none outline-none cursor-pointer transition-colors",
              pedido.metodoPago === 'sin_especificar' 
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 animate-pulse ring-1 ring-red-500 shadow-sm" 
                : "bg-slate-100 dark:bg-[#3a3a3a] hover:bg-slate-200 dark:hover:bg-[#444] text-slate-700 dark:text-[#e6e6e6]"
            )}
          >
            <option value="sin_especificar">⚠️ Falta Pago</option>
            <option value="efectivo">💵 Efectivo</option>
            <option value="tarjeta">💳 Tarjeta</option>
            <option value="transferencia">📱 Transf.</option>
            <option value="mixto">💵📱 Mixto</option>
          </select>
          {pedido.metodoPago === 'mixto' && (
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
              {pedido.montoEfectivo ? `💵${formatearPrecio(pedido.montoEfectivo)}` : ''}
              {pedido.montoEfectivo && (pedido.montoTransferencia || pedido.montoTarjeta) ? ' + ' : ''}
              {pedido.montoTransferencia ? `📱${formatearPrecio(pedido.montoTransferencia)}` : ''}
              {pedido.montoTransferencia && pedido.montoTarjeta ? ' + ' : ''}
              {pedido.montoTarjeta ? `💳${formatearPrecio(pedido.montoTarjeta)}` : ''}
            </span>
          )}
          {pedido.tipoEntrega === 'delivery' && (
            <select
              value={pedido.cadete_id || ''}
              onChange={(e) => {
                const selectedId = e.target.value
                const cad = cadetes.find(c => c.id === selectedId)
                asignarCadete(
                  pedido.id,
                  selectedId || null,
                  cad ? cad.nombre : null
                )
              }}
              disabled={soloLectura}
              className="bg-slate-100 dark:bg-[#3a3a3a] hover:bg-slate-200 dark:hover:bg-[#444] text-slate-700 dark:text-[#e6e6e6] px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border-none outline-none cursor-pointer transition-colors"
            >
              <option value="">🛵 Sin Cadete</option>
              {cadetes.map(c => (
                <option key={c.id} value={c.id}>🛵 {c.nombre}</option>
              ))}
            </select>
          )}
          {pedido.metodoPago === 'transferencia' && !soloLectura && (
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">¿Impactó?</span>
              <button 
                onClick={() => marcarPagoConfirmado(pedido.id, !pedido.pago_confirmado)}
                className={cn(
                  "relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors focus:outline-none",
                  pedido.pago_confirmado ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-700"
                )}
              >
                <span className={cn(
                  "inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform",
                  pedido.pago_confirmado ? "translate-x-[11px]" : "translate-x-0.5"
                )} />
              </button>
            </div>
          )}
          {pedido.costoEnvio !== undefined && pedido.costoEnvio > 0 && (
            <span className="text-blue-600 font-medium text-[11px] ml-1">
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
          <span className="text-[10px] text-gray-400 dark:text-[#686868] mr-1.5 font-normal">Total</span>
          <span className="font-bold text-gray-900 dark:text-[#e6e6e6] text-sm">{formatearPrecio(pedido.total)}</span>
        </div>
      </div>

      {/* Editor de Notas / Observaciones inline */}
      {editandoNota ? (
        <div className="flex flex-col gap-1.5 border border-slate-200 dark:border-[#3d3d3d] bg-slate-50 dark:bg-[#2f2f2f] rounded-lg p-2 animate-[slideIn_0.15s_ease-out]">
          <textarea
            value={notaTemporal}
            onChange={(e) => setNotaTemporal(e.target.value)}
            placeholder="Detalles del pago, débito, mitad/mitad, etc..."
            className="w-full text-xs p-1.5 border border-slate-200 dark:border-[#3d3d3d] rounded focus:outline-none focus:border-chefsy text-slate-700 dark:text-[#e6e6e6] bg-white dark:bg-[#2f2f2f]"
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
              "text-[11px] leading-relaxed text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-800/40 rounded-md px-2 py-1.5 flex items-start gap-1 relative group",
              !soloLectura && "cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-950/50 transition-colors"
            )}
            title={!soloLectura ? "Haz clic para editar la nota" : undefined}
          >
            <span className="shrink-0">💬</span>
            <p className="flex-1 pr-8">{pedido.observaciones}</p>
            {!soloLectura && (
              <span className="text-[9px] text-amber-600 dark:text-amber-400 underline opacity-0 group-hover:opacity-100 absolute right-2 top-1.5 transition-opacity duration-150">
                Editar
              </span>
            )}
          </div>
        )
      )}

      {/* Botón de Seguimiento GPS */}
      {pedido.cadete_id && !esFinal && (
        <button
          onClick={() => setVerMapa(true)}
          className="w-full mt-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-1.5 px-3 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <MapPin size={14} /> Seguir Envío Real-Time
        </button>
      )}

      {/* Modal del Mapa */}
      {verMapa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="text-indigo-500" /> Seguimiento: {pedido.cliente}
              </h3>
              <button 
                onClick={() => setVerMapa(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950">
              <MapaSeguimiento pedido={pedido} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Edición de Pedido Completo */}
      {editandoPedidoCompleto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-200 relative text-left">
            <div className="sticky top-0 z-10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md flex items-center justify-between border-b border-gray-150 dark:border-slate-800 p-6 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  <Pencil className="text-chefsy" /> Editar Pedido
                </h2>
              </div>
              <button
                onClick={() => setEditandoPedidoCompleto(false)}
                className="text-slate-450 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 pb-6">
              <FormularioPedido 
                pedidoInicial={pedido} 
                onClose={() => setEditandoPedidoCompleto(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      {!soloLectura && !esFinal && (
        <div className="flex gap-1.5 border-t border-slate-100 dark:border-[#3d3d3d] pt-2">
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
                className="px-2.5 py-1.5 border border-red-100 dark:border-red-900/50 text-red-500 hover:text-red-650 text-xs font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 transition-colors shrink-0"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={manejarCancelacion}
              className="w-full px-3 py-1.5 border border-red-100 dark:border-red-900/50 text-red-550 text-xs font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Cancelar Pedido
            </button>
          )}
        </div>
      )}

      {/* Opción de revertir eliminada (se movió al botón Undo en la cabecera) */}
    </div>
  )
}
