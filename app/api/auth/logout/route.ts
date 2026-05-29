// ─────────────────────────────────────────────────────
// app/api/auth/logout/route.ts
// Endpoint de cierre de sesión. Elimina la cookie
// segura del servidor para invalidar la sesión activa.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { NOMBRE_COOKIE_SESION } from '@/lib/auth-server'

export async function POST() {
  // Eliminar la cookie de sesión estableciendo su maxAge a 0
  const cookieStore = await cookies()
  cookieStore.set({
    name:     NOMBRE_COOKIE_SESION,
    value:    '',
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   0,
  })

  return NextResponse.json({ ok: true })
}
