import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerFechaNegocio, obtenerRangoSemanaISO } from '@/lib/tiempo'
import { consolidarMetricasCadetes, MetricasCadeteConsolidadas } from '@/lib/telemetriaCadetes'

const FLUTTER_SECRET_TOKEN = 'chefsy_expo_secure_track_99XQ'

interface CadeteItemRanking {
  posicion: number
  cadete_id: string
  nombre: string
  velocidad_media: number
  velocidad_maxima: number
  pedidos_entregados: number
  km_totales: number
  es_mas_rapido: boolean
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${FLUTTER_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cadeteIdParam = searchParams.get('cadeteId')
    if (!cadeteIdParam) {
      return NextResponse.json({ error: 'cadeteId requerido' }, { status: 400 })
    }

    const cadeteIdNorm = cadeteIdParam.trim().toLowerCase()
    const supabase = obtenerSupabaseAdmin()

    // 1. Obtener cadetes registrados
    const { data: cadetesData } = await supabase
      .from('cadetes')
      .select('id, nombre, activo')

    const cadetesRegistrados = (cadetesData || []).map(c => ({
      id: c.id,
      nombre: c.nombre || c.id,
      activo: c.activo ?? true
    }))

    const cadeteActual = cadetesRegistrados.find(
      c => c.id.toLowerCase().trim() === cadeteIdNorm || c.nombre.toLowerCase().trim() === cadeteIdNorm
    )
    const nombreCadeteActual = cadeteActual?.nombre || cadeteIdParam

    // 2. Fechas de negocio y rango de la semana ISO
    const fechaHoy = obtenerFechaNegocio()
    const rangoSemana = obtenerRangoSemanaISO(fechaHoy)

    // 3. Consultar pedidos entregados de la semana actual (incluye hoy)
    const { data: pedidosSemanaRaw, error: errPedidos } = await supabase
      .from('pedidos')
      .select('id, estado, fecha, hora, tipoEntrega, cadete_id, cadete_nombre, en_camino_at, entregado_at, ruta_historial')
      .in('fecha', rangoSemana.fechasSemana)
      .eq('estado', 'entregado')

    if (errPedidos) {
      console.error('[API Rendimiento] Error consultando pedidos de la semana:', errPedidos)
    }

    const pedidosSemana = (pedidosSemanaRaw || []).map(p => ({
      ...p,
      tipoEntrega: (p as any).tipoEntrega || 'delivery'
    }))

    const pedidosHoy = pedidosSemana.filter(p => p.fecha === fechaHoy)

    // 4. Consolidar métricas de HOY
    const resumenHoy = consolidarMetricasCadetes(pedidosHoy as any, cadetesRegistrados)
    
    // Ranking de hoy ordenado por velocidad en movimiento (desempate por pedidos entregados)
    const cadetesConActividadHoy = resumenHoy.cadetes.filter(c => c.pedidosEntregados > 0)
    const rankingHoyList: CadeteItemRanking[] = [...cadetesConActividadHoy]
      .sort((a, b) => {
        if (b.velocidadMediaMovimiento !== a.velocidadMediaMovimiento) {
          return b.velocidadMediaMovimiento - a.velocidadMediaMovimiento
        }
        return b.pedidosEntregados - a.pedidosEntregados
      })
      .map((c, index) => ({
        posicion: index + 1,
        cadete_id: c.cadeteId,
        nombre: c.cadeteNombre,
        velocidad_media: c.velocidadMediaMovimiento,
        velocidad_maxima: c.velocidadMaximaPico,
        pedidos_entregados: c.pedidosEntregados,
        km_totales: c.distanciaTotalKm,
        es_mas_rapido: index === 0 && c.velocidadMediaMovimiento > 0
      }))

    const masRapidoHoy = rankingHoyList.find(r => r.es_mas_rapido) || null

    const miMetricaHoy = resumenHoy.cadetes.find(
      c => c.cadeteId.toLowerCase().trim() === cadeteIdNorm || c.cadeteNombre.toLowerCase().trim() === cadeteIdNorm
    )
    const miRankingHoy = rankingHoyList.find(
      r => r.cadete_id.toLowerCase().trim() === cadeteIdNorm || r.nombre.toLowerCase().trim() === cadeteIdNorm
    )

    // 5. Consolidar métricas de la SEMANA ACTUAL
    const resumenSemana = consolidarMetricasCadetes(pedidosSemana as any, cadetesRegistrados)

    const cadetesConActividadSemana = resumenSemana.cadetes.filter(c => c.pedidosEntregados > 0)
    const rankingSemanaList: CadeteItemRanking[] = [...cadetesConActividadSemana]
      .sort((a, b) => {
        if (b.velocidadMediaMovimiento !== a.velocidadMediaMovimiento) {
          return b.velocidadMediaMovimiento - a.velocidadMediaMovimiento
        }
        return b.pedidosEntregados - a.pedidosEntregados
      })
      .map((c, index) => ({
        posicion: index + 1,
        cadete_id: c.cadeteId,
        nombre: c.cadeteNombre,
        velocidad_media: c.velocidadMediaMovimiento,
        velocidad_maxima: c.velocidadMaximaPico,
        pedidos_entregados: c.pedidosEntregados,
        km_totales: c.distanciaTotalKm,
        es_mas_rapido: index === 0 && c.velocidadMediaMovimiento > 0
      }))

    const masRapidoSemana = rankingSemanaList.find(r => r.es_mas_rapido) || null

    const miMetricaSemana = resumenSemana.cadetes.find(
      c => c.cadeteId.toLowerCase().trim() === cadeteIdNorm || c.cadeteNombre.toLowerCase().trim() === cadeteIdNorm
    )
    const miRankingSemana = rankingSemanaList.find(
      r => r.cadete_id.toLowerCase().trim() === cadeteIdNorm || r.nombre.toLowerCase().trim() === cadeteIdNorm
    )

    // 6. Sincronizar en Supabase de fondo (Upsert en tablas de persistencia)
    try {
      // Upsert diario
      if (rankingHoyList.length > 0) {
        const rowsDiario = rankingHoyList.map(r => {
          const metrica = resumenHoy.cadetes.find(c => c.cadeteId === r.cadete_id)
          return {
            cadete_id: r.cadete_id,
            cadete_nombre: r.nombre,
            fecha: fechaHoy,
            pedidos_entregados: r.pedidos_entregados,
            km_totales: r.km_totales,
            velocidad_media_movimiento: r.velocidad_media,
            velocidad_maxima: r.velocidad_maxima,
            tiempo_promedio_entrega_min: metrica?.tiempoPromedioPorPedidoMinutos || 0,
            es_mas_rapido_dia: r.es_mas_rapido,
            ranking_dia: r.posicion,
            updated_at: new Date().toISOString()
          }
        })

        await supabase.from('cadetes_rendimiento_diario').upsert(rowsDiario, {
          onConflict: 'cadete_id,fecha'
        })
      }

      // Upsert semanal
      if (rankingSemanaList.length > 0) {
        const rowsSemanal = rankingSemanaList.map(r => {
          const metrica = resumenSemana.cadetes.find(c => c.cadeteId === r.cadete_id)
          return {
            cadete_id: r.cadete_id,
            cadete_nombre: r.nombre,
            anio: rangoSemana.anio,
            semana_numero: rangoSemana.semanaNumero,
            semana_inicio: rangoSemana.fechaInicio,
            semana_fin: rangoSemana.fechaFin,
            pedidos_entregados: r.pedidos_entregados,
            km_totales: r.km_totales,
            velocidad_media_movimiento: r.velocidad_media,
            velocidad_maxima: r.velocidad_maxima,
            tiempo_promedio_entrega_min: metrica?.tiempoPromedioPorPedidoMinutos || 0,
            es_mas_rapido_semana: r.es_mas_rapido,
            posicion_ranking: r.posicion,
            updated_at: new Date().toISOString()
          }
        })

        await supabase.from('cadetes_rendimiento_semanal').upsert(rowsSemanal, {
          onConflict: 'cadete_id,anio,semana_numero'
        })
      }
    } catch (errSync) {
      console.warn('[API Rendimiento] Advertencia durante sincronización a Supabase:', errSync)
    }

    // 7. Consultar registros históricos de semanas de Supabase
    const { data: historialSemanasRaw } = await supabase
      .from('cadetes_rendimiento_semanal')
      .select('*')
      .or(`cadete_id.ilike.${cadeteIdNorm},cadete_nombre.ilike.${cadeteIdNorm}`)
      .order('anio', { ascending: false })
      .order('semana_numero', { ascending: false })
      .limit(10)

    // Formatear respuesta JSON estructurada
    const miRendimientoHoy = {
      pedidos_entregados: miMetricaHoy?.pedidosEntregados || 0,
      km_totales: miMetricaHoy?.distanciaTotalKm || 0,
      velocidad_media_movimiento: miMetricaHoy?.velocidadMediaMovimiento || 0,
      velocidad_maxima: miMetricaHoy?.velocidadMaximaPico || 0,
      tiempo_promedio_entrega_min: miMetricaHoy?.tiempoPromedioPorPedidoMinutos || 0,
      ranking: miRankingHoy?.posicion || (miMetricaHoy && miMetricaHoy.pedidosEntregados > 0 ? 1 : 0),
      es_mas_rapido: masRapidoHoy ? (masRapidoHoy.cadete_id.toLowerCase() === cadeteIdNorm || masRapidoHoy.nombre.toLowerCase() === cadeteIdNorm) : false
    }

    const miRendimientoSemanal = {
      semana_numero: rangoSemana.semanaNumero,
      anio: rangoSemana.anio,
      semana_inicio: rangoSemana.fechaInicio,
      semana_fin: rangoSemana.fechaFin,
      pedidos_entregados: miMetricaSemana?.pedidosEntregados || 0,
      km_totales: miMetricaSemana?.distanciaTotalKm || 0,
      velocidad_media_movimiento: miMetricaSemana?.velocidadMediaMovimiento || 0,
      velocidad_maxima: miMetricaSemana?.velocidadMaximaPico || 0,
      tiempo_promedio_entrega_min: miMetricaSemana?.tiempoPromedioPorPedidoMinutos || 0,
      ranking: miRankingSemana?.posicion || (miMetricaSemana && miMetricaSemana.pedidosEntregados > 0 ? 1 : 0),
      es_mas_rapido: masRapidoSemana ? (masRapidoSemana.cadete_id.toLowerCase() === cadeteIdNorm || masRapidoSemana.nombre.toLowerCase() === cadeteIdNorm) : false
    }

    return NextResponse.json({
      ok: true,
      cadete_id: cadeteIdNorm,
      cadete_nombre: nombreCadeteActual,
      fecha_negocio: fechaHoy,
      hoy: {
        mi_rendimiento: miRendimientoHoy,
        mas_rapido: masRapidoHoy ? {
          cadete_id: masRapidoHoy.cadete_id,
          nombre: masRapidoHoy.nombre,
          velocidad: masRapidoHoy.velocidad_media,
          es_propio: miRendimientoHoy.es_mas_rapido
        } : null,
        ranking: rankingHoyList
      },
      semana_actual: {
        semana_numero: rangoSemana.semanaNumero,
        anio: rangoSemana.anio,
        semana_inicio: rangoSemana.fechaInicio,
        semana_fin: rangoSemana.fechaFin,
        mi_rendimiento: miRendimientoSemanal,
        mas_rapido: masRapidoSemana ? {
          cadete_id: masRapidoSemana.cadete_id,
          nombre: masRapidoSemana.nombre,
          velocidad: masRapidoSemana.velocidad_media,
          es_propio: miRendimientoSemanal.es_mas_rapido
        } : null,
        ranking: rankingSemanaList
      },
      historial_semanas: (historialSemanasRaw || []).map(h => ({
        id: h.id,
        anio: h.anio,
        semana_numero: h.semana_numero,
        semana_inicio: h.semana_inicio,
        semana_fin: h.semana_fin,
        pedidos_entregados: h.pedidos_entregados,
        km_totales: Number(h.km_totales) || 0,
        velocidad_media_movimiento: Number(h.velocidad_media_movimiento) || 0,
        velocidad_maxima: Number(h.velocidad_maxima) || 0,
        tiempo_promedio_entrega_min: h.tiempo_promedio_entrega_min || 0,
        es_mas_rapido_semana: h.es_mas_rapido_semana,
        posicion_ranking: h.posicion_ranking
      }))
    })
  } catch (error) {
    console.error('[API Rendimiento Cadetes GET] Error fatal:', error)
    return NextResponse.json({ error: 'Error interno al procesar rendimiento' }, { status: 500 })
  }
}
