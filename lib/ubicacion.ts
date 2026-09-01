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
    if (err?.name === 'AbortError' && signal) throw err // Dejar pasar para que el hook lo maneje
    console.warn("Proxy OSRM falló. Usando fallback matemático.")
  }
  
  // Fallback final matemático ultra-preciso para tramas urbanas (Manhattan aproximado)
  // Reducimos el multiplicador de 1.4 a 1.25 para simular que la moto evita ciertos rodeos que daría un auto
  return calcularDistanciaKm(coord1, coord2) * 1.25
}

export function calcularCostoEnvio(distanciaKm: number): number {
  if (distanciaKm <= 1) return 1500
  if (distanciaKm <= 2) return 2000
  if (distanciaKm <= 3) return 2500
  if (distanciaKm <= 4) return 3000
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

export async function buscarCoordenadasPorDireccion(
  direccion: string
): Promise<Coordenadas | null> {
  const texto = direccion.trim()
  if (!texto) return null

  let queryBuscar = texto
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

    const fetchSignal = AbortSignal.timeout(3000)
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
      { headers: { 'Accept-Language': 'es' }, signal: AbortSignal.timeout(3000) }
    )

    if (!respuesta.ok) return null

    const resultado = await respuesta.json()
    if (!resultado || !resultado.address) return null

    const { road, house_number, city, town, village, suburb } = resultado.address
    const calle = road || ''
    const numero = house_number || ''
    const barrio = suburb ? `, Barrio ${suburb}` : ''
    const localidad = city || town || village || ''

    if (!calle) return null

    const dir = `${calle} ${numero}${barrio}, ${localidad}`.trim().replace(/,$/, '')
    
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

