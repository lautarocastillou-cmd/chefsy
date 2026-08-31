import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerFechaNegocio, detectarTipoTurnoActual } from '@/lib/tiempo'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha') || obtenerFechaNegocio()
    const turno_tipo = searchParams.get('turno_tipo')

    const supabase = obtenerSupabaseAdmin()
    let query = supabase
      .from('cadetes_pagos_extras')
      .select('*')
      .eq('fecha', fecha)
      .order('created_at', { ascending: false })

    if (turno_tipo && turno_tipo !== 'todos') {
      query = query.eq('turno_tipo', turno_tipo)
    }

    const { data, error } = await query

    if (error) {
      console.error('[API Pagos Extras Cadetes GET] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('[API Pagos Extras Cadetes GET]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      cadete_id,
      cadete_nombre,
      monto,
      motivo,
      fecha,
      turno_tipo,
      creado_por
    } = body || {}

    if (!cadete_id || !motivo || !monto || Number(monto) <= 0) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Cadete, motivo y monto positivo son obligatorios.' },
        { status: 400 }
      )
    }

    const supabase = obtenerSupabaseAdmin()
    const fechaEfectiva = fecha || obtenerFechaNegocio()
    const turnoEfectivo = turno_tipo || detectarTipoTurnoActual()
    const nombreEfectivo = String(cadete_nombre || cadete_id).trim()

    const { data, error } = await supabase
      .from('cadetes_pagos_extras')
      .insert({
        cadete_id: String(cadete_id).trim().toLowerCase(),
        cadete_nombre: nombreEfectivo,
        monto: Number(monto),
        motivo: String(motivo).trim(),
        fecha: fechaEfectiva,
        turno_tipo: turnoEfectivo,
        creado_por: creado_por || 'Admin'
      })
      .select()
      .single()

    if (error) {
      console.error('[API Pagos Extras Cadetes POST] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API Pagos Extras Cadetes POST]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de pago extra requerido' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    const { error } = await supabase
      .from('cadetes_pagos_extras')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[API Pagos Extras Cadetes DELETE] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id })
  } catch (err: any) {
    console.error('[API Pagos Extras Cadetes DELETE]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
