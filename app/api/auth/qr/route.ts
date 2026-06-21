import { NextResponse } from 'next/server'
import { verificarToken, configurarCookieSesion, firmarToken } from '@/lib/auth-server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const qrToken = searchParams.get('token')

  if (!qrToken) {
    return NextResponse.json({ error: 'Falta el token de acceso' }, { status: 400 })
  }

  try {
    // Verificar que el token sea válido.
    const payload = await verificarToken(qrToken)

    if (!payload || payload.rol !== 'cadete') {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    // El token del QR es válido. Generamos sesión real por 72 horas.
    const sessionToken = await firmarToken(
      { usuario: payload.usuario, nombre: payload.nombre, rol: payload.rol }, 
      72 // 72 horas
    )

    // Configurar la cookie
    const cookieOpts = configurarCookieSesion(sessionToken, 72) as any
    const cookieStore = await cookies()
    cookieStore.set(cookieOpts.name, cookieOpts.value, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    })

    // Redirigir al panel de cadetería
    const url = new URL('/cadeteria', request.url)
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('[QR Auth] Error:', error)
    return NextResponse.json({ error: 'Error procesando la autorización' }, { status: 500 })
  }
}
