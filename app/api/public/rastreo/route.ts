import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

// Coordenadas del local Chefsy por defecto
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

    // Solo pedimos las columnas estrictamente necesarias para el cliente por privacidad
    const { data, error } = await supabase
      .from('pedidos')
      .select('id, cliente, estado, tipoEntrega, coordenadas, cadete_nombre, cadete_coordenadas')
      .eq('id', pedidoId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
      }
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    // Si no es delivery, no hay rastreo
    if (data.tipoEntrega !== 'delivery') {
      return NextResponse.json({ error: 'Este pedido no es para envío a domicilio' }, { status: 400 })
    }

    return NextResponse.json({
      id: data.id,
      cliente: data.cliente,
      estado: data.estado,
      cadete_nombre: data.cadete_nombre,
      cadete_coordenadas: data.estado === 'en_camino' ? data.cadete_coordenadas : null, // Ocultar si ya se entregó
      destino_coordenadas: data.coordenadas,
      local_coordenadas: { latitud: LOCAL_LAT, longitud: LOCAL_LNG }
    })
  } catch (error) {
    console.error('[API Pública Rastreo GET] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
