// app/api/clientes/registro/route.ts
// Registro de nuevo cliente con nombre, teléfono y contraseña.
// Seguridad: bcrypt, validación estricta, unicidad de teléfono.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import {
  hashearClaveCliente,
  firmarTokenCliente,
  configurarCookieCliente,
} from '@/lib/auth-cliente-server'

const MIN_CLAVE = 8

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, telefono, clave } = body

    // ── Validaciones básicas ────────────────────────────────────────────────
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres.' }, { status: 400 })
    }
    if (!telefono || typeof telefono !== 'string') {
      return NextResponse.json({ error: 'El teléfono es obligatorio.' }, { status: 400 })
    }
    // Solo dígitos, largo entre 8 y 15
    const telLimpio = telefono.replace(/\D/g, '')
    if (telLimpio.length < 8 || telLimpio.length > 15) {
      return NextResponse.json({ error: 'Ingresá un número de teléfono válido (8-15 dígitos).' }, { status: 400 })
    }
    if (!clave || typeof clave !== 'string' || clave.length < MIN_CLAVE) {
      return NextResponse.json({ error: `La contraseña debe tener al menos ${MIN_CLAVE} caracteres.` }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()

    // ── Verificar unicidad del teléfono ────────────────────────────────────
    const { data: existente } = await supabase
      .from('clientes')
      .select('id')
      .eq('telefono', telLimpio)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese número de teléfono.' }, { status: 409 })
    }

    // ── Hash de la contraseña ──────────────────────────────────────────────
    const claveHash = await hashearClaveCliente(clave)

    // ── Crear registro en auth.users para satisfacer la foreign key clientes_id_fkey ──
    const dummyEmail = `${telLimpio}_${randomUUID().slice(0, 8)}@clientes.chefsy.internal`
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: dummyEmail,
      password: randomUUID(),
      email_confirm: true,
    })

    const nuevoId = authUser?.user?.id || randomUUID()

    const { data: nuevoCliente, error: insertError } = await supabase
      .from('clientes')
      .upsert({
        id: nuevoId,
        nombre: nombre.trim(),
        telefono: telLimpio,
        clave_hash: claveHash,
        puntos_actuales: 0,
      })
      .select('id, nombre, telefono, puntos_actuales')
      .single()

    if (insertError || !nuevoCliente) {
      console.error('[Registro] Error insertando cliente:', insertError)
      return NextResponse.json({ error: 'Error al crear la cuenta. Intentá de nuevo.' }, { status: 500 })
    }

    // ── Firmar JWT y devolver cookie ───────────────────────────────────────
    const token = await firmarTokenCliente({
      clienteId: nuevoCliente.id,
      nombre:    nuevoCliente.nombre,
      telefono:  nuevoCliente.telefono,
    })

    const cookieStore = await cookies()
    cookieStore.set(configurarCookieCliente(token) as any)

    return NextResponse.json({
      ok:     true,
      perfil: {
        id:              nuevoCliente.id,
        nombre:          nuevoCliente.nombre,
        telefono:        nuevoCliente.telefono,
        puntos_actuales: nuevoCliente.puntos_actuales,
      },
    })
  } catch (err) {
    console.error('[Registro] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
