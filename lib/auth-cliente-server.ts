// ─────────────────────────────────────────────────────
// lib/auth-cliente-server.ts
// Autenticación propia para clientes de la tienda.
// Solo se importa desde Route Handlers — NUNCA desde 'use client'.
// ─────────────────────────────────────────────────────

import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

// ── Constantes ─────────────────────────────────────────────────────────────
const NOMBRE_COOKIE      = 'chefsy-cliente-token'
const DURACION_HORAS     = 720   // 30 días
const BCRYPT_COST        = 12    // ~250ms — buen balance seguridad/UX

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface PerfilClienteDB {
  id:              string
  nombre:          string
  telefono:        string
  puntos_actuales: number
}

export interface PayloadCliente extends JWTPayload {
  clienteId: string
  nombre:    string
  telefono:  string
}

// ── Clave JWT ──────────────────────────────────────────────────────────────
function obtenerClave(): Uint8Array {
  const secreto = process.env.CHEFSY_JWT_SECRET
  if (!secreto) throw new Error('[ClienteAuth] CHEFSY_JWT_SECRET no definida')
  return new TextEncoder().encode(secreto + ':clientes') // namespace separado del admin
}

// ── Hash bcrypt ────────────────────────────────────────────────────────────
export async function hashearClaveCliente(clave: string): Promise<string> {
  return bcrypt.hash(clave, BCRYPT_COST)
}

export async function compararClaveCliente(clave: string, hash: string): Promise<boolean> {
  return bcrypt.compare(clave, hash)
}

// ── Firmar JWT ─────────────────────────────────────────────────────────────
export async function firmarTokenCliente(payload: {
  clienteId: string
  nombre:    string
  telefono:  string
}): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000)
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(ahora)
    .setExpirationTime(`${DURACION_HORAS}h`)
    .sign(obtenerClave())
}

// ── Verificar JWT ──────────────────────────────────────────────────────────
export async function verificarTokenCliente(token: string): Promise<PayloadCliente | null> {
  try {
    const { payload } = await jwtVerify(token, obtenerClave())
    return payload as PayloadCliente
  } catch {
    return null
  }
}

// ── Leer sesión desde cookie ───────────────────────────────────────────────
export async function obtenerSesionCliente(): Promise<PayloadCliente | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(NOMBRE_COOKIE)?.value
  if (!token) return null
  return verificarTokenCliente(token)
}

// ── Configurar cookie segura ───────────────────────────────────────────────
export function configurarCookieCliente(token: string): object {
  return {
    name:     NOMBRE_COOKIE,
    value:    token,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
    maxAge:   DURACION_HORAS * 3600,
  }
}

export function limpiarCookieCliente(): object {
  return {
    name:     NOMBRE_COOKIE,
    value:    '',
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
    maxAge:   0,
  }
}

export const NOMBRE_COOKIE_CLIENTE = NOMBRE_COOKIE

// ── Buscar cliente por teléfono (solo servidor) ────────────────────────────
export async function buscarClientePorTelefono(telefono: string): Promise<PerfilClienteDB & { clave_hash?: string } | null> {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('telefono', telefono)
      .maybeSingle()
    if (error || !data) return null
    return data
  } catch {
    return null
  }
}
