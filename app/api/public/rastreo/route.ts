import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { calcularDistanciaKm, resolverDireccionHumana, esEnlaceOCoordenadas } from '@/lib/ubicacion'

// Coordenadas del local Chefsy (San Fernando del Valle de Catamarca)
const LOCAL_LAT = -28.462809031658047
const LOCAL_LNG = -65.77850065400358

// GET /api/public/rastreo?id=[UUID]
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pedidoId = searchParams.get('id')

    if (!pedidoId) {
      return NextResponse.json({ error: 'ID de pedido requerido' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()

    const { data, error } = await supabase
      .from('pedidos')
      .select('id, cliente, telefono, estado, coordenadas, cadete_id, cadete_nombre, cadete_coordenadas, productos, tipoEntrega, total, metodoPago, direccion, observaciones, hora, costoEnvio')
      .eq('id', pedidoId)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
      }
      console.error('[API Rastreo] Error de Supabase:', error)
      return NextResponse.json({ error: `Error de base de datos: ${error.message}` }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    let gpsActivo = true
    let cadeteCoordsFallback: { latitud: number; longitud: number } | null = null
    let cadeteNombreFallback: string | null = null

    if (data.cadete_id) {
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
    }

    let cadeteVolviendoAlLocal = false

    if (data.cadete_id && data.estado === 'entregado') {
      try {
        let query = supabase
          .from('pedidos')
          .select('id')
          .in('estado', ['en_cocina', 'listo', 'en_camino'])
          .eq('archivado', false)
          .eq('tipoEntrega', 'delivery')

        if (data.cadete_nombre) {
          query = query.or(`cadete_id.ilike.${data.cadete_id},cadete_nombre.ilike.${data.cadete_nombre}`)
        } else {
          query = query.ilike('cadete_id', data.cadete_id)
        }

        const { data: pedidosActivosCadete } = await query

        // Si no tiene más entregas pendientes, está en viaje de regreso al local
        if (!pedidosActivosCadete || pedidosActivosCadete.length === 0) {
          cadeteVolviendoAlLocal = true
        }
      } catch (_) {}
    }

    const estadosActivos = ['en_cocina', 'listo', 'en_camino']
    const mostrarCadete = estadosActivos.includes(data.estado) || cadeteVolviendoAlLocal
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
      const { data: pedidosActivosCadete } = await supabase
        .from('pedidos')
        .select('id, estado, hora, created_at, coordenadas, orden_entrega, cliente')
        .ilike('cadete_id', data.cadete_id)
        .in('estado', ['en_cocina', 'listo', 'en_camino'])
        .eq('archivado', false)
        .eq('tipoEntrega', 'delivery')

      if (pedidosActivosCadete && pedidosActivosCadete.length > 0) {
        totalParadas = pedidosActivosCadete.length

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

        const colaOrdenada = ordenarCola(pedidosActivosCadete)

        // Localizar la posición de ESTE pedido en la cola de entregas del cadete
        const indiceMiPedido = colaOrdenada.findIndex((p) => p.id === pedidoId)

        if (indiceMiPedido >= 0) {
          paradaActual = indiceMiPedido + 1
          paradasPrevias = indiceMiPedido
          esProximaEntrega = indiceMiPedido === 0
          cadeteOcupadoEnOtroViaje = indiceMiPedido > 0
        } else {
          paradaActual = 1
          paradasPrevias = 0
          esProximaEntrega = true
          cadeteOcupadoEnOtroViaje = false
        }

        // PRIVACIDAD ESTRICTA:
        // El cliente 1 NUNCA debe ver la ruta ni el destino del cliente 2.
        // El cliente 2 solo ve hasta su propio pedido (sabe que hay una parada previa pero no ve paradas posteriores).
        // Por lo tanto, cortamos la lista exactamente en SU pedido (slice(0, indiceMiPedido + 1)).
        const paradasPermitidas = indiceMiPedido >= 0
          ? colaOrdenada.slice(0, indiceMiPedido + 1)
          : [data]

        itinerarioParadas = paradasPermitidas
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
              cliente: esMiPedido ? (data.cliente || 'Tu Domicilio') : `Parada ${idx + 1} (Entrega previa)`,
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

    return NextResponse.json({
      id: data.id,
      cliente: data.cliente,
      telefono: data.telefono ?? '',
      estado: data.estado,
      cadete_nombre: data.cadete_nombre ?? cadeteNombreFallback ?? null,
      cadete_coordenadas: coordsFinalesCadete,
      cadete_volviendo_al_local: cadeteVolviendoAlLocal,
      destino_coordenadas: data.coordenadas ?? null,
      cadete_gps_activo: gpsActivo,
      cadete_ocupado_en_otro_viaje: cadeteOcupadoEnOtroViaje,
      paradas_previas: paradasPrevias,
      total_paradas: totalParadas,
      parada_actual: paradaActual,
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
    })
  } catch (error) {
    console.error('[API Pública Rastreo GET] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
