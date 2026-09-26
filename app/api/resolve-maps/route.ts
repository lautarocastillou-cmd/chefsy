import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { buscarDireccionPorCoordenadas } from '@/lib/ubicacion'

function extraerCoordenadasDeUrl(rawUrl: string) {
  if (!rawUrl) return null
  let url = rawUrl
  try {
    url = decodeURIComponent(rawUrl)
  } catch (e) {}

  // 1. Intentar extraer coordenadas específicas del pin (formato data de Google Maps !3d...!4d)
  const match3d4d = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (match3d4d) {
    return { latitud: parseFloat(match3d4d[1]), longitud: parseFloat(match3d4d[2]) }
  }

  // 2. Buscar formato q=lat,lng o query=lat,lng (ej: q=-28.4593648%2C-65.7796141)
  const matchQ = url.match(/[?&](?:q|query)=(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchQ) {
    return { latitud: parseFloat(matchQ[1]), longitud: parseFloat(matchQ[2]) }
  }

  // 3. Buscar formato daddr=lat,lng (ej: daddr=-28.468200,-65.782100)
  const matchDaddr = url.match(/[?&]daddr=(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchDaddr) {
    return { latitud: parseFloat(matchDaddr[1]), longitud: parseFloat(matchDaddr[2]) }
  }

  // 4. Buscar formato ll=lat,lng / center=lat,lng / sll=lat,lng
  const matchLl = url.match(/[?&](?:ll|sll|center)=(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchLl) {
    return { latitud: parseFloat(matchLl[1]), longitud: parseFloat(matchLl[2]) }
  }

  // 5. Formato /place/lat,lng o /dir/.../lat,lng
  const matchPath = url.match(/\/(?:place|dir)\/(?:[^\/]+\/)?(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchPath) {
    return { latitud: parseFloat(matchPath[1]), longitud: parseFloat(matchPath[2]) }
  }

  // 6. Buscar formato @lat,lng (fallback)
  const matchAt = url.match(/@(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchAt) {
    return { latitud: parseFloat(matchAt[1]), longitud: parseFloat(matchAt[2]) }
  }

  return null
}

// Cache en memoria en el servidor para evitar llamadas repetidas a OSRM (0ms de latencia)
interface ServerCacheEntry {
  distance: number
  coordinates?: [number, number][]
  timestamp: number
}
const serverRouteCache = new Map<string, ServerCacheEntry>()

// Simplificación de coordenadas GeoJSON [lon, lat] antes de enviar por red
function simplificarGeoJSON(coordinates: [number, number][], toleranciaMetros = 4.0): [number, number][] {
  if (!coordinates || coordinates.length <= 2) return coordinates

  const M = 111320
  const cosLat = Math.cos((coordinates[0][1] * Math.PI) / 180)

  const distPerp = (p: [number, number], a: [number, number], b: [number, number]) => {
    const ax = (b[1] - a[1]) * M // latitud delta
    const ay = (b[0] - a[0]) * M * cosLat // longitud delta
    const lenSq = ax * ax + ay * ay
    if (lenSq === 0) {
      const dx = (p[1] - a[1]) * M
      const dy = (p[0] - a[0]) * M * cosLat
      return Math.sqrt(dx * dx + dy * dy)
    }
    const px = (p[1] - a[1]) * M
    const py = (p[0] - a[0]) * M * cosLat
    const t = Math.max(0, Math.min(1, (px * ax + py * ay) / lenSq))
    const projX = t * ax
    const projY = t * ay
    const dx = px - projX
    const dy = py - projY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const rdp = (pts: [number, number][]): [number, number][] => {
    if (pts.length <= 2) return pts
    let maxDist = 0
    let indexMax = 0
    const start = pts[0]
    const end = pts[pts.length - 1]
    for (let i = 1; i < pts.length - 1; i++) {
      const dist = distPerp(pts[i], start, end)
      if (dist > maxDist) {
        maxDist = dist
        indexMax = i
      }
    }
    if (maxDist > toleranciaMetros) {
      const izq = rdp(pts.slice(0, indexMax + 1))
      const der = rdp(pts.slice(indexMax))
      return izq.slice(0, -1).concat(der)
    }
    return [start, end]
  }

  return rdp(coordinates)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const urlParam = searchParams.get('url')

  // -- PROXY OSRM (Soporta origen/destino individual y multi-paradas con puntos) --
  const waypointsParam = searchParams.get('puntos') || searchParams.get('waypoints')
  const origenLon = searchParams.get('origenLon')
  const origenLat = searchParams.get('origenLat')
  const destinoLon = searchParams.get('destinoLon')
  const destinoLat = searchParams.get('destinoLat')

  let coordsCadena: string | null = null
  if (waypointsParam) {
    const partes = waypointsParam.split(';').map(p => p.trim()).filter(Boolean)
    if (partes.length >= 2) {
      const esValido = partes.every(p => {
        const [lon, lat] = p.split(',').map(Number)
        return !isNaN(lon) && !isNaN(lat) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
      })
      if (esValido) {
        coordsCadena = partes.join(';')
      }
    }
  } else if (origenLon && origenLat && destinoLon && destinoLat) {
    coordsCadena = `${origenLon},${origenLat};${destinoLon},${destinoLat}`
  }

  if (coordsCadena) {
    const conGeometria = searchParams.get('geometria') === 'true' || searchParams.get('overview') === 'full'
    const cacheKey = `${coordsCadena}?geom=${conGeometria}`
    const ttlMs = conGeometria ? 300_000 : 86_400_000 // 5 min para geometría, 24h para distancias

    // 1. Revisar caché server-side
    const enCache = serverRouteCache.get(cacheKey)
    if (enCache && Date.now() - enCache.timestamp < ttlMs) {
      return NextResponse.json(
        { distance: enCache.distance, ...(conGeometria && enCache.coordinates ? { coordinates: enCache.coordinates } : {}) },
        { headers: { 'Cache-Control': conGeometria ? 'public, s-maxage=300' : 'public, s-maxage=86400', 'X-Chefsy-Cache': 'HIT' } }
      )
    }

    const queryParams = conGeometria ? 'overview=full&geometries=geojson' : 'overview=false'

    try {
      const url1 = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordsCadena}?${queryParams}`
      const res1 = await fetch(url1, { 
        headers: { 'User-Agent': 'ChefsyApp/1.0' },
        signal: AbortSignal.timeout(5000)
      })
      if (res1.ok) {
        const data1 = await res1.json()
        if (data1?.routes?.[0]?.distance !== undefined) {
          const distance = data1.routes[0].distance / 1000
          let coordinates: [number, number][] | undefined

          if (conGeometria && data1.routes[0].geometry?.coordinates) {
            // Simplificación RDP directa en el servidor: reduce 85% el payload móvil
            coordinates = simplificarGeoJSON(data1.routes[0].geometry.coordinates, 4.0)
          }

          // Guardar en caché server-side
          if (serverRouteCache.size > 200) {
            const primerClave = serverRouteCache.keys().next().value
            if (primerClave) serverRouteCache.delete(primerClave)
          }
          serverRouteCache.set(cacheKey, { distance, coordinates, timestamp: Date.now() })

          const payload: any = { distance }
          if (coordinates) payload.coordinates = coordinates

          const cacheHeader = conGeometria
            ? 'public, s-maxage=300, stale-while-revalidate=60'
            : 'public, s-maxage=86400, stale-while-revalidate=604800'
          return NextResponse.json(payload, { headers: { 'Cache-Control': cacheHeader, 'X-Chefsy-Cache': 'MISS' } })
        }
      }
    } catch (err) {}

    try {
      const url2 = `https://router.project-osrm.org/route/v1/driving/${coordsCadena}?${queryParams}`
      const res2 = await fetch(url2, { signal: AbortSignal.timeout(5000) })
      if (res2.ok) {
        const data2 = await res2.json()
        if (data2?.routes?.[0]?.distance !== undefined) {
          const distance = data2.routes[0].distance / 1000
          let coordinates: [number, number][] | undefined

          if (conGeometria && data2.routes[0].geometry?.coordinates) {
            coordinates = simplificarGeoJSON(data2.routes[0].geometry.coordinates, 4.0)
          }

          if (serverRouteCache.size > 200) {
            const primerClave = serverRouteCache.keys().next().value
            if (primerClave) serverRouteCache.delete(primerClave)
          }
          serverRouteCache.set(cacheKey, { distance, coordinates, timestamp: Date.now() })

          const payload: any = { distance }
          if (coordinates) payload.coordinates = coordinates

          const cacheHeader = conGeometria
            ? 'public, s-maxage=300, stale-while-revalidate=60'
            : 'public, s-maxage=86400, stale-while-revalidate=604800'
          return NextResponse.json(payload, { headers: { 'Cache-Control': cacheHeader, 'X-Chefsy-Cache': 'MISS' } })
        }
      }
    } catch (err) {}

    return NextResponse.json({ error: 'No se pudo calcular la ruta' }, { status: 502 })
  }
  // -- FIN PROXY OSRM --

  if (!urlParam) {
    return NextResponse.json({ error: 'URL o coordenadas no provistas.' }, { status: 400 })
  }

  const DOMINIOS_PERMITIDOS = ['maps.google.com', 'goo.gl', 'maps.app.goo.gl', 'www.google.com', 'g.page']
  try {
    const parsedUrl = new URL(urlParam)
    if (!DOMINIOS_PERMITIDOS.includes(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'Dominio no permitido.' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'URL inválida.' }, { status: 400 })
  }

  const responderConDireccion = async (coords: { latitud: number; longitud: number }) => {
    let direccion: string | undefined
    try {
      const encontrada = await buscarDireccionPorCoordenadas(coords)
      if (encontrada) direccion = encontrada
    } catch (_) {}
    return NextResponse.json({
      ...coords,
      direccion,
    })
  }

  try {
    let currentUrl = urlParam
    let coordinates = extraerCoordenadasDeUrl(currentUrl)

    // Si ya tiene coordenadas en la URL inicial, devolverlas de inmediato
    if (coordinates) {
      return await responderConDireccion(coordinates)
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
            return await responderConDireccion(coordinates)
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
      return await responderConDireccion(coordinates)
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
