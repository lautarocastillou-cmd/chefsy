import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import configuracionFallback from '@/config/operacion.json'

// ─────────────────────────────────────────────────────
// app/api/admin/configuracion/route.ts
// Lee y escribe la configuración operativa desde Supabase.
// Fallback a config/operacion.json si la tabla no responde.
// ─────────────────────────────────────────────────────

export async function GET() {
  const sesion = await obtenerSesion()
  if (!sesion) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    const supabase = obtenerSupabaseAdmin()

    const { data, error } = await supabase
      .from('configuracion_operativa')
      .select('*')
      .eq('id', 1)
      .single()

    if (error || !data) {
      console.warn('[API Config] Supabase no disponible, usando fallback local:', error?.message)
      return NextResponse.json(configuracionFallback)
    }

    const portalCadeteriaHabilitado = data.portal_cadeteria_habilitado ?? data.prioridades?.portalCadeteriaHabilitado ?? (configuracionFallback as any).portalCadeteriaHabilitado ?? true

    return NextResponse.json({
      limites: data.limites,
      prioridades: data.prioridades,
      montoBaseCadete: data.monto_base_cadete ?? data.prioridades?.montoBaseCadete ?? configuracionFallback.montoBaseCadete ?? 4000,
      portalCadeteriaHabilitado,
    })
  } catch (error: any) {
    console.error('[API Config] Error al leer la configuración:', error)
    // Fallback al JSON estático en caso de error inesperado
    return NextResponse.json(configuracionFallback)
  }
}

export async function POST(request: Request) {
  // Validar sesión del administrador
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json(
      { error: 'Acceso denegado. Operación reservada para administradores.' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { limites, prioridades, montoBaseCadete, portalCadeteriaHabilitado } = body

    if (!limites || !prioridades) {
      return NextResponse.json(
        { error: 'Datos incompletos. Se requieren limites y prioridades.' },
        { status: 400 }
      )
    }

    const habilitado = portalCadeteriaHabilitado !== undefined ? Boolean(portalCadeteriaHabilitado) : true

    // Guardar también dentro de prioridades por si la columna física no existe aún en Postgres
    const prioridadesActualizadas = typeof prioridades === 'object' && prioridades !== null
      ? { ...prioridades, montoBaseCadete: Number(montoBaseCadete ?? 4000), portalCadeteriaHabilitado: habilitado }
      : prioridades

    const supabase = obtenerSupabaseAdmin()

    const { error } = await supabase
      .from('configuracion_operativa')
      .upsert(
        {
          id: 1,
          limites,
          prioridades: prioridadesActualizadas,
          monto_base_cadete: Number(montoBaseCadete ?? 4000),
          portal_cadeteria_habilitado: habilitado,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )

    if (error) {
      console.error('[API Config] Error al guardar en Supabase:', error)
      return NextResponse.json(
        { error: 'Error al guardar la configuración en la base de datos.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API Config] Error al procesar la solicitud:', error)
    return NextResponse.json(
      { error: 'Error interno al procesar la configuración.' },
      { status: 500 }
    )
  }
}
