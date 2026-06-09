'use client'

import { usarPedidos } from '@/contexto/PedidosContexto'
import { formatearPrecio } from '@/lib/utils'
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
} from 'lucide-react'
import { Pedido } from '@/tipos'

export default function PaginaCierreCaja() {
  const { pedidos, obtenerPedidosPorFecha, finalizarTurno } = usarPedidos()
  
  // Fecha seleccionada (por defecto hoy comercial)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => obtenerFechaNegocio())
  const [pedidosDelDia, setPedidosDelDia] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(false)
  const [copiado, setCopiado] = useState(false)

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

  // Cálculos estadísticos
  const facturacionTotal = useMemo(() => {
    return pedidosValidos.reduce((acc, p) => acc + p.total, 0)
  }, [pedidosValidos])

  const totalPedidos = pedidosValidos.length
  const ticketPromedio = totalPedidos > 0 ? facturacionTotal / totalPedidos : 0

  // Métodos de pago
  const efectivoTotal = useMemo(() => {
    return pedidosValidos.filter((p) => p.metodoPago === 'efectivo').reduce((acc, p) => acc + p.total, 0)
  }, [pedidosValidos])
  const efectivoCount = pedidosValidos.filter((p) => p.metodoPago === 'efectivo').length

  const tarjetaTotal = useMemo(() => {
    return pedidosValidos.filter((p) => p.metodoPago === 'tarjeta').reduce((acc, p) => acc + p.total, 0)
  }, [pedidosValidos])
  const tarjetaCount = pedidosValidos.filter((p) => p.metodoPago === 'tarjeta').length

  const transferenciaTotal = useMemo(() => {
    return pedidosValidos.filter((p) => p.metodoPago === 'transferencia').reduce((acc, p) => acc + p.total, 0)
  }, [pedidosValidos])
  const transferenciaCount = pedidosValidos.filter((p) => p.metodoPago === 'transferencia').length

  // Modalidades de entrega
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
💵 *Facturación Total:* ${formatearPrecio(facturacionTotal)}
📋 *Pedidos Entregados/Activos:* ${totalPedidos}
🎫 *Ticket Promedio:* ${formatearPrecio(ticketPromedio)}

*Por Método de Pago:*
- 💵 Efectivo: ${formatearPrecio(efectivoTotal)} (${efectivoCount} ped.)
- 💳 Tarjeta: ${formatearPrecio(tarjetaTotal)} (${tarjetaCount} ped.)
- 📱 Transferencia: ${formatearPrecio(transferenciaTotal)} (${transferenciaCount} ped.)

*Por Modalidad:*
- 🛵 Delivery: ${formatearPrecio(deliveryTotal)} (${deliveryCount} ped.)
- 🏪 Retiro: ${formatearPrecio(retiroTotal)} (${retiroCount} ped.)
- 🍽️ Consumo Local: ${formatearPrecio(localTotal)} (${localCount} ped.)

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

  // Porcentajes para barras visuales
  const pctEfectivo = facturacionTotal > 0 ? (efectivoTotal / facturacionTotal) * 100 : 0
  const pctTarjeta = facturacionTotal > 0 ? (tarjetaTotal / facturacionTotal) * 100 : 0
  const pctTransf = facturacionTotal > 0 ? (transferenciaTotal / facturacionTotal) * 100 : 0

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
            onClick={manejarFinalizarTurno}
            disabled={pedidos.length === 0}
            className="bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-50 disabled:cursor-not-allowed text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            title="Archiva todos los pedidos del panel activo para arrancar un nuevo turno limpio"
          >
            🏁 Finalizar Turno
          </button>
        </div>
      </div>

      {/* Contenedor con efecto de carga */}
      <div className={`space-y-6 transition-all duration-300 ${cargando ? 'opacity-40 pointer-events-none' : ''}`}>
        
        {/* Tarjeta Principal de Facturación */}
        <div className="bg-gradient-to-br from-chefsy-800 to-chefsy-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/6 -translate-y-1/6">
            <DollarSign size={200} />
          </div>
          <div className="relative z-10 space-y-1">
            <span className="text-xs text-chefsy-100 uppercase tracking-widest font-bold">Facturación del Día</span>
            <p className="text-4xl font-black">{formatearPrecio(facturacionTotal)}</p>
            <p className="text-xs text-chefsy-100 font-medium">Calculado sobre {totalPedidos} pedidos válidos</p>
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

        {/* Métricas secundarias */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  )
}
