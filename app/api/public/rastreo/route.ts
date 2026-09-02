import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

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

    if (data.cadete_id) {
      const { data: cadeteData } = await supabase
        .from('cadetes')
        .select('gps_activo, lat, lng')
        .or(`id.ilike.${data.cadete_id},nombre.ilike.${data.cadete_id}`)
        .maybeSingle()
      
      if (cadeteData) {
        if (cadeteData.gps_activo !== undefined) {
          gpsActivo = cadeteData.gps_activo
        }
        if (cadeteData.lat != null && cadeteData.lng != null) {
          cadeteCoordsFallback = { latitud: cadeteData.lat, longitud: cadeteData.lng }
        }
      }
    }

    const estadosActivos = ['en_cocina', 'listo', 'en_camino']
    const mostrarCadete = estadosActivos.includes(data.estado)
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

    if (data.cadete_id && data.estado !== 'entregado' && data.estado !== 'cancelado') {
      const { data: pedidosActivosCadete } = await supabase
        .from('pedidos')
        .select('id, estado, hora, created_at, coordenadas')
        .ilike('cadete_id', data.cadete_id)
        .in('estado', ['en_cocina', 'listo', 'en_camino'])
        .eq('archivado', false)
        .eq('tipoEntrega', 'delivery')
        .order('created_at', { ascending: true })

      if (pedidosActivosCadete && pedidosActivosCadete.length > 1) {
        totalParadas = pedidosActivosCadete.length
        const enCamino = pedidosActivosCadete.filter(p => p.estado === 'en_camino')

        if (data.estado === 'en_camino') {
          if (enCamino.length > 1) {
            // Múltiples pedidos en camino simultáneamente
            const indice = enCamino.findIndex(p => p.id === pedidoId)
            if (indice > 0) {
              paradaActual = indice + 1
              paradasPrevias = indice
              esProximaEntrega = false
              cadeteOcupadoEnOtroViaje = true
            } else {
              paradaActual = 1
              paradasPrevias = 0
              esProximaEntrega = true
              cadeteOcupadoEnOtroViaje = false
            }
          } else {
            // Este pedido es el único en camino
            paradaActual = 1
            paradasPrevias = 0
            esProximaEntrega = true
            cadeteOcupadoEnOtroViaje = false
          }
        } else {
          // El pedido está en 'listo' o 'en_cocina'
          if (enCamino.length > 0) {
            const indice = pedidosActivosCadete.findIndex(p => p.id === pedidoId)
            paradaActual = indice >= 0 ? indice + 1 : totalParadas
            paradasPrevias = Math.max(1, enCamino.length)
            esProximaEntrega = false
            cadeteOcupadoEnOtroViaje = true
          } else {
            const indice = pedidosActivosCadete.findIndex(p => p.id === pedidoId)
            paradaActual = indice >= 0 ? indice + 1 : 1
            paradasPrevias = indice > 0 ? indice : 0
            esProximaEntrega = indice === 0
            cadeteOcupadoEnOtroViaje = indice > 0
          }
        }
      }
    }

    return NextResponse.json({
      id: data.id,
      cliente: data.cliente,
      telefono: data.telefono ?? '',
      estado: data.estado,
      cadete_nombre: data.cadete_nombre ?? null,
      cadete_coordenadas: coordsFinalesCadete,
      destino_coordenadas: data.coordenadas ?? null,
      cadete_gps_activo: gpsActivo,
      cadete_ocupado_en_otro_viaje: cadeteOcupadoEnOtroViaje,
      paradas_previas: paradasPrevias,
      total_paradas: totalParadas,
      parada_actual: paradaActual,
      es_proxima_entrega: esProximaEntrega,
      local_coordenadas: { latitud: LOCAL_LAT, longitud: LOCAL_LNG },
      productos: data.productos ?? [],
      tipoEntrega: data.tipoEntrega ?? 'delivery',
      total: data.total ?? 0,
      metodoPago: data.metodoPago ?? 'efectivo',
      direccion: data.direccion ?? '',
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
