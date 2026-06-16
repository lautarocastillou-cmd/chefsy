import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import fs from 'fs'
import path from 'path'

// Obtener la ruta del archivo config/operacion.json
const obtenerRutaArchivo = () => path.join(process.cwd(), 'config', 'operacion.json')

export async function GET() {
  try {
    const ruta = obtenerRutaArchivo()
    if (!fs.existsSync(ruta)) {
      return NextResponse.json({ error: 'Archivo de configuración no encontrado.' }, { status: 404 })
    }
    const contenido = fs.readFileSync(ruta, 'utf-8')
    const config = JSON.parse(contenido)
    return NextResponse.json(config)
  } catch (error: any) {
    console.error('[API Config] Error al leer la configuración:', error)
    return NextResponse.json({ error: 'Error al leer la configuración.' }, { status: 500 })
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
    const { limites, prioridades } = body

    if (!limites || !prioridades) {
      return NextResponse.json(
        { error: 'Datos incompletos.' },
        { status: 400 }
      )
    }

    const ruta = obtenerRutaArchivo()
    const contenido = JSON.stringify(body, null, 2)
    fs.writeFileSync(ruta, contenido, 'utf-8')

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API Config] Error al escribir la configuración:', error)
    return NextResponse.json(
      { error: 'Error al escribir la configuración en el servidor.' },
      { status: 500 }
    )
  }
}
