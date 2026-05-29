// ─────────────────────────────────────────────────────
// app/api/auth/login/route.ts
// Endpoint de autenticación. Valida credenciales,
// firma un JWT y lo almacena en una cookie HttpOnly segura.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  validarCredenciales,
  firmarToken,
  configurarCookieSesion,
} from '@/lib/auth-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { usuario, clave } = body

    if (!usuario || !clave) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son obligatorios.' },
        { status: 400 }
      )
    }

    // Validar contra la fuente de verdad del servidor
    const datosUsuario = validarCredenciales(usuario, clave)

    if (!datosUsuario) {
      // Delay sintético para dificultar ataques de fuerza bruta en timing
      await new Promise((r) => setTimeout(r, 400))
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos.' },
        { status: 401 }
      )
    }

    // Firmar el JWT con los datos del usuario
    const token = await firmarToken(datosUsuario)

    // Establecer la cookie segura HttpOnly en la respuesta
    const cookieConfig = configurarCookieSesion(token)
    const cookieStore = await cookies()
    cookieStore.set(cookieConfig as any)

    // Retornar los datos públicos del usuario (sin el token en el body)
    return NextResponse.json({
      ok:      true,
      usuario: datosUsuario.usuario,
      nombre:  datosUsuario.nombre,
      rol:     datosUsuario.rol,
    })
  } catch (error) {
    console.error('[Auth] Error en login:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
