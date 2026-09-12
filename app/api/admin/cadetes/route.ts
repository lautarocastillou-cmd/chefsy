import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerSesion } from '@/lib/auth-server'

// ── GET: Obtener lista de cadetes con estado GPS/Turno en tiempo real ────────
export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const supabase = obtenerSupabaseAdmin()

    // 1. Obtener usuarios con rol cadete
    const { data: usuarios, error: errUsuarios } = await supabase
      .from('usuarios')
      .select('usuario, nombre')
      .eq('rol', 'cadete')
      .order('nombre', { ascending: true })

    if (errUsuarios) throw errUsuarios

    // 2. Obtener estado de GPS / turno en vivo desde la tabla cadetes
    const { data: cadetesGPS } = await supabase
      .from('cadetes')
      .select('id, gps_activo, lat, lng, updated_at, bateria')

    const gpsMap = new Map<string, any>()
    for (const c of (cadetesGPS || []) as any[]) {
      gpsMap.set(String(c.id || '').toLowerCase(), c)
    }

    // 3. Mapear con información de turno / GPS
    const cadetes = (usuarios || []).map((u: any) => {
      const infoGps = gpsMap.get(String(u.usuario || '').toLowerCase())
      const gpsActivo = Boolean(infoGps?.gps_activo)

      return {
        id: u.usuario,
        nombre: u.nombre,
        gps_activo: gpsActivo,
        online: gpsActivo,
        bateria: infoGps?.bateria ?? null,
        lat: infoGps?.lat ?? null,
        lng: infoGps?.lng ?? null,
        updated_at: infoGps?.updated_at ?? null,
      }
    })

    return NextResponse.json(cadetes)
  } catch (error) {
    console.error('[API Cadetes] Error GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

function esCoordenadaValida(lat: any, lng: any): boolean {
  if (lat === null || lat === undefined || lat === '' || typeof lat === 'boolean') return false
  if (lng === null || lng === undefined || lng === '' || typeof lng === 'boolean') return false
  const nLat = Number(lat)
  const nLng = Number(lng)
  return Number.isFinite(nLat) && Number.isFinite(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180
}

// ── POST: Actualizar posición GPS del cadete autenticado ─────────────────────
export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'cadete' && sesion.rol !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { lat, lng, gps_activo } = body || {}
    const cadeteId = String(sesion.usuario).trim().toLowerCase()

    const supabase = obtenerSupabaseAdmin()
    const camposActualizar: any = {
      id: cadeteId,
      nombre: sesion.nombre || cadeteId,
      activo: true,
      updated_at: new Date().toISOString(),
    }

    const coordenadasValidas = esCoordenadaValida(lat, lng)

    if (coordenadasValidas) {
      camposActualizar.lat = Number(lat)
      camposActualizar.lng = Number(lng)
    }

    if (gps_activo !== undefined) {
      camposActualizar.gps_activo = Boolean(gps_activo)
    }

    const { error } = await supabase
      .from('cadetes')
      .upsert(camposActualizar, { onConflict: 'id' })

    if (error) throw error

    // Grabar Breadcrumb Trail en pedidos en camino si el GPS está activo y las coordenadas son válidas
    if (Boolean(camposActualizar.gps_activo) && coordenadasValidas) {
      try {
        const { data: pedidosEnCamino } = await supabase
          .from('pedidos')
          .select('id, ruta_historial')
          .ilike('cadete_id', cadeteId)
          .eq('estado', 'en_camino')
          .eq('archivado', false)

        if (pedidosEnCamino && pedidosEnCamino.length > 0) {
          const ahoraIso = new Date().toISOString()
          const puntosAProcesar: Array<{ lat: number; lng: number; t: string; speed?: number | null }> = []

          if (Array.isArray(body.bufferPuntos) && body.bufferPuntos.length > 0) {
            const bufferSeguro = body.bufferPuntos.slice(-100)
            for (const p of bufferSeguro) {
              if (esCoordenadaValida(p?.lat, p?.lng)) {
                puntosAProcesar.push({
                  lat: Number(p.lat),
                  lng: Number(p.lng),
                  t: typeof p.t === 'string' && p.t ? p.t : ahoraIso,
                  speed: p.speed != null && p.speed !== '' && typeof p.speed !== 'boolean' && Number.isFinite(Number(p.speed)) ? Number(p.speed) : null,
                })
              }
            }
          }

          const ultimoEnBuffer = puntosAProcesar[puntosAProcesar.length - 1]
          const puntoActual = {
            lat: Number(lat),
            lng: Number(lng),
            t: ahoraIso,
            speed: null,
          }

          if (
            !ultimoEnBuffer ||
            Math.abs(ultimoEnBuffer.lat - puntoActual.lat) > 0.00001 ||
            Math.abs(ultimoEnBuffer.lng - puntoActual.lng) > 0.00001
          ) {
            puntosAProcesar.push(puntoActual)
          }

          for (const p of pedidosEnCamino) {
            let historial = Array.isArray(p.ruta_historial) ? [...p.ruta_historial] : []
            let huboCambios = false

            for (const punto of puntosAProcesar) {
              const ultimoPunto = historial[historial.length - 1]

              if (
                !ultimoPunto ||
                Math.abs(ultimoPunto.lat - punto.lat) > 0.00005 ||
                Math.abs(ultimoPunto.lng - punto.lng) > 0.00005
              ) {
                historial.push(punto)
                huboCambios = true
              }
            }

            if (huboCambios) {
              const historialActualizado = historial.slice(-500)
              await supabase
                .from('pedidos')
                .update({ ruta_historial: historialActualizado })
                .eq('id', p.id)
            }
          }
        }
      } catch (errBreadcrumb) {
        console.error('[API Cadetes] Error registrando breadcrumb:', errBreadcrumb)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API Cadetes] Error POST:', error)
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
  }
}
