// ─────────────────────────────────────────────────────
// lib/comparativa.ts
// Lógica para comparar el turno activo con el mismo día de la semana anterior.
// ─────────────────────────────────────────────────────

import { supabase } from './supabase'
import { TipoTurno } from '@/tipos'

export interface MetricasTurno {
  facturacionNeta: number
  totalPedidos: number
  ticketPromedio: number
  efectivoVentas: number
  transferenciaTotal: number
  totalDelivery: number
}

export interface ResultadoComparativa {
  fechaAnterior: string
  diaNombre: string
  turnoTipo: TipoTurno
  actual: MetricasTurno
  anterior: MetricasTurno
  porcentajeFacturacion: number
  diferenciaFacturacion: number
  porcentajePedidos: number
  diferenciaPedidos: number
  porcentajeTicket: number
  diferenciaTicket: number
  esPositivo: boolean
  sinHistorial: boolean
}

/**
 * Obtiene la fecha YYYY-MM-DD de hace N días.
 */
function restarDias(fechaStr: string, dias: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - dias)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/**
 * Obtiene el nombre del día de la semana en español.
 */
function obtenerNombreDia(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  return dias[date.getDay()]
}

/**
 * Consulta el cierre del mismo turno de la semana anterior y calcula la variación porcentual.
 */
export async function calcularComparativaSemanal(
  fechaHoy: string,
  turnoTipo: TipoTurno,
  metricasActuales: MetricasTurno
): Promise<ResultadoComparativa> {
  const fechaSemanaPasada = restarDias(fechaHoy, 7)
  const diaNombre = obtenerNombreDia(fechaHoy)

  try {
    // Buscar en cierres_diarios el snapshot del mismo turno hace 7 días
    const { data: cierres } = await supabase
      .from('cierres_diarios')
      .select('*')
      .eq('fecha', fechaSemanaPasada)
      .eq('turno_tipo', turnoTipo)
      .limit(1)

    let snapshotAnterior = cierres && cierres.length > 0 ? cierres[0] : null

    // Si no encontró exactamente hace 7 días, buscar el último cierre cerrado de ese mismo turno
    if (!snapshotAnterior) {
      const { data: ultimosCierres } = await supabase
        .from('cierres_diarios')
        .select('*')
        .eq('turno_tipo', turnoTipo)
        .lt('fecha', fechaHoy)
        .order('fecha', { ascending: false })
        .limit(1)

      if (ultimosCierres && ultimosCierres.length > 0) {
        snapshotAnterior = ultimosCierres[0]
      }
    }

    if (!snapshotAnterior) {
      return {
        fechaAnterior: fechaSemanaPasada,
        diaNombre,
        turnoTipo,
        actual: metricasActuales,
        anterior: {
          facturacionNeta: 0,
          totalPedidos: 0,
          ticketPromedio: 0,
          efectivoVentas: 0,
          transferenciaTotal: 0,
          totalDelivery: 0,
        },
        porcentajeFacturacion: 0,
        diferenciaFacturacion: metricasActuales.facturacionNeta,
        porcentajePedidos: 0,
        diferenciaPedidos: metricasActuales.totalPedidos,
        porcentajeTicket: 0,
        diferenciaTicket: metricasActuales.ticketPromedio,
        esPositivo: true,
        sinHistorial: true,
      }
    }

    const antFacturacion = Number(snapshotAnterior.facturacion_neta || 0)
    const antPedidos = Number(snapshotAnterior.total_pedidos || 0)
    const antTicket = Number(snapshotAnterior.ticket_promedio || 0)

    const actFacturacion = metricasActuales.facturacionNeta
    const actPedidos = metricasActuales.totalPedidos
    const actTicket = metricasActuales.ticketPromedio

    const diffFacturacion = actFacturacion - antFacturacion
    const pctFacturacion =
      antFacturacion > 0
        ? Math.round((diffFacturacion / antFacturacion) * 100)
        : actFacturacion > 0
        ? 100
        : 0

    const diffPedidos = actPedidos - antPedidos
    const pctPedidos =
      antPedidos > 0
        ? Math.round((diffPedidos / antPedidos) * 100)
        : actPedidos > 0
        ? 100
        : 0

    const diffTicket = actTicket - antTicket
    const pctTicket =
      antTicket > 0
        ? Math.round((diffTicket / antTicket) * 100)
        : actTicket > 0
        ? 100
        : 0

    return {
      fechaAnterior: snapshotAnterior.fecha,
      diaNombre: obtenerNombreDia(snapshotAnterior.fecha),
      turnoTipo,
      actual: metricasActuales,
      anterior: {
        facturacionNeta: antFacturacion,
        totalPedidos: antPedidos,
        ticketPromedio: antTicket,
        efectivoVentas: Number(snapshotAnterior.efectivo_ventas || 0),
        transferenciaTotal: Number(snapshotAnterior.transferencia_total || 0),
        totalDelivery: Number(snapshotAnterior.total_envios_delivery || 0),
      },
      porcentajeFacturacion: pctFacturacion,
      diferenciaFacturacion: diffFacturacion,
      porcentajePedidos: pctPedidos,
      diferenciaPedidos: diffPedidos,
      porcentajeTicket: pctTicket,
      diferenciaTicket: diffTicket,
      esPositivo: pctFacturacion >= 0,
      sinHistorial: false,
    }
  } catch (err) {
    console.error('Error calculando comparativa semanal:', err)
    return {
      fechaAnterior: fechaSemanaPasada,
      diaNombre,
      turnoTipo,
      actual: metricasActuales,
      anterior: {
        facturacionNeta: 0,
        totalPedidos: 0,
        ticketPromedio: 0,
        efectivoVentas: 0,
        transferenciaTotal: 0,
        totalDelivery: 0,
      },
      porcentajeFacturacion: 0,
      diferenciaFacturacion: 0,
      porcentajePedidos: 0,
      diferenciaPedidos: 0,
      porcentajeTicket: 0,
      diferenciaTicket: 0,
      esPositivo: true,
      sinHistorial: true,
    }
  }
}
