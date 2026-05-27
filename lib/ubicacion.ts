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

export async function obtenerDistanciaConduccion(coord1: Coordenadas, coord2: Coordenadas): Promise<number> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${coord1.longitud},${coord1.latitud};${coord2.longitud},${coord2.latitud}?overview=false`
    const res = await fetch(url)
    const data = await res.json()
    if (data && data.routes && data.routes.length > 0) {
      // OSRM returns distance in meters
      return data.routes[0].distance / 1000
    }
  } catch (error) {
    console.error("Error consultando OSRM", error)
  }
  // Si falla la API, aplicamos un factor de 1.4 a la distancia en línea recta 
  // para simular las calles de la ciudad (Manhattan/Grilla urbana aproximada).
  return calcularDistanciaKm(coord1, coord2) * 1.4
}

export function calcularCostoEnvio(distanciaKm: number): number {
  if (distanciaKm <= 1) return 1500
  if (distanciaKm <= 2) return 2000
  if (distanciaKm <= 3) return 2500
  if (distanciaKm <= 4) return 3000
  return 4500 // Todo lo mayor a 4km (4-5, 5-6) sale $4500
}

export function formatearCoordenadas(coordenadas: Coordenadas): string {
  return `${coordenadas.latitud.toFixed(6)}, ${coordenadas.longitud.toFixed(6)}`
}

export function crearEnlaceGoogleMaps(coordenadas: Coordenadas): string {
  return `https://www.google.com/maps?q=${coordenadas.latitud},${coordenadas.longitud}`
}

export function crearEnlaceOpenStreetMap(coordenadas: Coordenadas): string {
  return `https://www.openstreetmap.org/?mlat=${coordenadas.latitud}&mlon=${coordenadas.longitud}#map=17/${coordenadas.latitud}/${coordenadas.longitud}`
}

export async function buscarCoordenadasPorDireccion(
  direccion: string
): Promise<Coordenadas | null> {
  const texto = direccion.trim()
  if (!texto) return null

  try {
    const parametros = new URLSearchParams({
      format: 'json',
      q: texto,
      limit: '1',
      countrycodes: 'ar',
    })

    const respuesta = await fetch(
      `https://nominatim.openstreetmap.org/search?${parametros}`,
      { headers: { 'Accept-Language': 'es' } }
    )

    if (!respuesta.ok) return null

    const resultados = await respuesta.json()
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

export async function buscarDireccionPorCoordenadas(
  coordenadas: Coordenadas
): Promise<string | null> {
  try {
    const parametros = new URLSearchParams({
      format: 'json',
      lat: coordenadas.latitud.toString(),
      lon: coordenadas.longitud.toString(),
      addressdetails: '1',
    })

    const respuesta = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${parametros}`,
      { headers: { 'Accept-Language': 'es' } }
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

    return `${calle} ${numero}${barrio}, ${localidad}`.trim().replace(/,$/, '')
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

export async function buscarSugerenciasDireccion(
  texto: string
): Promise<SugerenciaDireccion[]> {
  const query = texto.trim()
  if (query.length < 3) return []

  try {
    const parametros = new URLSearchParams({
      format: 'json',
      q: query,
      limit: '5',
      countrycodes: 'ar',
      addressdetails: '1',
    })

    const respuesta = await fetch(
      `https://nominatim.openstreetmap.org/search?${parametros}`,
      { headers: { 'Accept-Language': 'es' } }
    )

    if (!respuesta.ok) return []

    const resultados = await respuesta.json()
    
    return resultados.map((item: any) => ({
      nombre: item.display_name,
      coordenadas: {
        latitud: parseFloat(item.lat),
        longitud: parseFloat(item.lon),
      }
    }))
  } catch {
    return []
  }
}
