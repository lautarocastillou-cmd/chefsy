// ─────────────────────────────────────────────────────
// lib/promo-flash-servidor.ts
// Persistencia server-side de la Promo Flash (Burger Cheese $5.000)
// en `configuracion_operativa` (id=96) y conteo real en vivo desde `pedidos`.
// Al alcanzar el límite configurado, desactiva la promo automáticamente en BD.
// ─────────────────────────────────────────────────────

import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import {
  contarUnidadesPromoFlashEnPedidos,
  crearConfiguracionPromoFlashDefault,
  evaluarEstadoPromoFlash,
  normalizarConfiguracionPromoFlash,
  type ConfiguracionPromoFlash,
  type EstadoPromoFlash,
} from '@/lib/promo-flash'

const ID_FILA_PROMO_FLASH = 96

export async function obtenerConfiguracionPromoFlashServidor(): Promise<ConfiguracionPromoFlash> {
  const fechaHoy = obtenerFechaNegocio()
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('configuracion_operativa')
      .select('prioridades, updated_at')
      .eq('id', ID_FILA_PROMO_FLASH)
      .maybeSingle()

    if (error || !data) {
      return crearConfiguracionPromoFlashDefault(fechaHoy)
    }

    const crudo = (data.prioridades as Record<string, any> | null)?.promoFlash
    if (!crudo || typeof crudo !== 'object') {
      return crearConfiguracionPromoFlashDefault(fechaHoy)
    }

    return normalizarConfiguracionPromoFlash(
      {
        ...crudo,
        updatedAt: crudo.updatedAt || data.updated_at || '',
      },
      fechaHoy
    )
  } catch (err) {
    console.error('[Promo Flash] Error leyendo configuración desde Supabase:', err)
    return crearConfiguracionPromoFlashDefault(fechaHoy)
  }
}

export async function contarVendidasPromoFlashFechaServidor(fechaVigencia: string): Promise<number> {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('pedidos')
      .select('productos, estado, es_prueba, turno_tipo')
      .eq('fecha', fechaVigencia)
      .limit(1000)

    if (error || !Array.isArray(data)) {
      return 0
    }

    return contarUnidadesPromoFlashEnPedidos(data)
  } catch (err) {
    console.error('[Promo Flash] Error contando ventas de promo:', err)
    return 0
  }
}

export async function guardarConfiguracionPromoFlashServidor(
  entrada: unknown
): Promise<ConfiguracionPromoFlash> {
  const supabase = obtenerSupabaseAdmin()
  const fechaHoy = obtenerFechaNegocio()
  const ahoraIso = new Date().toISOString()

  const normalizada = normalizarConfiguracionPromoFlash(entrada, fechaHoy)
  const finalConfig: ConfiguracionPromoFlash = {
    ...normalizada,
    updatedAt: ahoraIso,
  }

  const { error } = await supabase.from('configuracion_operativa').upsert(
    {
      id: ID_FILA_PROMO_FLASH,
      limites: {},
      prioridades: {
        promoFlash: finalConfig,
      },
      updated_at: ahoraIso,
    },
    { onConflict: 'id' }
  )

  if (error) {
    throw error
  }

  return finalConfig
}

/**
 * Consulta configuración + ventas reales del día.
 * Si el límite se alcanzó y la promo todavía figuraba activa, la desactiva
 * automáticamente en la base de datos para dejar registro persistente.
 */
export async function obtenerEstadoPromoFlashServidor(): Promise<EstadoPromoFlash> {
  const fechaHoy = obtenerFechaNegocio()
  const config = await obtenerConfiguracionPromoFlashServidor()
  const vendidas = await contarVendidasPromoFlashFechaServidor(config.fechaVigencia)

  let configVigente = config

  // Auto-desactivación persistente apenas se alcanza o supera el límite configurado
  if (
    config.fechaVigencia === fechaHoy &&
    config.activa &&
    vendidas >= config.limiteTotal
  ) {
    try {
      configVigente = await guardarConfiguracionPromoFlashServidor({
        ...config,
        activa: false,
        desactivadaAutomaticamente: true,
        agotadaEn: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('[Promo Flash] No se pudo persistir auto-desactivación:', err)
      configVigente = {
        ...config,
        activa: false,
        desactivadaAutomaticamente: true,
      }
    }
  }

  return evaluarEstadoPromoFlash(configVigente, vendidas, fechaHoy)
}

/**
 * Invocado tras insertar un pedido con ítems de Promo Flash para disparar
 * la auto-desactivación inmediata si se llegó al tope.
 */
export async function verificarYAutoDesactivarPromoFlashServidor(): Promise<EstadoPromoFlash> {
  return obtenerEstadoPromoFlashServidor()
}
