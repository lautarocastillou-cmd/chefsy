import { NextResponse } from 'next/server'
import { crearTokenReservas, corsHeaders, validarPin } from '@/lib/reservas-auth'
import { obtenerIpCliente, verificarRateLimit } from '@/lib/rate-limit'

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

export async function POST(request: Request) {
  const headers = corsHeaders(request.headers.get('origin'))
  try {
    const ip = obtenerIpCliente(request)
    const limit = verificarRateLimit(`reservas-login:${ip}`, 5, 15 * 60)
    if (!limit.permitido) return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en 15 minutos.' }, { status: 429, headers })
    const body = await request.json().catch(() => null)
    if (!validarPin(body?.pin)) return NextResponse.json({ error: 'PIN incorrecto.' }, { status: 401, headers })
    const token = await crearTokenReservas()
    return NextResponse.json({ token, expiresIn: 30 * 24 * 60 * 60 }, { headers })
  } catch (error) {
    console.error('[Reservas] Error de autenticación:', error)
    return NextResponse.json({ error: 'No se pudo iniciar sesión.' }, { status: 503, headers })
  }
}
