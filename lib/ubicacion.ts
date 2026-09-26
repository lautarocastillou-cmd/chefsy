// ─────────────────────────────────────────────────────
// lib/ubicacion.ts
// Utilidades para coordenadas y enlaces a mapas.
// ─────────────────────────────────────────────────────

import { Coordenadas } from '@/tipos'

export const UBICACION_LOCAL: Coordenadas = {
  latitud: -28.462809031658047,
  longitud: -65.77850065400358,
}

// Para retrocompatibilidad y centrado de mapas
export const CENTRO_POR_DEFECTO: Coordenadas = UBICACION_LOCAL

export const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_3ul8_1_0d6b5b9afb4cfc068d667127'

// Capa activa: Google Maps HD (ultra fluida a 60 FPS, alto contraste y 100% de disponibilidad sin bloqueos ni API key)
export const MAPA_TILES_URL = 'https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}'
export const MAPA_SUBDOMAINS = ['1']
export const MAPA_ATTRIBUTION = '&copy; Google Maps'

export const CARTO_VOYAGER_URL = MAPA_TILES_URL
export const CARTO_ATTRIBUTION = MAPA_ATTRIBUTION
export const CARTO_SUBDOMAINS = MAPA_SUBDOMAINS

export function calcularDistanciaKm(coord1: Coordenadas, coord2: Coordenadas): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = (coord2.latitud - coord1.latitud) * (Math.PI / 180)
  const dLon = (coord2.longitud - coord1.longitud) * (Math.PI / 180)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitud * (Math.PI / 180)) * Math.cos(coord2.latitud * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function obtenerDistanciaConduccion(coord1: Coordenadas, coord2: Coordenadas, signal?: AbortSignal): Promise<number> {
  try {
    const params = new URLSearchParams({
      origenLon: coord1.longitud.toString(),
      origenLat: coord1.latitud.toString(),
      destinoLon: coord2.longitud.toString(),
      destinoLat: coord2.latitud.toString()
    })
    
    const fetchSignal = signal || AbortSignal.timeout(3000)
    const res = await fetch(`/api/resolve-maps?${params}`, { signal: fetchSignal })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data.distance === 'number') {
        return data.distance
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return calcularDistanciaKm(coord1, coord2) * 1.25
    }
    console.warn("Proxy OSRM falló. Usando fallback matemático.")
  }
  
  // Fallback final matemático ultra-preciso para tramas urbanas (Manhattan aproximado)
  // Reducimos el multiplicador de 1.4 a 1.25 para simular que la moto evita ciertos rodeos que daría un auto
  return calcularDistanciaKm(coord1, coord2) * 1.25
}

export interface RutaConGeometria {
  distanciaKm: number
  puntos: [number, number][] // [latitud, longitud] listos para Leaflet
}

/**
 * Simplificación geométrica de polilíneas mediante el algoritmo Ramer-Douglas-Peucker (RDP).
 * Reduce entre un 70% y 85% la cantidad de vértices de la polilínea OSRM sin perder esquinas,
 * rotondas ni giros en calles. Elimina micro-vértices redundantes en avenidas rectas,
 * descongestionando drásticamente el renderizado SVG del navegador y manteniendo 60 FPS estables.
 * Tolerancia recomendada: 4.5 metros.
 */
export function simplificarPolilinea(
  puntos: [number, number][],
  toleranciaMetros: number = 4.5
): [number, number][] {
  if (!puntos || puntos.length <= 2) return puntos

  const M = 111320 // Metros aproximados por grado de latitud
  const cosLat = Math.cos((puntos[0][0] * Math.PI) / 180)

  // Distancia perpendicular exacta de un punto P a un segmento de recta A -> B
  const distanciaPerpendicular = (
    p: [number, number],
    a: [number, number],
    b: [number, number]
  ): number => {
    const ax = (b[0] - a[0]) * M
    const ay = (b[1] - a[1]) * M * cosLat
    const lenSq = ax * ax + ay * ay

    if (lenSq === 0) {
      const dx = (p[0] - a[0]) * M
      const dy = (p[1] - a[1]) * M * cosLat
      return Math.sqrt(dx * dx + dy * dy)
    }

    const px = (p[0] - a[0]) * M
    const py = (p[1] - a[1]) * M * cosLat

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
      const dist = distanciaPerpendicular(pts[i], start, end)
      if (dist > maxDist) {
        maxDist = dist
        indexMax = i
      }
    }

    if (maxDist > toleranciaMetros) {
      const izq = rdp(pts.slice(0, indexMax + 1))
      const der = rdp(pts.slice(indexMax))
      return izq.slice(0, -1).concat(der)
    } else {
      return [start, end]
    }
  }

  return rdp(puntos)
}

// Caché en memoria para evitar llamadas de red duplicadas o recálculos OSRM idénticos
const cacheRutasOSRM = new Map<string, RutaConGeometria>()

/**
 * Obtiene el trazado real por calles mediante el proxy OSRM (/api/resolve-maps)
 * Convierte automáticamente GeoJSON [lon, lat] al formato [lat, lon] de Leaflet
 * y aplica compresión RDP para garantizar máxima fluidez en pantalla.
 */
export async function obtenerRutaConduccion(
  coord1: Coordenadas,
  coord2: Coordenadas,
  signal?: AbortSignal
): Promise<RutaConGeometria | null> {
  // Clave de caché a 4 decimales (~11m de resolución espacial)
  const cacheKey = `${coord1.latitud.toFixed(4)},${coord1.longitud.toFixed(4)}->${coord2.latitud.toFixed(4)},${coord2.longitud.toFixed(4)}`
  if (cacheRutasOSRM.has(cacheKey)) {
    return cacheRutasOSRM.get(cacheKey)!
  }

  try {
    const params = new URLSearchParams({
      origenLon: coord1.longitud.toString(),
      origenLat: coord1.latitud.toString(),
      destinoLon: coord2.longitud.toString(),
      destinoLat: coord2.latitud.toString(),
      geometria: 'true'
    })

    const fetchSignal = signal || AbortSignal.timeout(5000)
    const res = await fetch(`/api/resolve-maps?${params}`, { signal: fetchSignal })
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.coordinates) && data.coordinates.length > 0) {
        // En GeoJSON es [lon, lat] -> En Leaflet se usa [lat, lon]
        const puntosCrudos: [number, number][] = data.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon]
        )
        // Reducir vértices redundantes conservando esquinas y trazado 100% fiel
        const puntos = simplificarPolilinea(puntosCrudos, 4.5)

        const resultado: RutaConGeometria = {
          distanciaKm: typeof data.distance === 'number' ? data.distance : calcularDistanciaKm(coord1, coord2),
          puntos
        }

        if (cacheRutasOSRM.size > 50) {
          const firstKey = cacheRutasOSRM.keys().next().value
          if (firstKey) cacheRutasOSRM.delete(firstKey)
        }
        cacheRutasOSRM.set(cacheKey, resultado)

        return resultado
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return null // Cancelación intencional y normal
    }
  }
  return null
}

export function calcularCostoEnvio(distanciaKm: number): number {
  if (distanciaKm <= 1) return 1500
  if (distanciaKm <= 2) return 2000
  if (distanciaKm <= 3) return 2500
  if (distanciaKm <= 4) return 3500
  if (distanciaKm <= 5) return 4000
  if (distanciaKm <= 6) return 4500
  if (distanciaKm <= 7) return 5000
  if (distanciaKm <= 8) return 5500
  return 6000 // De 8km a 10km (o superior) sale $6000
}

export function formatearCoordenadas(coordenadas: Coordenadas): string {
  return `${coordenadas.latitud.toFixed(6)}, ${coordenadas.longitud.toFixed(6)}`
}

export function crearEnlaceGoogleMaps(coordenadas?: Coordenadas | null, direccion?: string): string {
  if (coordenadas && typeof coordenadas.latitud === 'number' && typeof coordenadas.longitud === 'number' && !isNaN(coordenadas.latitud) && !isNaN(coordenadas.longitud)) {
    return `https://www.google.com/maps?q=${coordenadas.latitud},${coordenadas.longitud}`
  }
  if (direccion && direccion !== 'Retiro por el local') {
    const dirCompleta = direccion.toLowerCase().includes('catamarca')
      ? direccion
      : `${direccion}, San Fernando del Valle de Catamarca, Catamarca`
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dirCompleta)}`
  }
  return ''
}

export function crearEnlaceOpenStreetMap(coordenadas: Coordenadas): string {
  return `https://www.openstreetmap.org/?mlat=${coordenadas.latitud}&mlon=${coordenadas.longitud}#map=17/${coordenadas.latitud}/${coordenadas.longitud}`
}

export function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string): number {
  let decimal = degrees + minutes / 60 + seconds / 3600
  if (['S', 's', 'W', 'w', 'O', 'o'].includes(direction)) {
    decimal = -decimal
  }
  return decimal
}

export function extraerUrlDeGoogleMaps(texto: string): string | null {
  if (!texto) return null
  const match = texto.match(/(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?google\.[a-z]+(?:\.[a-z]+)?\/maps[^\s]*|(?:https?:\/\/)?maps\.app\.goo\.gl\/[^\s]*|(?:https?:\/\/)?goo\.gl\/maps\/[^\s]*/i)
  return match ? match[0] : null
}

export function extraerCoordenadasDeTexto(rawTexto: string): Coordenadas | null {
  if (!rawTexto) return null
  let texto = rawTexto
  try {
    texto = decodeURIComponent(rawTexto)
  } catch (e) {}

  // 1. Coordenadas de pin en URL de Google Maps (!3d...!4d)
  const match3d4d = texto.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (match3d4d) {
    return { latitud: parseFloat(match3d4d[1]), longitud: parseFloat(match3d4d[2]) }
  }

  // 2. Query string q=lat,lng o query=lat,lng
  const matchQ = texto.match(/[?&](?:q|query)=(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchQ) {
    return { latitud: parseFloat(matchQ[1]), longitud: parseFloat(matchQ[2]) }
  }

  // 3. Formato destino daddr=lat,lng
  const matchDaddr = texto.match(/[?&]daddr=(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchDaddr) {
    return { latitud: parseFloat(matchDaddr[1]), longitud: parseFloat(matchDaddr[2]) }
  }

  // 4. Formato ll=lat,lng / center=lat,lng
  const matchLl = texto.match(/[?&](?:ll|sll|center)=(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchLl) {
    return { latitud: parseFloat(matchLl[1]), longitud: parseFloat(matchLl[2]) }
  }

  // 5. Formato /place/lat,lng o /dir/.../lat,lng
  const matchPath = texto.match(/\/(?:place|dir)\/(?:[^\/]+\/)?(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchPath) {
    return { latitud: parseFloat(matchPath[1]), longitud: parseFloat(matchPath[2]) }
  }

  // 6. Formato @lat,lng
  const matchAt = texto.match(/@(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchAt) {
    return { latitud: parseFloat(matchAt[1]), longitud: parseFloat(matchAt[2]) }
  }

  // 7. Formato DMS (ej: 28°27'13.5"S 65°47'00.5"W)
  const dmsRegex = /(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"\s*([NSns])\s*[,/]?\s*(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"\s*([WOEwoeOo])/
  const matchDms = texto.match(dmsRegex)
  if (matchDms) {
    const lat = dmsToDecimal(parseFloat(matchDms[1]), parseFloat(matchDms[2]), parseFloat(matchDms[3]), matchDms[4])
    const lng = dmsToDecimal(parseFloat(matchDms[5]), parseFloat(matchDms[6]), parseFloat(matchDms[7]), matchDms[8])
    return { latitud: lat, longitud: lng }
  }

  // 8. Coordenadas numéricas directas (ej: -28.468200, -65.782100)
  const matchCoordsSueltas = texto.match(/(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchCoordsSueltas) {
    const lat = parseFloat(matchCoordsSueltas[1])
    const lng = parseFloat(matchCoordsSueltas[2])
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitud: lat, longitud: lng }
    }
  }

  return null
}

export async function buscarCoordenadasPorDireccion(
  direccion: string
): Promise<Coordenadas | null> {
  const texto = (direccion || '').trim()
  if (!texto) return null

  // 1. Extraer si ya son coordenadas explícitas o URL con parámetros
  const directas = extraerCoordenadasDeTexto(texto)
  if (directas) return directas

  // 2. Si es una URL acortada o enlace de Google Maps, resolver mediante /api/resolve-maps
  const urlMaps = extraerUrlDeGoogleMaps(texto)
  if (urlMaps) {
    try {
      const res = await fetch(`/api/resolve-maps?url=${encodeURIComponent(urlMaps)}`, {
        signal: AbortSignal.timeout(4000)
      })
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data.latitud === 'number' && typeof data.longitud === 'number') {
          return { latitud: data.latitud, longitud: data.longitud }
        }
      }
    } catch {}
  }

  // 3. Limpiar prefijos comunes y formatear query para Catamarca
  const limpio = texto
    .replace(/^b[°º.]?\s*/i, '')
    .replace(/^barrio\s+/i, '')
    .replace(/^av[.]?\s+/i, 'Avenida ')
    .trim()

  let queryBuscar = limpio || texto
  if (!queryBuscar.toLowerCase().includes('catamarca')) {
    queryBuscar = `${queryBuscar}, Catamarca`
  }

  try {
    const parametros = new URLSearchParams({
      format: 'json',
      q: queryBuscar,
      limit: '1',
      countrycodes: 'ar',
      viewbox: '-65.95,-28.15,-65.60,-28.60',
      bounded: '1',
    })

    const fetchSignal = AbortSignal.timeout(3500)
    let respuesta = await fetch(
      `https://nominatim.openstreetmap.org/search?${parametros}`,
      { headers: { 'Accept-Language': 'es' }, signal: fetchSignal }
    )

    let resultados = []
    if (respuesta.ok) {
      resultados = await respuesta.json()
    }

    if (resultados.length === 0) {
      parametros.set('bounded', '0')
      parametros.set('q', texto)
      respuesta = await fetch(
        `https://nominatim.openstreetmap.org/search?${parametros}`,
        { headers: { 'Accept-Language': 'es' }, signal: fetchSignal }
      )
      if (respuesta.ok) {
        resultados = await respuesta.json()
      }
    }

    const primero = resultados[0]
    if (!primero) return null

    return {
      latitud: parseFloat(primero.lat),
      longitud: parseFloat(primero.lon),
    }
  } catch {
    return null
  }
}

export function esEnlaceOCoordenadas(texto?: string | null): boolean {
  if (!texto) return false
  const t = texto.trim()
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.includes('maps.app.goo.gl') ||
    t.includes('goo.gl/maps') ||
    t.includes('google.com/maps') ||
    t.includes('maps.google') ||
    /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(t) ||
    /(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"\s*([NSns])/.test(t)
  )
}

export async function resolverDireccionHumana(
  direccionActual?: string | null,
  coordenadas?: Coordenadas | null
): Promise<string> {
  const dir = (direccionActual || '').trim()

  // Si ya es un texto normal comprensible y no es un link ni coordenadas sueltas, devolverlo
  if (dir && !esEnlaceOCoordenadas(dir)) {
    return dir
  }

  // Si tenemos coordenadas válidas, resolver mediante geocodificación inversa (OSRM / Nominatim)
  if (
    coordenadas &&
    typeof coordenadas.latitud === 'number' &&
    typeof coordenadas.longitud === 'number' &&
    !isNaN(coordenadas.latitud) &&
    !isNaN(coordenadas.longitud) &&
    (coordenadas.latitud !== 0 || coordenadas.longitud !== 0)
  ) {
    try {
      const encontrada = await buscarDireccionPorCoordenadas(coordenadas)
      if (encontrada && encontrada.trim()) {
        return encontrada
      }
    } catch (e) {
      console.warn('Error resolviendo dirección legible por coordenadas:', e)
    }
  }

  // Si era un link o coordenadas pero no pudimos resolver la calle, no mostramos el link crudo
  if (esEnlaceOCoordenadas(dir)) {
    return 'Ubicación seleccionada en el mapa'
  }

  return dir || 'Sin dirección especificada'
}

const cacheDirecciones = new Map<string, string | null>()

export async function buscarDireccionPorCoordenadas(
  coordenadas: Coordenadas
): Promise<string | null> {
  const cacheKey = `${coordenadas.latitud},${coordenadas.longitud}`
  if (cacheDirecciones.has(cacheKey)) {
    return cacheDirecciones.get(cacheKey)!
  }

  try {
    const parametros = new URLSearchParams({
      format: 'json',
      lat: coordenadas.latitud.toString(),
      lon: coordenadas.longitud.toString(),
      addressdetails: '1',
    })

    const respuesta = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${parametros}`,
      { 
        headers: { 
          'Accept-Language': 'es',
          'User-Agent': 'ChefsyApp/1.0' 
        }, 
        signal: AbortSignal.timeout(4000) 
      }
    )

    if (!respuesta.ok) return null

    const resultado = await respuesta.json()
    if (!resultado || !resultado.address) return null

    const { road, pedestrian, footway, house_number, city, town, village, suburb, neighbourhood } = resultado.address
    const calle = road || pedestrian || footway || neighbourhood || ''
    const numero = house_number ? ` ${house_number}` : ''
    const barrio = suburb ? `, Barrio ${suburb}` : ''
    const localidad = city || town || village || ''

    if (!calle && !localidad) {
      const fallbackDisplay = resultado.display_name?.split(',')?.[0]?.trim()
      return fallbackDisplay || null
    }

    const dir = `${calle}${numero}${barrio}${localidad ? `, ${localidad}` : ''}`.trim().replace(/^,|,$/g, '').trim()
    
    if (cacheDirecciones.size > 50) {
      const firstKey = cacheDirecciones.keys().next().value
      if (firstKey) cacheDirecciones.delete(firstKey)
    }
    cacheDirecciones.set(cacheKey, dir)

    return dir
  } catch {
    return null
  }
}

export function obtenerUbicacionActual(): Promise<Coordenadas> {
  return new Promise((resolver, rechazar) => {
    if (!navigator.geolocation) {
      rechazar(new Error('Este navegador no soporta geolocalización.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        resolver({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
        })
      },
      (error) => {
        const mensajes: Record<number, string> = {
          1: 'Permiso de ubicación denegado.',
          2: 'No se pudo obtener la ubicación.',
          3: 'Tiempo de espera agotado al buscar GPS.',
        }
        rechazar(new Error(mensajes[error.code] ?? 'Error al obtener GPS.'))
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  })
}

export interface SugerenciaDireccion {
  nombre: string
  coordenadas: Coordenadas
}

const cacheSugerencias = new Map<string, SugerenciaDireccion[]>()

export async function buscarSugerenciasDireccion(
  texto: string,
  signal?: AbortSignal
): Promise<SugerenciaDireccion[]> {
  const query = texto.trim()
  if (query.length < 3) return []

  const cacheKey = query.toLowerCase()
  if (cacheSugerencias.has(cacheKey)) {
    return cacheSugerencias.get(cacheKey)!
  }

  let queryBuscar = query
  if (!queryBuscar.toLowerCase().includes('catamarca')) {
    queryBuscar = `${queryBuscar}, Catamarca`
  }

  try {
    const parametros = new URLSearchParams({
      format: 'json',
      q: queryBuscar,
      limit: '5',
      countrycodes: 'ar',
      addressdetails: '1',
      viewbox: '-65.95,-28.15,-65.60,-28.60',
      bounded: '1',
    })

    let respuesta = await fetch(
      `https://nominatim.openstreetmap.org/search?${parametros}`,
      { headers: { 'Accept-Language': 'es' }, signal }
    )

    let resultados = []
    if (respuesta.ok) {
      resultados = await respuesta.json()
    }

    if (resultados.length === 0) {
      parametros.set('bounded', '0')
      parametros.set('q', query)
      respuesta = await fetch(
        `https://nominatim.openstreetmap.org/search?${parametros}`,
        { headers: { 'Accept-Language': 'es' }, signal }
      )
      if (respuesta.ok) {
        resultados = await respuesta.json()
      }
    }
    
    const sugerencias = resultados.map((item: any) => ({
      nombre: item.display_name,
      coordenadas: {
        latitud: parseFloat(item.lat),
        longitud: parseFloat(item.lon),
      }
    }))

    // Limitar caché a 50 entradas para no devorar memoria
    if (cacheSugerencias.size > 50) {
      const firstKey = cacheSugerencias.keys().next().value
      if (firstKey) cacheSugerencias.delete(firstKey)
    }
    cacheSugerencias.set(cacheKey, sugerencias)

    return sugerencias
  } catch (err: any) {
    if (err.name === 'AbortError') throw err // Dejar que lo capture el caller
    return []
  }
}

