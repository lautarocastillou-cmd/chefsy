import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerConfiguracionTienda } from '@/servicios/supabase/configuracion'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const accion = searchParams.get('accion')

  // 1. Escaneo de salud y latencia de tablas clave de Supabase
  if (accion === 'tablas') {
    const supabaseAdmin = obtenerSupabaseAdmin()
    const tablasAProbar = [
      { id: 'pedidos', nombre: 'Pedidos' },
      { id: 'turnos', nombre: 'Turnos' },
      { id: 'cadetes', nombre: 'Cadetes' },
      { id: 'stock_insumos', nombre: 'Stock Insumos' },
      { id: 'usuarios', nombre: 'Usuarios' },
    ]

    const resultados = await Promise.all(
      tablasAProbar.map(async ({ id, nombre }) => {
        const tInicio = performance.now()
        try {
          const { error } = await supabaseAdmin.from(id).select('id').limit(1)
          const latenciaMs = Math.round(performance.now() - tInicio)
          if (error) {
            return { id, nombre, ok: false, latenciaMs, error: error.message }
          }
          return { id, nombre, ok: true, latenciaMs }
        } catch (e: any) {
          return {
            id,
            nombre,
            ok: false,
            latenciaMs: Math.round(performance.now() - tInicio),
            error: e.message || 'Error de conexión',
          }
        }
      })
    )

    return NextResponse.json({ ok: true, tablas: resultados })
  }

  // 2. Consulta de configuración por defecto
  try {
    const config = await obtenerConfiguracionTienda()
    return NextResponse.json(config)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
