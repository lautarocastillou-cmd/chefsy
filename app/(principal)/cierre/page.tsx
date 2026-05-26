'use client'

import { usarPedidos } from '@/contexto/PedidosContexto'
import { formatearPrecio } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { Calendar, DollarSign, Send, TrendingUp, CreditCard, Landmark, Bike, Store, UtensilsCrossed, AlertTriangle } from 'lucide-react'

export default function PaginaCierreCaja() {
  const { pedidos } = usarPedidos()
  
  // Fecha seleccionada (por defecto hoy)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const hoy = new Date()
    return hoy.toISOString().split('T')[0]
  })

  // Filtrar pedidos por fecha
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => p.fecha === fechaSeleccionada)
  }, [pedidos, fechaSeleccionada])

  // Pedidos válidos (no cancelados) para estadísticas de caja
  const pedidosValidos = useMemo(() => {
    return pedidosFiltrados.filter((p) => p.estado !== 'cancelado')
  }, [pedidosFiltrados])

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
  const canceladosCount = pedidosFiltrados.filter((p) => p.estado === 'cancelado').length
  const canceladosMonto = pedidosFiltrados.filter((p) => p.estado === 'cancelado').reduce((acc, p) => acc + p.total, 0)

  // Enviar reporte por WhatsApp
  const enviarReporteWhatsApp = () => {
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

    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  // Porcentajes para barras visuales
  const pctEfectivo = facturacionTotal > 0 ? (efectivoTotal / facturacionTotal) * 100 : 0
  const pctTarjeta = facturacionTotal > 0 ? (tarjetaTotal / facturacionTotal) * 100 : 0
  const pctTransf = facturacionTotal > 0 ? (transferenciaTotal / facturacionTotal) * 100 : 0

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      
      {/* Selector de fecha y cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-800">💰 Cierre de Caja</h1>
          <p className="text-xs text-gray-400">Resumen y métricas de facturación diaria</p>
        </div>
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50">
          <Calendar size={16} className="text-slate-400" />
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="bg-transparent border-none text-sm outline-none text-slate-700 font-semibold cursor-pointer"
          />
        </div>
      </div>

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
          onClick={enviarReporteWhatsApp}
          disabled={totalPedidos === 0 && canceladosCount === 0}
          className="relative z-10 bg-white hover:bg-chefsy-50 text-chefsy-800 px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={14} /> Enviar Reporte por WhatsApp
        </button>
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Pedidos Realizados</p>
            <p className="text-xl font-bold text-gray-800">{totalPedidos} pedidos</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Ticket Promedio</p>
            <p className="text-xl font-bold text-gray-800">{formatearPrecio(ticketPromedio)}</p>
          </div>
        </div>
      </div>

      {/* Desglose por Método de Pago */}
      <section className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-800 border-b border-slate-100 pb-2">💳 Facturación por Método de Pago</h2>
        
        {totalPedidos === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No hay registros de facturación para la fecha seleccionada.</p>
        ) : (
          <div className="space-y-4">
            {/* Efectivo */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <DollarSign size={14} className="text-emerald-500" /> Efectivo ({efectivoCount} ped.)
                </span>
                <span className="text-gray-900">{formatearPrecio(efectivoTotal)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pctEfectivo}%` }} />
              </div>
            </div>

            {/* Tarjeta */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <CreditCard size={14} className="text-blue-500" /> Tarjeta / Débito ({tarjetaCount} ped.)
                </span>
                <span className="text-gray-900">{formatearPrecio(tarjetaTotal)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pctTarjeta}%` }} />
              </div>
            </div>

            {/* Transferencia */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <Landmark size={14} className="text-indigo-500" /> Transferencia ({transferenciaCount} ped.)
                </span>
                <span className="text-gray-900">{formatearPrecio(transferenciaTotal)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pctTransf}%` }} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Desglose por Modalidad de Entrega */}
      <section className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-800 border-b border-slate-100 pb-2">🛵 Facturación por Modalidad</h2>
        
        {totalPedidos === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No hay registros de facturación para la fecha seleccionada.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Delivery */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-center space-y-1">
              <Bike size={20} className="text-blue-600 mx-auto" />
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Delivery</p>
              <p className="text-lg font-bold text-slate-800">{formatearPrecio(deliveryTotal)}</p>
              <p className="text-[10px] text-gray-400">{deliveryCount} envíos</p>
            </div>

            {/* Retiro */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-center space-y-1">
              <Store size={20} className="text-amber-600 mx-auto" />
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Retiro Local</p>
              <p className="text-lg font-bold text-slate-800">{formatearPrecio(retiroTotal)}</p>
              <p className="text-[10px] text-gray-400">{retiroCount} retiros</p>
            </div>

            {/* Local */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-center space-y-1">
              <UtensilsCrossed size={20} className="text-purple-600 mx-auto" />
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Consumo Local</p>
              <p className="text-lg font-bold text-slate-800">{formatearPrecio(localTotal)}</p>
              <p className="text-[10px] text-gray-400">{localCount} servidos</p>
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
  )
}
