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
import { obtenerIpCliente, verificarRateLimit, resetearRateLimit } from '@/lib/rate-limit'

const MAX_INTENTOS = 5
const VENTANA_BLOQUEO_SEG = 15 * 60 // 15 minutos

export async function POST(request: Request) {
  try {
    // Rate Limiting seguro por IP (5 intentos por cada 15 minutos)
    const ip = obtenerIpCliente(request)
    const rateCheck = verificarRateLimit(`login-staff:${ip}`, MAX_INTENTOS, VENTANA_BLOQUEO_SEG)

    if (!rateCheck.permitido) {
      return NextResponse.json(
        { error: 'Demasiados intentos fallidos. Tu IP fue bloqueada por 15 minutos por seguridad.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.segundosParaReset),
            'Cache-Control': 'no-store'
          }
        }
      )
    }

    const body = await request.json()
    const { usuario, clave } = body

    if (!usuario || !clave) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son obligatorios.' },
        { status: 400 }
      )
    }

    // Validar contra la fuente de verdad del servidor
    const datosUsuario = await validarCredenciales(usuario, clave)

    if (!datosUsuario) {
      return NextResponse.json(
        { error: `Usuario o contraseña incorrectos. (Intentos restantes: ${rateCheck.restante})` },
        { status: 401 }
      )
    }

    // Si el login es exitoso, resetear contador de la IP
    resetearRateLimit(`login-staff:${ip}`)

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
