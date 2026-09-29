import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { calcularDistanciaKm, resolverDireccionHumana, esEnlaceOCoordenadas } from '@/lib/ubicacion'
import { obtenerIpCliente, verificarRateLimit } from '@/lib/rate-limit'

// Coordenadas del local Chefsy (San Fernando del Valle de Catamarca)
const LOCAL_LAT = -28.462809031658047
const LOCAL_LNG = -65.77850065400358

// GET /api/public/rastreo?id=[UUID]
export async function GET(request: Request) {
  try {
    // 1. Rate Limiting por IP (60 peticiones/minuto para evitar fuerza bruta de IDs)
    const ip = obtenerIpCliente(request)
    const rateCheck = verificarRateLimit(`rastreo:${ip}`, 60, 60)
    if (!rateCheck.permitido) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes de rastreo. Esperá unos segundos.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.segundosParaReset),
            'Cache-Control': 'no-store'
          }
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const pedidoId = searchParams.get('id')

    if (!pedidoId || typeof pedidoId !== 'string') {
      return NextResponse.json({ error: 'ID de pedido requerido' }, { status: 400 })
    }

    const pedidoIdLimpio = pedidoId.trim()
    if (!pedidoIdLimpio || pedidoIdLimpio.length > 64 || !/^[a-zA-Z0-9_\-]+$/.test(pedidoIdLimpio)) {
      return NextResponse.json({ error: 'Formato de ID de pedido inválido' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()

    const { data, error } = await supabase
      .from('pedidos')
      .select('id, cliente, telefono, estado, coordenadas, cadete_id, cadete_nombre, cadete_coordenadas, productos, tipoEntrega, total, metodoPago, direccion, observaciones, hora, fecha, created_at, en_camino_at, orden_entrega, costoEnvio')
      .eq('id', pedidoId)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
      }
      console.error('[API Rastreo] Error de Supabase:', error)
      return NextResponse.json({ error: 'Error al consultar el pedido' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    let gpsActivo = true
    let cadeteCoordsFallback: { latitud: number; longitud: number } | null = null
    let cadeteNombreFallback: string | null = null

    const esPedidoFinalizado = data.estado === 'entregado' || data.estado === 'cancelado'

    if (data.cadete_id && !esPedidoFinalizado) {
      const { data: cadeteData } = await supabase
        .from('cadetes')
        .select('gps_activo, lat, lng, nombre')
        .or(`id.ilike.${data.cadete_id},nombre.ilike.${data.cadete_id}`)
        .maybeSingle()
      
      if (cadeteData) {
        if (cadeteData.gps_activo !== undefined) {
          gpsActivo = cadeteData.gps_activo
        }
        if (cadeteData.lat != null && cadeteData.lng != null) {
          cadeteCoordsFallback = { latitud: cadeteData.lat, longitud: cadeteData.lng }
        }
        if (cadeteData.nombre) {
          cadeteNombreFallback = cadeteData.nombre
        }
      }
    } else if (data.cadete_id && esPedidoFinalizado && !data.cadete_nombre) {
      // Si el pedido ya finalizó y no tiene guardado el nombre del cadete, solo traemos el nombre sin coordenadas
      const { data: cadeteData } = await supabase
        .from('cadetes')
        .select('nombre')
        .or(`id.ilike.${data.cadete_id},nombre.ilike.${data.cadete_id}`)
        .maybeSingle()
      if (cadeteData?.nombre) {
        cadeteNombreFallback = cadeteData.nombre
      }
    }

    const estadosActivos = ['en_cocina', 'listo', 'en_camino']
    const mostrarCadete = !esPedidoFinalizado && estadosActivos.includes(data.estado)
    const coordsFinalesCadete = mostrarCadete
      ? (cadeteCoordsFallback ?? data.cadete_coordenadas ?? null)
      : null

    // Buscar otros pedidos activos del mismo cliente (por teléfono)
    let pedidosRelacionados: any[] = []
    if (data.telefono) {
      const estadosNoTerminados = ['nuevo', 'en_cocina', 'listo', 'en_camino']
      const { data: otrosPedidos } = await supabase
        .from('pedidos')
        .select('id, estado, productos, tipoEntrega, hora')
        .eq('telefono', data.telefono)
        .in('estado', estadosNoTerminados)
        .eq('archivado', false)
        .neq('id', pedidoId)
        .order('created_at', { ascending: true })
        .limit(2)

      if (otrosPedidos && otrosPedidos.length > 0) {
        pedidosRelacionados = otrosPedidos
      }
    }

    // Detección inteligente de paradas múltiples y orden de entrega del cadete
    let paradasPrevias = 0
    let totalParadas = 1
    let paradaActual = 1
    let totalPrevios = 0
    let previosEntregados = 0
    let cadeteOcupadoEnOtroViaje = false
    let esProximaEntrega = true

    let itinerarioParadas: Array<{
      id: string
      orden: number
      es_mi_pedido: boolean
      cliente: string
      coordenadas: { latitud: number; longitud: number }
      estado: string
      es_proxima_entrega: boolean
    }> = []

    if (data.cadete_id && data.estado !== 'entregado' && data.estado !== 'cancelado') {
      const { data: pedidosCadete } = await supabase
        .from('pedidos')
        .select('id, estado, hora, created_at, coordenadas, orden_entrega, cliente, entregado_at, en_camino_at, fecha')
        .eq('tipoEntrega', 'delivery')
        .eq('archivado', false)
        .in('estado', ['en_cocina', 'listo', 'en_camino', 'entregado'])
        .ilike('cadete_id', data.cadete_id)

      if (pedidosCadete && pedidosCadete.length > 0) {
        const ahora = Date.now()
        const fechaHoy = data.fecha || new Date().toISOString().slice(0, 10)

        // Pedidos activos del cadete
        const pedidosActivos = pedidosCadete.filter(
          (p) => ['en_cocina', 'listo', 'en_camino'].includes(p.estado)
        )

        // Pedidos entregados en este mismo viaje/turno
        const pedidosEntregadosRecientes = pedidosCadete.filter((p) => {
          if (p.estado !== 'entregado') return false
          if (p.fecha && p.fecha !== fechaHoy) return false

          const entregadoMs = p.entregado_at ? new Date(p.entregado_at).getTime() : 0
          if (!entregadoMs) return false

          // Entregado en los últimos 90 minutos
          if (ahora - entregadoMs > 90 * 60 * 1000) return false

          // Si data tiene orden_entrega manual y p tiene orden_entrega manual:
          if (data.orden_entrega != null && p.orden_entrega != null) {
            return Number(p.orden_entrega) < Number(data.orden_entrega)
          }

          // Si este pedido tiene referencia de tiempo de salida o creación:
          const refInicioTrip = data.en_camino_at
            ? new Date(data.en_camino_at).getTime()
            : (data.created_at ? new Date(data.created_at).getTime() : 0)

          if (refInicioTrip > 0) {
            if (entregadoMs < refInicioTrip - 20 * 60 * 1000) {
              return false
            }
          }

          return true
        })

        // Unificar pedidos del viaje garantizando que data esté incluido y sin duplicados
        const mapaTodos = new Map<string, any>()
        pedidosEntregadosRecientes.forEach((p) => mapaTodos.set(p.id, p))
        pedidosActivos.forEach((p) => mapaTodos.set(p.id, p))
        mapaTodos.set(data.id, {
          ...data,
          coordenadas: data.coordenadas,
          orden_entrega: data.orden_entrega,
        })

        const todosDelViaje = Array.from(mapaTodos.values())
        totalParadas = todosDelViaje.length

        // Ordenar la cola de entregas:
        // 1. Manual si existe 'orden_entrega' asignado desde /cadeteria
        // 2. Cercanía geográfica al local (la casa más cercana primero)
        // 3. Fallback a created_at
        const ordenarCola = (lista: any[]) => {
          return [...lista].sort((a, b) => {
            const ordA = a.orden_entrega != null ? Number(a.orden_entrega) : null
            const ordB = b.orden_entrega != null ? Number(b.orden_entrega) : null
            if (ordA !== null && ordB !== null) return ordA - ordB
            if (ordA !== null) return -1
            if (ordB !== null) return 1

            const distA = a.coordenadas?.latitud && a.coordenadas?.longitud
              ? calcularDistanciaKm({ latitud: LOCAL_LAT, longitud: LOCAL_LNG }, a.coordenadas)
              : 9999
            const distB = b.coordenadas?.latitud && b.coordenadas?.longitud
              ? calcularDistanciaKm({ latitud: LOCAL_LAT, longitud: LOCAL_LNG }, b.coordenadas)
              : 9999

            if (Math.abs(distA - distB) > 0.05) {
              return distA - distB
            }

            return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          })
        }

        const colaOrdenada = ordenarCola(todosDelViaje)

        // Localizar la posición de ESTE pedido en la cola de entregas del cadete
        const indiceMiPedido = colaOrdenada.findIndex((p) => p.id === pedidoId)

        if (indiceMiPedido >= 0) {
          paradaActual = indiceMiPedido + 1
          const pedidosAntes = colaOrdenada.slice(0, indiceMiPedido)
          totalPrevios = pedidosAntes.length
          previosEntregados = pedidosAntes.filter((p) => p.estado === 'entregado').length
          paradasPrevias = pedidosAntes.filter((p) => p.estado !== 'entregado').length
          esProximaEntrega = paradasPrevias === 0
          cadeteOcupadoEnOtroViaje = paradasPrevias > 0
        } else {
          totalParadas = 1
          paradaActual = 1
          totalPrevios = 0
          previosEntregados = 0
          paradasPrevias = 0
          esProximaEntrega = true
          cadeteOcupadoEnOtroViaje = false
        }

        // PRIVACIDAD ESTRICTA Y RUTA ACTIVA:
        // El cliente solo ve en el mapa su propio destino y las paradas intermedias PENDIENTES.
        // Las entregas que el cadete ya finalizó ('entregado') se quitan del mapa porque ya no son paradas futuras.
        const paradasPendientesRuta = indiceMiPedido >= 0
          ? colaOrdenada.slice(0, indiceMiPedido + 1).filter((p) => p.id === pedidoId || p.estado !== 'entregado')
          : [data]

        itinerarioParadas = paradasPendientesRuta
          .filter(
            (p) =>
              p.coordenadas &&
              typeof p.coordenadas.latitud === 'number' &&
              typeof p.coordenadas.longitud === 'number'
          )
          .map((p, idx) => {
            const esMiPedido = p.id === pedidoId
            return {
              id: p.id,
              orden: idx + 1,
              es_mi_pedido: esMiPedido,
              cliente: esMiPedido ? (data.cliente || 'Tu Domicilio') : `Parada previa (${idx + 1})`,
              coordenadas: {
                latitud: Number(p.coordenadas.latitud),
                longitud: Number(p.coordenadas.longitud),
              },
              estado: p.estado,
              es_proxima_entrega: idx === 0,
            }
          })
      }
    }

    let direccionLimpia = data.direccion ?? ''
    if (data.tipoEntrega === 'delivery' && (esEnlaceOCoordenadas(direccionLimpia) || !direccionLimpia)) {
      try {
        const resuelta = await resolverDireccionHumana(direccionLimpia, data.coordenadas)
        if (resuelta && resuelta !== direccionLimpia) {
          direccionLimpia = resuelta
          // Auto-sanar el registro en la base de datos en background
          if (!esEnlaceOCoordenadas(resuelta)) {
            supabase
              .from('pedidos')
              .update({ direccion: resuelta })
              .eq('id', data.id)
              .then(() => {}, () => {})
          }
        }
      } catch (_) {}
    }

    const headers: Record<string, string> = {
      'Cache-Control': esPedidoFinalizado
        ? 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'
        : 'no-cache, no-store, must-revalidate',
    }

    // Enmascarar teléfono del cliente para no exponer PII en enlaces compartidos (ej: "******1234")
    const telRaw = String(data.telefono || '').trim()
    const telEnmascarado = telRaw.length > 4
      ? `${'*'.repeat(Math.max(0, telRaw.length - 4))}${telRaw.slice(-4)}`
      : (telRaw ? '****' : '')

    return NextResponse.json({
      id: data.id,
      cliente: data.cliente,
      telefono: telEnmascarado,
      estado: data.estado,
      cadete_id: data.cadete_id ?? null,
      cadete_nombre: data.cadete_nombre ?? cadeteNombreFallback ?? null,
      cadete_coordenadas: coordsFinalesCadete,
      cadete_volviendo_al_local: false,
      destino_coordenadas: data.coordenadas ?? null,
      cadete_gps_activo: gpsActivo,
      cadete_ocupado_en_otro_viaje: cadeteOcupadoEnOtroViaje,
      paradas_previas: paradasPrevias,
      total_paradas: totalParadas,
      parada_actual: paradaActual,
      total_previos: totalPrevios,
      previos_entregados: previosEntregados,
      es_proxima_entrega: esProximaEntrega,
      itinerario_paradas: itinerarioParadas,
      local_coordenadas: { latitud: LOCAL_LAT, longitud: LOCAL_LNG },
      productos: data.productos ?? [],
      tipoEntrega: data.tipoEntrega ?? 'delivery',
      total: data.total ?? 0,
      metodoPago: data.metodoPago ?? 'efectivo',
      direccion: direccionLimpia,
      observaciones: data.observaciones ?? '',
      costoEnvio: data.costoEnvio ?? 0,
      hora: data.hora ?? '',
      pedidos_relacionados: pedidosRelacionados,
    }, { headers })
  } catch (error) {
    console.error('[API Pública Rastreo GET] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
