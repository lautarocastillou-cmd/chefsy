'use client'

import { usarPedidos } from '@/contexto/PedidosContexto'
import { formatearPrecio, cn } from '@/lib/utils'
import { obtenerFechaNegocio, detectarTipoTurnoActual, obtenerEtiquetaTurno } from '@/lib/tiempo'
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
  X,
  BarChart3,
  Wallet,
  Sun,
  Moon,
  Clock,
  Zap
} from 'lucide-react'
import { Pedido, TipoTurno } from '@/tipos'
import MetricasHistoricas from '@/components/cierre/MetricasHistoricas'

export default function PaginaCierreCaja() {
  const { pedidos, obtenerPedidosPorFecha, finalizarTurno, estadoTurno, iniciarTurno, configuracionOperativa } = usarPedidos()
  
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => obtenerFechaNegocio())
  const [modoOrigen, setModoOrigen] = useState<'en_vivo' | 'fecha'>('en_vivo')
  const [pedidosDelDia, setPedidosDelDia] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [tabActual, setTabActual] = useState<'calculadora' | 'metricas'>('calculadora')
  const [filtroTurno, setFiltroTurno] = useState<'todos' | 'mediodia' | 'noche'>('todos')

  const montoBaseCadete = (configuracionOperativa as any)?.montoBaseCadete ?? 4000

  // Estado para el modal de Iniciar Turno
  const [modalInicioAbierto, setModalInicioAbierto] = useState(false)
  const [cajaInicialInput, setCajaInicialInput] = useState('')
  const [tipoTurnoInput, setTipoTurnoInput] = useState<TipoTurno>(() => detectarTipoTurnoActual())

  // Detectar si hay pedidos activos de un turno anterior sin archivar
  const infoTurnoPendiente = useMemo(() => {
    const activosNoArchivados = pedidos.filter(p => !p.archivado)
    if (activosNoArchivados.length === 0) return null

    const distintos = activosNoArchivados.filter(p => p.fecha && p.fecha !== fechaSeleccionada)
    if (distintos.length === 0) return null

    const fechaPendiente = distintos[0].fecha
    const cantidad = distintos.length
    const totalMonto = distintos.reduce((acc, p) => acc + (p.estado !== 'cancelado' ? p.total : 0), 0)

    return { fechaPendiente, cantidad, totalMonto }
  }, [pedidos, fechaSeleccionada])

  // Cargar pedidos según el modo de origen seleccionado (En vivo vs Por fecha)
  useEffect(() => {
    let activo = true

    if (modoOrigen === 'en_vivo') {
      // Usar los pedidos activos en vivo en pantalla sin archivar
      setPedidosDelDia(pedidos.filter(p => !p.archivado))
      setCargando(false)
      return
    }

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
  }, [modoOrigen, fechaSeleccionada, obtenerPedidosPorFecha, pedidos])

  // Filtrar pedidos por tipo de turno seleccionado (mediodía vs noche)
  const pedidosFiltradosPorTurno = useMemo(() => {
    if (filtroTurno === 'todos') return pedidosDelDia
    return pedidosDelDia.filter((p) => {
      if (p.turno_tipo) return p.turno_tipo === filtroTurno
      // Fallback por hora si no fue etiquetado
      const horaNum = Number((p.hora || '').split(':')[0]) || 20
      const esMediodia = horaNum >= 10 && horaNum < 16
      return filtroTurno === 'mediodia' ? esMediodia : !esMediodia
    })
  }, [pedidosDelDia, filtroTurno])

  // Pedidos válidos (no cancelados) para estadísticas de caja
  const pedidosValidos = useMemo(() => {
    return pedidosFiltradosPorTurno.filter((p) => p.estado !== 'cancelado')
  }, [pedidosFiltradosPorTurno])

  // ── Desglose y Liquidación por Cadete ───────────────
  const resumenCadetes = useMemo(() => {
    const deliveryOrders = pedidosValidos.filter((p) => p.tipoEntrega === 'delivery')
    const grupos: Record<string, { id: string; nombre: string; cantidadViajes: number; recaudadoViajes: number; base: number; total: number }> = {}

    deliveryOrders.forEach((p) => {
      const key = p.cadete_id || p.cadete_nombre || 'sin_asignar'
      const nombre = p.cadete_nombre || (p.cadete_id ? p.cadete_id : 'Sin Cadete')
      
      if (!grupos[key]) {
        grupos[key] = {
          id: key,
          nombre,
          cantidadViajes: 0,
          recaudadoViajes: 0,
          base: key === 'sin_asignar' ? 0 : montoBaseCadete,
          total: 0
        }
      }
      grupos[key].cantidadViajes += 1
      grupos[key].recaudadoViajes += (p.costoEnvio || 0)
    })

    Object.values(grupos).forEach((g) => {
      g.total = g.recaudadoViajes + g.base
    })

    return Object.values(grupos)
  }, [pedidosValidos, montoBaseCadete])

  const totalPagoCadetesTotal = useMemo(() => {
    return resumenCadetes.reduce((acc, c) => acc + c.total, 0)
  }, [resumenCadetes])

  // ── Cálculos de Facturación ──────────────────────────

  // Total bruto (lo que se cobró sumando todo)
  const facturacionBruta = useMemo(() => {
    return pedidosValidos.reduce((acc, p) => acc + p.total, 0)
  }, [pedidosValidos])

  // Total de costos de envío (= recaudado con envíos)
  const totalCostosEnvio = useMemo(() => {
    return pedidosValidos.reduce((acc, p) => acc + (p.costoEnvio || 0), 0)
  }, [pedidosValidos])

  // Facturación neta del local (lo que realmente queda del alimento)
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

    const desgloseCadetesTexto = resumenCadetes.length > 0
      ? resumenCadetes.map(c => `- 🛵 ${c.nombre}: ${c.cantidadViajes} viajes (${formatearPrecio(c.recaudadoViajes)}) ${c.base > 0 ? `+ ${formatearPrecio(c.base)} base` : ''} = *${formatearPrecio(c.total)}*`).join('\n')
      : '- Sin entregas registradas'

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

*Pago y Liquidación a Cadetes (Total: ${formatearPrecio(totalPagoCadetesTotal)}):*
${desgloseCadetesTexto}
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
    const exito = await iniciarTurno(monto, tipoTurnoInput)
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
    <div className="space-y-6 w-full pb-10">
      
      {/* Selector de fecha, cabecera y botón de finalizar turno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#252525] p-5 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-[#e6e6e6] leading-tight">Cierre de Caja</h1>
            <p className="text-xs text-gray-400 dark:text-[#686868]">Resumen y métricas de facturación diaria</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector Modo Origen de Datos */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#2f2f2f] p-1 rounded-xl border border-slate-200 dark:border-[#4d4d4d] text-xs">
            <button
              onClick={() => setModoOrigen('en_vivo')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5",
                modoOrigen === 'en_vivo'
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
              )}
            >
              <Zap size={14} />
              <span>⚡ En Vivo ({pedidos.filter(p => !p.archivado).length})</span>
            </button>
            <button
              onClick={() => setModoOrigen('fecha')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5",
                modoOrigen === 'fecha'
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
              )}
            >
              <Calendar size={14} />
              <span>Por Fecha</span>
            </button>
          </div>

          {modoOrigen === 'fecha' && (
            <div className="flex items-center gap-2 border border-slate-200 dark:border-[#4d4d4d] rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-[#2f2f2f]">
              <Calendar size={16} className="text-slate-400 dark:text-[#686868]" />
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="bg-transparent border-none text-sm outline-none text-slate-700 dark:text-[#e6e6e6] font-semibold cursor-pointer"
              />
            </div>
          )}

          <button
            onClick={() => setModalInicioAbierto(true)}
            disabled={estadoTurno.activo}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5",
              estadoTurno.activo
                ? "bg-slate-100 text-slate-500 dark:bg-[#333] dark:text-[#888] cursor-not-allowed border border-slate-200 dark:border-slate-800"
                : "bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 active:scale-95"
            )}
          >
            <Play size={16} />
            {estadoTurno.activo
              ? (estadoTurno.tipoTurno === 'mediodia' ? '☀️ Turno Mediodía activo' : '🌙 Turno Noche activo')
              : 'Iniciar Turno'}
          </button>
          <button
            onClick={manejarFinalizarTurno}
            disabled={!estadoTurno.activo}
            className="bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-50 disabled:cursor-not-allowed text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            title="Archiva todos los pedidos del panel activo para arrancar un nuevo turno limpio"
          >
            🏁 Finalizar Turno
          </button>
        </div>
      </div>

      {/* Alerta de Turno Pendiente de Fecha Anterior */}
      {infoTurnoPendiente && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5 sm:mt-0 shadow-sm">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                ⚠️ Turno anterior sin finalizar ({infoTurnoPendiente.fechaPendiente})
              </h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-400/90 mt-0.5 font-medium">
                Tenés <strong className="text-amber-950 dark:text-amber-200">{infoTurnoPendiente.cantidad} pedidos en vivo</strong> sin archivar por <strong className="text-amber-950 dark:text-amber-200">{formatearPrecio(infoTurnoPendiente.totalMonto)}</strong> pertenecientes a una fecha previa.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => {
                setFechaSeleccionada(infoTurnoPendiente.fechaPendiente)
                setModoOrigen('fecha')
              }}
              className="px-3 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Calendar size={14} />
              Ver Cierre de esa Fecha ({infoTurnoPendiente.fechaPendiente})
            </button>
            <button
              onClick={manejarFinalizarTurno}
              className="px-3 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              🏁 Finalizar Turno Anterior
            </button>
          </div>
        </div>
      )}

      {/* Selector de Tabs y Filtro de Turno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#3d3d3d] pb-1">
        <div className="flex">
          <button
            onClick={() => setTabActual('calculadora')}
            className={cn(
              "px-4 py-3 text-sm font-bold transition-all border-b-2",
              tabActual === 'calculadora' 
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" 
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            Calculadora en Vivo
          </button>
          <button
            onClick={() => setTabActual('metricas')}
            className={cn(
              "px-4 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
              tabActual === 'metricas' 
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" 
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            <BarChart3 size={16} />
            Métricas Históricas
          </button>
        </div>

        {/* Filtro por Turno (solo visible en Calculadora) */}
        {tabActual === 'calculadora' && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#282828] p-1 rounded-xl border border-slate-200 dark:border-[#3d3d3d] text-xs self-start sm:self-auto mb-2 sm:mb-0">
            <button
              onClick={() => setFiltroTurno('todos')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all",
                filtroTurno === 'todos'
                  ? "bg-white dark:bg-[#383838] text-slate-800 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              ☀️/🌙 Ambos Turnos
            </button>
            <button
              onClick={() => setFiltroTurno('mediodia')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1",
                filtroTurno === 'mediodia'
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              <Sun size={13} />
              Mediodía
            </button>
            <button
              onClick={() => setFiltroTurno('noche')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1",
                filtroTurno === 'noche'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              <Moon size={13} />
              Noche
            </button>
          </div>
        )}
      </div>

      {tabActual === 'metricas' ? (
        <MetricasHistoricas />
      ) : (
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
              <p className="text-xs text-gray-400 dark:text-[#686868] font-medium">Pago a Cadetes (Viajes + Base)</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{formatearPrecio(totalPagoCadetesTotal)}</p>
              <p className="text-[10px] text-gray-400 dark:text-[#686868]">
                {deliveryCount} envíos • Base: {formatearPrecio(montoBaseCadete)}
              </p>
            </div>
          </div>
        </div>

        {/* Desglose por Método de Pago */}
        <section className="bg-white dark:bg-[#252525] border border-slate-100 dark:border-[#3d3d3d] shadow-sm rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 dark:text-[#e6e6e6] border-b border-slate-100 dark:border-[#3d3d3d] pb-2 flex items-center gap-2">
            <CreditCard size={16} className="text-chefsy dark:text-chefsy-400" />
            <span>Facturación por Método de Pago</span>
          </h2>
          
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

        {/* Liquidación Individual por Cadete */}
        <section className="bg-white dark:bg-[#252525] border border-slate-100 dark:border-[#3d3d3d] shadow-sm rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 dark:text-[#e6e6e6] border-b border-slate-100 dark:border-[#3d3d3d] pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bike size={16} className="text-orange-500" />
              <span>Liquidación a Cadetes (Viajes + Base)</span>
            </span>
            <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900/30">
              Total: {formatearPrecio(totalPagoCadetesTotal)}
            </span>
          </h2>
          
          {resumenCadetes.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-[#686868] text-center py-4">
              {cargando ? 'Cargando...' : 'No hay envíos asignados a cadetes en la fecha seleccionada.'}
            </p>
          ) : (
            <div className="space-y-3">
              {resumenCadetes.map((c) => (
                <div key={c.id} className="bg-slate-50 dark:bg-[#2f2f2f] p-3.5 rounded-xl border border-slate-100 dark:border-[#3d3d3d] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-800 dark:text-[#e6e6e6] flex items-center gap-2">
                      <span>{c.nombre}</span>
                      <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                        {c.cantidadViajes} {c.cantidadViajes === 1 ? 'viaje' : 'viajes'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Recaudado por viajes: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatearPrecio(c.recaudadoViajes)}</span>
                      {c.base > 0 && <> • Base fija: <span className="font-semibold text-amber-600 dark:text-amber-400">+{formatearPrecio(c.base)}</span></>}
                    </p>
                  </div>
                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-700">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total a Pagar</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatearPrecio(c.total)}</span>
                  </div>
                </div>
              ))}
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
      )}

      {/* Modal Iniciar Turno */}
      {modalInicioAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 transition-opacity duration-200 will-change-opacity animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 overflow-hidden will-change-transform">
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
                  Tipo de Turno
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoTurnoInput('mediodia')}
                    className={cn(
                      "p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all",
                      tipoTurnoInput === 'mediodia'
                        ? "bg-amber-500 text-white border-amber-600 shadow-md scale-[1.02]"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Sun size={18} />
                    <span>☀️ Mediodía</span>
                    <span className="text-[10px] font-normal opacity-80">11:30 a 14:00</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoTurnoInput('noche')}
                    className={cn(
                      "p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all",
                      tipoTurnoInput === 'noche'
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-md scale-[1.02]"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Moon size={18} />
                    <span>🌙 Noche</span>
                    <span className="text-[10px] font-normal opacity-80">20:30 a 01:00</span>
                  </button>
                </div>
              </div>

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
