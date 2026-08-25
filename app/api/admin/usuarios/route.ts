import { NextResponse } from 'next/server'
import { obtenerSesion, hashearClave } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

// ── GET: Obtener lista de usuarios ─────────────────────────────────────────
export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('usuarios')
      .select('usuario, nombre, rol, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API Usuarios] Error GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── POST: Crear o modificar un usuario ──────────────────────────────────────
export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { usuario, clave, nombre, rol } = body

    if (!usuario || !clave || !nombre || !rol) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    
    // Preparar el usuario
    const uLimpio = usuario.trim().toLowerCase()
    const hash = await hashearClave(clave)

    const { error } = await supabase
      .from('usuarios')
      .insert({
        usuario: uLimpio,
        clave_hash: hash,
        nombre: nombre,
        rol: rol
      })

    if (error) {
      if (error.code === '23505') { // Código de PostgreSQL para unique violation
        return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 400 })
      }
      throw error
    }

    // Si el usuario es un cadete, asegurar que esté en la tabla cadetes para seguimiento GPS y asignación
    if (rol === 'cadete') {
      try {
        await supabase.from('cadetes').upsert({
          id: uLimpio,
          nombre: nombre,
          activo: true
        })
      } catch (err) {
        console.error('[API Usuarios] Error creando cadete en tabla cadetes:', err)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API Usuarios] Error POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── DELETE: Eliminar un usuario ────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const usuarioId = searchParams.get('usuario')

    if (!usuarioId) {
      return NextResponse.json({ error: 'ID de usuario no proporcionado' }, { status: 400 })
    }
    
    if (usuarioId === sesion.usuario) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('usuario', usuarioId)

    if (error) throw error

    // Eliminar también de la tabla cadetes si correspondía
    try {
      await supabase
        .from('cadetes')
        .delete()
        .eq('id', usuarioId)
    } catch {
      // Ignorar si no existe
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API Usuarios] Error DELETE:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
