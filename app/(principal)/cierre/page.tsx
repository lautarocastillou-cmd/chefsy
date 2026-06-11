'use client'

import { usarPedidos } from '@/contexto/PedidosContexto'
import { formatearPrecio, cn } from '@/lib/utils'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { useState, useMemo, useEffect } from 'react'
import {
  Calendar,
  DollarSign,
  Send,
  TrendingUp,
  CreditCard,
  Landmark,
  Bike,
  Store,
  UtensilsCrossed,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Play,
  X
} from 'lucide-react'
import { Pedido } from '@/tipos'

export default function PaginaCierreCaja() {
  const { pedidos, obtenerPedidosPorFecha, finalizarTurno, estadoTurno, iniciarTurno } = usarPedidos()
  
  // Fecha seleccionada (por defecto hoy comercial)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => obtenerFechaNegocio())
  const [pedidosDelDia, setPedidosDelDia] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // Estado para el modal de Iniciar Turno
  const [modalInicioAbierto, setModalInicioAbierto] = useState(false)
  const [cajaInicialInput, setCajaInicialInput] = useState('')

  // Cargar pedidos de la fecha seleccionada en Supabase (históricos + activos)
  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      const data = await obtenerPedidosPorFecha(fechaSeleccionada)
      if (activo) {
        setPedidosDelDia(data)
        setCargando(false)
      }
    }
    cargar()
    return () => {
      activo = false
    }
  }, [fechaSeleccionada, obtenerPedidosPorFecha, pedidos])

  // Pedidos válidos (no cancelados) para estadísticas de caja
  const pedidosValidos = useMemo(() => {
    return pedidosDelDia.filter((p) => p.estado !== 'cancelado')
  }, [pedidosDelDia])

  // ── Cálculos de Facturación ──────────────────────────

  // Total bruto (lo que se cobró sumando todo)
  const facturacionBruta = useMemo(() => {
    return pedidosValidos.reduce((acc, p) => acc + p.total, 0)
  }, [pedidosValidos])

  // Total de costos de envío (= pago a cadetes)
  const totalCostosEnvio = useMemo(() => {
    return pedidosValidos.reduce((acc, p) => acc + (p.costoEnvio || 0), 0)
  }, [pedidosValidos])

  // Facturación neta del local (lo que realmente queda)
  const facturacionNeta = facturacionBruta - totalCostosEnvio

  const totalPedidos = pedidosValidos.length
  const ticketPromedio = totalPedidos > 0 ? facturacionNeta / totalPedidos : 0

  // ── Desglose por Método de Pago (con soporte mixto) ──

  // Helper: obtener cuánto de un pedido corresponde a cada método
  const obtenerMontosPorMetodo = (p: Pedido) => {
    if (p.metodoPago === 'mixto') {
      return {
        efectivo: p.montoEfectivo || 0,
        transferencia: p.montoTransferencia || 0,
        tarjeta: p.montoTarjeta || 0,
      }
    }
    return {
      efectivo: p.metodoPago === 'efectivo' ? p.total : 0,
      transferencia: p.metodoPago === 'transferencia' ? p.total : 0,
      tarjeta: p.metodoPago === 'tarjeta' ? p.total : 0,
    }
  }

  const efectivoTotal = useMemo(() => {
    return pedidosValidos.reduce((acc, p) => acc + obtenerMontosPorMetodo(p).efectivo, 0)
  }, [pedidosValidos])
  const efectivoCount = pedidosValidos.filter((p) => p.metodoPago === 'efectivo' || (p.metodoPago === 'mixto' && (p.montoEfectivo || 0) > 0)).length

  const tarjetaTotal = useMemo(() => {
    return pedidosValidos.reduce((acc, p) => acc + obtenerMontosPorMetodo(p).tarjeta, 0)
  }, [pedidosValidos])
  const tarjetaCount = pedidosValidos.filter((p) => p.metodoPago === 'tarjeta' || (p.metodoPago === 'mixto' && (p.montoTarjeta || 0) > 0)).length

  const transferenciaTotal = useMemo(() => {
    return pedidosValidos.reduce((acc, p) => acc + obtenerMontosPorMetodo(p).transferencia, 0)
  }, [pedidosValidos])
  const transferenciaCount = pedidosValidos.filter((p) => p.metodoPago === 'transferencia' || (p.metodoPago === 'mixto' && (p.montoTransferencia || 0) > 0)).length

  // ── Modalidades de entrega ───────────────────────────

  const deliveryTotal = useMemo(() => {
    return pedidosValidos.filter((p) => p.tipoEntrega === 'delivery').reduce((acc, p) => acc + p.total, 0)
  }, [pedidosValidos])
  const deliveryCount = pedidosValidos.filter((p) => p.tipoEntrega === 'delivery').length

  const retiroTotal = useMemo(() => {
    return pedidosValidos.filter((p) => p.tipoEntrega === 'retiro').reduce((acc, p) => acc + p.total, 0)
  }, [pedidosValidos])
  const retiroCount = pedidosValidos.filter((p) => p.tipoEntrega === 'retiro').length

  const localTotal = useMemo(() => {
    return pedidosValidos.filter((p) => p.tipoEntrega === 'consumo_local').reduce((acc, p) => acc + p.total, 0)
  }, [pedidosValidos])
  const localCount = pedidosValidos.filter((p) => p.tipoEntrega === 'consumo_local').length

  // Pedidos cancelados
  const canceladosCount = pedidosDelDia.filter((p) => p.estado === 'cancelado').length
  const canceladosMonto = pedidosDelDia.filter((p) => p.estado === 'cancelado').reduce((acc, p) => acc + p.total, 0)

  // Cantidad de envíos delivery (para la sección cadetes)
  const enviosDelivery = pedidosValidos.filter((p) => p.tipoEntrega === 'delivery' && (p.costoEnvio || 0) > 0)

  // Efectivo a rendir al final de la noche (Caja Inicial + Efectivo Entrante)
  const efectivoARendir = (estadoTurno?.cajaInicial || 0) + efectivoTotal

  // Copiar reporte al portapapeles
  const copiarReporteAlPortapapeles = () => {
    const formattedDate = new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const mensaje = `*CIERRE DE CAJA - CHEFSY* 💰
📅 *Fecha:* ${formattedDate}
----------------------------------------
💵 *Facturación Neta:* ${formatearPrecio(facturacionNeta)}
📋 *Pedidos:* ${totalPedidos}
🎫 *Ticket Promedio:* ${formatearPrecio(ticketPromedio)}

*Estado de la Caja:*
- 📥 Caja Inicial: ${formatearPrecio(estadoTurno?.cajaInicial || 0)}
- 💵 Efectivo Ventas: ${formatearPrecio(efectivoTotal)}
- 💰 *Físico a Rendir:* ${formatearPrecio(efectivoARendir)}

*Por Método de Pago:*
- 💵 Efectivo: ${formatearPrecio(efectivoTotal)} (${efectivoCount} ped.)
- 💳 Tarjeta: ${formatearPrecio(tarjetaTotal)} (${tarjetaCount} ped.)
- 📱 Transferencia: ${formatearPrecio(transferenciaTotal)} (${transferenciaCount} ped.)

*Por Modalidad:*
- 🛵 Delivery: ${formatearPrecio(deliveryTotal)} (${deliveryCount} ped.)
- 🏪 Retiro: ${formatearPrecio(retiroTotal)} (${retiroCount} ped.)
- 🍽️ Consumo Local: ${formatearPrecio(localTotal)} (${localCount} ped.)

🛵 *Pago a Cadetes:* ${formatearPrecio(totalCostosEnvio)} (${enviosDelivery.length} envíos)
----------------------------------------
❌ *Pedidos Cancelados:* ${canceladosCount} (${formatearPrecio(canceladosMonto)})
----------------------------------------
_Generado automáticamente desde Chefsy_`.trim()

    navigator.clipboard.writeText(mensaje)
      .then(() => {
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2000)
      })
      .catch((err) => {
        console.error('Error al copiar el reporte: ', err)
      })
  }

  // Finalizar el turno (Archivar pedidos de la pantalla)
  const manejarFinalizarTurno = async () => {
    const confirmacion = window.confirm(
      '🚨 ¿Estás seguro de que deseas FINALIZAR EL TURNO?\n\n' +
      'Esto archivará todos los pedidos que estén actualmente visibles en la pantalla (dashboard, pedidos y cadetería) ' +
      'para dejar el panel limpio para el próximo turno.\n\n' +
      'Los pedidos no se borrarán de la base de datos; podrás consultarlos en cualquier momento seleccionando esta fecha en esta misma pantalla.'
    )
    if (confirmacion) {
      await finalizarTurno()
    }
  }

  const manejarIniciarTurno = async (e: React.FormEvent) => {
    e.preventDefault()
    const monto = Number(cajaInicialInput)
    if (isNaN(monto) || monto < 0) return
    const exito = await iniciarTurno(monto)
    if (exito) {
      setModalInicioAbierto(false)
      setCajaInicialInput('')
    }
  }

  // Porcentajes para barras visuales
  const totalMetodos = efectivoTotal + tarjetaTotal + transferenciaTotal
  const pctEfectivo = totalMetodos > 0 ? (efectivoTotal / totalMetodos) * 100 : 0
  const pctTarjeta = totalMetodos > 0 ? (tarjetaTotal / totalMetodos) * 100 : 0
  const pctTransf = totalMetodos > 0 ? (transferenciaTotal / totalMetodos) * 100 : 0

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      
      {/* Selector de fecha, cabecera y botón de finalizar turno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#252525] p-5 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-[#e6e6e6]">💰 Cierre de Caja</h1>
          <p className="text-xs text-gray-400 dark:text-[#686868]">Resumen y métricas de facturación diaria</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 border border-slate-200 dark:border-[#4d4d4d] rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-[#2f2f2f]">
            <Calendar size={16} className="text-slate-400 dark:text-[#686868]" />
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="bg-transparent border-none text-sm outline-none text-slate-700 dark:text-[#e6e6e6] font-semibold cursor-pointer"
            />
          </div>
          <button
            onClick={() => setModalInicioAbierto(true)}
            disabled={estadoTurno.activo}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5",
              estadoTurno.activo
                ? "bg-slate-100 text-slate-400 dark:bg-[#333] dark:text-[#666] cursor-not-allowed"
                : "bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 active:scale-95"
            )}
          >
            <Play size={16} />
            {estadoTurno.activo ? 'Turno en curso' : 'Iniciar Turno'}
          </button>
          <button
            onClick={manejarFinalizarTurno}
            disabled={!estadoTurno.activo || pedidos.length === 0}
            className="bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-50 disabled:cursor-not-allowed text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            title="Archiva todos los pedidos del panel activo para arrancar un nuevo turno limpio"
          >
            🏁 Finalizar Turno
          </button>
        </div>
      </div>

      {/* Contenedor con efecto de carga */}
      <div className={`space-y-6 transition-all duration-300 ${cargando ? 'opacity-40 pointer-events-none' : ''}`}>
        
        {/* Tarjeta Principal de Facturación NETA */}
        <div className="bg-gradient-to-br from-chefsy-800 to-chefsy-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/6 -translate-y-1/6">
            <DollarSign size={200} />
          </div>
          <div className="relative z-10 space-y-1">
            <span className="text-xs text-chefsy-100 uppercase tracking-widest font-bold">Facturación Neta del Local</span>
            <p className="text-4xl font-black">{formatearPrecio(facturacionNeta)}</p>
            <p className="text-xs text-chefsy-100 font-medium">
              {formatearPrecio(facturacionBruta)} bruto − {formatearPrecio(totalCostosEnvio)} envíos cadetes
            </p>
          </div>
          <button
            onClick={copiarReporteAlPortapapeles}
            disabled={totalPedidos === 0 && canceladosCount === 0}
            className={`relative z-10 px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              copiado
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-white hover:bg-chefsy-50 text-chefsy-800'
            }`}
          >
            {copiado ? (
              <>
                <Check size={14} /> ¡Reporte Copiado!
              </>
            ) : (
              <>
                <Copy size={14} /> Copiar Reporte de Caja
              </>
            )}
          </button>
        </div>

        {/* Tarjeta Extra: Total Efectivo a Rendir */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-500 uppercase tracking-wider mb-1">Efectivo Físico a Rendir</p>
            <p className="text-2xl font-black text-emerald-900 dark:text-emerald-400">{formatearPrecio(efectivoARendir)}</p>
          </div>
          <div className="text-right text-xs text-emerald-700 dark:text-emerald-600 font-medium">
            <p>Caja Inicial: {formatearPrecio(estadoTurno?.cajaInicial || 0)}</p>
            <p>Efectivo Ventas: {formatearPrecio(efectivoTotal)}</p>
          </div>
        </div>

        {/* Métricas secundarias */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#252525] border border-slate-100 dark:border-[#3d3d3d] shadow-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 p-3 rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-[#686868] font-medium">Pedidos Realizados</p>
              <p className="text-xl font-bold text-gray-800 dark:text-[#e6e6e6]">{totalPedidos} pedidos</p>
            </div>
          </div>
          <div className="bg-white dark:bg-[#252525] border border-slate-100 dark:border-[#3d3d3d] shadow-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-[#686868] font-medium">Ticket Promedio</p>
              <p className="text-xl font-bold text-gray-800 dark:text-[#e6e6e6]">{formatearPrecio(ticketPromedio)}</p>
            </div>
          </div>
          {/* Pago a Cadetes */}
          <div className="bg-white dark:bg-[#252525] border border-slate-100 dark:border-[#3d3d3d] shadow-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 p-3 rounded-xl">
              <Bike size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-[#686868] font-medium">Pago a Cadetes</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{formatearPrecio(totalCostosEnvio)}</p>
              <p className="text-[10px] text-gray-400 dark:text-[#686868]">{enviosDelivery.length} envíos con costo</p>
            </div>
          </div>
        </div>

        {/* Desglose por Método de Pago */}
        <section className="bg-white dark:bg-[#252525] border border-slate-100 dark:border-[#3d3d3d] shadow-sm rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 dark:text-[#e6e6e6] border-b border-slate-100 dark:border-[#3d3d3d] pb-2">💳 Facturación por Método de Pago</h2>
          
          {totalPedidos === 0 ? (
            <p className="text-xs text-gray-400 dark:text-[#686868] text-center py-6">
              {cargando ? 'Cargando registros...' : 'No hay registros de facturación para la fecha seleccionada.'}
            </p>
          ) : (
            <div className="space-y-4">
              {/* Efectivo */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-[#a8a8a8]">
                    <DollarSign size={14} className="text-emerald-500" /> Efectivo ({efectivoCount} ped.)
                  </span>
                  <span className="text-gray-900 dark:text-[#e6e6e6]">{formatearPrecio(efectivoTotal)}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-[#3a3a3a] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pctEfectivo}%` }} />
                </div>
              </div>

              {/* Tarjeta */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-[#a8a8a8]">
                    <CreditCard size={14} className="text-blue-500" /> Tarjeta / Débito ({tarjetaCount} ped.)
                  </span>
                  <span className="text-gray-900 dark:text-[#e6e6e6]">{formatearPrecio(tarjetaTotal)}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-[#3a3a3a] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pctTarjeta}%` }} />
                </div>
              </div>

              {/* Transferencia */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-[#a8a8a8]">
                    <Landmark size={14} className="text-indigo-500" /> Transferencia ({transferenciaCount} ped.)
                  </span>
                  <span className="text-gray-900 dark:text-[#e6e6e6]">{formatearPrecio(transferenciaTotal)}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-[#3a3a3a] rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pctTransf}%` }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Desglose por Modalidad de Entrega */}
        <section className="bg-white dark:bg-[#252525] border border-slate-100 dark:border-[#3d3d3d] shadow-sm rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 dark:text-[#e6e6e6] border-b border-slate-100 dark:border-[#3d3d3d] pb-2">🛵 Facturación por Modalidad</h2>
          
          {totalPedidos === 0 ? (
            <p className="text-xs text-gray-400 dark:text-[#686868] text-center py-6">
              {cargando ? 'Cargando registros...' : 'No hay registros de facturación para la fecha seleccionada.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Delivery */}
              <div className="bg-slate-50/50 dark:bg-[#2f2f2f] p-4 rounded-xl border border-slate-100 dark:border-[#3d3d3d] text-center space-y-1">
                <Bike size={20} className="text-blue-600 dark:text-blue-400 mx-auto" />
                <p className="text-[10px] text-gray-400 dark:text-[#686868] font-bold uppercase tracking-wider">Delivery</p>
                <p className="text-lg font-bold text-slate-800 dark:text-[#e6e6e6]">{formatearPrecio(deliveryTotal)}</p>
                <p className="text-[10px] text-gray-400 dark:text-[#686868]">{deliveryCount} envíos</p>
              </div>

              {/* Retiro */}
              <div className="bg-slate-50/50 dark:bg-[#2f2f2f] p-4 rounded-xl border border-slate-100 dark:border-[#3d3d3d] text-center space-y-1">
                <Store size={20} className="text-amber-600 dark:text-amber-400 mx-auto" />
                <p className="text-[10px] text-gray-400 dark:text-[#686868] font-bold uppercase tracking-wider">Retiro Local</p>
                <p className="text-lg font-bold text-slate-800 dark:text-[#e6e6e6]">{formatearPrecio(retiroTotal)}</p>
                <p className="text-[10px] text-gray-400 dark:text-[#686868]">{retiroCount} retiros</p>
              </div>

              {/* Local */}
              <div className="bg-slate-50/50 dark:bg-[#2f2f2f] p-4 rounded-xl border border-slate-100 dark:border-[#3d3d3d] text-center space-y-1">
                <UtensilsCrossed size={20} className="text-purple-600 dark:text-purple-400 mx-auto" />
                <p className="text-[10px] text-gray-400 dark:text-[#686868] font-bold uppercase tracking-wider">Consumo Local</p>
                <p className="text-lg font-bold text-slate-800 dark:text-[#e6e6e6]">{formatearPrecio(localTotal)}</p>
                <p className="text-[10px] text-gray-400 dark:text-[#686868]">{localCount} servidos</p>
              </div>
            </div>
          )}
        </section>

        {/* Pedidos Cancelados */}
        {canceladosCount > 0 && (
          <div className="bg-red-50 border border-red-150 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-500" />
              <div>
                <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Pedidos Cancelados</p>
                <p className="text-sm text-red-700">Se cancelaron {canceladosCount} pedidos en esta fecha.</p>
              </div>
            </div>
            <p className="text-base font-bold text-red-800">-{formatearPrecio(canceladosMonto)}</p>
          </div>
        )}
        
      </div>

      {/* Modal Iniciar Turno */}
      {modalInicioAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 p-5">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                ▶️ Iniciar Turno
              </h2>
              <button
                onClick={() => setModalInicioAbierto(false)}
                className="text-slate-450 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={manejarIniciarTurno} className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
                  Plata en caja (Cambio Inicial)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={cajaInicialInput}
                    onChange={(e) => setCajaInicialInput(e.target.value)}
                    placeholder="Ej: 5000"
                    className="w-full pl-7 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100 font-bold transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Esta plata se sumará al efectivo de las ventas al final del día para el conteo de la caja.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalInicioAbierto(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
                >
                  Confirmar e Iniciar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
