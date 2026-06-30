import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { hashearClaveCliente } from '@/lib/auth-cliente-server'

// ── GET: Obtener lista completa de clientes con cuentas ─────────────────────
export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, puntos_actuales, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[API Admin Clientes] Error GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── POST: Crear cliente o modificar contraseña / datos ──────────────────────
export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { accion } = body

    const supabase = obtenerSupabaseAdmin()

    if (accion === 'crear') {
      const { nombre, telefono, clave, puntos } = body
      if (!nombre || !telefono || !clave) {
        return NextResponse.json({ error: 'Nombre, teléfono y contraseña son obligatorios' }, { status: 400 })
      }

      const telLimpio = telefono.replace(/\D/g, '')
      if (telLimpio.length < 8) {
        return NextResponse.json({ error: 'El número de teléfono no es válido' }, { status: 400 })
      }

      // Verificar unicidad
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', telLimpio)
        .maybeSingle()

      if (existente) {
        return NextResponse.json({ error: 'Ya existe un cliente con ese teléfono' }, { status: 409 })
      }

      const claveHash = await hashearClaveCliente(clave)
      
      const dummyEmail = `${telLimpio}_${randomUUID().slice(0, 8)}@clientes.chefsy.internal`
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: dummyEmail,
        password: randomUUID(),
        email_confirm: true,
      })

      const nuevoId = authUser?.user?.id || randomUUID()

      const { error: insertErr } = await supabase
        .from('clientes')
        .upsert({
          id: nuevoId,
          nombre: nombre.trim(),
          telefono: telLimpio,
          clave_hash: claveHash,
          puntos_actuales: Number(puntos) || 0,
        })

      if (insertErr) throw insertErr
      return NextResponse.json({ ok: true })
    }

    if (accion === 'cambiar_clave') {
      const { id, nuevaClave } = body
      if (!id || !nuevaClave || nuevaClave.length < 6) {
        return NextResponse.json({ error: 'Contraseña no válida (mínimo 6 caracteres)' }, { status: 400 })
      }

      const claveHash = await hashearClaveCliente(nuevaClave)
      const { error: updateErr } = await supabase
        .from('clientes')
        .update({ clave_hash: claveHash })
        .eq('id', id)

      if (updateErr) throw updateErr
      return NextResponse.json({ ok: true })
    }

    if (accion === 'editar') {
      const { id, nombre, telefono, puntos } = body
      if (!id || !nombre || !telefono) {
        return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
      }

      const telLimpio = telefono.replace(/\D/g, '')

      // Verificar si el teléfono ya lo usa otro cliente
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', telLimpio)
        .neq('id', id)
        .maybeSingle()

      if (existente) {
        return NextResponse.json({ error: 'Ese número de teléfono ya está en uso por otro cliente' }, { status: 409 })
      }

      const { error: updateErr } = await supabase
        .from('clientes')
        .update({
          nombre: nombre.trim(),
          telefono: telLimpio,
          puntos_actuales: Number(puntos) || 0,
        })
        .eq('id', id)

      if (updateErr) throw updateErr
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error: any) {
    console.error('[API Admin Clientes] Error POST:', error)
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 })
  }
}

// ── DELETE: Eliminar un cliente ─────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API Admin Clientes] Error DELETE:', error)
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 })
  }
}
