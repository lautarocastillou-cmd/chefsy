import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

// Este token debe coincidir con el que envíe la app de Expo
const EXPO_SECRET_TOKEN = 'chefsy_expo_secure_track_99XQ'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${EXPO_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { cadeteId, lat, lng, accuracy, heading, speed } = body

    if (!cadeteId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Actualizamos usando supabaseAdmin para bypassear cualquier política RLS
    const adminClient = obtenerSupabaseAdmin()


    await adminClient
      .from('cadetes')
      .update({
        lat,
        lng,
        accuracy: accuracy || null,
        heading: heading || null,
        speed: speed || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', cadeteId)

    // Actualizamos también cadete_coordenadas en los pedidos activos de este cadete para que el mapa en vivo de Chefsy los muestre al instante
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
