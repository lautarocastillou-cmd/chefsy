import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

const EXPO_SECRET_TOKEN = 'chefsy_expo_secure_track_99XQ'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${EXPO_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { cadeteId, lat, lng, accuracy, heading, speed, gps_activo, batteryLevel, iniciar_gps_manual } = body || {}
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

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Coordenadas incompletas' }, { status: 400 })
    }

    // 1. Verificar estado actual en tabla cadetes
    const { data: cadeteExistente } = await adminClient
      .from('cadetes')
      .select('id, gps_activo')
      .ilike('id', idNormalizado)
      .maybeSingle()

    // 🔒 BLINDAJE DE APAGADO DE GPS:
    // Si el admin (o el cadete) apagó el GPS (gps_activo === false en DB), NO revivirlo
    // automáticamente solo por recibir un ping de fondo del teléfono.
    // Solo se reactiva si la app manda iniciar_gps_manual: true (cuando el cadete toca el botón en su pantalla).
    const debePermanecerApagado = Boolean(cadeteExistente && cadeteExistente.gps_activo === false && !iniciar_gps_manual)

    const estadoGpsFinal = debePermanecerApagado ? false : true

    const camposActualizar: any = {
      lat: Number(lat),
      lng: Number(lng),
      accuracy: accuracy !== undefined && accuracy !== null ? Number(accuracy) : null,
      heading: heading !== undefined && heading !== null ? Number(heading) : null,
      speed: speed !== undefined && speed !== null ? Number(speed) : null,
      gps_activo: estadoGpsFinal,
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
          const nuevoPunto = {
            lat: Number(lat),
            lng: Number(lng),
            t: ahoraIso,
            speed: speed != null ? Number(speed) : null
          }

          for (const p of pedidosEnCamino) {
            const historialPrevio = Array.isArray(p.ruta_historial) ? p.ruta_historial : []
            const ultimoPunto = historialPrevio[historialPrevio.length - 1]

            // Grabar si es el primer punto o si se desplazó más de 5 metros
            if (
              !ultimoPunto ||
              Math.abs(ultimoPunto.lat - nuevoPunto.lat) > 0.00005 ||
              Math.abs(ultimoPunto.lng - nuevoPunto.lng) > 0.00005
            ) {
              const historialActualizado = [...historialPrevio.slice(-400), nuevoPunto]
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
      comando: debePermanecerApagado ? 'apagar_gps' : 'continuar'
    })
  } catch (err) {
    console.error('Error procesando ubicación:', err)
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }
}
