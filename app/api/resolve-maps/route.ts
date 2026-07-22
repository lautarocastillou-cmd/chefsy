import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'

function extraerCoordenadasDeUrl(url: string) {
  // 1. Intentar extraer coordenadas específicas del pin (formato data de Google Maps !3d...!4d)
  const match3d4d = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (match3d4d) {
    return { latitud: parseFloat(match3d4d[1]), longitud: parseFloat(match3d4d[2]) }
  }

  // 2. Buscar formato q=lat,lng (ej: q=-28.468200,-65.782100)
  const matchQ = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (matchQ) {
    return { latitud: parseFloat(matchQ[1]), longitud: parseFloat(matchQ[2]) }
  }

  // 3. Buscar formato daddr=lat,lng (ej: daddr=-28.468200,-65.782100)
  const matchDaddr = url.match(/[?&]daddr=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (matchDaddr) {
    return { latitud: parseFloat(matchDaddr[1]), longitud: parseFloat(matchDaddr[2]) }
  }

  // 4. Buscar formato ll=lat,lng
  const matchLl = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (matchLl) {
    return { latitud: parseFloat(matchLl[1]), longitud: parseFloat(matchLl[2]) }
  }

  // 5. Buscar formato @lat,lng (fallback)
  const matchAt = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (matchAt) {
    return { latitud: parseFloat(matchAt[1]), longitud: parseFloat(matchAt[2]) }
  }

  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const urlParam = searchParams.get('url')

  // -- PROXY OSRM (Público para cálculo exacto de envío en la web y panel) --
  const origenLon = searchParams.get('origenLon')
  const origenLat = searchParams.get('origenLat')
  const destinoLon = searchParams.get('destinoLon')
  const destinoLat = searchParams.get('destinoLat')

  if (origenLon && origenLat && destinoLon && destinoLat) {
    try {
      const url1 = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${origenLon},${origenLat};${destinoLon},${destinoLat}?overview=false`
      const res1 = await fetch(url1, { 
        headers: { 'User-Agent': 'ChefsyApp/1.0' },
        signal: AbortSignal.timeout(5000)
      })
      if (res1.ok) {
        const data1 = await res1.json()
        if (data1?.routes?.[0]?.distance !== undefined) {
          return NextResponse.json({ distance: data1.routes[0].distance / 1000 })
        }
      }
    } catch (err) {}

    try {
      const url2 = `https://router.project-osrm.org/route/v1/driving/${origenLon},${origenLat};${destinoLon},${destinoLat}?overview=false`
      const res2 = await fetch(url2, { signal: AbortSignal.timeout(5000) })
      if (res2.ok) {
        const data2 = await res2.json()
        if (data2?.routes?.[0]?.distance !== undefined) {
          return NextResponse.json({ distance: data2.routes[0].distance / 1000 })
        }
      }
    } catch (err) {}

    return NextResponse.json({ error: 'No se pudo calcular la ruta' }, { status: 502 })
  }
  // -- FIN PROXY OSRM --

  const sesion = await obtenerSesion()
  if (!sesion) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  if (!urlParam) {
    return NextResponse.json({ error: 'URL o coordenadas no provistas.' }, { status: 400 })
  }

  const DOMINIOS_PERMITIDOS = ['maps.google.com', 'goo.gl', 'maps.app.goo.gl', 'www.google.com']
  try {
    const parsedUrl = new URL(urlParam)
    if (!DOMINIOS_PERMITIDOS.includes(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'Dominio no permitido.' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'URL inválida.' }, { status: 400 })
  }

  try {
    let currentUrl = urlParam
    let coordinates = extraerCoordenadasDeUrl(currentUrl)

    // Si ya tiene coordenadas en la URL inicial, devolverlas de inmediato
    if (coordinates) {
      return NextResponse.json(coordinates)
    }

    // Seguir redirecciones manualmente buscando las coordenadas en cada hop
    const maxRedirects = 10
    for (let i = 0; i < maxRedirects; i++) {
      const respuesta = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })

      // Verificar si hay redirección (3xx)
      if (respuesta.status >= 300 && respuesta.status < 400) {
        const location = respuesta.headers.get('location')
        if (location) {
          // Si es una redirección relativa
          if (!location.startsWith('http')) {
            const parsed = new URL(currentUrl)
            currentUrl = parsed.protocol + '//' + parsed.host + location
          } else {
            currentUrl = location
          }

          // Intentar extraer coordenadas de la nueva URL
          coordinates = extraerCoordenadasDeUrl(currentUrl)
          if (coordinates) {
            return NextResponse.json(coordinates)
          }
          continue
        }
      }
      
      // Si no es un redirect o no hay Location header, paramos
      break
    }

    // Si salimos del bucle y no encontramos coordenadas, intentar con redirect: 'follow'
    // como último recurso (por si acaso el backend es un redirect por JS)
    if (!coordinates) {
      const finalRes = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      coordinates = extraerCoordenadasDeUrl(finalRes.url)
    }

    if (coordinates) {
      return NextResponse.json(coordinates)
    }

    return NextResponse.json(
      { error: 'No se pudieron extraer coordenadas de la ubicación de Google Maps.' },
      { status: 422 }
    )
  } catch (error: any) {
    console.error('Error resolviendo URL acortada de Google Maps:', error)
    return NextResponse.json(
      { error: 'Error al intentar resolver la dirección de Google Maps en el servidor.' },
      { status: 500 }
    )
  }
}
