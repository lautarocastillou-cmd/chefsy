'use client'

// ─────────────────────────────────────────────────────
// modules/malu/componentes/ListaVentasDiarias.tsx
// Pestaña de ventas que muestra el balance del día y el historial.
// Permite registrar ventas de mostrador directamente desde aquí.
// ─────────────────────────────────────────────────────

import { useState } from 'react'
import { usarMalu, obtenerFechaNegocioMalu } from '../contexto'
import ModalVentaMostrador from './ModalVentaMostrador'
import ModalNuevoGasto from './ModalNuevoGasto'

function formatearPeso(monto: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

export default function ListaVentasDiarias() {
  const { ventasMostrador, apartados, clientas, entregarApartado, cancelarApartado, gastos, borrarGasto, productos, ventas } = usarMalu()
  const [modalRegistrar, setModalRegistrar] = useState(false)
  const [modalGasto, setModalGasto] = useState(false)
  const [subTab, setSubTab] = useState<'caja' | 'apartados' | 'estadisticas'>('caja')

  // Estados para retiro de seña
  const [confirmarRetiroId, setConfirmarRetiroId] = useState<string | null>(null)
  const [metodoRetiro, setMetodoRetiro] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [procesandoRetiro, setProcesandoRetiro] = useState(false)

  // Buscador de apartados
  const [busquedaAp, setBusquedaAp] = useState('')

  const hoyStr = obtenerFechaNegocioMalu()

  // Filtrar ventas de hoy
  const ventasHoy = ventasMostrador.filter(v => v.fecha === hoyStr)

  // Calcular balances
  const totalHoy = ventasHoy.reduce((sum, v) => sum + v.monto, 0)
  const efectivoHoy = ventasHoy.filter(v => v.metodo === 'efectivo').reduce((sum, v) => sum + v.monto, 0)
  const transferenciaHoy = ventasHoy.filter(v => v.metodo === 'transferencia').reduce((sum, v) => sum + v.monto, 0)

  // Filtrar gastos de hoy y acumulado neto
  const gastosHoy = (gastos || []).filter(g => g.fecha === hoyStr)
  const totalGastosHoy = gastosHoy.reduce((sum, g) => sum + g.monto, 0)
  const cajaNetaHoy = totalHoy - totalGastosHoy

  const formatHora = (creadaEn?: string) => {
    if (!creadaEn) return 'Ahora'
    try {
      const d = new Date(creadaEn)
      return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return '--:--'
    }
  }

  // Filtrado de apartados
  const apartadosFiltrados = apartados.filter(ap => {
    const clienta = clientas.find(c => c.id === ap.clienta_id)
    const nombre = clienta ? clienta.nombre.toLowerCase() : ''
    const tel = clienta?.telefono || ''
    const desc = ap.descripcion.toLowerCase()
    const query = busquedaAp.toLowerCase()

    return nombre.includes(query) || tel.includes(query) || desc.includes(query)
  })

  const handleEntregarConfirm = async () => {
    if (!confirmarRetiroId) return
    setProcesandoRetiro(true)
    try {
      await entregarApartado(confirmarRetiroId, metodoRetiro)
      alert('¡Apartado entregado con éxito! Se registró la venta en caja.')
      setConfirmarRetiroId(null)
    } catch (err) {
      alert('Error al registrar la entrega.')
    } finally {
      setProcesandoRetiro(false)
    }
  }

  const handleCancelarApartado = async (id: string) => {
    if (confirm('¿Estás seguro de que querés cancelar esta seña? La prenda se devolverá al stock.')) {
      try {
        await cancelarApartado(id)
        alert('Reserva cancelada. Prenda devuelta al inventario.')
      } catch (err) {
        alert('Error al cancelar la reserva.')
      }
    }
  }

  // Buscar clienta por id para renderizado
  const obtenerDatosClienta = (clientaId: string) => {
    const c = clientas.find(item => item.id === clientaId)
    return {
      nombre: c ? c.nombre : 'Clienta desconocida',
      telefono: c?.telefono || null
    }
  }

  const apParaRetiro = apartados.find(a => a.id === confirmarRetiroId)
  const clientaRetiro = apParaRetiro ? obtenerDatosClienta(apParaRetiro.clienta_id) : null

  return (
    <div className="space-y-7">
      {/* Sub-pestañas de Navegación */}
      <div 
        className="flex p-1 rounded-2xl gap-1" 
        style={{ 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(5px)'
        }}
      >
        <button
          onClick={() => setSubTab('caja')}
          className="flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 font-serif-elegant"
          style={{
            background: subTab === 'caja' ? 'rgba(229,211,179,0.1)' : 'transparent',
            color: subTab === 'caja' ? '#E5D3B3' : 'rgba(255,255,255,0.4)',
            border: subTab === 'caja' ? '1px solid rgba(229,211,179,0.15)' : '1px solid transparent',
          }}
        >
          💵 Caja Diaria
        </button>
        <button
          onClick={() => setSubTab('apartados')}
          className="flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 font-serif-elegant"
          style={{
            background: subTab === 'apartados' ? 'rgba(52, 211, 153, 0.08)' : 'transparent',
            color: subTab === 'apartados' ? '#34d399' : 'rgba(255,255,255,0.4)',
            border: subTab === 'apartados' ? '1px solid rgba(52, 211, 153, 0.15)' : '1px solid transparent',
          }}
        >
          📌 Señas
        </button>
        <button
          onClick={() => setSubTab('estadisticas')}
          className="flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 font-serif-elegant"
          style={{
            background: subTab === 'estadisticas' ? 'rgba(229, 211, 179, 0.1)' : 'transparent',
            color: subTab === 'estadisticas' ? '#E5D3B3' : 'rgba(255,255,255,0.4)',
            border: subTab === 'estadisticas' ? '1px solid rgba(229, 211, 179, 0.15)' : '1px solid transparent',
          }}
        >
          📊 Estadísticas
        </button>
      </div>

      {subTab === 'caja' ? (
        <>
          {/* Balance del Día */}
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 font-serif-elegant">
                Balance del Día
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalGasto(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-white/5 active:scale-[0.98] select-none border"
                  style={{
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.05)',
                  }}
                >
                  + Cargar Gasto
                </button>
                <button
                  onClick={() => setModalRegistrar(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-95 active:scale-[0.98] select-none shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #E5D3B3, #C9B497)',
                    color: '#0a0a0a',
                    boxShadow: '0 4px 12px rgba(229,211,179,0.15)',
                  }}
                >
                  + Registrar Venta
                </button>
              </div>
            </div>
            
            {/* Fila de Balances con Glassmorphism */}
            <div className="grid grid-cols-2 gap-3">
              {/* Total recaudado */}
              <div
                className="rounded-2xl p-4 flex flex-col justify-between transition-all hover:scale-[1.01]"
                style={{
                  background: 'rgba(229, 211, 179, 0.02)',
                  border: '1px solid rgba(229, 211, 179, 0.15)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-semibold">Total Ventas</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Ingresos de hoy</p>
                </div>
                <p className="text-lg font-bold mt-3" style={{ color: '#E5D3B3' }}>
                  {formatearPeso(totalHoy)}
                </p>
              </div>

              {/* Gastos de Hoy */}
              <div
                className="rounded-2xl p-4 flex flex-col justify-between transition-all hover:scale-[1.01]"
                style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-semibold">Gastos</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Egresos de hoy</p>
                </div>
                <p className="text-lg font-bold mt-3 text-red-400">
                  {formatearPeso(totalGastosHoy)}
                </p>
              </div>

              {/* Caja Neta */}
              <div
                className="rounded-2xl p-4 flex flex-col justify-between transition-all hover:scale-[1.01]"
                style={{
                  background: 'rgba(229, 211, 179, 0.02)',
                  border: `1px solid ${cajaNetaHoy >= 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-semibold">Caja Neta</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Ganancia limpia</p>
                </div>
                <p className={`text-lg font-bold mt-3 ${cajaNetaHoy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatearPeso(cajaNetaHoy)}
                </p>
              </div>

              {/* Métodos de Cobro */}
              <div
                className="rounded-2xl p-4 flex flex-col justify-between transition-all hover:scale-[1.01]"
                style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-semibold">Medios de Cobro</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Efectivo vs Transf</p>
                </div>
                <div className="mt-2 text-[10px] font-medium space-y-0.5">
                  <p className="text-emerald-400">💵 Efec: {formatearPeso(efectivoHoy)}</p>
                  <p className="text-blue-400">📱 Trans: {formatearPeso(transferenciaHoy)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Historial de Ventas del Día */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 font-serif-elegant">
              Historial de Ventas de Hoy
            </h3>

            {ventasHoy.length === 0 ? (
              <div 
                className="text-center py-12 rounded-2xl" 
                style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.25)' 
                }}
              >
                <p className="text-2xl mb-2">💸</p>
                <p className="text-sm">Abril, todavía no se registraron ventas hoy</p>
              </div>
            ) : (
              <div 
                className="overflow-hidden rounded-2xl"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)' 
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr style={{ background: 'rgba(229, 211, 179, 0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th className="px-4 py-3 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">Hora</th>
                        <th className="px-4 py-3 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">Producto</th>
                        <th className="px-4 py-3 text-neutral-400 font-semibold uppercase tracking-wider text-[10px] text-center">Talle</th>
                        <th className="px-4 py-3 text-neutral-400 font-semibold uppercase tracking-wider text-[10px] text-center">Metodo</th>
                        <th className="px-4 py-3 text-neutral-400 font-semibold uppercase tracking-wider text-[10px] text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      {ventasHoy.map((v) => (
                        <tr 
                          key={v.id} 
                          className="hover:bg-white/[0.01] transition-colors"
                        >
                          <td className="px-4 py-3.5 text-neutral-400 font-medium">
                            {formatHora(v.creada_en)}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-neutral-200">
                            {v.descripcion} {v.cantidad > 1 ? `(x${v.cantidad})` : ''}
                          </td>
                          <td className="px-4 py-3.5 text-neutral-400 text-center">
                            <span className="px-2 py-0.5 rounded bg-neutral-900 text-[10px] border border-neutral-800 font-medium text-neutral-300">
                              {v.talle || 'Único'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span 
                              className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                              style={{
                                background: v.metodo === 'efectivo' ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)',
                                color: v.metodo === 'efectivo' ? '#34d399' : '#60a5fa',
                                border: v.metodo === 'efectivo' ? '1px solid rgba(52,211,153,0.15)' : '1px solid rgba(96,165,250,0.15)',
                              }}
                            >
                              {v.metodo === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-neutral-100">
                            {formatearPeso(v.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Historial de Gastos del Día */}
          <div className="space-y-3 mt-7">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-1.5 font-serif-elegant">
              Historial de Gastos de Hoy
            </h3>

            {gastosHoy.length === 0 ? (
              <div 
                className="text-center py-8 rounded-2xl" 
                style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.25)' 
                }}
              >
                <p className="text-xl mb-1">💸</p>
                <p className="text-xs">No hay gastos registrados hoy</p>
              </div>
            ) : (
              <div 
                className="overflow-hidden rounded-2xl"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)' 
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr style={{ background: 'rgba(229, 211, 179, 0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th className="px-4 py-2.5 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">Concepto</th>
                        <th className="px-4 py-2.5 text-neutral-400 font-semibold uppercase tracking-wider text-[10px] text-right">Monto</th>
                        <th className="px-4 py-2.5 text-neutral-400 font-semibold uppercase tracking-wider text-[10px] text-center w-12">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      {gastosHoy.map((g) => (
                        <tr 
                          key={g.id} 
                          className="hover:bg-white/[0.01] transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-neutral-200">
                            {g.descripcion}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-400">
                            {formatearPeso(g.monto)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                if (confirm('¿Eliminar este gasto?')) {
                                  borrarGasto(g.id).catch(() => alert('Error al borrar gasto'))
                                }
                              }}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Borrar gasto"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      ) : subTab === 'apartados' ? (
        /* Sección de Reservas / Apartados */
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Buscar por clienta, teléfono o prenda..."
              value={busquedaAp}
              onChange={e => setBusquedaAp(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl text-xs outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#f5f5f5',
              }}
            />
          </div>

          {apartadosFiltrados.length === 0 ? (
            <div 
              className="text-center py-16 rounded-2xl" 
              style={{ 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.25)' 
              }}
            >
              <p className="text-2xl mb-2">📌</p>
              <p className="text-sm">Abril, no se encontraron señas o apartados registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apartadosFiltrados.map((ap) => {
                const { nombre, telefono } = obtenerDatosClienta(ap.clienta_id)
                const saldoRestante = ap.monto_total - ap.monto_senado
                const fechaFormat = ap.fecha.split('-').reverse().join('/')

                return (
                  <div
                    key={ap.id}
                    className="rounded-2xl p-4 border flex flex-col justify-between gap-3 transition-all hover:bg-white/[0.01]"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderColor: ap.estado === 'pendiente' ? 'rgba(234,179,8,0.12)' : (ap.estado === 'retirado' ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)'),
                    }}
                  >
                    {/* Header: Clienta y Estado */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-serif-elegant text-sm font-bold text-neutral-100">
                          {nombre}
                        </h4>
                        {telefono && (
                          <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{telefono}</p>
                        )}
                      </div>
                      
                      {/* Badge de estado */}
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                        style={{
                          background: ap.estado === 'pendiente' ? 'rgba(234,179,8,0.08)' : (ap.estado === 'retirado' ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)'),
                          color: ap.estado === 'pendiente' ? '#f59e0b' : (ap.estado === 'retirado' ? '#10b981' : '#ef4444'),
                          border: ap.estado === 'pendiente' ? '1px solid rgba(234,179,8,0.15)' : (ap.estado === 'retirado' ? '1px solid rgba(52,211,153,0.15)' : '1px solid rgba(239,68,68,0.15)'),
                        }}
                      >
                        {ap.estado === 'pendiente' ? 'Pendiente' : (ap.estado === 'retirado' ? 'Retirado' : 'Cancelado')}
                      </span>
                    </div>

                    {/* Prenda y Seña Detalles */}
                    <div className="grid grid-cols-2 gap-4 border-t border-neutral-900 pt-3">
                      <div>
                        <p className="text-[9px] text-neutral-500 uppercase tracking-widest">Prenda</p>
                        <p className="text-xs font-semibold text-neutral-200 mt-0.5">
                          {ap.descripcion} {ap.cantidad > 1 ? `(x${ap.cantidad})` : ''}
                        </p>
                        {ap.talle && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[9px] mt-1.5 text-neutral-400 font-medium">
                            Talle: {ap.talle}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] text-neutral-500 uppercase tracking-widest text-right">Precios</p>
                        <div className="mt-1 text-right text-xs space-y-0.5">
                          <p className="text-neutral-400">Total: <span className="font-mono text-neutral-200 font-semibold">{formatearPeso(ap.monto_total)}</span></p>
                          <p className="text-neutral-400">Seña: <span className="font-mono text-neutral-200 font-semibold">{formatearPeso(ap.monto_senado)} ({ap.metodo_seña === 'efectivo' ? 'Efec.' : 'Trans.'})</span></p>
                          {ap.estado === 'pendiente' && (
                            <p className="text-red-400 font-semibold">Resta: <span className="font-mono">{formatearPeso(saldoRestante)}</span></p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer del apartado: Fecha y Botones de acción */}
                    <div className="flex items-center justify-between border-t border-neutral-900 pt-3 mt-1.5">
                      <span className="text-[10px] text-neutral-500">
                        Señado el {fechaFormat}
                      </span>

                      {ap.estado === 'pendiente' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCancelarApartado(ap.id)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:bg-red-500/10 text-red-400"
                            style={{ border: '1px solid rgba(239,68,68,0.2)' }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => setConfirmarRetiroId(ap.id)}
                            className="px-3.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-90 active:scale-[0.98] text-neutral-900"
                            style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}
                          >
                            Entregar Prenda
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* Sección de Estadísticas (subTab === 'estadisticas') */
        (() => {
          // 1. Calcular cantidades vendidas agrupando por producto
          const ventasPorProd: Record<string, number> = {}

          // a) Ventas de mostrador
          const listVm = ventasMostrador || []
          listVm.forEach(vm => {
            if (vm.producto_id) {
              ventasPorProd[vm.producto_id] = (ventasPorProd[vm.producto_id] || 0) + vm.cantidad
            }
          })

          // b) Apartados (excluyendo cancelados)
          const listAp = apartados || []
          listAp.forEach(ap => {
            if (ap.producto_id && ap.estado !== 'cancelado') {
              ventasPorProd[ap.producto_id] = (ventasPorProd[ap.producto_id] || 0) + ap.cantidad
            }
          })

          // c) Ventas fiadas
          const listV = ventas || []
          listV.forEach(v => {
            const descLower = v.descripcion.toLowerCase()
            const matchQty = v.descripcion.match(/\(x(\d+)\)/)
            const qty = matchQty ? parseInt(matchQty[1], 10) : 1

            const listP = productos || []
            listP.forEach(p => {
              if (descLower.includes(p.nombre.toLowerCase())) {
                ventasPorProd[p.id] = (ventasPorProd[p.id] || 0) + qty
              }
            })
          })

          // 2. Mapear a estrellas ordenado por cantVendida DESC
          const estrellas = (productos || [])
            .map(p => ({
              producto: p,
              cantVendida: ventasPorProd[p.id] || 0,
            }))
            .filter(item => item.cantVendida > 0)
            .sort((a, b) => b.cantVendida - a.cantVendida)
            .slice(0, 5)

          // 3. Calcular Clavos (Mercadería estancada)
          // creado_en hace más de 60 días sin ventas en los últimos 60 días
          const hoy = new Date()
          const hace60Dias = new Date()
          hace60Dias.setDate(hoy.getDate() - 60)
          const hace60DiasStr = hace60Dias.toLocaleDateString('sv').substring(0, 10)

          const clavos = (productos || [])
            .filter(p => {
              if (p.stock <= 0) return false
              const fechaCreado = new Date(p.creado_en)
              if (fechaCreado >= hace60Dias) return false

              // Sin ventas en los últimos 60 días
              const subVm = ventasMostrador || []
              const hasVentaMostradorReciente = subVm.some(
                vm => vm.producto_id === p.id && vm.fecha >= hace60DiasStr
              )
              if (hasVentaMostradorReciente) return false

              const subAp = apartados || []
              const hasApartadoReciente = subAp.some(
                ap => ap.producto_id === p.id && ap.estado !== 'cancelado' && ap.fecha >= hace60DiasStr
              )
              if (hasApartadoReciente) return false

              const subV = ventas || []
              const hasVentaFiadaReciente = subV.some(
                v => v.descripcion.toLowerCase().includes(p.nombre.toLowerCase()) && v.fecha >= hace60DiasStr
              )
              if (hasVentaFiadaReciente) return false

              return true
            })
            .map(p => ({
              producto: p,
              capitalEstancado: p.precio * p.stock,
              diasSinVenta: Math.floor((hoy.getTime() - new Date(p.creado_en).getTime()) / (1000 * 60 * 60 * 24))
            }))
            .sort((a, b) => b.capitalEstancado - a.capitalEstancado)
            .slice(0, 5)

          // Capital estancado total en clavos
          const capitalEstancadoTotal = (productos || [])
            .filter(p => {
              if (p.stock <= 0) return false
              const creado = new Date(p.creado_en)
              if (creado >= hace60Dias) return false

              const subVm = ventasMostrador || []
              const hasVentaMostradorReciente = subVm.some(vm => vm.producto_id === p.id && vm.fecha >= hace60DiasStr)
              if (hasVentaMostradorReciente) return false

              const subAp = apartados || []
              const hasApartadoReciente = subAp.some(ap => ap.producto_id === p.id && ap.estado !== 'cancelado' && ap.fecha >= hace60DiasStr)
              if (hasApartadoReciente) return false

              const subV = ventas || []
              const hasVentaFiadaReciente = subV.some(v => v.descripcion.toLowerCase().includes(p.nombre.toLowerCase()) && v.fecha >= hace60DiasStr)
              if (hasVentaFiadaReciente) return false

              return true
            })
            .reduce((sum, p) => sum + (p.precio * p.stock), 0)

          return (
            <div className="space-y-6 animate-fade-in text-neutral-200">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 font-serif-elegant">
                  Análisis del Negocio
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Cruza de datos de ventas e inventario para optimizar tu stock
                </p>
              </div>

              {/* Tarjeta de Resumen de Capital Estancado vs Estrellas */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <p className="text-[9px] uppercase tracking-widest text-neutral-400">Capital en Clavos 🧊</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Parado hace +60 días</p>
                  <p className="text-lg font-bold mt-2 text-red-400 font-mono">
                    {formatearPeso(capitalEstancadoTotal)}
                  </p>
                </div>
                <div 
                  className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid rgba(52, 211, 153, 0.15)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <p className="text-[9px] uppercase tracking-widest text-neutral-400">Prendas Estrella 🔥</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Modelos con ventas</p>
                  <p className="text-lg font-bold mt-2 text-emerald-400">
                    {estrellas.length} Diseños
                  </p>
                </div>
              </div>

              {/* Top 5 Las Estrellas (Más Vendidos) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-serif-elegant">
                  🔥 Las Estrellas (Top 5 Más Vendidos)
                </h4>
                {estrellas.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic p-4 rounded-xl border border-white/5 bg-white/[0.01] text-center">
                    Aún no hay suficientes ventas registradas para generar el ranking.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {estrellas.map((item, index) => (
                      <div
                        key={item.producto.id}
                        className="rounded-2xl p-3.5 flex items-center justify-between gap-3 bg-white/[0.02] border border-white/5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 text-[#E5D3B3] flex items-center justify-center text-xs font-bold shrink-0">
                            #{index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-neutral-100 truncate">{item.producto.nombre}</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">Categoría: {item.producto.categoria || 'Sin Cat.'}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-[#E5D3B3]">{item.cantVendida} vendidos</p>
                          <p className="text-[10px] text-neutral-500">Stock: {item.producto.stock} uds</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top 5 Los Clavos (Mercadería Estancada) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-serif-elegant">
                  🧊 Mercadería Estancada / Clavos (Top 5)
                </h4>
                {clavos.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic p-4 rounded-xl border border-white/5 bg-white/[0.01] text-center">
                    ¡Excelente! No tenés prendas estancadas de más de 60 días sin ventas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {clavos.map((item, index) => (
                      <div
                        key={item.producto.id}
                        className="rounded-2xl p-3.5 flex items-center justify-between gap-3 bg-white/[0.02] border border-white/5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                            #{index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-neutral-100 truncate">{item.producto.nombre}</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">{item.diasSinVenta} días sin ventas</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-red-400 font-mono">{formatearPeso(item.capitalEstancado)} estancado</p>
                          <p className="text-[10px] text-neutral-500">Stock: {item.producto.stock} uds</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()
      )}

      {/* Modal / Prompt de confirmación de retiro */}
      {confirmarRetiroId && clientaRetiro && apParaRetiro && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }}
          onClick={() => setConfirmarRetiroId(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-4 animate-[slideIn_0.2s_ease-out]"
            style={{
              background: '#161616',
              border: '1px solid rgba(229, 211, 179, 0.18)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-neutral-200 font-serif-elegant">
                Confirmar Entrega de Prenda
              </h3>
              <p className="text-[11px] text-neutral-400 mt-1">
                Abril, registra el cobro final del saldo restante.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-xs space-y-1.5">
              <p className="text-neutral-300">Clienta: <span className="font-bold text-[#E5D3B3]">{clientaRetiro.nombre}</span></p>
              <p className="text-neutral-300">Prenda: <span className="font-medium text-neutral-100">{apParaRetiro.descripcion}</span></p>
              <p className="text-neutral-300">Total Prenda: <span className="font-mono">{formatearPeso(apParaRetiro.monto_total)}</span></p>
              <p className="text-neutral-300">Seña Abonada: <span className="font-mono text-emerald-400">-{formatearPeso(apParaRetiro.monto_senado)}</span></p>
              <div className="border-t border-neutral-800 pt-1.5 flex items-center justify-between font-bold text-neutral-100">
                <span>Saldo a cobrar:</span>
                <span className="text-emerald-400 font-mono">{formatearPeso(apParaRetiro.monto_total - apParaRetiro.monto_senado)}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-2 text-neutral-400 font-semibold">
                ¿Cómo abona la clienta el saldo? *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoRetiro('efectivo')}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={
                    metodoRetiro === 'efectivo'
                      ? { background: 'rgba(229, 211, 179, 0.15)', color: '#E5D3B3', border: '1px solid rgba(229, 211, 179, 0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }
                  }
                >
                  💵 Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoRetiro('transferencia')}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={
                    metodoRetiro === 'transferencia'
                      ? { background: 'rgba(229, 211, 179, 0.15)', color: '#E5D3B3', border: '1px solid rgba(229, 211, 179, 0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }
                  }
                >
                  📱 Transf.
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmarRetiroId(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
              >
                Cerrar
              </button>
              <button
                onClick={handleEntregarConfirm}
                disabled={procesandoRetiro}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-neutral-900 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}
              >
                {procesandoRetiro ? 'Procesando...' : 'Confirmar Retiro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRegistrar && (
        <ModalVentaMostrador onCerrar={() => setModalRegistrar(false)} />
      )}
      {modalGasto && (
        <ModalNuevoGasto onCerrar={() => setModalGasto(false)} />
      )}
    </div>
  )
}
