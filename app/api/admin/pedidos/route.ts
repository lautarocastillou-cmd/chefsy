// ─────────────────────────────────────────────────────
// app/api/admin/pedidos/route.ts
// Endpoint seguro para operaciones administrativas en pedidos.
// Valida sesión y ejecuta acciones usando service_role.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { enviarNotificacionCadete } from '@/lib/webpush'

export async function POST(request: Request) {
  // 1. Validar sesión en el servidor
  const sesion = await obtenerSesion()
  if (!sesion) {
    return NextResponse.json(
      { error: 'Acceso denegado. No autenticado.' },
      { status: 401 }
    )
  }

  const { rol } = sesion

  let body: any = null
  try {
    body = await request.json()
    const { accion } = body

    if (!accion) {
      return NextResponse.json(
        { error: 'Acción no especificada.' },
        { status: 400 }
      )
    }

    // 2. Obtener el cliente de Supabase administrativo (singleton — se reutiliza entre requests)
    const supabaseAdmin = obtenerSupabaseAdmin()

    // 3. Procesar acciones con validación de roles
    switch (accion) {
      case 'crear': {
        if (rol !== 'admin') {
          return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
        }

        const { pedido } = body
        if (!pedido || !pedido.id) {
          return NextResponse.json({ error: 'Datos incompletos para crear.' }, { status: 400 })
        }

        const payload = { ...pedido, archivado: false }
        delete payload.created_at
        delete payload.updated_at
        delete payload.envioManual
        delete payload.turno_tipo

        // 1. Ejecutar transacción de puntos si aplica
        if (payload.cliente_id && (payload.puntos_gastados > 0 || payload.puntos_ganados > 0)) {
          const { error: rpcError } = await supabaseAdmin.rpc('procesar_compra_puntos', {
            p_cliente_id: payload.cliente_id,
            p_puntos_a_gastar: payload.puntos_gastados || 0,
            p_puntos_a_ganar: payload.puntos_ganados || 0
          })
          
          if (rpcError) {
            console.error('[API Pedidos] Error en RPC de puntos:', rpcError.message)
            return NextResponse.json({ error: `Error procesando puntos: ${rpcError.message}` }, { status: 500 })
          }
        }

        let { error } = await supabaseAdmin
          .from('pedidos')
          .insert(payload)

        if (error) {
          console.error('[API Pedidos] Error al insertar pedido:', error)
          throw error
        }

        return NextResponse.json({ ok: true })
      }

      case 'editar': {
        if (rol !== 'admin') {
          return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
        }

        const { id, pedido } = body
        if (!id || !pedido) {
          return NextResponse.json({ error: 'Datos incompletos para editar.' }, { status: 400 })
        }

        const payload = { ...pedido }
        
        // Quitar campos autogenerados de base de datos y campos no existentes
        delete payload.id
        delete payload.created_at
        delete payload.updated_at
        delete payload.envioManual
        delete payload.turno_tipo

        const { error } = await supabaseAdmin
          .from('pedidos')
          .update(payload)
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'actualizar_estado': {
        const { id, estado, cocina_at, listo_at, entregado_at, en_camino_at } = body
        if (!id || !estado) {
          return NextResponse.json({ error: 'Datos incompletos para actualizar_estado.' }, { status: 400 })
        }

        const ESTADOS_VALIDOS = ['nuevo', 'en_cocina', 'listo', 'en_camino', 'entregado', 'cancelado']
        if (!ESTADOS_VALIDOS.includes(estado)) {
          return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 })
        }

        // Un cadete puede cambiar a "listo", "en_camino" o "entregado"
        if (rol === 'cadete' && !['listo', 'en_camino', 'entregado'].includes(estado)) {
          return NextResponse.json({ error: 'Operación no permitida para el rol de cadete.' }, { status: 403 })
        }

        const updatePayload: any = { estado }
        if (cocina_at !== undefined) updatePayload.cocina_at = cocina_at
        if (listo_at !== undefined) updatePayload.listo_at = listo_at
        if (entregado_at !== undefined) updatePayload.entregado_at = entregado_at
        if (en_camino_at !== undefined) updatePayload.en_camino_at = en_camino_at
        if (estado === 'en_camino' && en_camino_at === undefined) updatePayload.en_camino_at = new Date().toISOString()

        // Limpiar coordenadas del cadete automáticamente al finalizar la entrega
        if (estado === 'entregado') {
          updatePayload.cadete_coordenadas = null
        }

        // Obtener estado anterior para evitar doble descuento y obtener cadete_id
        const { data: pedidoPrevio } = await supabaseAdmin
          .from('pedidos')
          .select('estado, cadete_id')
          .eq('id', id)
          .single()

        if (estado === 'en_camino' && pedidoPrevio?.cadete_id) {
          const { data: cadeteInfo } = await supabaseAdmin
            .from('cadetes')
            .select('lat, lng')
            .ilike('id', pedidoPrevio.cadete_id)
            .maybeSingle()

          if (cadeteInfo && cadeteInfo.lat != null && cadeteInfo.lng != null) {
            updatePayload.cadete_coordenadas = { latitud: cadeteInfo.lat, longitud: cadeteInfo.lng }
          }
        }

        // C4: Una sola query — update + select en la misma operación
        const { data: updateData, error } = await supabaseAdmin
          .from('pedidos')
          .update(updatePayload)
          .eq('id', id)
          .select('cadete_id, tipoEntrega, cliente, productos')

        if (error) throw error
        
        const pedidoAct = updateData && updateData.length > 0 ? updateData[0] : null
        
        if (!pedidoAct) {
          console.warn(`[API Pedidos] El update no devolvió filas para el pedido ${id}. Fila inexistente.`)
          return NextResponse.json(
            { error: 'El pedido no existe en la base de datos (quizás fue eliminado o nunca se sincronizó).' },
            { status: 404 }
          )
        }

        // Descontar stock inteligentemente cuando pasa a "entregado" (y antes no lo era)
        if (pedidoPrevio?.estado !== 'entregado' && estado === 'entregado' && pedidoAct?.productos) {
          const productosVendidos = pedidoAct.productos.map((p: any) => ({
            idCatalogo: p.idCatalogo,
            cantidad: p.cantidad
          })).filter((p: any) => p.idCatalogo)

          if (productosVendidos.length > 0) {
            const { error: rpcError } = await supabaseAdmin.rpc('deducir_stock', {
              productos_vendidos: productosVendidos
            })
            if (rpcError) console.error('[Stock] Error al deducir stock:', rpcError)
          }
        }

        // Restituir stock inteligentemente cuando deja de ser "entregado" (ej. pasa a cancelado o nuevo)
        if (pedidoPrevio?.estado === 'entregado' && estado !== 'entregado' && pedidoAct?.productos) {
          const productosDevueltos = pedidoAct.productos.map((p: any) => ({
            idCatalogo: p.idCatalogo,
            cantidad: p.cantidad
          })).filter((p: any) => p.idCatalogo)

          if (productosDevueltos.length > 0) {
            const { error: rpcError } = await supabaseAdmin.rpc('restituir_stock', {
              productos_devueltos: productosDevueltos
            })
            if (rpcError) console.error('[Stock] Error al restituir stock:', rpcError)
          }
        }

        // Notificar al cadete si el pedido es delivery y está listo
        // Usamos pedidoAct directamente — sin segunda query a la base de datos
        if (estado === 'listo' && pedidoAct?.cadete_id && pedidoAct?.tipoEntrega === 'delivery') {
          await enviarNotificacionCadete(
            pedidoAct.cadete_id,
            '¡Pedido Listo para Retirar! 🛵',
            `El pedido de ${pedidoAct.cliente} ya está listo en cocina.`
          )
        }

        return NextResponse.json({ ok: true })
      }

      case 'confirmar_pago': {
        if (rol !== 'admin') {
          return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
        }

        const { id, pago_confirmado } = body
        if (!id || pago_confirmado === undefined) {
          return NextResponse.json({ error: 'Datos incompletos para confirmar_pago.' }, { status: 400 })
        }

        const { error } = await supabaseAdmin
          .from('pedidos')
          .update({ pago_confirmado })
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'eliminar': {
        if (rol !== 'admin') {
          return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
        }

        const { id } = body
        if (!id) {
          return NextResponse.json({ error: 'ID de pedido no provisto.' }, { status: 400 })
        }

        // Obtener pedido antes de eliminar para restituir stock si aplica
        const { data: pedidoEliminar } = await supabaseAdmin
          .from('pedidos')
          .select('estado, productos')
          .eq('id', id)
          .single()

        const { error } = await supabaseAdmin
          .from('pedidos')
          .delete()
          .eq('id', id)

        if (error) throw error

        // Restituir stock si el pedido eliminado estaba en estado "entregado"
        if (pedidoEliminar?.estado === 'entregado' && pedidoEliminar?.productos) {
          const productosDevueltos = pedidoEliminar.productos.map((p: any) => ({
            idCatalogo: p.idCatalogo,
            cantidad: p.cantidad
          })).filter((p: any) => p.idCatalogo)

          if (productosDevueltos.length > 0) {
            const { error: rpcError } = await supabaseAdmin.rpc('restituir_stock', {
              productos_devueltos: productosDevueltos
            })
            if (rpcError) console.error('[Stock] Error al restituir stock al eliminar pedido:', rpcError)
          }
        }

        return NextResponse.json({ ok: true })
      }

      case 'finalizar_turno': {
        if (rol !== 'admin') {
          return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
        }

        const { ids, snapshot } = body
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json({ error: 'IDs de pedidos no provistos o vacíos.' }, { status: 400 })
        }

        // 1. Archivar los pedidos inmediatamente (limpiar panel)
        const { error: errorArchivar } = await supabaseAdmin
          .from('pedidos')
          .update({ archivado: true })
          .in('id', ids)

        if (errorArchivar) throw errorArchivar

        // 2. FUSIONAR Y CONSOLIDAR EL CIERRE COMPLETO DEL TURNO EN CIERRES_DIARIOS
        try {
          // Obtener fecha local de Argentina (YYYY-MM-DD)
          const now = new Date()
          const utcOffset = -3 // ARG
          const argTime = new Date(now.getTime() + utcOffset * 3600000)
          const fechaStr = argTime.toISOString().split('T')[0]

          const argHora = argTime.getHours()
          const fallbackTipo = argHora >= 10 && argHora < 17 ? 'mediodia' : 'noche'
          const turnoTipo = snapshot?.turno_tipo || fallbackTipo

          // Consultar TODOS los pedidos de hoy en la base de datos para consolidar
          const { data: pedidosDelDia } = await supabaseAdmin
            .from('pedidos')
            .select('*')
            .eq('fecha', fechaStr)

          if (pedidosDelDia && pedidosDelDia.length > 0) {
            // Filtrar todos los pedidos que pertenecen a este turno
            const pedidosDelTurno = pedidosDelDia.filter((p: any) => {
              if (p.turno_tipo) return p.turno_tipo === turnoTipo
              let horaNum = 20
              if (p.hora) {
                const esPM = /p\.?\s*m\.?|pm/i.test(p.hora)
                const esAM = /a\.?\s*m\.?|am/i.test(p.hora)
                const numStr = p.hora.replace(/[^0-9:]/g, '').split(':')[0]
                let h = Number(numStr) || 0
                if (esPM && h < 12) h += 12
                else if (esAM && h === 12) h = 0
                horaNum = h
              }
              const esMediodia = horaNum >= 10 && horaNum < 16
              return turnoTipo === 'mediodia' ? esMediodia : !esMediodia
            })

            const validos = pedidosDelTurno.filter((p: any) => p.estado !== 'cancelado')
            const facturacion_neta = validos.reduce((acc: number, p: any) => acc + (p.total - (p.costoEnvio || 0)), 0)
            const efectivo_ventas = validos.reduce((acc: number, p: any) => acc + (p.metodoPago === 'efectivo' ? p.total : 0), 0)
            const tarjeta_total = validos.reduce((acc: number, p: any) => acc + (p.metodoPago === 'tarjeta' ? p.total : 0), 0)
            const transferencia_total = validos.reduce((acc: number, p: any) => acc + (p.metodoPago === 'transferencia' ? p.total : 0), 0)

            const caja_inicial = snapshot?.caja_inicial || 0
            const efectivo_rendir = caja_inicial + efectivo_ventas
            const total_pedidos = validos.length
            const ticket_promedio = total_pedidos > 0 ? facturacion_neta / total_pedidos : 0

            const total_envios_delivery = validos.filter((p: any) => p.tipoEntrega === 'delivery').length
            const costo_envios_cadetes = validos
              .filter((p: any) => p.tipoEntrega === 'delivery')
              .reduce((acc: number, p: any) => acc + (p.costoEnvio || 0), 0)
            const total_retiros = validos.filter((p: any) => p.tipoEntrega === 'retiro').length
            const total_consumo_local = validos.filter((p: any) => p.tipoEntrega === 'consumo_local').length

            const cancelados = pedidosDelTurno.filter((p: any) => p.estado === 'cancelado')
            const pedidos_cancelados = cancelados.length
            const monto_cancelados = cancelados.reduce((acc: number, p: any) => acc + p.total, 0)

            const snapshotConsolidado = {
              fecha: fechaStr,
              turno_tipo: turnoTipo,
              facturacion_neta,
              efectivo_ventas,
              caja_inicial,
              efectivo_rendir,
              tarjeta_total,
              transferencia_total,
              total_pedidos,
              total_envios_delivery,
              costo_envios_cadetes,
              total_retiros,
              total_consumo_local,
              ticket_promedio,
              pedidos_cancelados,
              monto_cancelados,
            }

            // Buscar si ya existe un registro de cierre para esta fecha y turno
            const { data: existingCierres } = await supabaseAdmin
              .from('cierres_diarios')
              .select('id')
              .eq('fecha', fechaStr)
              .eq('turno_tipo', turnoTipo)
              .limit(1)

            if (existingCierres && existingCierres.length > 0) {
              await supabaseAdmin
                .from('cierres_diarios')
                .update(snapshotConsolidado)
                .eq('id', existingCierres[0].id)
            } else {
              await supabaseAdmin
                .from('cierres_diarios')
                .insert(snapshotConsolidado)
            }
          }
        } catch (errCierre) {
          console.error('[API Cierre Diario] Error al consolidar snapshot:', errCierre)
        }

        return NextResponse.json({ ok: true })
      }

      case 'actualizar_gps': {
        // Permitido para cadetes y administradores
        const { ids, cadete_coordenadas } = body
        if (!ids || !Array.isArray(ids) || !cadete_coordenadas) {
          return NextResponse.json({ error: 'Datos incompletos para actualizar_gps.' }, { status: 400 })
        }

        let query = supabaseAdmin
          .from('pedidos')
          .update({ cadete_coordenadas })
          .in('id', ids)

        // Seguridad estricta: si es cadete, solo puede inyectar GPS en sus propios pedidos
        if (rol === 'cadete') {
          query = query.eq('cadete_id', sesion.usuario)
        }

        const { error } = await query

        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'asignar_cadete': {
        if (rol !== 'admin') {
          return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
        }

        const { id, cadete_id, cadete_nombre } = body
        if (!id) {
          return NextResponse.json({ error: 'ID de pedido no provisto.' }, { status: 400 })
        }

        // Si se asigna un cadete, verificar que tenga el turno iniciado (GPS activo)
        if (cadete_id) {
          const { data: cadeteGPS } = await supabaseAdmin
            .from('cadetes')
            .select('gps_activo')
            .ilike('id', cadete_id)
            .maybeSingle()

          if (!cadeteGPS || !cadeteGPS.gps_activo) {
            return NextResponse.json({
              error: `El repartidor ${cadete_nombre || cadete_id} no inició turno (GPS inactivo). Debe activar el GPS en su app para recibir pedidos.`
            }, { status: 400 })
          }
        }

        const { data: updateData, error } = await supabaseAdmin
          .from('pedidos')
          .update({ cadete_id: cadete_id || null, cadete_nombre: cadete_nombre || null })
          .eq('id', id)
          .select('cliente')

        if (error) throw error

        const pedidoAct = updateData && updateData.length > 0 ? updateData[0] : null

        if (cadete_id && pedidoAct) {
          enviarNotificacionCadete(
            cadete_id,
            '🛵 Nuevo Pedido Asignado',
            `Se te ha asignado el pedido de ${pedidoAct.cliente || 'un cliente'}.`
          ).catch((err) => console.error('[Push Cadete] Error enviando notificación:', err))
        }

        return NextResponse.json({ ok: true })
      }

      case 'cambiar_metodo_pago': {
        if (rol !== 'admin') {
          return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
        }

        const { id, metodoPago } = body
        if (!id || !metodoPago) {
          return NextResponse.json({ error: 'Datos incompletos para cambiar_metodo_pago.' }, { status: 400 })
        }

        const { error } = await supabaseAdmin
          .from('pedidos')
          .update({ metodoPago })
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json(
          { error: `Acción '${accion}' no válida.` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error(`[API Pedidos] Error al procesar acción '${body?.accion}':`, error)
    return NextResponse.json(
      { error: `Error interno: ${error?.message || 'Error desconocido'}` },
      { status: 500 }
    )
  }
}
