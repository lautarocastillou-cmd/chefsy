// ─────────────────────────────────────────────────────
// lib/carta-digital-servidor.ts
// Persistencia server-side de la Carta Digital en Supabase.
// Usa una fila dedicada (id=98) en `configuracion_operativa`
// para funcionar de inmediato sin migración manual obligatoria.
// ─────────────────────────────────────────────────────

import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerEstadoHorarioLocal } from '@/lib/tiempo'
import {
  crearConfiguracionCartaDefault,
  normalizarConfiguracionCarta,
  obtenerUrlsEliminadasStorage,
  type ConfiguracionCarta,
} from '@/lib/carta-digital'

const ID_FILA_CARTA_DIGITAL = 98

export async function obtenerConfiguracionCartaServidor(): Promise<ConfiguracionCarta> {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('configuracion_operativa')
      .select('prioridades, updated_at')
      .eq('id', ID_FILA_CARTA_DIGITAL)
      .maybeSingle()

    if (error || !data) {
      return crearConfiguracionCartaDefault()
    }

    const crudo = (data.prioridades as Record<string, any> | null)?.cartaDigital
    if (!crudo || typeof crudo !== 'object') {
      return crearConfiguracionCartaDefault()
    }

    return normalizarConfiguracionCarta({
      ...crudo,
      updatedAt: crudo.updatedAt || data.updated_at || '',
    })
  } catch (err) {
    console.error('[Carta Digital] Error leyendo configuración desde Supabase:', err)
    return crearConfiguracionCartaDefault()
  }
}

export async function guardarConfiguracionCartaServidor(
  entrada: unknown
): Promise<ConfiguracionCarta> {
  const supabase = obtenerSupabaseAdmin()
  const anterior = await obtenerConfiguracionCartaServidor()

  const ahoraIso = new Date().toISOString()
  const normalizada = normalizarConfiguracionCarta(entrada, ahoraIso)
  const finalConfig: ConfiguracionCarta = {
    ...normalizada,
    updatedAt: ahoraIso,
  }

  const filaUpsert = {
    id: ID_FILA_CARTA_DIGITAL,
    limites: {},
    prioridades: {
      cartaDigital: finalConfig,
    },
    updated_at: ahoraIso,
  }

  const { error } = await supabase
    .from('configuracion_operativa')
    .upsert(filaUpsert, { onConflict: 'id' })

  if (error) {
    throw error
  }

  // Limpiar en segundo plano archivos del bucket `images` que ya no están en la carta
  const urlsHuerfanas = obtenerUrlsEliminadasStorage(anterior.hojas, finalConfig.hojas)
  if (urlsHuerfanas.length > 0) {
    const nombresArchivo = urlsHuerfanas
      .map((u) => u.split('/').pop()?.split('?')[0] || '')
      .filter((n) => Boolean(n && n.startsWith('carta_')))
    if (nombresArchivo.length > 0) {
      supabase.storage
        .from('images')
        .remove(nombresArchivo)
        .catch((err) => console.warn('[Carta Digital] No se pudieron limpiar archivos huérfanos:', err))
    }
  }

  return finalConfig
}

export interface EstadoHorarioCarta {
  abierto: boolean
  esDomingo: boolean
  etiquetaCorta: string
  detalle: string
}

export async function obtenerEstadoHorarioCartaServidor(): Promise<EstadoHorarioCarta> {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data: turnoData } = await supabase
      .from('turnos')
      .select('activo')
      .eq('id', 1)
      .maybeSingle()

    const estado = obtenerEstadoHorarioLocal(Boolean(turnoData?.activo))
    if (estado.abierto) {
      return {
        abierto: true,
        esDomingo: false,
        etiquetaCorta: 'Abierto ahora',
        detalle: 'Recibiendo pedidos',
      }
    }
    if (estado.esDomingo) {
      return {
        abierto: false,
        esDomingo: true,
        etiquetaCorta: 'Cerrado hoy',
        detalle: 'Domingos cerrado · Lun a Sáb 20:30 a 01:00',
      }
    }
    return {
      abierto: false,
      esDomingo: false,
      etiquetaCorta: 'Abrimos 20:30 hs',
      detalle: 'Lun a Sáb de 20:30 a 01:00 hs',
    }
  } catch (err) {
    console.warn('[Carta Digital] Error consultando turno:', err)
    return {
      abierto: false,
      esDomingo: false,
      etiquetaCorta: 'Lun a Sáb 20:30–01:00',
      detalle: 'Horarios de atención',
    }
  }
}
