// ─────────────────────────────────────────────────────────────────────────────
// app/api/geo/sugerencias/route.ts
// Proxy de geocodificación ultrarrápido con caché en RAM del servidor
// Acelera la búsqueda de direcciones y alturas acotadas a Catamarca.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { BOUNDING_BOX_CATAMARCA } from '@/lib/geo/catamarca'
import { buscarSugerenciasLocales } from '@/lib/geo/matcher'

export const dynamic = 'force-dynamic'

interface EntradaCacheSugerencias {
  sugerencias: Array<{
    nombre: string
    coordenadas: {
      latitud: number
      longitud: number
    }
  }>
  timestamp: number
}

// Caché global en memoria en el servidor (0ms para búsquedas repetidas)
const CACHE_SERVIDOR = new Map<string, EntradaCacheSugerencias>()
const MAX_CACHE_SIZE = 1000
const TTL_CACHE_MS = 24 * 60 * 60 * 1000 // 24 horas

// Rate limiter en memoria por IP
interface RateLimitEntry {
  contador: number
  reseteo: number
}
const rateLimitMap = new Map<string, RateLimitEntry>()

function verificarRateLimit(ip: string, maxPeticiones = 120, ventanaSegundos = 60) {
  const ahora = Date.now()
  const entrada = rateLimitMap.get(ip)

  if (!entrada || ahora > entrada.reseteo) {
    rateLimitMap.set(ip, { contador: 1, reseteo: ahora + ventanaSegundos * 1000 })
    return { permitido: true, segundosParaReset: ventanaSegundos }
  }

  entrada.contador++
  if (entrada.contador > maxPeticiones) {
    const segundosParaReset = Math.ceil((entrada.reseteo - ahora) / 1000)
    return { permitido: false, segundosParaReset }
  }

  return { permitido: true, segundosParaReset: 0 }
}

function obtenerIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] || req.headers.get('x-real-ip') || '127.0.0.1').trim()
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ ok: true, sugerencias: [] })
    }

    const ip = obtenerIp(req)
    const rateCheck = verificarRateLimit(ip, 120, 60)
    if (!rateCheck.permitido) {
      return NextResponse.json(
        { ok: false, error: 'Demasiadas solicitudes. Esperá unos segundos.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.segundosParaReset) } }
      )
    }

    const cacheKey = q.toLowerCase()

    // 1. Verificar si está en la memoria del servidor (0ms)
    const enCache = CACHE_SERVIDOR.get(cacheKey)
    if (enCache && Date.now() - enCache.timestamp < TTL_CACHE_MS) {
      return NextResponse.json(
        { ok: true, sugerencias: enCache.sugerencias, fuente: 'cache_servidor' },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            'X-Chefsy-Cache': 'HIT',
          },
        }
      )
    }

    // 2. Obtener coincidencias locales inmediatas en memoria (0ms)
    const locales = buscarSugerenciasLocales(q, 4).map((l) => ({
      nombre: l.nombre,
      coordenadas: l.coordenadas,
    }))

    // Si es un barrio o referencia exacta conocida sin número de calle, podemos responder de inmediato
    const tieneNumero = /\d{1,5}/.test(q)
    if (locales.length > 0 && !tieneNumero) {
      return NextResponse.json(
        { ok: true, sugerencias: locales, fuente: 'diccionario_local' },
        { headers: { 'Cache-Control': 'public, s-maxage=3600' } }
      )
    }

    // 3. Consultar Nominatim acotado a Catamarca
    const bbox = BOUNDING_BOX_CATAMARCA
    const viewboxStr = `${bbox.minLng},${bbox.maxLat},${bbox.maxLng},${bbox.minLat}`

    let queryBuscar = q
    if (!queryBuscar.toLowerCase().includes('catamarca')) {
      queryBuscar = `${queryBuscar}, San Fernando del Valle de Catamarca`
    }

    const params = new URLSearchParams({
      q: queryBuscar,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'ar',
      viewbox: viewboxStr,
      bounded: '1',
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)

    let sugerenciasOSM: Array<{ nombre: string; coordenadas: { latitud: number; longitud: number } }> = []

    try {
      const resOSM = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
          'User-Agent': 'ChefsyApp-Delivery/1.0 (contacto@chefsy.xyz)',
          'Accept-Language': 'es-AR,es;q=0.9',
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (resOSM.ok) {
        const data = await resOSM.json()
        if (Array.isArray(data)) {
          sugerenciasOSM = data
            .filter((item: any) => {
              const lat = parseFloat(item?.lat)
              const lon = parseFloat(item?.lon)
              if (isNaN(lat) || isNaN(lon)) return false
              return (
                lat >= bbox.minLat &&
                lat <= bbox.maxLat &&
                lon >= bbox.minLng &&
                lon <= bbox.maxLng
              )
            })
            .map((item: any) => ({
              nombre: item.display_name,
              coordenadas: {
                latitud: parseFloat(item.lat),
                longitud: parseFloat(item.lon),
              },
            }))
        }
      }
    } catch {
      clearTimeout(timeout)
    }

    // 4. Combinar locales + OSM evitando duplicados
    const combinadas: Array<{ nombre: string; coordenadas: { latitud: number; longitud: number } }> = []
    const nombresVistos = new Set<string>()

    for (const item of [...sugerenciasOSM, ...locales]) {
      const normalizado = item.nombre.toLowerCase().replace(/,\s*argentina$/i, '').trim()
      if (!nombresVistos.has(normalizado)) {
        nombresVistos.add(normalizado)
        combinadas.push(item)
      }
      if (combinadas.length >= 6) break
    }

    // Guardar en caché del servidor
    if (CACHE_SERVIDOR.size >= MAX_CACHE_SIZE) {
      const primerClave = CACHE_SERVIDOR.keys().next().value
      if (primerClave) CACHE_SERVIDOR.delete(primerClave)
    }
    CACHE_SERVIDOR.set(cacheKey, { sugerencias: combinadas, timestamp: Date.now() })

    return NextResponse.json(
      { ok: true, sugerencias: combinadas, fuente: 'osm_hibrido' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'X-Chefsy-Cache': 'MISS',
        },
      }
    )
  } catch (error: any) {
    console.error('[API Sugerencias Geo] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Error al buscar sugerencias de dirección' },
      { status: 500 }
    )
  }
}
