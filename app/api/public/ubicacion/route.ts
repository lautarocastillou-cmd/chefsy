import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

const EXPO_SECRET_TOKEN = 'chefsy_expo_secure_track_99XQ'

function esCoordenadaValida(lat: any, lng: any): boolean {
  if (lat === null || lat === undefined || lat === '' || typeof lat === 'boolean') return false
  if (lng === null || lng === undefined || lng === '' || typeof lng === 'boolean') return false
  const nLat = Number(lat)
  const nLng = Number(lng)
  return Number.isFinite(nLat) && Number.isFinite(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${EXPO_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { cadeteId, lat, lng, accuracy, heading, speed, gps_activo, batteryLevel, iniciar_gps_manual, bufferPuntos } = body || {}
    const idNormalizado = String(cadeteId || '').trim().toLowerCase()
    if (!idNormalizado) {
      return NextResponse.json({ error: 'cadeteId inválido' }, { status: 400 })
    }

    const adminClient = obtenerSupabaseAdmin()

    // Si el cadete mandó explícitamente gps_activo=false (ej: apagó el toggle en la app)
    if (gps_activo === false) {
      await adminClient
        .from('cadetes')
        .update({
          gps_activo: false,
          ...(batteryLevel !== undefined && batteryLevel !== null ? { bateria: Math.round(Number(batteryLevel)) } : {}),
          updated_at: new Date().toISOString()
        })
        .ilike('id', idNormalizado)

      return NextResponse.json({ success: true, gps_activo: false })
    }

    if (!esCoordenadaValida(lat, lng)) {
      return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 })
    }

    const numLat = Number(lat)
    const numLng = Number(lng)

    // 1. Verificar estado actual en tabla cadetes
    const { data: cadeteExistente } = await adminClient
      .from('cadetes')
      .select('id, gps_activo, apagado_por_admin, updated_at')
      .ilike('id', idNormalizado)
      .maybeSingle()

    // Si el Administrador ejecutó un Kill Switch desde Torre de Control:
    if (cadeteExistente?.apagado_por_admin && !iniciar_gps_manual) {
      // Limpiar la orden pendiente para que el cadete pueda volver a encenderlo cuando quiera
      await adminClient
        .from('cadetes')
        .update({
          gps_activo: false,
          apagado_por_admin: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', cadeteExistente.id)

      // Responder con la orden de apagado para que la app móvil detenga el servicio
      return NextResponse.json({
        success: true,
        gps_activo: false,
        comando: 'apagar_gps'
      })
    }

    // Si el GPS del cadete está apagado y llega un paquete residual de fondo (sin iniciar_gps_manual explícito),
    // no reactivarlo y ordenar a la app detener el servicio de segundo plano
    if (cadeteExistente && cadeteExistente.gps_activo === false && !iniciar_gps_manual) {
      return NextResponse.json({
        success: true,
        gps_activo: false,
        comando: 'apagar_gps'
      })
    }

    const estadoGpsFinal = gps_activo === false ? false : true

    const camposActualizar: any = {
      lat: numLat,
      lng: numLng,
      accuracy: accuracy !== undefined && accuracy !== null && Number.isFinite(Number(accuracy)) ? Number(accuracy) : null,
      heading: heading !== undefined && heading !== null && Number.isFinite(Number(heading)) ? Number(heading) : null,
      speed: speed !== undefined && speed !== null && Number.isFinite(Number(speed)) ? Number(speed) : null,
      gps_activo: estadoGpsFinal,
      apagado_por_admin: false,
      updated_at: new Date().toISOString()
    }

    if (batteryLevel !== undefined && batteryLevel !== null) {
      camposActualizar.bateria = Math.round(Number(batteryLevel))
    }

    if (cadeteExistente) {
      const { error: updateError } = await adminClient
        .from('cadetes')
        .update(camposActualizar)
        .eq('id', cadeteExistente.id)
      
      if (updateError) {
        console.error('[API Ubicacion] Error actualizando cadete:', updateError)
      }
    } else {
      const { error: insertError } = await adminClient
        .from('cadetes')
        .insert({
          id: idNormalizado,
          nombre: idNormalizado,
          activo: true,
          ...camposActualizar
        })
      
      if (insertError) {
        console.error('[API Ubicacion] Error insertando cadete:', insertError)
      }
    }

    // 2. Grabar Breadcrumb Trail en pedidos activos en viaje (en_camino) solo si GPS está activo
    if (estadoGpsFinal) {
      try {
        const { data: pedidosEnCamino } = await adminClient
          .from('pedidos')
          .select('id, ruta_historial')
          .ilike('cadete_id', idNormalizado)
          .eq('estado', 'en_camino')
          .eq('archivado', false)

        if (pedidosEnCamino && pedidosEnCamino.length > 0) {
          const ahoraIso = new Date().toISOString()

          // Construir lista secuencial de puntos para el breadcrumb
          const puntosAProcesar: Array<{ lat: number; lng: number; t: string; speed?: number | null }> = []

          // Si vino un buffer de puntos offline capturados previamente (limitado a los últimos 100 para evitar abusos)
          if (Array.isArray(bufferPuntos) && bufferPuntos.length > 0) {
            const bufferSeguro = bufferPuntos.slice(-100)
            for (const p of bufferSeguro) {
              if (esCoordenadaValida(p?.lat, p?.lng)) {
                const pSpeed = p?.speed != null && p?.speed !== '' && typeof p?.speed !== 'boolean' && Number.isFinite(Number(p.speed)) ? Number(p.speed) : null
                puntosAProcesar.push({
                  lat: Number(p.lat),
                  lng: Number(p.lng),
                  t: typeof p.t === 'string' && p.t ? p.t : ahoraIso,
                  speed: pSpeed
                })
              }
            }
          }

          // Asegurar que el punto actual forme parte de la cola (al final) si no estaba ya
          const ultimoEnBuffer = puntosAProcesar[puntosAProcesar.length - 1]
          const puntoActual = {
            lat: numLat,
            lng: numLng,
            t: ahoraIso,
            speed: speed != null && Number.isFinite(Number(speed)) ? Number(speed) : null
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

              // Grabar si es el primer punto o si se desplazó más de 5 metros (~0.00005 grados)
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
              // Limitar tamaño del trail a los últimos 500 puntos para optimizar base de datos
              const historialActualizado = historial.slice(-500)
              await adminClient
                .from('pedidos')
                .update({ ruta_historial: historialActualizado })
                .eq('id', p.id)
            }
          }
        }
      } catch (errBreadcrumb) {
        console.error('[API Ubicacion] Error registrando breadcrumb:', errBreadcrumb)
      }
    }

    return NextResponse.json({
      success: true,
      gps_activo: estadoGpsFinal,
      comando: estadoGpsFinal ? 'continuar' : 'apagar_gps'
    })
  } catch (err) {
    console.error('Error procesando ubicación:', err)
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }
}
