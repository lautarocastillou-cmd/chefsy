import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { ConsumoPersonal, NuevoConsumoPayload } from '@/tipos/consumo'

// ─────────────────────────────────────────────────────
// app/api/admin/consumos-personal/route.ts
// Gestión y persistencia segura de consumos internos del personal.
// Diseñado para no alterar pedidos, facturación ni estadísticas de clientes.
// ─────────────────────────────────────────────────────

// Helper: Guardar en fallback en configuracion_operativa
async function leerConsumosFallback(supabaseAdmin: any): Promise<ConsumoPersonal[]> {
  try {
    const { data } = await supabaseAdmin
      .from('configuracion_operativa')
      .select('prioridades')
      .eq('id', 1)
      .maybeSingle()

    return (data?.prioridades?.consumos_personal as ConsumoPersonal[]) || []
  } catch {
    return []
  }
}

async function guardarConsumosFallback(supabaseAdmin: any, consumos: ConsumoPersonal[]) {
  try {
    const { data } = await supabaseAdmin
      .from('configuracion_operativa')
      .select('prioridades')
      .eq('id', 1)
      .maybeSingle()

    const prioridades = data?.prioridades || {}
    prioridades.consumos_personal = consumos

    await supabaseAdmin
      .from('configuracion_operativa')
      .update({ prioridades })
      .eq('id', 1)
  } catch (e) {
    console.error('[Consumos] Error guardando fallback en config:', e)
  }
}

export async function GET() {
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const supabaseAdmin = obtenerSupabaseAdmin()

    // 1. Intentar leer de la tabla dedicada consumos_personal
    const { data, error } = await supabaseAdmin
      .from('consumos_personal')
      .select('*')
      .order('fecha', { ascending: false })

    if (!error && data) {
      return NextResponse.json(data)
    }

    // 2. Si la tabla no existe o falla, leer de fallback
    const fallbackData = await leerConsumosFallback(supabaseAdmin)
    return NextResponse.json(fallbackData)
  } catch (error: any) {
    console.error('[API Consumos] Error GET:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { accion } = body
    const supabaseAdmin = obtenerSupabaseAdmin()

    switch (accion) {
      case 'crear': {
        const payload: NuevoConsumoPayload = body.consumo
        if (!payload || !payload.producto_nombre || !payload.persona_nombre) {
          return NextResponse.json({ error: 'Datos de consumo incompletos' }, { status: 400 })
        }

        const id = 'cons-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
        const nuevoConsumo: ConsumoPersonal = {
          id,
          fecha: new Date().toISOString(),
          producto_id: payload.producto_id,
          producto_nombre: payload.producto_nombre,
          categoria_nombre: payload.categoria_nombre,
          precio: Number(payload.precio) || 0,
          cantidad: Math.max(1, Number(payload.cantidad) || 1),
          total: (Number(payload.precio) || 0) * Math.max(1, Number(payload.cantidad) || 1),
          persona_nombre: payload.persona_nombre.trim(),
          tipo_pago: payload.tipo_pago || 'anotado',
          saldado: payload.tipo_pago === 'pagado', // Si pagó en el momento, ya está saldado
          descontar_stock: payload.descontar_stock !== false,
          notas: payload.notas || '',
          creado_por: sesion.usuario,
        }

        // Intentar insertar en tabla consumos_personal
        const { error: errInsert } = await supabaseAdmin
          .from('consumos_personal')
          .insert(nuevoConsumo)

        if (errInsert) {
          // Fallback: guardar en array JSON de configuracion_operativa
          const consumosActuales = await leerConsumosFallback(supabaseAdmin)
          const actualizados = [nuevoConsumo, ...consumosActuales]
          await guardarConsumosFallback(supabaseAdmin, actualizados)
        }

        return NextResponse.json({ ok: true, consumo: nuevoConsumo })
      }

      case 'marcar_saldado': {
        const { id, saldado } = body
        if (!id) return NextResponse.json({ error: 'ID no provisto' }, { status: 400 })

        const { error } = await supabaseAdmin
          .from('consumos_personal')
          .update({ saldado: Boolean(saldado) })
          .eq('id', id)

        if (error) {
          const consumosActuales = await leerConsumosFallback(supabaseAdmin)
          const actualizados = consumosActuales.map((c) =>
            c.id === id ? { ...c, saldado: Boolean(saldado) } : c
          )
          await guardarConsumosFallback(supabaseAdmin, actualizados)
        }

        return NextResponse.json({ ok: true })
      }

      case 'saldar_persona': {
        const { persona_nombre } = body
        if (!persona_nombre) {
          return NextResponse.json({ error: 'Nombre de persona no provisto' }, { status: 400 })
        }

        const { error } = await supabaseAdmin
          .from('consumos_personal')
          .update({ saldado: true })
          .ilike('persona_nombre', persona_nombre.trim())
          .eq('tipo_pago', 'anotado')

        if (error) {
          const consumosActuales = await leerConsumosFallback(supabaseAdmin)
          const actualizados = consumosActuales.map((c) =>
            c.persona_nombre.toLowerCase() === persona_nombre.trim().toLowerCase() &&
            c.tipo_pago === 'anotado'
              ? { ...c, saldado: true }
              : c
          )
          await guardarConsumosFallback(supabaseAdmin, actualizados)
        }

        return NextResponse.json({ ok: true })
      }

      case 'eliminar': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'ID no provisto' }, { status: 400 })

        const { error } = await supabaseAdmin
          .from('consumos_personal')
          .delete()
          .eq('id', id)

        if (error) {
          const consumosActuales = await leerConsumosFallback(supabaseAdmin)
          const actualizados = consumosActuales.filter((c) => c.id !== id)
          await guardarConsumosFallback(supabaseAdmin, actualizados)
        }

        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[API Consumos] Error POST:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
