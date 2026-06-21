import { NextResponse } from 'next/server'
import { obtenerSesion, firmarToken } from '@/lib/auth-server'

export async function POST(req: Request) {
  try {
    // Solo admins pueden generar QRs
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { usuario, nombre } = body

    if (!usuario || !nombre) {
      return NextResponse.json({ error: 'Faltan datos del cadete' }, { status: 400 })
    }

    // Generar un token con rol cadete que dura 72 horas (o podría ser más corto solo para el escaneo,
    // pero usamos 72hs así la ruta de validación lo usa directamente).
    const token = await firmarToken({
      usuario,
      nombre,
      rol: 'cadete'
    }, 72)

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error generando token QR:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
