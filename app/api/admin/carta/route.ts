// ─────────────────────────────────────────────────────
// app/api/admin/carta/route.ts
// API administrativa para leer y actualizar las hojas
// y ajustes de la Carta Digital (/carta).
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { obtenerSesion } from '@/lib/auth-server'
import { responderError } from '@/lib/api-error'
import {
  guardarConfiguracionCartaServidor,
  obtenerConfiguracionCartaServidor,
} from '@/lib/carta-digital-servidor'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado. Operación reservada para administradores.' },
        { status: 403 }
      )
    }

    const config = await obtenerConfiguracionCartaServidor()
    return NextResponse.json(config, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return responderError(err, {
      contexto: '[API Carta GET]',
      mensaje: 'No se pudo cargar la configuración de la carta.',
    })
  }
}

export async function PUT(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado. Operación reservada para administradores.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
    }

    const guardada = await guardarConfiguracionCartaServidor(body)
    try {
      revalidatePath('/carta')
    } catch {
      // En entornos sin cache de rutas activo no es crítico
    }

    return NextResponse.json({ ok: true, carta: guardada })
  } catch (err) {
    return responderError(err, {
      contexto: '[API Carta PUT]',
      mensaje: 'No se pudo guardar la carta. Intentá de nuevo.',
    })
  }
}
