// app/api/clientes/login/route.ts
// Login de clientes con teléfono y contraseña.
// Seguridad: bcrypt compare, rate limiting por IP no bloqueante.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import {
  compararClaveCliente,
  firmarTokenCliente,
  configurarCookieCliente,
} from '@/lib/auth-cliente-server'
import { obtenerIpCliente, verificarRateLimit, resetearRateLimit } from '@/lib/rate-limit'

const MAX_INTENTOS = 5
const VENTANA_BLOQUEO_SEG = 15 * 60 // 15 minutos

export async function POST(request: Request) {
  try {
    const ip = obtenerIpCliente(request)
    const rateCheck = verificarRateLimit(`login-cliente:${ip}`, MAX_INTENTOS, VENTANA_BLOQUEO_SEG)

    // ── Rate Limiting (No bloqueante, sin worker starvation) ─────────────────
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

    if (error || !cliente || !cliente.clave_hash) {
      return NextResponse.json(
        { error: `Teléfono o contraseña incorrectos. (Intentos restantes: ${rateCheck.restante})` },
        { status: 401 }
      )
    }

    // ── Comparar contraseña ─────────────────────────────────────────────────
    const coincide = await compararClaveCliente(clave, cliente.clave_hash)
    if (!coincide) {
      return NextResponse.json(
        { error: `Teléfono o contraseña incorrectos. (Intentos restantes: ${rateCheck.restante})` },
        { status: 401 }
      )
    }

    // ── Éxito: resetear contador de rate limit, firmar JWT, devolver cookie ──
    resetearRateLimit(`login-cliente:${ip}`)

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
