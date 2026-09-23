import { NextResponse } from 'next/server'

// Helper: Calcular ángulo de rumbo desde la cámara del auto de Google hacia el pin del cliente
function calcularRumboHacia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI
  const dLng = toRad(lon2 - lon1)
  const phi1 = toRad(lat1)
  const phi2 = toRad(lat2)
  const y = Math.sin(dLng) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng)
  const brng = toDeg(Math.atan2(y, x))
  return Math.round((brng + 360) % 360)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const latStr = searchParams.get('lat')
  const lngStr = searchParams.get('lng')
  const widthStr = searchParams.get('w') || '600'
  const heightStr = searchParams.get('h') || '350'
  const proxyImage = searchParams.get('image') === 'true'

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: 'Faltan parámetros lat y lng' }, { status: 400 })
  }

  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 })
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.MAPS_API_KEY

  const directPanoUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`

  // Si no hay API key configurada en el servidor todavía
  if (!apiKey) {
    return NextResponse.json({
      disponible: false,
      motivo: 'sin_api_key',
      mensaje: 'Falta configurar GOOGLE_MAPS_API_KEY en .env.local',
      urlDirectaPano: directPanoUrl,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      }
    })
  }

  try {
    // 1. Consultar primero Metadata API (gratuita / consumo mínimo)
    const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}&radius=80&source=outdoor`
    const metaRes = await fetch(metaUrl, { next: { revalidate: 86400 } })
    
    if (!metaRes.ok) {
      return NextResponse.json({
        disponible: false,
        motivo: 'error_metadata',
        urlDirectaPano: directPanoUrl,
      })
    }

    const metaData = await metaRes.json()

    if (metaData.status !== 'OK') {
      return NextResponse.json({
        disponible: false,
        motivo: 'sin_cobertura',
        mensaje: 'Google no tiene fotografía de calle registrada en esta ubicación exacta.',
        urlDirectaPano: directPanoUrl,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, max-age=86400',
        }
      })
    }

    // 2. Si hay cobertura, calcular heading hacia el domicilio
    let heading: number | undefined
    if (metaData.location && typeof metaData.location.lat === 'number' && typeof metaData.location.lng === 'number') {
      heading = calcularRumboHacia(metaData.location.lat, metaData.location.lng, lat, lng)
    }

    const staticParams = new URLSearchParams({
      size: `${widthStr}x${heightStr}`,
      location: `${lat},${lng}`,
      fov: '85',
      pitch: '0',
      key: apiKey,
    })

    if (heading !== undefined) {
      staticParams.set('heading', heading.toString())
    }

    const staticImageUrl = `https://maps.googleapis.com/maps/api/streetview?${staticParams.toString()}`

    // Si se solicitó la imagen directamente a través del proxy para proteger la API key en el cliente
    if (proxyImage) {
      const imgRes = await fetch(staticImageUrl)
      if (!imgRes.ok) {
        return NextResponse.json({ error: 'Error al obtener la imagen de Google' }, { status: 502 })
      }
      const buffer = await imgRes.arrayBuffer()
      return new Response(buffer, {
        headers: {
          'Content-Type': imgRes.headers.get('content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=604800, s-maxage=604800, immutable',
        },
      })
    }

    // Formatear fecha amigable (ej: "2023-05" -> "Mayo 2023")
    let fechaFormateada = metaData.date || null
    if (metaData.date && typeof metaData.date === 'string') {
      const [year, month] = metaData.date.split('-')
      if (year && month) {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        const mesIdx = parseInt(month, 10) - 1
        if (mesIdx >= 0 && mesIdx < 12) {
          fechaFormateada = `${meses[mesIdx]} ${year}`
        }
      }
    }

    const urlPanoConId = metaData.pano_id
      ? `https://www.google.com/maps/@?api=1&map_action=pano&pano=${metaData.pano_id}`
      : directPanoUrl

    return NextResponse.json({
      disponible: true,
      urlImagenProxy: `/api/streetview?lat=${lat}&lng=${lng}&w=${widthStr}&h=${heightStr}&image=true`,
      urlImagenDirecta: staticImageUrl,
      fecha: fechaFormateada,
      panoId: metaData.pano_id,
      copyright: metaData.copyright || '© Google',
      urlDirectaPano: urlPanoConId,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=604800, max-age=604800',
      }
    })
  } catch (error) {
    console.error('Error en /api/streetview:', error)
    return NextResponse.json({
      disponible: false,
      motivo: 'error_interno',
      urlDirectaPano: directPanoUrl,
    }, { status: 500 })
  }
}
