import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// POST /api/cadeteria/subir-apk
// Recibe el archivo APK desde GitHub Actions y lo sube al almacenamiento público de Supabase
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const tokenSecreto = process.env.FLUTTER_SECRET_TOKEN || 'chefsy-flutter-secret-2026'

    if (authHeader !== `Bearer ${tokenSecreto}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const supabase = obtenerSupabaseAdmin()

    // 1. Verificar si existe el bucket 'cadeteria' (si no, crearlo como público)
    const { data: buckets } = await supabase.storage.listBuckets()
    const existeBucket = buckets?.some(b => b.name === 'cadeteria')

    if (!existeBucket) {
      await supabase.storage.createBucket('cadeteria', {
        public: true,
        fileSizeLimit: 104857600 // 100MB
      })
    }

    // 2. Subir/reemplazar el archivo app-release.apk
    const { error: uploadError } = await supabase.storage
      .from('cadeteria')
      .upload('app-release.apk', buffer, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true
      })

    if (uploadError) {
      console.error('[API Subir APK] Error en Supabase Storage:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('cadeteria').getPublicUrl('app-release.apk')

    return NextResponse.json({
      ok: true,
      mensaje: 'APK subida con éxito a los servidores públicos de Chefsy',
      publicUrl: urlData.publicUrl
    })
  } catch (error: any) {
    console.error('[API Subir APK] Error interno:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
