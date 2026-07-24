import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/cadeteria/descargar-apk
// Redirecciona directamente a la última APK en los servidores públicos de Chefsy (Supabase Storage)
export async function GET(request: Request) {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data: urlData } = supabase.storage.from('cadeteria').getPublicUrl('app-release.apk')

    if (urlData?.publicUrl) {
      return NextResponse.redirect(urlData.publicUrl, { status: 307 })
    }

    const fallbackUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vuhubnblmsedpxedwepc.supabase.co'}/storage/v1/object/public/cadeteria/app-release.apk`
    return NextResponse.redirect(fallbackUrl, { status: 307 })
  } catch (error) {
    const fallbackUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vuhubnblmsedpxedwepc.supabase.co'}/storage/v1/object/public/cadeteria/app-release.apk`
    return NextResponse.redirect(fallbackUrl, { status: 307 })
  }
}
