import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerFechaNegocio } from '@/lib/tiempo'

// Token compartido con la app Flutter
const FLUTTER_SECRET_TOKEN = 'chefsy_expo_secure_track_99XQ'

// GET /api/public/pedidos?cadeteId=paulo
// Devuelve todos los datos del pedido asignado al cadete (en_cocina, listo, en_camino)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${FLUTTER_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cadeteId = searchParams.get('cadeteId')

    if (!cadeteId) {
      return NextResponse.json({ error: 'cadeteId requerido' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    const fechaHoy = obtenerFechaNegocio()

    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('cadete_id', cadeteId)
      .in('estado', ['en_cocina', 'listo', 'en_camino'])
      .eq('fecha', fechaHoy)
      .eq('archivado', false)
      .order('hora', { ascending: true })

    if (error) throw error

    return NextResponse.json({ pedidos: data || [] })
  } catch (error) {
    console.error('[API Pública Pedidos GET] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/public/pedidos
// Permite a la app Flutter cambiar el estado de un pedido (ej. listo o entregado)
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${FLUTTER_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { accion, id, estado } = body

    if (accion !== 'actualizar_estado' || !id || !estado) {
      return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    const updatePayload: any = { estado }
    if (estado === 'entregado') {
      updatePayload.cadete_coordenadas = null
      updatePayload.entregado_at = new Date().toISOString()
    } else if (estado === 'listo') {
      updatePayload.listo_at = new Date().toISOString()
    }

    const { data: pedidoPrevio } = await supabase
      .from('pedidos')
      .select('estado')
      .eq('id', id)
      .single()

    const { data: updateData, error } = await supabase
      .from('pedidos')
      .update(updatePayload)
      .eq('id', id)
      .select('*')

    if (error) throw error

    const pedidoAct = updateData && updateData.length > 0 ? updateData[0] : null

    if (pedidoPrevio?.estado !== 'entregado' && estado === 'entregado' && pedidoAct?.productos) {
      const productosVendidos = pedidoAct.productos.map((p: any) => ({
        idCatalogo: p.idCatalogo,
        cantidad: p.cantidad
      })).filter((p: any) => p.idCatalogo)

      if (productosVendidos.length > 0) {
        await supabase.rpc('deducir_stock', { productos_vendidos: productosVendidos })
      }
    }

    return NextResponse.json({ ok: true, pedido: pedidoAct })
  } catch (error) {
    console.error('[API Pública Pedidos POST] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
