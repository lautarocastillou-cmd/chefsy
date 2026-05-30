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

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

// ── Cliente Supabase de Solo Servidor ──────────────────────────────────────
function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variables de entorno Supabase no configuradas para Admin')
  return createClient(url, key, { auth: { persistSession: false } })
}

// ── Derivar la clave secreta de la variable de entorno ─────────────────────
function obtenerClave(): Uint8Array {
  const secreto = process.env.CHEFSY_JWT_SECRET
  if (!secreto) {
    throw new Error('[Auth] CHEFSY_JWT_SECRET no está definida en .env.local')
  }
  return new TextEncoder().encode(secreto)
}

// ── Utilidad para hashear contraseñas ──────────────────────────────────────
export function hashearClave(claveLimpia: string): string {
  return createHash('sha256').update(claveLimpia).digest('hex')
}

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface PayloadSesion extends JWTPayload {
  usuario: string
  nombre:  string
  rol:     'admin' | 'cadete'
}

// ── Validar credenciales y retornar datos del usuario ──────────────────────
export async function validarCredenciales(
  usuario: string,
  clave: string
): Promise<{ usuario: string; nombre: string; rol: 'admin' | 'cadete' } | null> {
  const uLimpio = usuario.trim().toLowerCase()
  const hashIntento = hashearClave(clave)
  
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data: usuarioBd, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('usuario', uLimpio)
      .single()

    if (error || !usuarioBd) return null

    // Verificar si la clave cifrada coincide
    if (usuarioBd.clave_hash === hashIntento) {
      return { 
        usuario: usuarioBd.usuario, 
        nombre: usuarioBd.nombre, 
        rol: usuarioBd.rol as 'admin' | 'cadete' 
      }
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
  const cookieStore = await cookies()
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
