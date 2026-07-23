// app/api/clientes/logout/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { NOMBRE_COOKIE_CLIENTE } from '@/lib/auth-cliente-server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const cookieStore = await cookies()
    // 1. Método nativo de Next.js para borrar la cookie
    cookieStore.delete(NOMBRE_COOKIE_CLIENTE)

    // 2. Respuesta forzando la expiración de la cookie
    const response = NextResponse.json({ ok: true })
    response.cookies.set(NOMBRE_COOKIE_CLIENTE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    })

    return response
  } catch (err) {
    console.error('[ClienteLogout] Error al cerrar sesión:', err)
    return NextResponse.json({ ok: true })
  }
}
