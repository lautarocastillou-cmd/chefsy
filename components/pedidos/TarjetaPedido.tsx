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
import ModalAccionesPedidoMobile from './ModalAccionesPedidoMobile'
import {
  Copy,
  Check,
  Printer,
  MapPin,
  X,
  Trash2,
  Pencil,
  Undo2,
  Receipt,
  MoreHorizontal,
  Phone,
  MessageCircle,
  Bike
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { crearEnlaceGoogleMaps, calcularCostoEnvio } from '@/lib/ubicacion'
import ModalVistaMapa from './ModalVistaMapa'
import dynamic from 'next/dynamic'
const FormularioPedidoLazy = dynamic(() => import('./FormularioPedido'), {
  loading: () => <div className="p-8 text-center text-sm text-slate-400">Cargando formulario...</div>
})
const ModalBreadcrumbTrail = dynamic(() => import('@/components/cadeteria/ModalBreadcrumbTrail'), {
  ssr: false
})
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import BadgeSmartBatch from './BadgeSmartBatch'
import { gestorImpresora } from '@/lib/impresion/impresoraTermica'
import ModalConfiguracionImpresora from '@/components/impresion/ModalConfiguracionImpresora'
import { Sliders, Zap } from 'lucide-react'
import { copiarConNotificacion } from '@/lib/notificaciones'

const etiquetaMetodoPago: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

const bordesPorEstado: Record<Pedido['estado'], string> = {
  nuevo:      'border-l-[4px] border-l-blue-500',
  en_cocina:  'border-l-[4px] border-l-orange-500',
  listo:      'border-l-[4px] border-l-amber-500',
  en_camino:  'border-l-[4px] border-l-indigo-500',
  entregado:  'border-l-[4px] border-l-green-500',
  cancelado:  'border-l-[4px] border-l-red-500',
}

const colorBotonPorEstado: Record<Pedido['estado'], string> = {
  nuevo:      'bg-chefsy hover:bg-chefsy-700 text-white',
  en_cocina:  'bg-[#5c4a36] hover:bg-[#4d3e2d] text-white',
  listo:      'bg-chefsy hover:bg-chefsy-700 text-white',
  en_camino:  'bg-[#284f60] hover:bg-[#1e3e4c] text-white',
  entregado:  'bg-[#20563e] hover:bg-[#174330] text-white',
  cancelado:  'bg-slate-600 hover:bg-slate-700 text-white',
}

interface PropsTarjetaPedido {
  pedido: Pedido
  soloLectura?: boolean
  onEditarPedido?: (pedido: Pedido) => void
}

import React from 'react'

const TarjetaPedido = React.memo(function TarjetaPedido({ pedido, soloLectura = false, onEditarPedido }: PropsTarjetaPedido) {
  const { cambiarEstado, editarPedido, eliminarPedido, marcarPagoConfirmado, asignarCadete, cambiarMetodoPago, revertirEstado, cadetes } = usarPedidos()
  const { modificadores: catalogoModificadores } = usarCatalogo()
  const siguienteEstado = obtenerSiguienteEstado(pedido.estado, pedido.tipoEntrega)
  const [montado, setMontado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [editandoNota, setEditandoNota] = useState(false)
  const [notaTemporal, setNotaTemporal] = useState(pedido.observaciones || '')
  const [verMapa, setVerMapa] = useState(false)
  const [verBreadcrumb, setVerBreadcrumb] = useState(false)
  const [editandoPedidoCompleto, setEditandoPedidoCompleto] = useState(false)
  const [ticketCopiado, setTicketCopiado] = useState(false)
  const [modalImpresion, setModalImpresion] = useState(false)
  const [modalConfigImpresora, setModalConfigImpresora] = useState(false)
  const [infoImpresora, setInfoImpresora] = useState(gestorImpresora.obtenerInfo())
  const [sheetMobileAbierto, setSheetMobileAbierto] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  const abrirWhatsAppDirecto = () => {
    if (!pedido.telefono || pedido.telefono === 'Sin especificar') {
      copiarParaWhatsApp()
      return
    }
    const cleanTel = pedido.telefono.replace(/\D/g, '')
    const formattedTel = cleanTel.startsWith('54') ? cleanTel : `549${cleanTel}`
    const textoMensaje = `¡Hola ${pedido.cliente}! Te escribimos de Chefsy por tu pedido #${pedido.id.slice(-4)}.`
    window.open(`https://wa.me/${formattedTel}?text=${encodeURIComponent(textoMensaje)}`, '_blank')
  }

  const llamarDirecto = () => {
    if (!pedido.telefono || pedido.telefono === 'Sin especificar') return
    const cleanTel = pedido.telefono.replace(/\D/g, '')
    window.location.href = `tel:${cleanTel}`
  }

  useEffect(() => {
    setNotaTemporal(pedido.observaciones || '')
  }, [pedido.observaciones])

  useEffect(() => {
    if (!ticketCopiado) return
    const t = setTimeout(() => setTicketCopiado(false), 2000)
    return () => clearTimeout(t)
  }, [ticketCopiado])

  const esFinal = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
  const [procesando, setProcesando] = useState(false)

  const manejarAvance = async () => {
    if (siguienteEstado && !procesando) {
      setProcesando(true)
      try {
        await cambiarEstado(pedido.id, siguienteEstado)
      } finally {
        setProcesando(false)
      }
    }
  }

  const manejarCancelacion = async () => {
    if (!procesando) {
      setProcesando(true)
      try {
        await cambiarEstado(pedido.id, 'cancelado')
      } finally {
        setProcesando(false)
      }
    }
  }

  const copiarParaWhatsApp = async () => {
    const productosText = pedido.productos.map(p => `${p.cantidad}x ${p.nombre}`).join('\n')
    
    let direccionTexto = ''
    if (pedido.direccion && pedido.direccion.trim() !== '') {
      direccionTexto = `📍 ${pedido.direccion.trim()}`
      const linkMapa = crearEnlaceGoogleMaps(pedido.coordenadas, pedido.direccion)
      if (linkMapa) {
        direccionTexto += `\n🗺️ Mapa: ${linkMapa}`
      }
    } else if (pedido.tipoEntrega && pedido.tipoEntrega !== 'delivery') {
      direccionTexto = `📍 ${pedido.tipoEntrega === 'retiro' ? 'Retiro en el local' : 'Consumo en el local'}`
    }

    const texto = `*Pedido de ${pedido.cliente}*
📞 ${pedido.telefono}
${direccionTexto ? `${direccionTexto}\n` : ''}
*Detalle:*
${productosText}

💵 Total: ${formatearPrecio(pedido.total)} (${etiquetaMetodoPago[pedido.metodoPago]})
${pedido.observaciones ? `💬 ${pedido.observaciones}` : ''}`.trim()

    const ok = await copiarConNotificacion(texto, '¡Pedido para WhatsApp copiado al portapapeles!')
    if (ok) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const copiarTicketCliente = async () => {
    let subtotal = 0

    const lineasProductos = pedido.productos.map(p => {
      // Intentar extraer extras e instrucciones del nombre
      // Formato: "Nombre Base (+ Extra 1, Extra 2 | \"Instruccion\")" o "Nombre Base (+ Extra 1, Extra 2)"
      const match = p.nombre.match(/^(.*?)\s*\(\+\s*(.*?)\s*\)$/)
      let nombreBase = p.nombre
      let extrasTexto = ''
      let precioBase = p.precio // precio unitario del producto con extras
      let extrasDetalle: { nombre: string; precio: number }[] = []

      if (match) {
        nombreBase = match[1].trim()
        const contenidoParentesis = match[2]
        
        // Separar por " | " para dividir extras de comentarios/notas
        const partes = contenidoParentesis.split('|')
        const extrasParte = partes[0].trim()
        const notasParte = partes[1] ? partes[1].trim() : ''

        // Procesar extras
        if (extrasParte && !extrasParte.includes('[PAGADO CON PUNTOS]')) {
          const nombresExtras = extrasParte.split(',').map(e => e.trim())
          let sumaExtras = 0
          
          nombresExtras.forEach(nombreExtra => {
            // Buscar en el catálogo de modificadores
            const modInfo = catalogoModificadores?.find(
              (m: any) => m.nombre.toLowerCase().trim() === nombreExtra.toLowerCase().trim()
            )
            const precioExtra = modInfo ? Number(modInfo.precioExtra || 0) : 0
            sumaExtras += precioExtra
            extrasDetalle.push({ nombre: nombreExtra, precio: precioExtra })
          })
          
          // El precio base sin extras
          precioBase = Math.max(0, p.precio - sumaExtras)
        }
        
        // Construir líneas de extras para el texto del ticket
        const lineasExtras = extrasDetalle.map(ext => 
          `   + ${ext.nombre} (+${formatearPrecio(ext.precio)})`
        ).join('\n')

        const lineaNota = notasParte ? `   (Nota: ${notasParte})` : ''
        
        extrasTexto = (lineasExtras ? '\n' + lineasExtras : '') + (lineaNota ? '\n' + lineaNota : '')
      }

      const totalProducto = p.precio * p.cantidad
      subtotal += totalProducto

      return `${p.cantidad}x ${nombreBase} - ${formatearPrecio(precioBase * p.cantidad)}${extrasTexto}`
    }).join('\n\n')

    let costoEnvio = pedido.costoEnvio || 0
    if (pedido.tipoEntrega === 'delivery' && costoEnvio === 0 && !pedido.envioManual) {
      costoEnvio = pedido.distanciaKm ? calcularCostoEnvio(pedido.distanciaKm) : 1500
    }
    const total = subtotal + costoEnvio

    let infoCliente = `Cliente: ${pedido.cliente}`
    if (pedido.telefono && pedido.telefono !== 'Sin especificar') {
      infoCliente += `\nTeléfono: ${pedido.telefono}`
    }

    const etiquetasTipoEntrega: Record<string, string> = {
      delivery: 'Delivery',
      retiro: 'Retiro en el local',
      consumo_local: 'Consumo en el local',
    }
    const tipoTexto = etiquetasTipoEntrega[pedido.tipoEntrega] || 'Delivery'
    infoCliente += `\nTipo de pedido: ${tipoTexto}`

    let textoEnvio = ''
    if (pedido.tipoEntrega === 'delivery') {
      textoEnvio = `\nEnvío: ${formatearPrecio(costoEnvio)}`
    }

    const texto = `Este es el resumen de tu pedido en Chefsy.

${infoCliente}

----------------------------------
${lineasProductos}

----------------------------------
Subtotal: ${formatearPrecio(subtotal)}
${textoEnvio}
Total: ${formatearPrecio(total)}
----------------------------------
${pedido.observaciones ? `Notas: ${pedido.observaciones}` : ''}`.trim().replace(/\n-+$/, '')

    const ok = await copiarConNotificacion(texto, '¡Ticket de cliente copiado al portapapeles!')
    if (ok) {
      setTicketCopiado(true)
      setTimeout(() => setTicketCopiado(false), 2000)
    }
  }

  const imprimirSilencioso = async (tipo: 'ticket' | 'cocina') => {
    setModalImpresion(false)
    await gestorImpresora.imprimirPedido(pedido, tipo)
  }

  return (
    <div 
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 260px',
        contain: 'layout style paint',
      }}
      className={cn(
        "bg-white dark:bg-[#1e1e1e] border border-slate-100/80 dark:border-white/[0.07] hover:border-slate-200/90 dark:hover:border-white/[0.12] rounded-xl p-3 flex flex-col gap-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)_inset] relative overflow-hidden transition-colors duration-150",
        bordesPorEstado[pedido.estado]
      )}
    >
      {/* Cabecera del pedido: Cliente y Estado */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-slate-800 dark:text-[#e6e6e6] text-sm truncate leading-snug" title={pedido.cliente}>
              {pedido.cliente}
            </h4>
            {/* Acciones directas táctiles en mobile */}
            {pedido.telefono && pedido.telefono !== 'Sin especificar' && (
              <div className="flex items-center gap-1 md:hidden">
                <button
                  onClick={abrirWhatsAppDirecto}
                  className="p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-90 transition-transform"
                  title="Escribir por WhatsApp"
                >
                  <MessageCircle size={14} />
                </button>
                <button
                  onClick={llamarDirecto}
                  className="p-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 active:scale-90 transition-transform"
                  title="Llamar al cliente"
                >
                  <Phone size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center flex-wrap gap-1.5 mt-1 text-xs text-slate-500 dark:text-[#a8a8a8] font-medium">
            <span>{pedido.telefono === 'Sin especificar' ? 'Tel: Sin especificar' : `Tel: ${pedido.telefono}`}</span>
            <span className="text-slate-300 dark:text-[#686868]">•</span>
            <span>{pedido.hora}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <BadgeEstado estado={pedido.estado} />
            {/* Botón 3 puntos para Action Sheet en Mobile */}
            <button
              onClick={() => setSheetMobileAbierto(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-100 dark:bg-[#333] active:scale-90 transition-transform"
              title="Más acciones del pedido"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          {/* Botones de escritorio (hidden en mobile) */}
          <div className="hidden md:flex items-center gap-1">
            <button 
              onClick={() => onEditarPedido ? onEditarPedido(pedido) : setEditandoPedidoCompleto(true)}
              className="text-slate-450 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors p-1 rounded-md border border-slate-100 dark:border-[#3d3d3d] bg-white dark:bg-[#2f2f2f] shadow-sm cursor-pointer"
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
                className="text-orange-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors p-1 rounded-md border border-orange-100 dark:border-orange-900/50 bg-white dark:bg-[#2f2f2f] shadow-sm cursor-pointer"
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
              className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors p-1 rounded-md border border-red-100 dark:border-red-900/50 bg-white dark:bg-[#2f2f2f] shadow-sm cursor-pointer"
              title="Eliminar Pedido Definitivamente"
            >
              <Trash2 size={11} />
            </button>
            <button 
              onClick={copiarParaWhatsApp}
              className="text-slate-450 hover:text-chefsy hover:bg-slate-100 dark:hover:bg-[#3a3a3a] transition-colors p-1 rounded-md border border-slate-100 dark:border-[#3d3d3d] bg-white dark:bg-[#2f2f2f] shadow-sm cursor-pointer"
              title="Copiar para WhatsApp"
            >
              {copiado ? <Check size={11} className="text-green-500" /> : <Copy size={11} className="dark:text-[#a8a8a8]" />}
            </button>
            <button 
              onClick={() => setModalImpresion(true)}
              className="text-slate-450 hover:text-chefsy hover:bg-slate-100 dark:hover:bg-[#3a3a3a] transition-colors p-1 rounded-md border border-slate-100 dark:border-[#3d3d3d] bg-white dark:bg-[#2f2f2f] shadow-sm cursor-pointer"
              title="Imprimir Ticket / Comanda"
            >
              <Printer size={11} className="dark:text-[#a8a8a8]" />
            </button>
            <button 
              onClick={copiarTicketCliente}
              className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors p-1 rounded-md border border-amber-100 dark:border-amber-900/50 bg-white dark:bg-[#2f2f2f] shadow-sm cursor-pointer"
              title="Copiar Ticket / Desglose para el Cliente"
            >
              {ticketCopiado ? (
                <Check size={11} className="text-green-500" />
              ) : (
                <Receipt size={11} className="dark:text-amber-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Línea de Tiempos del Pedido (Aislada reactivamente en subcomponente) */}
      <TimerPedido pedido={pedido} mostrarFilaCompleta />

      {/* Tipo de entrega e info geográfica */}
      <InfoEntregaPedido pedido={pedido} />
      {pedido.tipoEntrega === 'delivery' && <BadgeSmartBatch pedido={pedido} />}

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
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 ring-1 ring-red-500 shadow-sm" 
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
              {cadetes
                .filter(c => c.gps_activo || c.id === pedido.cadete_id)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    🛵 {c.nombre}
                  </option>
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
            <span className="text-blue-600 dark:text-blue-400 font-medium text-[11px] ml-1">
              + Envío ({formatearPrecio(pedido.costoEnvio)})
            </span>
          )}
          {pedido.tipoEntrega === 'delivery' && (!pedido.costoEnvio || pedido.costoEnvio === 0) && !soloLectura && (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation()
                const costoSugerido = pedido.distanciaKm ? calcularCostoEnvio(pedido.distanciaKm) : 1500
                const nuevoTotal = pedido.total + costoSugerido
                editarPedido({
                  ...pedido,
                  costoEnvio: costoSugerido,
                  total: nuevoTotal,
                })
              }}
              className="inline-flex items-center gap-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ml-1"
              title="Este pedido de delivery no tiene costo de envío sumado. Hacé clic para sumarle el costo en 1 clic."
            >
              <span>⚠️ + Envío ({formatearPrecio(pedido.distanciaKm ? calcularCostoEnvio(pedido.distanciaKm) : 1500)})</span>
            </button>
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

      {/* Botones de Seguimiento GPS y Repetición de Ruta */}
      {pedido.tipoEntrega === 'delivery' && (pedido.cadete_id || (pedido.ruta_historial && pedido.ruta_historial.length > 0)) && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {!esFinal && (
            <button
              onClick={() => setVerMapa(true)}
              className="flex-1 min-w-[80px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 py-1.5 px-2 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            >
              <MapPin size={13} /> En Vivo
            </button>
          )}

          <button
            onClick={() => setVerBreadcrumb(true)}
            className="flex-1 min-w-[80px] bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 py-1.5 px-2 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            title="Ver trayecto real recorrido por la moto"
          >
            <Bike size={13} /> Repetir Ruta
          </button>

          {!esFinal && (
            <button
              onClick={async () => {
                const url = `https://chefsy.xyz/cadete-en-vivo/${pedido.id}`
                await copiarConNotificacion(url, '¡Link de seguimiento copiado al portapapeles!')
              }}
              className="flex-1 min-w-[80px] bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 py-1.5 px-2 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            >
              <Copy size={13} /> Link
            </button>
          )}
        </div>
      )}

      {/* Modal Repetición de Ruta (Breadcrumb Trail) */}
      {verBreadcrumb && (
        <ModalBreadcrumbTrail
          pedido={pedido}
          onCerrar={() => setVerBreadcrumb(false)}
        />
      )}

      {/* Modal del Mapa */}
      {verMapa && (
        <ModalVistaMapa
          pedido={pedido}
          onClose={() => setVerMapa(false)}
        />
      )}

      {/* Modal Edición de Pedido Completo */}
      {editandoPedidoCompleto && montado && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 transition-opacity duration-200 will-change-opacity animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-200 relative text-left will-change-transform">
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-gray-150 dark:border-slate-800 p-6 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  <Pencil className="text-chefsy" /> Editar Pedido
                </h2>
              </div>
              <button
                onClick={() => setEditandoPedidoCompleto(false)}
                className="text-slate-450 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 pb-6">
              <FormularioPedidoLazy 
                pedidoInicial={pedido} 
                onClose={() => setEditandoPedidoCompleto(false)} 
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Botones de acción clásicos con diferenciación sutil y botón Cancelar */}
      {!soloLectura && !esFinal && (
        <div className="flex gap-1.5 border-t border-slate-100 dark:border-[#3d3d3d] pt-2">
          {siguienteEstado ? (
            <>
              <button
                type="button"
                onClick={manejarAvance}
                disabled={procesando}
                className={cn(
                  'flex-1 px-3 py-1.5 text-white text-xs font-semibold rounded-md shadow-xs active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 select-none',
                  colorBotonPorEstado[siguienteEstado] || 'bg-chefsy hover:bg-chefsy-700 text-white'
                )}
              >
                {procesando ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Actualizando...</span>
                  </span>
                ) : (
                  obtenerEtiquetaAccionEstado(siguienteEstado, pedido.tipoEntrega)
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Deseas cancelar este pedido?')) {
                    manejarCancelacion()
                  }
                }}
                disabled={procesando}
                className="px-2.5 py-1.5 border border-red-100 dark:border-red-900/50 text-red-500 hover:text-red-650 text-xs font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 transition-colors shrink-0 disabled:opacity-50 cursor-pointer select-none"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Deseas cancelar este pedido?')) {
                  manejarCancelacion()
                }
              }}
              disabled={procesando}
              className="w-full px-3 py-1.5 border border-red-100 dark:border-red-900/50 text-red-550 text-xs font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 cursor-pointer select-none"
            >
              Cancelar Pedido
            </button>
          )}
        </div>
      )}

      {/* Action Sheet Inferior para Mobile — montado solo cuando está abierto */}
      {sheetMobileAbierto && (
        <ModalAccionesPedidoMobile
          pedido={pedido}
          abierto={sheetMobileAbierto}
          onClose={() => setSheetMobileAbierto(false)}
          onEditar={() => {
            if (onEditarPedido) onEditarPedido(pedido)
            else setEditandoPedidoCompleto(true)
          }}
          onImprimir={() => setModalImpresion(true)}
          onCopiarTicket={copiarTicketCliente}
          onCopiarWhatsApp={copiarParaWhatsApp}
          onVerMapa={() => setVerMapa(true)}
          onRevertirEstado={() => revertirEstado(pedido.id)}
          onCancelar={() => {
            if (window.confirm('¿Estás seguro de cancelar este pedido?')) {
              manejarCancelacion()
            }
          }}
        />
      )}

      {/* Opción de revertir eliminada (se movió al botón Undo en la cabecera) */}

      {/* Modal de Selección de Impresión */}
      {modalImpresion && montado && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-150"
          onClick={() => setModalImpresion(false)}
        >
          <div
            className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#3d3d3d] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#3d3d3d]">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-slate-500" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">¿Qué querés imprimir?</h3>
              </div>
              <button
                onClick={() => setModalImpresion(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2f2f2f] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Opciones */}
            <div className="p-4 space-y-3">
              {/* Ticket Cliente */}
              <button
                onClick={() => imprimirSilencioso('ticket')}
                className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-chefsy-200 dark:border-chefsy-800/60 hover:border-chefsy hover:bg-chefsy-50/40 dark:hover:bg-chefsy-900/20 transition-all text-left group"
              >
                <span className="text-2xl">🧾</span>
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-chefsy-700 dark:group-hover:text-chefsy-300 transition-colors">
                    Ticket para el Cliente
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Con precios, total, método de pago y datos del cliente
                  </p>
                </div>
              </button>

              {/* Comanda Cocina */}
              <button
                onClick={() => imprimirSilencioso('cocina')}
                className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-orange-200 dark:border-orange-800/60 hover:border-orange-500 hover:bg-orange-50/40 dark:hover:bg-orange-900/20 transition-all text-left group"
              >
                <span className="text-2xl">🍳</span>
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
                    Comanda para Cocina
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Solo productos, cantidades y notas — sin precios
                  </p>
                </div>
              </button>
            </div>

            <div className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#3d3d3d] text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${infoImpresora.conectada ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                    {infoImpresora.conectada ? 'Térmica Directa (0.1s)' : 'Modo Diálogo Windows'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalImpresion(false)
                    setModalConfigImpresora(true)
                  }}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-[#3d3d3d] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Configurar Impresora Térmica"
                >
                  <Sliders size={13} />
                  <span>Ajustes</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Configuración de Impresora Térmica Directa */}
      <ModalConfiguracionImpresora
        abierto={modalConfigImpresora}
        onCerrar={() => {
          setModalConfigImpresora(false)
          setInfoImpresora(gestorImpresora.obtenerInfo())
        }}
      />
    </div>
  )
})

export default TarjetaPedido
