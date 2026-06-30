// app/api/clientes/login/route.ts
// Login de clientes con teléfono y contraseña.
// Seguridad: bcrypt compare, rate limiting por IP, delay progresivo.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import {
  compararClaveCliente,
  firmarTokenCliente,
  configurarCookieCliente,
} from '@/lib/auth-cliente-server'

// Rate limiting en memoria (reinicia con cada deploy — suficiente para producción serverless)
const intentosFallidos = new Map<string, { cantidad: number; ultimoIntento: number }>()
const MAX_INTENTOS      = 5
const BLOQUEO_MS        = 15 * 60 * 1000 // 15 minutos

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'ip-desconocida'

    // ── Rate Limiting ───────────────────────────────────────────────────────
    const intento = intentosFallidos.get(ip) || { cantidad: 0, ultimoIntento: Date.now() }
    if (intento.cantidad >= MAX_INTENTOS) {
      if (Date.now() - intento.ultimoIntento < BLOQUEO_MS) {
        return NextResponse.json(
          { error: 'Demasiados intentos fallidos. IP bloqueada por 15 minutos.' },
          { status: 429 }
        )
      }
      intentosFallidos.delete(ip)
    }

    const body = await request.json()
    const { telefono, clave } = body

    if (!telefono || !clave) {
      return NextResponse.json({ error: 'Teléfono y contraseña son obligatorios.' }, { status: 400 })
    }

    const telLimpio = telefono.replace(/\D/g, '')

    // ── Buscar cliente en BD ────────────────────────────────────────────────
    const supabase = obtenerSupabaseAdmin()
    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, clave_hash, puntos_actuales')
      .eq('telefono', telLimpio)
      .maybeSingle()

    // ── Helper para registrar fallo ─────────────────────────────────────────
    const registrarFallo = async () => {
      const actual = intentosFallidos.get(ip) || { cantidad: 0, ultimoIntento: Date.now() }
      const nuevaCant = actual.cantidad + 1
      intentosFallidos.set(ip, { cantidad: nuevaCant, ultimoIntento: Date.now() })
      // Delay progresivo anti-bruteforce
      const penalizacion = Math.min(nuevaCant * 400, 3000)
      await new Promise((r) => setTimeout(r, penalizacion))
      return nuevaCant
    }

    if (error || !cliente || !cliente.clave_hash) {
      const cant = await registrarFallo()
      return NextResponse.json(
        { error: `Teléfono o contraseña incorrectos. (Intento ${cant} de ${MAX_INTENTOS})` },
        { status: 401 }
      )
    }

    // ── Comparar contraseña ─────────────────────────────────────────────────
    const coincide = await compararClaveCliente(clave, cliente.clave_hash)
    if (!coincide) {
      const cant = await registrarFallo()
      return NextResponse.json(
        { error: `Teléfono o contraseña incorrectos. (Intento ${cant} de ${MAX_INTENTOS})` },
        { status: 401 }
      )
    }

    // ── Éxito: resetear contador, firmar JWT, devolver cookie ───────────────
    intentosFallidos.delete(ip)

    const token = await firmarTokenCliente({
      clienteId: cliente.id,
      nombre:    cliente.nombre,
      telefono:  cliente.telefono,
    })

    const cookieStore = await cookies()
    cookieStore.set(configurarCookieCliente(token) as any)

    return NextResponse.json({
      ok:     true,
      perfil: {
        id:              cliente.id,
        nombre:          cliente.nombre,
        telefono:        cliente.telefono,
        puntos_actuales: cliente.puntos_actuales,
      },
    })
  } catch (err) {
    console.error('[ClienteLogin] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
