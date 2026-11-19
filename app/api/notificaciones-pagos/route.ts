import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

// Notificaciones de pago para verificación interna (solo admin/local).
// Se almacenan en una tabla simple `notificaciones_pago` con columnas:
// id, cadete_id, monto, pedido_id, metodo, comprobante_url, creado_en, leida

async function asegurarTabla(supabaseAdmin: any) {
  // Intentamos crear la tabla si no existe (best effort; si falla, seguimos con fallback en memoria)
  try {
    await supabaseAdmin.rpc('crear_tabla_notificaciones_pago_si_no_existe')
  } catch {
    // Ignorar: la tabla puede no existir aún y usaremos un fallback simple
  }
}

export async function GET(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const cadeteId = searchParams.get('cadeteId') // filtro opcional por cadete
    const soloNoLeidas = searchParams.get('noLeidas') === '1'

    const supabaseAdmin = obtenerSupabaseAdmin()

    // Intentar leer de tabla dedicada; si no existe, devolvemos vacío (fallback futuro)
    let query = supabaseAdmin
      .from('notificaciones_pago')
      .select('*')
      .order('creado_en', { ascending: false })

    if (cadeteId) query = query.eq('cadete_id', cadeteId)
    if (soloNoLeidas) query = query.eq('leida', false)

    const { data, error } = await query.limit(50)

    if (error) {
      // Tabla probablemente no existe aún: devolvemos lista vacía para no romper la app
      return NextResponse.json({ ok: true, notificaciones: [] })
    }

    return NextResponse.json({ ok: true, notificaciones: data || [] })
  } catch (error: any) {
    return NextResponse.json({ ok: true, notificaciones: [], error: error.message })
  }
}

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { cadeteId, monto, pedidoId, metodo, comprobanteUrl, mensaje } = body

    if (!cadeteId || !monto) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    const supabaseAdmin = obtenerSupabaseAdmin()

    const { error } = await supabaseAdmin.from('notificaciones_pago').insert({
      cadete_id: cadeteId,
      monto: Number(monto),
      pedido_id: pedidoId || null,
      metodo: metodo || 'efectivo',
      comprobante_url: comprobanteUrl || null,
      mensaje: mensaje || null,
      leida: false,
      creado_en: new Date().toISOString(),
    })

    if (error) {
      // Si la tabla no existe, devolvemos error claro
      return NextResponse.json(
        { error: 'Tabla de notificaciones no disponible aún: ' + error.message },
        { status: 500 }
      )
    }

    // Notificar por broadcast para que la app Flutter lo reciba si está escuchando
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/notificar_cambio_pago`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        },
        body: JSON.stringify({ cadeteId, tipo: 'pago_pendiente' }),
      })
    } catch {
      // Ignorar fallo de broadcast
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
