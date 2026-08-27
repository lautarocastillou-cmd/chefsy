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
import { Copy, Check, Printer, MapPin, X, Trash2, Pencil, Undo2, Receipt } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { crearEnlaceGoogleMaps } from '@/lib/ubicacion'
import MapaSeguimiento from '@/components/ubicacion/MapaSeguimiento'
import FormularioPedido from './FormularioPedido'
import { useRelojGlobal } from '@/hooks/useRelojGlobal'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import BadgeSmartBatch from './BadgeSmartBatch'

const etiquetaMetodoPago: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

const bordesPorEstado: Record<Pedido['estado'], string> = {
  nuevo:      'border-l-[3px] border-l-blue-500',
  en_cocina:  'border-l-[3px] border-l-orange-500',
  listo:      'border-l-[3px] border-l-amber-500',
  en_camino:  'border-l-[3px] border-l-indigo-500',
  entregado:  'border-l-[3px] border-l-green-500',
  cancelado:  'border-l-[3px] border-l-red-500',
}

interface PropsTarjetaPedido {
  pedido: Pedido
  soloLectura?: boolean
}

import React from 'react'

const TarjetaPedido = React.memo(function TarjetaPedido({ pedido, soloLectura = false }: PropsTarjetaPedido) {
  const { cambiarEstado, editarPedido, eliminarPedido, marcarPagoConfirmado, asignarCadete, cambiarMetodoPago, revertirEstado, cadetes } = usarPedidos()
  const { modificadores: catalogoModificadores } = usarCatalogo()
  const siguienteEstado = obtenerSiguienteEstado(pedido.estado, pedido.tipoEntrega)
  const [copiado, setCopiado] = useState(false)
  const [editandoNota, setEditandoNota] = useState(false)
  const [notaTemporal, setNotaTemporal] = useState(pedido.observaciones || '')
  const [verMapa, setVerMapa] = useState(false)
  const [editandoPedidoCompleto, setEditandoPedidoCompleto] = useState(false)
  const [ticketCopiado, setTicketCopiado] = useState(false)
  const [modalImpresion, setModalImpresion] = useState(false)

  useEffect(() => {
    setNotaTemporal(pedido.observaciones || '')
  }, [pedido.observaciones])

  useEffect(() => {
    if (ticketCopiado) {
      const t = setTimeout(() => setTicketCopiado(false), 2000)
      return () => clearTimeout(t)
    }
  }, [ticketCopiado])

  const esFinal = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
  const ahoraDate = useRelojGlobal(!esFinal)
  const ahora = ahoraDate.getTime()

  let esAtrasado = false
  if (!esFinal) {
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

    if (fechaInicio) {
      const startMs = new Date(fechaInicio).getTime()
      esAtrasado = ahora - startMs >= limiteMs
    }
  }

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

  const copiarParaWhatsApp = () => {
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

    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const copiarTicketCliente = () => {
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

    const costoEnvio = pedido.costoEnvio || 0
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

    navigator.clipboard.writeText(texto)
    setTicketCopiado(true)
  }

  const imprimirSilencioso = (tipo: 'ticket' | 'cocina') => {
    const f = formatearPrecio
    const p = pedido

    const metodoPagoLabel: Record<string, string> = {
      efectivo: 'Efectivo', tarjeta: 'Tarjeta',
      transferencia: 'Transferencia', mixto: 'Mixto', sin_especificar: 'Sin especificar',
    }

    // ── Ticket para el Cliente ────────────────────────────────────────────────
    const htmlTicket = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{margin:0!important;size:auto}
  html,body{margin:0!important;padding:0!important;font-family:monospace;font-size:12px;width:80mm;color:#000;background:#fff}
  body{padding:0 2px!important}
  h1{font-size:18px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;text-align:center;margin:0 0 2px 0;padding-top:0}
  .sub{text-align:center;font-size:10px;margin-bottom:3px}
  .sep{border-top:1px dashed #000;margin:4px 0}
  .row{display:flex;justify-content:space-between;margin:2px 0}
  .bold{font-weight:bold}
  .big{font-size:14px;font-weight:bold}
  .center{text-align:center}
  .upper{text-transform:uppercase}
  table{width:100%;border-collapse:collapse}
  td{padding:2px 0;vertical-align:top;font-size:11px}
  td:last-child{text-align:right;white-space:nowrap}
  .nota{font-size:10px;background:#f5f5f5;padding:3px 5px;border-radius:3px;margin-top:3px}
  @media print{@page{margin:0!important;size:auto}html,body{margin:0!important;padding:0 2px!important}}
</style></head><body>
<h1>CHEFSY</h1>
<div class="sub">Ticket de Pedido</div>
<div class="sub">Pedido #${p.id.slice(0,6).toUpperCase()} &nbsp;·&nbsp; ${p.hora}</div>
<div class="sep"></div>
<div class="row"><span><b>Cliente:</b> ${p.cliente}</span></div>
${p.telefono && p.telefono !== 'Sin especificar' ? `<div class="row"><span><b>Tel:</b> ${p.telefono}</span></div>` : ''}
<div class="row"><span><b>Entrega:</b> ${p.tipoEntrega === 'delivery' ? 'Delivery' : p.tipoEntrega === 'retiro' ? 'Retiro en local' : 'Consumo en local'}</span></div>
${p.direccion ? `<div class="row"><span><b>Dir:</b> ${p.direccion}</span></div>` : ''}
<div class="sep"></div>
<table>
${p.productos.map(prod => `<tr><td><b>${prod.cantidad}x</b> ${prod.nombre}</td><td>${f(prod.precio * prod.cantidad)}</td></tr>`).join('')}
</table>
<div class="sep"></div>
${p.costoEnvio ? `<div class="row"><span>Subtotal:</span><span>${f(p.total - (p.costoEnvio ?? 0))}</span></div><div class="row"><span>Envío:</span><span>${f(p.costoEnvio)}</span></div>` : ''}
<div class="row big"><span>TOTAL:</span><span>${f(p.total)}</span></div>
<div class="row"><span>Pago:</span><span>${metodoPagoLabel[p.metodoPago ?? 'sin_especificar'] ?? 'Desconocido'}</span></div>
${p.observaciones ? `<div class="sep"></div><div class="nota bold upper">NOTAS: ${p.observaciones}</div>` : ''}
<div class="sep"></div>
<div class="center" style="margin-top:4px;font-size:10px">¡Gracias por su compra! · Sistema Chefsy</div>
</body></html>`

    // ── Comanda para Cocina ───────────────────────────────────────────────────
    const htmlCocina = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{margin:0!important;size:auto}
  html,body{margin:0!important;padding:0!important;font-family:monospace;font-size:17px;width:80mm;color:#000;background:#fff}
  body{padding:0 2px!important}
  h1{font-size:26px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;text-align:center;margin:0 0 2px 0;padding-top:0}
  .sub{text-align:center;font-size:14px;margin-bottom:3px}
  .sep{border-top:2px dashed #000;margin:6px 0}
  .prod{display:flex;align-items:baseline;gap:6px;margin:5px 0;font-size:18px;font-weight:bold}
  .cant{font-size:26px;min-width:32px;text-align:right;line-height:1}
  .pname{flex:1}
  .nota{font-size:15px;font-weight:bold;text-transform:uppercase;background:#eee;padding:4px 6px;border-radius:3px;margin-top:6px}
  .tipo{font-size:16px;font-weight:bold;text-align:center;text-transform:uppercase;letter-spacing:1px;border:2px solid #000;padding:3px;margin-top:4px}
  @media print{@page{margin:0!important;size:auto}html,body{margin:0!important;padding:0 2px!important}}
</style></head><body>
<h1>COCINA</h1>
<div class="sub">${p.hora}</div>
<div class="sub"><b>${p.cliente}</b></div>
<div class="sep"></div>
${p.productos.map(prod => `<div class="prod"><span class="cant">${prod.cantidad}x</span><span class="pname">${prod.nombre}</span></div>`).join('')}
${p.observaciones ? `<div class="sep"></div><div class="nota">⚠ ${p.observaciones}</div>` : ''}
<div class="sep"></div>
<div class="tipo">${p.tipoEntrega === 'delivery' ? '🛵 DELIVERY' : p.tipoEntrega === 'retiro' ? '🏠 RETIRO EN LOCAL' : '🍽 CONSUMO EN LOCAL'}</div>
</body></html>`

    const html = tipo === 'ticket' ? htmlTicket : htmlCocina
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;top:0;left:0;opacity:0;pointer-events:none'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) return
    doc.open(); doc.write(html); doc.close()
    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 300)
    setModalImpresion(false)
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
              onClick={() => setModalImpresion(true)}
              className="text-slate-450 hover:text-chefsy hover:bg-slate-100 dark:hover:bg-[#3a3a3a] transition-all p-1 rounded-md border border-slate-100 dark:border-[#3d3d3d] bg-white dark:bg-[#2f2f2f] shadow-sm"
              title="Imprimir Ticket / Comanda"
            >
              <Printer size={11} className="dark:text-[#a8a8a8]" />
            </button>
            <button 
              onClick={copiarTicketCliente}
              className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all p-1 rounded-md border border-amber-100 dark:border-amber-900/50 bg-white dark:bg-[#2f2f2f] shadow-sm"
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

      {/* Línea de Tiempos del Pedido */}
      <div className={cn(
        "bg-slate-50/70 dark:bg-[#2f2f2f] border border-slate-100/50 dark:border-[#3d3d3d] rounded-xl p-2 flex items-center justify-between gap-2 transition-all",
        esAtrasado && "bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30"
      )}>
        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#686868] tracking-wider flex items-center gap-1.5">
          {esAtrasado && (
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
          Tiempos
        </span>
        <TimerPedido pedido={pedido} />
      </div>

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

      {/* Botones de Seguimiento GPS */}
      {pedido.cadete_id && !esFinal && (
        <div className="flex gap-1.5 mt-1.5">
          <button
            onClick={() => setVerMapa(true)}
            className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-1.5 px-3 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <MapPin size={14} /> Mapa (Admin)
          </button>
          <button
            onClick={() => {
              const url = `https://chefsy.xyz/cadete-en-vivo/${pedido.id}`
              navigator.clipboard.writeText(url)
              alert('Enlace de rastreo para el cliente copiado al portapapeles.')
            }}
            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-1.5 px-3 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Copy size={14} /> Link Cliente
          </button>
        </div>
      )}

      {/* Modal del Mapa */}
      {verMapa && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setVerMapa(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative animate-[slideIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
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
            <div className="p-4 bg-slate-50 dark:bg-slate-950 h-[400px]">
              <MapaSeguimiento pedido={pedido} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Edición de Pedido Completo */}
      {editandoPedidoCompleto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 transition-opacity duration-200 will-change-opacity animate-in fade-in">
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
                disabled={procesando}
                className="flex-1 px-3 py-1.5 bg-chefsy text-white text-xs font-semibold rounded-md hover:bg-chefsy-700 transition-colors shadow-sm active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {procesando ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  obtenerEtiquetaAccionEstado(siguienteEstado, pedido.tipoEntrega)
                )}
              </button>
              <button
                onClick={manejarCancelacion}
                disabled={procesando}
                className="px-2.5 py-1.5 border border-red-100 dark:border-red-900/50 text-red-500 hover:text-red-650 text-xs font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 transition-colors shrink-0 disabled:opacity-50"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={manejarCancelacion}
              disabled={procesando}
              className="w-full px-3 py-1.5 border border-red-100 dark:border-red-900/50 text-red-550 text-xs font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
            >
              Cancelar Pedido
            </button>
          )}
        </div>
      )}

      {/* Opción de revertir eliminada (se movió al botón Undo en la cabecera) */}

      {/* Modal de Selección de Impresión */}
      {modalImpresion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          onClick={() => setModalImpresion(false)}
        >
          <div
            className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#3d3d3d] rounded-2xl shadow-2xl w-80 overflow-hidden"
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

            <div className="px-4 pb-4">
              <p className="text-[10px] text-slate-400 text-center">
                Se imprimirá directamente en tu impresora predeterminada
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default TarjetaPedido
