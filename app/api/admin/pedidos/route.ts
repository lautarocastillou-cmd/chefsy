// ─────────────────────────────────────────────────────
// app/api/admin/pedidos/route.ts
// Endpoint seguro para operaciones administrativas en pedidos.
// Valida sesión y ejecuta acciones usando service_role.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'

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

    // 2. Inicializar cliente de Supabase administrativo con service_role
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
      console.error('[API Pedidos] Falta configurar variables de entorno en el servidor.')
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    // 3. Procesar acciones con validación de roles
    switch (accion) {
      case 'editar': {
        if (rol !== 'admin') {
          return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
        }

        const { id, pedido } = body
        if (!id || !pedido) {
          return NextResponse.json({ error: 'Datos incompletos para editar.' }, { status: 400 })
        }

        const payload = { ...pedido }
        // Adaptar reparto_at -> ubicacion_cadete si es necesario
        if (payload.reparto_at !== undefined) {
          payload.ubicacion_cadete = payload.reparto_at
          delete payload.reparto_at
        }
        
        // Quitar campos autogenerados de base de datos
        delete payload.id
        delete payload.created_at
        delete payload.updated_at

        const { error } = await supabaseAdmin
          .from('pedidos')
          .update(payload)
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'actualizar_estado': {
        const { id, estado, cocina_at, listo_at, reparto_at, entregado_at } = body
        if (!id || !estado) {
          return NextResponse.json({ error: 'Datos incompletos para actualizar_estado.' }, { status: 400 })
        }

        // Un cadete solo puede cambiar el estado a "en_reparto" o "entregado"
        if (rol === 'cadete' && estado !== 'en_reparto' && estado !== 'entregado') {
          return NextResponse.json({ error: 'Operación no permitida para el rol de cadete.' }, { status: 403 })
        }

        const updatePayload: any = { estado }
        if (cocina_at !== undefined) updatePayload.cocina_at = cocina_at
        if (listo_at !== undefined) updatePayload.listo_at = listo_at
        if (reparto_at !== undefined) updatePayload.ubicacion_cadete = reparto_at
        if (entregado_at !== undefined) updatePayload.entregado_at = entregado_at

        const { error } = await supabaseAdmin
          .from('pedidos')
          .update(updatePayload)
          .eq('id', id)

        if (error) throw error
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

        const { error } = await supabaseAdmin
          .from('pedidos')
          .delete()
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'finalizar_turno': {
        if (rol !== 'admin') {
          return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
        }

        const { ids } = body
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json({ error: 'IDs de pedidos no provistos o vacíos.' }, { status: 400 })
        }

        const { error } = await supabaseAdmin
          .from('pedidos')
          .update({ archivado: true })
          .in('id', ids)

        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'actualizar_gps': {
        // Permitido para cadetes y administradores
        const { ids, cadete_coordenadas } = body
        if (!ids || !Array.isArray(ids) || !cadete_coordenadas) {
          return NextResponse.json({ error: 'Datos incompletos para actualizar_gps.' }, { status: 400 })
        }

        const { error } = await supabaseAdmin
          .from('pedidos')
          .update({ cadete_coordenadas })
          .in('id', ids)

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

        const { error } = await supabaseAdmin
          .from('pedidos')
          .update({ cadete_id: cadete_id || null, cadete_nombre: cadete_nombre || null })
          .eq('id', id)

        if (error) throw error
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
      { error: error.message || 'Error interno al procesar la operación en el servidor.' },
      { status: 500 }
    )
  }
}
