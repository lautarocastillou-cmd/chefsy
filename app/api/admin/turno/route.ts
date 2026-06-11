import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import fs from 'fs'
import path from 'path'

const obtenerRutaArchivo = () => path.join(process.cwd(), 'config', 'turno.json')

export async function GET() {
  try {
    const ruta = obtenerRutaArchivo()
    if (!fs.existsSync(ruta)) {
      // Si no existe, devolvemos el estado por defecto
      return NextResponse.json({
        activo: false,
        cajaInicial: 0,
        fechaInicio: null
      })
    }
    const contenido = fs.readFileSync(ruta, 'utf-8')
    const config = JSON.parse(contenido)
    return NextResponse.json(config)
  } catch (error: any) {
    console.error('[API Turno] Error al leer estado del turno:', error)
    return NextResponse.json({ error: 'Error al leer el turno.' }, { status: 500 })
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
    const { activo, cajaInicial, fechaInicio } = body

    if (activo === undefined) {
      return NextResponse.json(
        { error: 'Datos incompletos.' },
        { status: 400 }
      )
    }

    const ruta = obtenerRutaArchivo()
    const contenido = JSON.stringify({ activo, cajaInicial, fechaInicio }, null, 2)
    fs.writeFileSync(ruta, contenido, 'utf-8')

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API Turno] Error al escribir estado del turno:', error)
    return NextResponse.json(
      { error: error.message || 'Error al guardar el turno en el servidor.' },
      { status: 500 }
    )
  }
}
