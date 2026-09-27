import { NextResponse } from 'next/server'
import { obtenerDeCache, guardarEnCache } from '@/lib/cache-servidor'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const CACHE_KEY_APK = 'cadeteria_apk_disponible'
const FALLBACK_GITHUB_URL = 'https://github.com/lautarocastillou-cmd/flutter-chefsy-app/releases/latest/download/app-release.apk'

// GET /api/cadeteria/descargar-apk
// Redirecciona directamente a la última APK con verificación cacheada en memoria (0 llamadas a Supabase tras primer hit)
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const apkPublicUrl = supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/cadeteria/app-release.apk`
      : FALLBACK_GITHUB_URL

    const enCache = obtenerDeCache<boolean>(CACHE_KEY_APK)
    if (enCache === true) {
      return NextResponse.redirect(apkPublicUrl, {
        status: 307,
        headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' }
      })
    }

    const supabase = obtenerSupabaseAdmin()
    const { data: archivos } = await supabase.storage.from('cadeteria').list('', { limit: 1, search: 'app-release.apk' })
    const existe = Boolean(archivos?.some(f => f.name === 'app-release.apk'))

    guardarEnCache(CACHE_KEY_APK, existe, 600) // 10 minutos de caché en memoria

    if (existe) {
      return NextResponse.redirect(apkPublicUrl, {
        status: 307,
        headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' }
      })
    }

    return NextResponse.redirect(FALLBACK_GITHUB_URL, { status: 307 })
  } catch (error) {
    console.error('[API Descargar APK] Error:', error)
    return NextResponse.redirect(FALLBACK_GITHUB_URL, { status: 307 })
  }
}
