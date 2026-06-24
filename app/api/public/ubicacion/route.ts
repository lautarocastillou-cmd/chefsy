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


    const { error } = await adminClient
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

    if (error) {
      console.error('Error actualizando ubicación en DB:', error)
      return NextResponse.json({ error: 'Error interno en BD' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error procesando ubicación:', err)
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }
}
