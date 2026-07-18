import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

// Coordenadas del local Chefsy
const LOCAL_LAT = -32.8894
const LOCAL_LNG = -68.8458

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
      .select('id, cliente, estado, coordenadas, cadete_nombre, cadete_coordenadas')
      .eq('id', pedidoId)
      .single()

    if (error) {
      // PGRST116 = no rows found (not found)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
      }
      // Cualquier otro error de Supabase — lo exponemos para poder diagnosticarlo
      console.error('[API Rastreo] Error de Supabase:', error)
      return NextResponse.json({ error: `Error de base de datos: ${error.message}` }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    // Mostrar las coordenadas del cadete solo si el pedido está activo (no entregado/cancelado)
    const estadosActivos = ['en_cocina', 'listo', 'en_camino']
    const mostrarCadete = estadosActivos.includes(data.estado)

    return NextResponse.json({
      id: data.id,
      cliente: data.cliente,
      estado: data.estado,
      cadete_nombre: data.cadete_nombre ?? null,
      cadete_coordenadas: mostrarCadete ? (data.cadete_coordenadas ?? null) : null,
      destino_coordenadas: data.coordenadas ?? null,
      local_coordenadas: { latitud: LOCAL_LAT, longitud: LOCAL_LNG }
    })
  } catch (error) {
    console.error('[API Pública Rastreo GET] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

