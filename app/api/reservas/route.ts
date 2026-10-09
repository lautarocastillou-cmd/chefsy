import { NextResponse } from 'next/server'
import { autorizarReservas, corsHeaders } from '@/lib/reservas-auth'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

const TABLE = 'reservas_malu'
const CANALES = ['Local', 'WhatsApp', 'Instagram', 'Empretienda', 'TikTok']
const ESTADOS = ['active', 'collected', 'cancelled']

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

function fail(message: string, status: number, headers: Headers) {
  return NextResponse.json({ error: message }, { status, headers })
}

function activityValue(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 50).filter((entry) => entry && typeof entry === 'object' && typeof (entry as { label?: unknown }).label === 'string').map((entry) => {
    const item = entry as { type?: unknown; label: string; at?: unknown }
    return { type: typeof item.type === 'string' ? item.type.slice(0, 40) : 'update', label: item.label.slice(0, 120), at: typeof item.at === 'string' ? item.at : new Date().toISOString() }
  })
}

export async function GET(request: Request) {
  const headers = corsHeaders(request.headers.get('origin'))
  if (!await autorizarReservas(request)) return fail('Sesión vencida. Volvé a ingresar el PIN.', 401, headers)
  try {
    const { data, error } = await obtenerSupabaseAdmin().from(TABLE).select('*').order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ reservations: data ?? [] }, { headers })
  } catch (error) {
    console.error('[Reservas] Error leyendo reservas:', error)
    return fail('No se pudieron cargar las reservas.', 500, headers)
  }
}

export async function POST(request: Request) {
  const headers = corsHeaders(request.headers.get('origin'))
  if (!await autorizarReservas(request)) return fail('Sesión vencida. Volvé a ingresar el PIN.', 401, headers)
  try {
    const body = await request.json()
    const nombre = typeof body.name === 'string' ? body.name.trim() : ''
    const productos = typeof body.items === 'string' ? body.items.trim() : ''
    const canal = CANALES.includes(body.channel) ? body.channel : 'Local'
    const recordatorio = body.reminderAt ? new Date(body.reminderAt) : null
    if (!nombre || nombre.length > 80 || !productos || productos.length > 500) return fail('Revisá el nombre y los productos.', 400, headers)
    if (body.reminderAt && (!recordatorio || Number.isNaN(recordatorio.getTime()))) return fail('La fecha del recordatorio no es válida.', 400, headers)
    const row = {
      nombre, productos, canal,
      telefono: typeof body.phone === 'string' ? body.phone.trim().slice(0, 60) : '',
      notas: typeof body.notes === 'string' ? body.notes.trim().slice(0, 300) : '',
      recordatorio_at: recordatorio?.toISOString() ?? null,
      estado: ESTADOS.includes(body.status) ? body.status : 'active',
      notificado_at: null,
      actividad: activityValue(body.activity),
      updated_at: new Date().toISOString(),
    }
    const payload: Record<string, unknown> = body.id ? { ...row, id: body.id } : row
    const query = obtenerSupabaseAdmin().from(TABLE).upsert(payload, { onConflict: 'id' })
    const { data, error } = await query.select('*').single()
    if (error) throw error
    return NextResponse.json({ reservation: data }, { status: 201, headers })
  } catch (error) {
    console.error('[Reservas] Error creando reserva:', error)
    return fail('No se pudo guardar la reserva.', 500, headers)
  }
}

export async function PATCH(request: Request) {
  const headers = corsHeaders(request.headers.get('origin'))
  if (!await autorizarReservas(request)) return fail('Sesión vencida. Volvé a ingresar el PIN.', 401, headers)
  try {
    const body = await request.json()
    if (typeof body.id !== 'string') return fail('Falta el identificador de reserva.', 400, headers)
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80) return fail('El nombre no es válido.', 400, headers)
      update.nombre = body.name.trim()
    }
    if (body.items !== undefined) {
      if (typeof body.items !== 'string' || !body.items.trim() || body.items.trim().length > 500) return fail('Los productos no son válidos.', 400, headers)
      update.productos = body.items.trim()
    }
    if (body.channel !== undefined) {
      if (!CANALES.includes(body.channel)) return fail('El canal no es válido.', 400, headers)
      update.canal = body.channel
    }
    if (body.phone !== undefined) update.telefono = String(body.phone).trim().slice(0, 60)
    if (body.notes !== undefined) update.notas = String(body.notes).trim().slice(0, 300)
    if (body.activity !== undefined) update.actividad = activityValue(body.activity)
    if (body.reminderAt !== undefined) {
      const date = body.reminderAt ? new Date(body.reminderAt) : null
      if (body.reminderAt && (!date || Number.isNaN(date.getTime()))) return fail('La fecha del recordatorio no es válida.', 400, headers)
      update.recordatorio_at = date?.toISOString() ?? null
      update.notificado_at = null
    }
    if (body.status !== undefined) {
      if (!ESTADOS.includes(body.status)) return fail('El estado no es válido.', 400, headers)
      update.estado = body.status
      update.finalizado_at = body.status === 'active' ? null : new Date().toISOString()
    }
    const { data, error } = await obtenerSupabaseAdmin().from(TABLE).update(update).eq('id', body.id).select('*').single()
    if (error) throw error
    return NextResponse.json({ reservation: data }, { headers })
  } catch (error) {
    console.error('[Reservas] Error actualizando reserva:', error)
    return fail('No se pudo actualizar la reserva.', 500, headers)
  }
}

export async function DELETE(request: Request) {
  const headers = corsHeaders(request.headers.get('origin'))
  if (!await autorizarReservas(request)) return fail('Sesión vencida. Volvé a ingresar el PIN.', 401, headers)
  try {
    const body = await request.json()
    if (typeof body.id !== 'string') return fail('Falta el identificador de reserva.', 400, headers)
    const { error } = await obtenerSupabaseAdmin().from(TABLE).delete().eq('id', body.id)
    if (error) throw error
    return NextResponse.json({ ok: true }, { headers })
  } catch (error) {
    console.error('[Reservas] Error eliminando reserva:', error)
    return fail('No se pudo eliminar la reserva.', 500, headers)
  }
}
