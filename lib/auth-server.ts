// ─────────────────────────────────────────────────────
// lib/auth-server.ts
// Utilidades de autenticación del lado del servidor.
// Solo se importa desde Route Handlers o Server Components,
// nunca desde componentes 'use client'.
// ─────────────────────────────────────────────────────

import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { cookies } from 'next/headers'

const NOMBRE_COOKIE = 'chefsy-token'
const DURACION_SESION_HORAS = 8

// ── Usuarios autorizados — contraseñas vienen de variables de entorno ──────
// NUNCA escribir contraseñas en este archivo. Configurar en .env.local y
// en el panel de Variables de Entorno de Vercel.
function obtenerUsuariosAutorizados(): Record<
  string,
  { clave: string; nombre: string; rol: 'admin' | 'cadete' }
> {
  const claveAdmin  = process.env.CHEFSY_ADMIN_PASS
  const claveCadete = process.env.CHEFSY_CADETE_PASS

  if (!claveAdmin || !claveCadete) {
    // En desarrollo local sin .env.local configurado, fallar de forma visible
    console.error(
      '[Auth] ⚠️  CHEFSY_ADMIN_PASS o CHEFSY_CADETE_PASS no están definidas. ' +
      'Copiar .env.example a .env.local y configurar los valores.'
    )
  }

  return {
    admin:  {
      clave:  claveAdmin  ?? '',
      nombre: 'Administrador Chefsy',
      rol:    'admin',
    },
    cadete: {
      clave:  claveCadete ?? '',
      nombre: 'Delivery Cadete',
      rol:    'cadete',
    },
  }
}

// ── Derivar la clave secreta de la variable de entorno ─────────────────────
function obtenerClave(): Uint8Array {
  const secreto = process.env.CHEFSY_JWT_SECRET
  if (!secreto) {
    throw new Error('[Auth] CHEFSY_JWT_SECRET no está definida en .env.local')
  }
  return new TextEncoder().encode(secreto)
}

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface PayloadSesion extends JWTPayload {
  usuario: string
  nombre:  string
  rol:     'admin' | 'cadete'
}

// ── Validar credenciales y retornar datos del usuario ──────────────────────
export function validarCredenciales(
  usuario: string,
  clave: string
): { usuario: string; nombre: string; rol: 'admin' | 'cadete' } | null {
  const uLimpio = usuario.trim().toLowerCase()
  const usuarios = obtenerUsuariosAutorizados()
  const match = usuarios[uLimpio]
  if (match && match.clave === clave) {
    return { usuario: uLimpio, nombre: match.nombre, rol: match.rol }
  }
  return null
}

// ── Firmar y emitir un JWT firmado ─────────────────────────────────────────
export async function firmarToken(payload: {
  usuario: string
  nombre:  string
  rol:     'admin' | 'cadete'
}): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000)
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(ahora)
    .setExpirationTime(`${DURACION_SESION_HORAS}h`)
    .sign(obtenerClave())
}

// ── Verificar un JWT y retornar su payload ─────────────────────────────────
export async function verificarToken(token: string): Promise<PayloadSesion | null> {
  try {
    const { payload } = await jwtVerify(token, obtenerClave())
    return payload as PayloadSesion
  } catch {
    return null
  }
}

// ── Leer la sesión activa desde las cookies del servidor ───────────────────
export async function obtenerSesion(): Promise<PayloadSesion | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(NOMBRE_COOKIE)?.value
  if (!token) return null
  return verificarToken(token)
}

// ── Configuración de la cookie segura ─────────────────────────────────────
export function configurarCookieSesion(token: string): object {
  return {
    name:     NOMBRE_COOKIE,
    value:    token,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
    maxAge:   DURACION_SESION_HORAS * 3600,
  }
}

export const NOMBRE_COOKIE_SESION = NOMBRE_COOKIE
