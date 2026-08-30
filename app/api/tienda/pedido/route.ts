// app/api/tienda/pedido/route.ts
// Endpoint para que los clientes de la tienda creen pedidos.
// Usa el cliente admin (service_role) para bypassear RLS.
// No requiere autenticación — la validación de datos se hace aquí.

import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { esDomingoArgentina, obtenerEstadoHorarioLocal } from '@/lib/tiempo'

// ── Rate limiting en memoria por IP ───────────────────────────────────────────
const rateLimitIP = new Map<string, { intentos: number; ultimoReset: number }>()
const MAX_PEDIDOS_POR_SESION = 3 // máximo 3 pedidos activos
const VENTANA_RATE_LIMIT_MS = 10 * 60 * 1000 // ventana de 10 min

function obtenerIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

// ── Validación básica del payload ─────────────────────────────────────────────
function validarPedido(body: any): string | null {
  if (!body || typeof body !== 'object') return 'Payload inválido'
  if (!body.id || typeof body.id !== 'string') return 'ID de pedido requerido'
  if (!body.cliente || typeof body.cliente !== 'string' || !body.cliente.trim()) return 'Nombre de cliente requerido'
  if (!body.telefono || typeof body.telefono !== 'string') return 'Teléfono requerido'
  if (!Array.isArray(body.productos) || body.productos.length === 0) return 'Productos requeridos'
  if (!['delivery', 'retiro'].includes(body.tipoEntrega)) return 'Tipo de entrega inválido'
  if (!['efectivo', 'tarjeta', 'transferencia'].includes(body.metodoPago)) return 'Método de pago inválido'
  if (typeof body.total !== 'number' || body.total < 0) return 'Total inválido'
  return null
}

export async function POST(request: Request) {
  try {
    const ip = obtenerIP(request)
    const ahora = Date.now()

    // ── Rate limit por IP ───────────────────────────────────────────────────
    const registro = rateLimitIP.get(ip) || { intentos: 0, ultimoReset: ahora }
    if (ahora - registro.ultimoReset > VENTANA_RATE_LIMIT_MS) {
      registro.intentos = 0
      registro.ultimoReset = ahora
    }
    registro.intentos++
    rateLimitIP.set(ip, registro)

    if (registro.intentos > 10) {
      console.warn(`[API Pedido] Rate limit excedido para IP: ${ip}`)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    // ── Validar datos de entrada ─────────────────────────────────────────────
    const errorValidacion = validarPedido(body)
    if (errorValidacion) {
      return NextResponse.json({ error: errorValidacion }, { status: 400 })
    }

    const supabaseAdmin = obtenerSupabaseAdmin()

    // ── BLINDAJE DE TURNOS: Verificar en tiempo real que el local esté ABIERTO ─
    const { data: turnoData, error: turnoError } = await supabaseAdmin
      .from('turnos')
      .select('activo, tipo_turno')
      .eq('id', 1)
      .single()

    const estaActivoDb = !turnoError && turnoData ? Boolean(turnoData.activo) : false
    const estadoLocal = obtenerEstadoHorarioLocal(estaActivoDb)

    if (!estadoLocal.abierto) {
      console.warn(`[API Pedido] Intento de compra con local cerrado (${estadoLocal.motivo}) desde IP: ${ip}`)
      return NextResponse.json(
        {
          error: estadoLocal.mensaje,
          motivo: estadoLocal.motivo,
          esDomingo: estadoLocal.esDomingo,
        },
        { status: 400 }
      )
    }

    const telefono = String(body.telefono).trim()

    // ── Límite de pedidos activos por teléfono ───────────────────────────────
    const { count, error: countError } = await supabaseAdmin
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('telefono', telefono)
      .eq('archivado', false)
      .not('estado', 'in', '("entregado","cancelado")')

    if (countError) {
      console.error('[API Pedido] Error al verificar pedidos activos:', countError.message)
    } else if ((count ?? 0) >= MAX_PEDIDOS_POR_SESION) {
      console.warn(`[API Pedido] Límite de pedidos activos alcanzado para tel: ${telefono}`)
      return NextResponse.json(
        { error: `Tenés ${count} pedidos activos. Esperá que sean entregados antes de hacer uno nuevo.` },
        { status: 429 }
      )
    }

    // ── Transacción de puntos (si hay cliente logueado) ──────────────────────
    if (body.cliente_id && (body.puntos_gastados > 0 || body.puntos_ganados > 0)) {
      const { error: rpcError } = await supabaseAdmin.rpc('procesar_compra_puntos', {
        p_cliente_id: body.cliente_id,
        p_puntos_a_gastar: body.puntos_gastados || 0,
        p_puntos_a_ganar: body.puntos_ganados || 0,
      })
      if (rpcError) {
        console.error('[API Pedido] Error RPC puntos:', rpcError.message)
      }
    }

    // ── Insertar pedido con service_role (bypassea RLS) ───────────────────────
    const payload = {
      ...body,
      archivado: false,
    }
    delete payload.envioManual
    delete payload.turno_tipo

    const { error } = await supabaseAdmin
      .from('pedidos')
      .insert(payload)

    if (error) {
      console.error('[API Pedido] Error al insertar:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: body.id })
  } catch (err: any) {
    console.error('[API Pedido] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
