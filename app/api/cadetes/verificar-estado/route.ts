import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

// Endpoint para verificar si un cadete está activo o fue eliminado
// Usado por la app Flutter para bloquear el acceso si el cadete ya no existe
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cadeteId = searchParams.get('cadeteId')

  if (!cadeteId) {
    return NextResponse.json(
      { error: 'Falta cadeteId' },
      { status: 400 }
    )
  }

  const supabaseAdmin = obtenerSupabaseAdmin()

  // Buscar el cadete en la tabla cadetes
  const { data, error } = await supabaseAdmin
    .from('cadetes')
    .select('id, activo, eliminado, nombre, fecha_baja')
    .eq('id', cadeteId)
    .single()

  if (error || !data) {
    return NextResponse.json({
      activo: false,
      eliminado: true,
      motivo: 'Cadete no encontrado en la base de datos',
      puedeReactivar: false,
    })
  }

  // Verificar si está marcado como eliminado o inactivo
  const estaEliminado = data.eliminado === true
  const estaInactivo = data.activo === false

  if (estaEliminado || estaInactivo) {
    return NextResponse.json({
      activo: false,
      eliminado: true,
      motivo: data.fecha_baja
        ? `Cadete dado de baja el ${data.fecha_baja}`
        : 'Cadete eliminado del sistema',
      puedeReactivar: false,
    })
  }

  return NextResponse.json({
    activo: true,
    eliminado: false,
    motivo: null,
    puedeReactivar: false,
  })
}
