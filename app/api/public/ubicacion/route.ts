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
    const { cadeteId, lat, lng, accuracy, heading, speed, gps_activo, batteryLevel } = body

    const adminClient = obtenerSupabaseAdmin()

    // Si el cadete mandó gps_activo=false, solo actualizamos el estado GPS sin tocar coordenadas
    if (gps_activo === false) {
      await adminClient
        .from('cadetes')
        .update({
          gps_activo: false,
          ...(batteryLevel !== undefined && { bateria: batteryLevel }),
          updated_at: new Date().toISOString()
        })
        .eq('id', cadeteId)

      return NextResponse.json({ success: true })
    }

    if (!cadeteId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Actualizar coordenadas y marcar GPS como activo
    await adminClient
      .from('cadetes')
      .update({
        lat,
        lng,
        accuracy: accuracy || null,
        heading: heading || null,
        speed: speed || null,
        gps_activo: true,
        ...(batteryLevel !== undefined && { bateria: batteryLevel }),
        updated_at: new Date().toISOString()
      })
      .eq('id', cadeteId)

    // Actualizar coordenadas en los pedidos activos del cadete
    const coords = { latitud: lat, longitud: lng }
    await adminClient
      .from('pedidos')
      .update({ cadete_coordenadas: coords })
      .eq('cadete_id', cadeteId)
      .in('estado', ['en_cocina', 'listo', 'en_camino'])
      .eq('archivado', false)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error procesando ubicación:', err)
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }
}
