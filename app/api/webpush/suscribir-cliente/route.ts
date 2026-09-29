import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerSesionCliente } from '@/lib/auth-cliente-server'
import { obtenerIpCliente, verificarRateLimit } from '@/lib/rate-limit'

// Límite por IP: suscribirse a notificaciones es una acción puntual y legítima.
const MAX_INTENTOS_POR_IP = 10
const VENTANA_SEGUNDOS = 300 // 5 minutos

interface SuscripcionPush {
  endpoint?: string
  expirationTime?: number | null
  keys?: { p256dh?: string; auth?: string }
}

/** Extrae el endpoint de una suscripción sin asumir la forma exacta del objeto. */
function leerEndpoint(suscripcion: unknown): string | null {
  if (!suscripcion || typeof suscripcion !== 'object') return null
  const endpoint = (suscripcion as SuscripcionPush).endpoint
  return typeof endpoint === 'string' && endpoint.length > 0 ? endpoint : null
}

export async function POST(request: Request) {
  try {
    // ── 0. Rate limit por IP ───────────────────────────────────────────────
    const ip = obtenerIpCliente(request)
    const limite = verificarRateLimit(`webpush-suscribir:${ip}`, MAX_INTENTOS_POR_IP, VENTANA_SEGUNDOS)
    if (!limite.permitido) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
        { status: 429, headers: { 'Retry-After': String(limite.segundosParaReset) } }
      )
    }

    const body = await request.json()
    const { pedido_id, subscription } = body

    if (!pedido_id || !subscription) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 })
    }

    // Validar que la suscripción tenga forma de Web Push antes de tocar la BD.
    const endpointNuevo = leerEndpoint(subscription)
    if (!endpointNuevo) {
      return NextResponse.json({ error: 'Suscripción inválida.' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()

    // ── 1. Cargar el pedido incluyendo su dueño y la suscripción actual ─────
    const { data: pedidoBd, error: errorBusqueda } = await supabase
      .from('pedidos')
      .select('id, estado, archivado, cliente_id, push_subscription')
      .eq('id', pedido_id)
      .single()

    if (errorBusqueda || !pedidoBd) {
      return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })
    }

    if (pedidoBd.archivado || ['entregado', 'cancelado'].includes(pedidoBd.estado)) {
      return NextResponse.json({ error: 'El pedido ya fue finalizado o archivado.' }, { status: 403 })
    }

    // ── 2. Prueba de titularidad ───────────────────────────────────────────
    // El pedido NO puede reescribirse solo porque se conozca su ID (que es
    // enumerable). Hace falta o bien una sesión de cliente dueño, o bien
    // que el pedido todavía no tenga ninguna suscripción (> claim-once).
    const sesion = await obtenerSesionCliente()

    if (pedidoBd.cliente_id) {
      // Pedido con dueño: exigimos sesión de ese mismo cliente.
      if (!sesion || sesion.clienteId !== pedidoBd.cliente_id) {
        return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
      }
    } else {
      // Pedido de invitado (sin cuenta): no hay sesión que valida. Permitimos
      // únicamente (a) primera suscripción o (b) re-suscripción del mismo
      // dispositivo. Cualquier otro endpoint no puede tomar el control.
      const endpointActual = leerEndpoint(pedidoBd.push_subscription)
      if (endpointActual && endpointActual !== endpointNuevo) {
        return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
      }
    }

    // ── 3. Guardar la suscripción ───────────────────────────────────────────
    const { error } = await supabase
      .from('pedidos')
      .update({ push_subscription: subscription })
      .eq('id', pedido_id)

    if (error) {
      console.error('[WebPush API] Error Supabase:', error)
      throw error
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : String(error)
    console.error('[WebPush API] Error guardando suscripción del cliente:', mensaje)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
