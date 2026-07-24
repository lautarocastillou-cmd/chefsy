import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/cadeteria/descargar-apk
// Redirecciona directamente a la última APK en los servidores públicos de Chefsy (Supabase Storage)
export async function GET(request: Request) {
  const fallbackGithubUrl = 'https://github.com/lautarocastillou-cmd/flutter-chefsy-app/releases/latest/download/app-release.apk'

  try {
    const supabase = obtenerSupabaseAdmin()

    // 1. Verificar/Crear el bucket 'cadeteria' público si no existe
    const { data: buckets } = await supabase.storage.listBuckets()
    const existeBucket = buckets?.some(b => b.name === 'cadeteria')

    if (!existeBucket) {
      await supabase.storage.createBucket('cadeteria', {
        public: true,
        fileSizeLimit: 104857600 // 100MB
      })
    }

    // 2. Verificar si el archivo app-release.apk ya fue subido a Supabase Storage
    const { data: archivos } = await supabase.storage.from('cadeteria').list()
    const existeApk = archivos?.some(f => f.name === 'app-release.apk')

    if (existeApk) {
      const { data: urlData } = supabase.storage.from('cadeteria').getPublicUrl('app-release.apk')
      if (urlData?.publicUrl) {
        return NextResponse.redirect(urlData.publicUrl, { status: 307 })
      }
    }

    // Si aún no se ha subido la APK a Supabase Storage (esperando primer build de GitHub Actions), usar GitHub Release
    return NextResponse.redirect(fallbackGithubUrl, { status: 307 })
  } catch (error) {
    console.error('[API Descargar APK] Error:', error)
    return NextResponse.redirect(fallbackGithubUrl, { status: 307 })
  }
}
