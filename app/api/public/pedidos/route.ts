import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { registrarVentaKardex } from '@/lib/stock-motor'

// Token compartido con la app Flutter
const FLUTTER_SECRET_TOKEN = 'chefsy_expo_secure_track_99XQ'

// GET /api/public/pedidos?cadeteId=paulo
// Devuelve todos los datos del pedido asignado al cadete (en_cocina, listo, en_camino, entregado)
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
    const cadeteIdNorm = cadeteId.trim().toLowerCase()

    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .or(`cadete_id.ilike.${cadeteIdNorm},cadete_nombre.ilike.${cadeteIdNorm}`)
      .in('estado', ['nuevo', 'en_cocina', 'listo', 'en_camino', 'entregado'])
      .eq('archivado', false)
      .order('hora', { ascending: true })

    if (error) throw error

    // Consultar viajes y pagos extras asignados al cadete en el turno/fecha de negocio actual
    const { data: extrasData } = await supabase
      .from('cadetes_pagos_extras')
      .select('*')
      .or(`cadete_id.ilike.${cadeteIdNorm},cadete_nombre.ilike.${cadeteIdNorm}`)
      .eq('fecha', fechaHoy)
      .order('created_at', { ascending: false })

    // Consultar estado del turno y monto base configurado para cadetes
    const [turnoRes, configRes] = await Promise.all([
      supabase.from('turnos').select('activo, tipo_turno').eq('id', 1).maybeSingle(),
      supabase.from('configuracion_operativa').select('prioridades').eq('id', 1).maybeSingle()
    ])

    const turnoActivo = turnoRes.data?.activo ?? false
    const prioridades = configRes.data?.prioridades || {}
    const montoBaseConfigurado = Number(prioridades.montoBaseCadete ?? 4000)

    // La base aplica desde que se inicia el turno (activo) O si el cadete ya tiene actividad hoy
    const tieneActividad = (data && data.length > 0) || (extrasData && extrasData.length > 0)
    const montoBaseEfectivo = (turnoActivo || tieneActividad) ? montoBaseConfigurado : 0

    return NextResponse.json({
      pedidos: data || [],
      pagos_extras: extrasData || [],
      monto_base: montoBaseEfectivo,
      turno_activo: turnoActivo,
    })
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
    const { accion, id, estado, metodo_pago, metodoPago, pago_confirmado } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de pedido requerido' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()

    // 1. Caso: Cambio directo de método de pago o confirmación desde la puerta
    if (accion === 'cambiar_metodo_pago') {
      const metodoFinal = metodo_pago || metodoPago
      const updatePayload: any = {}
      if (metodoFinal) updatePayload.metodoPago = metodoFinal
      if (pago_confirmado !== undefined) updatePayload.pago_confirmado = Boolean(pago_confirmado)

      const { error } = await supabase
        .from('pedidos')
        .update(updatePayload)
        .eq('id', id)

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // 2. Caso: Actualización de estado del pedido
    if (accion !== 'actualizar_estado' || !estado) {
      return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
    }

    const updatePayload: any = { estado }
    if (metodo_pago || metodoPago) {
      updatePayload.metodoPago = metodo_pago || metodoPago
    }
    if (pago_confirmado !== undefined) {
      updatePayload.pago_confirmado = Boolean(pago_confirmado)
    } else if (estado === 'entregado') {
      // Si se marca como entregado y no se especificó lo contrario, se asume cobrado
      updatePayload.pago_confirmado = true
    }

    if (estado === 'entregado') {
      updatePayload.cadete_coordenadas = null
      updatePayload.entregado_at = new Date().toISOString()
    } else if (estado === 'listo') {
      updatePayload.listo_at = new Date().toISOString()
    } else if (estado === 'en_camino') {
      updatePayload.en_camino_at = new Date().toISOString()
    }

    const { data: pedidoPrevio } = await supabase
      .from('pedidos')
      .select('estado, cadete_id')
      .eq('id', id)
      .single()

    if (estado === 'en_camino' && pedidoPrevio?.cadete_id) {
      const { data: cadeteInfo } = await supabase
        .from('cadetes')
        .select('lat, lng')
        .ilike('id', pedidoPrevio.cadete_id)
        .maybeSingle()

      if (cadeteInfo && cadeteInfo.lat != null && cadeteInfo.lng != null) {
        updatePayload.cadete_coordenadas = { latitud: cadeteInfo.lat, longitud: cadeteInfo.lng }
      }
    }

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
        id: p.id,
        cantidad: p.cantidad,
        nombre: p.nombre
      })).filter((p: any) => p.idCatalogo || p.id)

      if (productosVendidos.length > 0) {
        await registrarVentaKardex(productosVendidos, id, pedidoAct.cliente)
      }
    }

    return NextResponse.json({ ok: true, pedido: pedidoAct })
  } catch (error) {
    console.error('[API Pública Pedidos POST] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
