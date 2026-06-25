// ─────────────────────────────────────────────────────
// lib/auth-server.ts
// Utilidades de autenticación del lado del servidor.
// Solo se importa desde Route Handlers o Server Components,
// nunca desde componentes 'use client'.
// ─────────────────────────────────────────────────────

import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

const NOMBRE_COOKIE = 'chefsy-token'
const DURACION_SESION_HORAS = 8 // 1 jornada laboral
const BCRYPT_COST = 12 // ~250ms por hash — buen balance seguridad/performance

// ── Derivar la clave secreta de la variable de entorno ─────────────────────
function obtenerClave(): Uint8Array {
  const secreto = process.env.CHEFSY_JWT_SECRET
  if (!secreto) {
    throw new Error('[Auth] CHEFSY_JWT_SECRET no está definida en .env.local')
  }
  return new TextEncoder().encode(secreto)
}

// ── Utilidad para hashear contraseñas con bcrypt ───────────────────────────
export async function hashearClave(claveLimpia: string): Promise<string> {
  return bcrypt.hash(claveLimpia, BCRYPT_COST)
}

// ── Legacy: hash SHA-256 para migración on-login ───────────────────────────
function hashearClaveLegacy(claveLimpia: string): string {
  return createHash('sha256').update(claveLimpia).digest('hex')
}

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface PayloadSesion extends JWTPayload {
  usuario: string
  nombre:  string
  rol:     'admin' | 'cadete'
}

// ── Validar credenciales y retornar datos del usuario ──────────────────────
// Soporta migración transparente: si el hash almacenado es SHA-256 legacy,
// lo valida y lo reemplaza automáticamente por bcrypt en la DB.
export async function validarCredenciales(
  usuario: string,
  clave: string
): Promise<{ usuario: string; nombre: string; rol: 'admin' | 'cadete' } | null> {
  const uLimpio = usuario.trim().toLowerCase()

  try {
    const supabase = obtenerSupabaseAdmin()
    const { data: usuarioBd, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('usuario', uLimpio)
      .single()

    if (error || !usuarioBd) return null

    const datosUsuario = {
      usuario: usuarioBd.usuario,
      nombre:  usuarioBd.nombre,
      rol:     usuarioBd.rol as 'admin' | 'cadete',
    }

    // ── 1. Intentar bcrypt (formato moderno) ──────────────────────────────
    // Los hashes bcrypt empiezan con $2a$ o $2b$
    if (usuarioBd.clave_hash.startsWith('$2')) {
      const coincide = await bcrypt.compare(clave, usuarioBd.clave_hash)
      if (coincide) return datosUsuario
      return null
    }

    // ── 2. Fallback: migración desde SHA-256 legacy ───────────────────────
    const hashLegacy = hashearClaveLegacy(clave)
    if (usuarioBd.clave_hash === hashLegacy) {
      // Contraseña correcta con hash antiguo → re-hashear con bcrypt
      const nuevoHash = await bcrypt.hash(clave, BCRYPT_COST)
      await supabase
        .from('usuarios')
        .update({ clave_hash: nuevoHash })
        .eq('usuario', uLimpio)

      console.log(`[Auth] Migración bcrypt completada para usuario: ${uLimpio}`)
      return datosUsuario
    }

    return null
  } catch (err) {
    console.error('[Auth] Error al validar credenciales en BD:', err)
    return null
  }
}



// ── Firmar y emitir un JWT firmado ─────────────────────────────────────────
export async function firmarToken(payload: {
  usuario: string
  nombre:  string
  rol:     'admin' | 'cadete'
}, duracionHoras: number = DURACION_SESION_HORAS): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000)
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(ahora)
    .setExpirationTime(`${duracionHoras}h`)
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
  const cookieStore = await cookies()
  const token = cookieStore.get(NOMBRE_COOKIE)?.value
  if (!token) return null
  return verificarToken(token)
}

// ── Configuración de la cookie segura ─────────────────────────────────────
export function configurarCookieSesion(token: string, duracionHoras: number = DURACION_SESION_HORAS): object {
  return {
    name:     NOMBRE_COOKIE,
    value:    token,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path:     '/',
    maxAge:   duracionHoras * 3600,
  }
}

export const NOMBRE_COOKIE_SESION = NOMBRE_COOKIE
