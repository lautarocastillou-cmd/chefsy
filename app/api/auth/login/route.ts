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

// Diccionario en memoria para rastrear intentos fallidos (Rate Limiting básico)
const intentosFallidos = new Map<string, { cantidad: number; ultimoIntento: number }>();
const MAX_INTENTOS = 5;
const TIEMPO_BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos

export async function POST(request: Request) {
  try {
    // Obtener IP para el Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'ip-desconocida';
    const intento = intentosFallidos.get(ip) || { cantidad: 0, ultimoIntento: Date.now() };

    // Verificar si la IP está bloqueada
    if (intento.cantidad >= MAX_INTENTOS) {
      if (Date.now() - intento.ultimoIntento < TIEMPO_BLOQUEO_MS) {
        return NextResponse.json(
          { error: 'Demasiados intentos fallidos. Tu IP fue bloqueada por 15 minutos por seguridad.' },
          { status: 429 }
        )
      } else {
        // Expiró el bloqueo
        intentosFallidos.delete(ip);
      }
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
      // Registrar intento fallido
      intentosFallidos.set(ip, {
        cantidad: (intentosFallidos.get(ip)?.cantidad || 0) + 1,
        ultimoIntento: Date.now()
      });

      // Delay sintético progresivo
      const penalizacion = Math.min((intentosFallidos.get(ip)?.cantidad || 1) * 500, 3000);
      await new Promise((r) => setTimeout(r, penalizacion))
      
      return NextResponse.json(
        { error: `Usuario o contraseña incorrectos. (Intento ${(intentosFallidos.get(ip)?.cantidad || 1)} de ${MAX_INTENTOS})` },
        { status: 401 }
      )
    }

    // Si el login es exitoso, resetear contador de la IP
    intentosFallidos.delete(ip);

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
