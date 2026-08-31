// app/api/tienda/pedido/route.ts
// Endpoint seguro para que los clientes de la tienda creen pedidos.
// Usa el cliente admin (service_role) para bypassear RLS.
// Incluye blindaje de precios, recálculo en backend, validación de puntos,
// verificación de horario/turno, rate-limit y protección de idempotencia.

import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerEstadoHorarioLocal } from '@/lib/tiempo'
import { calcularCostoEnvio } from '@/lib/ubicacion'

// ── Rate limiting en memoria por IP ───────────────────────────────────────────
const rateLimitIP = new Map<string, { intentos: number; ultimoReset: number }>()
const MAX_PEDIDOS_POR_SESION = 3 // máximo 3 pedidos activos por teléfono
const VENTANA_RATE_LIMIT_MS = 10 * 60 * 1000 // ventana de 10 min

function obtenerIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

// ── Validación básica de estructura del payload ───────────────────────────────
function validarEstructuraPedido(body: any): string | null {
  if (!body || typeof body !== 'object') return 'Payload inválido'
  if (!body.id || typeof body.id !== 'string') return 'ID de pedido requerido'
  if (!body.cliente || typeof body.cliente !== 'string' || !body.cliente.trim()) return 'Nombre de cliente requerido'
  if (!body.telefono || typeof body.telefono !== 'string' || !body.telefono.trim()) return 'Teléfono requerido'
  if (!Array.isArray(body.productos) || body.productos.length === 0) return 'El pedido debe contener al menos un producto'
  if (!['delivery', 'retiro'].includes(body.tipoEntrega)) return 'Tipo de entrega inválido'
  if (!['efectivo', 'tarjeta', 'transferencia', 'sin_especificar'].includes(body.metodoPago)) return 'Método de pago inválido'
  if (typeof body.total !== 'number' || body.total < 0) return 'Total inválido'
  return null
}

export async function POST(request: Request) {
  try {
    const ip = obtenerIP(request)
    const ahora = Date.now()

    // ── 1. Rate limit por IP ──────────────────────────────────────────────────
    const registro = rateLimitIP.get(ip) || { intentos: 0, ultimoReset: ahora }
    if (ahora - registro.ultimoReset > VENTANA_RATE_LIMIT_MS) {
      registro.intentos = 0
      registro.ultimoReset = ahora
    }
    registro.intentos++
    rateLimitIP.set(ip, registro)

    if (registro.intentos > 15) {
      console.warn(`[API Pedido] Rate limit excedido para IP: ${ip}`)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    // ── 2. Validar estructura del payload ─────────────────────────────────────
    const errorValidacion = validarEstructuraPedido(body)
    if (errorValidacion) {
      return NextResponse.json({ error: errorValidacion }, { status: 400 })
    }

    const supabaseAdmin = obtenerSupabaseAdmin()

    // ── 3. IDEMPOTENCIA: Evitar duplicados por doble-clic o reintento de red ──
    const pedidoId = String(body.id).trim()
    const { data: pedidoExistente } = await supabaseAdmin
      .from('pedidos')
      .select('id, total, estado')
      .eq('id', pedidoId)
      .maybeSingle()

    if (pedidoExistente) {
      // El pedido ya fue insertado previamente con éxito: responder OK sin duplicar
      return NextResponse.json({ ok: true, id: pedidoExistente.id, yaProcesado: true })
    }

    // ── 4. BLINDAJE DE TURNOS: Verificar en tiempo real que el local esté ABIERTO
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

    // ── 5. Límite de pedidos activos por teléfono ─────────────────────────────
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

    // ── 6. BLINDAJE DE PRECIOS: Recálculo Forzoso en Backend ─────────────────
    // Extraer todos los IDs de producto del catálogo
    const idsCatalogo = Array.from(
      new Set(
        body.productos
          .map((p: any) => p.idCatalogo || p.id)
          .filter((id: any) => typeof id === 'string' && id.trim().length > 0)
      )
    ) as string[]

    // Consultar precios reales en la base de datos oficial
    const { data: productosDb, error: errProdDb } = await supabaseAdmin
      .from('productos')
      .select('id, nombre, precio, precio_puntos, activo')
      .in('id', idsCatalogo)

    if (errProdDb) {
      console.error('[API Pedido] Error consultando productos en DB:', errProdDb.message)
      return NextResponse.json({ error: 'Error al verificar el catálogo de productos.' }, { status: 500 })
    }

    const mapProductosDb = new Map((productosDb || []).map((p) => [p.id, p]))

    let subtotalCalculado = 0
    let puntosRequeridos = 0

    for (const item of body.productos) {
      const idProducto = item.idCatalogo || item.id
      const cantidad = Number(item.cantidad)

      if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 50) {
        return NextResponse.json({ error: `Cantidad inválida para el producto "${item.nombre || 'desconocido'}"` }, { status: 400 })
      }

      const prodDb = mapProductosDb.get(idProducto)

      if (prodDb) {
        // Validar que el producto no esté pausado
        if (prodDb.activo === false) {
          return NextResponse.json(
            { error: `El producto "${prodDb.nombre}" no está disponible en este momento.` },
            { status: 400 }
          )
        }

        const precioItemCliente = Number(item.precio) || 0

        // Caso A: Pago con Puntos
        if (precioItemCliente === 0 && Boolean(item.pago_con_puntos || item.nombre?.includes('[PAGADO CON PUNTOS]'))) {
          if (!prodDb.precio_puntos || prodDb.precio_puntos <= 0) {
            return NextResponse.json(
              { error: `El producto "${prodDb.nombre}" no puede canjearse por puntos.` },
              { status: 400 }
            )
          }
          puntosRequeridos += prodDb.precio_puntos * cantidad
        } else {
          // Caso B: Pago normal en dinero
          const precioBaseDb = Number(prodDb.precio) || 0

          // El precio unitario no puede ser inferior al precio base registrado en la base de datos
          if (precioItemCliente < precioBaseDb) {
            console.warn(`[API Pedido Security] Intento de precio adulterado para ${prodDb.nombre}: Cliente envió $${precioItemCliente}, DB es $${precioBaseDb}`)
            return NextResponse.json(
              { error: `El precio de "${prodDb.nombre}" cambió. Por favor actualizá tu menú.` },
              { status: 400 }
            )
          }

          subtotalCalculado += precioItemCliente * cantidad
        }
      } else {
        // Si no está en la tabla productos (caso legacy/combo no registrado), validamos con el precio enviado
        const precioUnitario = Math.max(0, Number(item.precio) || 0)
        subtotalCalculado += precioUnitario * cantidad
      }
    }

    // ── 7. Validación del Costo de Envío ─────────────────────────────────────
    let costoEnvioCalculado = 0
    if (body.tipoEntrega === 'delivery') {
      if (body.distanciaKm && typeof body.distanciaKm === 'number' && body.distanciaKm > 0) {
        costoEnvioCalculado = calcularCostoEnvio(body.distanciaKm)
      } else {
        costoEnvioCalculado = 1500 // Tarifa base mínima para envíos urbanos
      }
      // Garantizar que ningún delivery cobre menos del piso operativo ($1.500)
      costoEnvioCalculado = Math.max(costoEnvioCalculado, 1500)
    } else {
      costoEnvioCalculado = 0
    }

    // ── 8. Validación de Saldo de Puntos del Cliente ─────────────────────────
    const totalPuntosAGastar = Math.max(Number(body.puntos_gastados) || 0, puntosRequeridos)
    const clienteId = body.cliente_id ? String(body.cliente_id).trim() : null

    if (clienteId && totalPuntosAGastar > 0) {
      const { data: clienteDb, error: errCliente } = await supabaseAdmin
        .from('clientes')
        .select('id, puntos')
        .eq('id', clienteId)
        .single()

      if (errCliente || !clienteDb) {
        return NextResponse.json({ error: 'No se pudo verificar la cuenta del cliente.' }, { status: 400 })
      }

      if ((clienteDb.puntos || 0) < totalPuntosAGastar) {
        return NextResponse.json(
          {
            error: `Puntos insuficientes. Tu saldo actual es de ${clienteDb.puntos || 0} pts (se requieren ${totalPuntosAGastar} pts).`,
          },
          { status: 400 }
        )
      }
    }

    // ── 9. Comparación Final y Detección de Discrepancias ────────────────────
    const totalCalculado = subtotalCalculado + costoEnvioCalculado
    const totalCliente = Number(body.total) || 0

    // Tolerancia máxima de $10 por posibles diferencias mínimas de redondeo
    if (Math.abs(totalCalculado - totalCliente) > 10) {
      console.warn(
        `[API Pedido Security Alert] Discrepancia de total detectada desde IP ${ip}: Cliente envió $${totalCliente}, Backend calculó $${totalCalculado} (Subtotal: $${subtotalCalculado}, Envío: $${costoEnvioCalculado})`
      )
      return NextResponse.json(
        {
          error: 'Hubo una diferencia en los precios o costo de envío del pedido. Por favor recargá la página para confirmar el total actualizado.',
          totalCalculado,
        },
        { status: 400 }
      )
    }

    // Calcular cashback real: 5% del total
    const puntosGanadosCalculados = Math.floor(totalCalculado * 0.05)

    // ── 10. Transacción de Puntos (RPC seguro) ──────────────────────────────
    if (clienteId && (totalPuntosAGastar > 0 || puntosGanadosCalculados > 0)) {
      const { error: rpcError } = await supabaseAdmin.rpc('procesar_compra_puntos', {
        p_cliente_id: clienteId,
        p_puntos_a_gastar: totalPuntosAGastar,
        p_puntos_a_ganar: puntosGanadosCalculados,
      })
      if (rpcError) {
        console.error('[API Pedido] Error RPC puntos:', rpcError.message)
      }
    }

    // ── 11. Inserción Autorizada del Pedido con Valores Auditados ────────────
    const payload = {
      ...body,
      id: pedidoId,
      total: totalCalculado, // Total verificado por el servidor
      costoEnvio: costoEnvioCalculado, // Costo de envío verificado
      puntos_gastados: totalPuntosAGastar,
      puntos_ganados: puntosGanadosCalculados,
      archivado: false,
    }
    delete payload.envioManual
    delete payload.turno_tipo

    const { error: insertError } = await supabaseAdmin.from('pedidos').insert(payload)

    if (insertError) {
      console.error('[API Pedido] Error al insertar:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      id: pedidoId,
      total: totalCalculado,
      puntosGanados: puntosGanadosCalculados,
    })
  } catch (err: any) {
    console.error('[API Pedido] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor al procesar el pedido.' }, { status: 500 })
  }
}
