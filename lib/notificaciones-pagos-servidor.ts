// ─────────────────────────────────────────────────────
// lib/notificaciones-pagos-servidor.ts
// Persistencia server-side de la cola de verificación de pagos
// en `configuracion_operativa` (id=97) — sin tocar ni contaminar
// `cadetes_pagos_extras` ni requerir migraciones manuales.
// ─────────────────────────────────────────────────────

import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { notificarCambioPedido } from '@/lib/pedidos-broadcast'
import {
  buscarPedidoCoincidentePago,
  esNotificacionPagoDuplicada,
  parsearNotificacionPagoTexto,
  type NotificacionPago,
  type PedidoCandidatoMatch,
} from '@/lib/notificaciones-pagos'

const ID_FILA_NOTIFICACIONES_PAGOS = 97
const MAX_NOTIFICACIONES_GUARDADAS = 100

async function leerColaCompleta(): Promise<NotificacionPago[]> {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('configuracion_operativa')
      .select('prioridades')
      .eq('id', ID_FILA_NOTIFICACIONES_PAGOS)
      .maybeSingle()

    if (error || !data) return []
    const lista = (data.prioridades as Record<string, any> | null)?.notificacionesPagos
    return Array.isArray(lista) ? (lista as NotificacionPago[]) : []
  } catch (err) {
    console.error('[Notificaciones Pagos] Error leyendo cola:', err)
    return []
  }
}

async function guardarColaCompleta(lista: NotificacionPago[]): Promise<void> {
  const supabase = obtenerSupabaseAdmin()
  const recortada = lista.slice(0, MAX_NOTIFICACIONES_GUARDADAS)
  const ahoraIso = new Date().toISOString()

  const { error } = await supabase.from('configuracion_operativa').upsert(
    {
      id: ID_FILA_NOTIFICACIONES_PAGOS,
      limites: {},
      prioridades: {
        notificacionesPagos: recortada,
      },
      updated_at: ahoraIso,
    },
    { onConflict: 'id' }
  )

  if (error) {
    throw error
  }
}

export async function obtenerNotificacionesPagosServidor(filtros?: {
  cadeteId?: string | null
  pedidoId?: string | null
  soloNoLeidas?: boolean
  limite?: number
}): Promise<NotificacionPago[]> {
  const todas = await leerColaCompleta()
  const limite = Math.min(Math.max(filtros?.limite || 50, 1), MAX_NOTIFICACIONES_GUARDADAS)

  return todas
    .filter((n) => {
      if (filtros?.soloNoLeidas && n.leida) return false
      if (filtros?.cadeteId) {
        const objetivo = filtros.cadeteId.trim().toLowerCase()
        if ((n.cadete_id || '').trim().toLowerCase() !== objetivo) return false
      }
      if (filtros?.pedidoId) {
        if ((n.pedido_id || '') !== filtros.pedidoId) return false
      }
      return true
    })
    .slice(0, limite)
}

export interface EntradaRegistrarNotificacionPago {
  // Modo crudo desde Android NotificationListenerService
  titulo?: string
  texto?: string
  paquete?: string
  // Modo estructurado directo (admin o ya parseado)
  monto?: number | string
  metodo?: string
  billetera?: string
  remitente?: string
  cadeteId?: string
  cadeteNombre?: string
  pedidoId?: string
  mensaje?: string
}

export async function registrarNotificacionPagoServidor(
  entrada: EntradaRegistrarNotificacionPago
): Promise<{
  ok: boolean
  descartada?: boolean
  duplicada?: boolean
  motivo?: string
  notificacion?: NotificacionPago
}> {
  let montoFinal = Number(entrada.monto)
  let billeteraFinal = (entrada.billetera || '').trim()
  let remitenteFinal = (entrada.remitente || '').trim() || undefined
  let mensajeFinal = (entrada.mensaje || '').trim()

  // Si viene texto crudo de notificación Android (y no vino un monto explícito), parseamos
  if (!Number.isFinite(montoFinal) || montoFinal <= 0) {
    const parseo = parsearNotificacionPagoTexto({
      titulo: entrada.titulo,
      texto: entrada.texto,
      paquete: entrada.paquete,
    })
    if (!parseo.esIngreso || !parseo.monto) {
      return {
        ok: true,
        descartada: true,
        motivo: parseo.motivoDescarte || 'No corresponde a un pago recibido',
      }
    }
    montoFinal = parseo.monto
    billeteraFinal = billeteraFinal || parseo.billetera
    remitenteFinal = remitenteFinal || parseo.remitente
    if (!mensajeFinal) {
      mensajeFinal = [entrada.titulo, entrada.texto].filter(Boolean).join(' · ').slice(0, 220)
    }
  } else {
    billeteraFinal = billeteraFinal || 'Transferencia'
    if (!mensajeFinal && (entrada.titulo || entrada.texto)) {
      mensajeFinal = [entrada.titulo, entrada.texto].filter(Boolean).join(' · ').slice(0, 220)
    }
  }

  const existentes = await leerColaCompleta()
  if (
    esNotificacionPagoDuplicada(existentes, {
      monto: montoFinal,
      billetera: billeteraFinal,
      mensaje: mensajeFinal,
    })
  ) {
    return {
      ok: true,
      duplicada: true,
      motivo: 'Notificación duplicada ignorada',
    }
  }

  // Cruce automático contra pedidos recientes sin pago confirmado (últimas 12 horas)
  let pedidoCoincidente: PedidoCandidatoMatch | null = null
  if (!entrada.pedidoId) {
    try {
      const supabase = obtenerSupabaseAdmin()
      const hace12h = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      const { data: pedidosRecientes } = await supabase
        .from('pedidos')
        .select('id, cliente, total, estado, metodo_pago, pago_confirmado, cadete_id, cadete_nombre, created_at')
        .gte('created_at', hace12h)
        .eq('pago_confirmado', false)
        .order('created_at', { ascending: false })
        .limit(80)

      if (Array.isArray(pedidosRecientes) && pedidosRecientes.length > 0) {
        pedidoCoincidente = buscarPedidoCoincidentePago(pedidosRecientes as PedidoCandidatoMatch[], {
          monto: montoFinal,
          remitente: remitenteFinal,
        })
      }
    } catch (err) {
      console.warn('[Notificaciones Pagos] No se pudo cruzar con pedidos recientes:', err)
    }
  }

  const cadeteIdFinal = (
    entrada.cadeteId ||
    pedidoCoincidente?.cadete_id ||
    'local'
  ).trim()

  const cadeteNombreFinal = (
    entrada.cadeteNombre ||
    pedidoCoincidente?.cadete_nombre ||
    'Local / Mostrador'
  ).trim()

  const nueva: NotificacionPago = {
    id: `np_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    cadete_id: cadeteIdFinal,
    cadete_nombre: cadeteNombreFinal,
    monto: montoFinal,
    metodo: (entrada.metodo || 'transferencia').trim(),
    billetera: billeteraFinal,
    remitente: remitenteFinal,
    pedido_id: entrada.pedidoId || pedidoCoincidente?.id,
    pedido_cliente: pedidoCoincidente?.cliente,
    mensaje: mensajeFinal || undefined,
    paquete: entrada.paquete?.trim() || undefined,
    leida: false,
    creado_en: new Date().toISOString(),
  }

  await guardarColaCompleta([nueva, ...existentes])

  try {
    await notificarCambioPedido(cadeteIdFinal, 'update')
  } catch {
    // Broadcast opcional
  }

  return { ok: true, notificacion: nueva }
}

export async function marcarNotificacionPagoLeidaServidor(id: string): Promise<boolean> {
  const existentes = await leerColaCompleta()
  let encontrada = false
  const actualizadas = existentes.map((n) => {
    if (n.id === id) {
      encontrada = true
      return { ...n, leida: true }
    }
    return n
  })

  if (encontrada) {
    await guardarColaCompleta(actualizadas)
  }
  return encontrada
}
