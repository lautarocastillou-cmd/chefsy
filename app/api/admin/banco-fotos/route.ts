import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Listar fotos del bucket images
    const { data: files, error } = await supabaseAdmin.storage
      .from('images')
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error) {
      console.warn('[BancoFotos API] Error listando bucket:', error)
      return NextResponse.json({ fotos: [] })
    }

    const fotos = (files || [])
      .filter(f => f.name && !f.name.startsWith('.'))
      .map(f => {
        const { data } = supabaseAdmin.storage.from('images').getPublicUrl(f.name)
        return {
          nombre: f.name,
          url: data.publicUrl,
          createdAt: f.created_at,
          tamano: f.metadata?.size,
        }
      })

    return NextResponse.json({ fotos })
  } catch (err: any) {
    console.error('[BancoFotos API] Error:', err)
    return NextResponse.json({ fotos: [] })
  }
}
