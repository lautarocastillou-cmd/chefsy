import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/cadeteria/descargar-apk
// Redirecciona directamente a la última APK compilada por GitHub Actions en GitHub Releases
export async function GET(request: Request) {
  try {
    const urlPublica = 'https://github.com/lautarocastillou-cmd/flutter-chefsy-app/releases/latest/download/app-release.apk'
    
    const { searchParams } = new URL(request.url)
    if (searchParams.get('json') === 'true') {
      try {
        const resGh = await fetch('https://api.github.com/repos/lautarocastillou-cmd/flutter-chefsy-app/releases/latest', {
          headers: { 'Accept': 'application/vnd.github.v3+json' },
          next: { revalidate: 60 }
        })
        if (resGh.ok) {
          const data = await resGh.json()
          return NextResponse.json({
            ok: true,
            tag_name: data.tag_name || 'latest',
            name: data.name || 'Chefsy Cadete App',
            published_at: data.published_at,
            download_url: data.assets?.[0]?.browser_download_url || urlPublica
          })
        }
      } catch (e) {}

      return NextResponse.json({
        ok: true,
        tag_name: 'latest',
        download_url: urlPublica
      })
    }

    return NextResponse.redirect(urlPublica, { status: 307 })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener la APK' }, { status: 500 })
  }
}
