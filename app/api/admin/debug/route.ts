import { NextResponse } from 'next/server'
import { obtenerConfiguracionTienda } from '@/servicios/supabase/configuracion'

export async function GET() {
  try {
    const config = await obtenerConfiguracionTienda()
    return NextResponse.json(config)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
