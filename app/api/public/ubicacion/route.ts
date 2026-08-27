import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

const EXPO_SECRET_TOKEN = 'chefsy_expo_secure_track_99XQ'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${EXPO_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { cadeteId, lat, lng, accuracy, heading, speed, gps_activo, batteryLevel } = body || {}
    const idNormalizado = String(cadeteId || '').trim().toLowerCase()
    if (!idNormalizado) {
      return NextResponse.json({ error: 'cadeteId inválido' }, { status: 400 })
    }

    const adminClient = obtenerSupabaseAdmin()

    // Si el cadete mandó gps_activo=false, solo actualizamos el estado GPS sin tocar coordenadas
    if (gps_activo === false) {
      await adminClient
        .from('cadetes')
        .update({
          gps_activo: false,
          ...(batteryLevel !== undefined && batteryLevel !== null ? { bateria: Math.round(Number(batteryLevel)) } : {}),
          updated_at: new Date().toISOString()
        })
        .ilike('id', idNormalizado)

      return NextResponse.json({ success: true })
    }

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Coordenadas incompletas' }, { status: 400 })
    }

    // 1. Verificar si ya existe en tabla cadetes
    const { data: cadeteExistente } = await adminClient
      .from('cadetes')
      .select('id')
      .ilike('id', idNormalizado)
      .maybeSingle()

    const camposActualizar: any = {
      lat: Number(lat),
      lng: Number(lng),
      accuracy: accuracy !== undefined && accuracy !== null ? Number(accuracy) : null,
      heading: heading !== undefined && heading !== null ? Number(heading) : null,
      speed: speed !== undefined && speed !== null ? Number(speed) : null,
      gps_activo: true,
      updated_at: new Date().toISOString()
    }

    if (batteryLevel !== undefined && batteryLevel !== null) {
      camposActualizar.bateria = Math.round(Number(batteryLevel))
    }

    if (cadeteExistente) {
      const { error: updateError } = await adminClient
        .from('cadetes')
        .update(camposActualizar)
        .eq('id', cadeteExistente.id)
      
      if (updateError) {
        console.error('[API Ubicacion] Error actualizando cadete:', updateError)
      }
    } else {
      const { error: insertError } = await adminClient
        .from('cadetes')
        .insert({
          id: idNormalizado,
          nombre: idNormalizado,
          activo: true,
          ...camposActualizar
        })
      
      if (insertError) {
        console.error('[API Ubicacion] Error insertando cadete:', insertError)
      }
    }

    // 2. Actualizar coordenadas en los pedidos activos del cadete
    const coords = { latitud: Number(lat), longitud: Number(lng) }
    await adminClient
      .from('pedidos')
      .update({ cadete_coordenadas: coords })
      .ilike('cadete_id', idNormalizado)
      .in('estado', ['en_cocina', 'listo', 'en_camino'])
      .eq('archivado', false)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error procesando ubicación:', err)
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }
}
