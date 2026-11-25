import type { Pedido } from '@/tipos'

export const STORAGE_KEY_OFFLINE_QUEUE = 'chefsy-offline-queue'
export const EVENTO_OFFLINE_QUEUE_ACTUALIZADA = 'chefsy:offline-queue-updated'

// Ventanas de protección contra respuestas SWR/Realtime rezagadas
export const VENTANA_LOCK_LOCAL_MS = 20_000
export const VENTANA_LOCK_EN_VUELO_MS = 60_000
export const VENTANA_ELIMINADO_LOCAL_MS = 30_000
export const MAX_ANTIGUEDAD_COLA_OFFLINE_MS = 6 * 60 * 60 * 1000 // 6 horas

export type RegistroCambioLocal =
  | number
  | {
      timestamp: number
      cambios: Partial<Pedido>
      /** Copia completa cuando se trata de una creación local optimista. */
      pedidoCompleto?: Pedido
      /** True mientras el POST al servidor (o sus reintentos) sigue en vuelo. */
      enVuelo?: boolean
    }

export interface ItemColaOffline {
  payload: Record<string, any>
  timestamp: number
  intentos?: number
}

export interface ResultadoAccionPedido {
  ok: boolean
  offline?: boolean
  error?: string
  status?: number
}

export interface StorageBasico {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function leerColaOffline(
  storage: Pick<StorageBasico, 'getItem'> | null | undefined,
  ahora: number = Date.now()
): { items: ItemColaOffline[]; descartados: number } {
  if (!storage) return { items: [], descartados: 0 }
  try {
    const raw = storage.getItem(STORAGE_KEY_OFFLINE_QUEUE)
    if (!raw) return { items: [], descartados: 0 }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { items: [], descartados: 0 }

    const validos: ItemColaOffline[] = []
    let descartados = 0

    for (const item of parsed) {
      if (!item || typeof item !== 'object' || !item.payload || typeof item.payload !== 'object') {
        descartados++
        continue
      }
      const ts = typeof item.timestamp === 'number' && Number.isFinite(item.timestamp) ? item.timestamp : 0
      if (ts > 0 && ahora - ts > MAX_ANTIGUEDAD_COLA_OFFLINE_MS) {
        descartados++
        continue
      }
      validos.push({
        payload: item.payload,
        timestamp: ts || ahora,
        intentos: typeof item.intentos === 'number' ? item.intentos : 0,
      })
    }

    return { items: validos, descartados }
  } catch {
    return { items: [], descartados: 0 }
  }
}

export function guardarColaOffline(
  storage: Pick<StorageBasico, 'setItem' | 'removeItem'> | null | undefined,
  items: ItemColaOffline[]
): void {
  if (!storage) return
  try {
    if (items.length === 0) {
      storage.removeItem(STORAGE_KEY_OFFLINE_QUEUE)
    } else {
      storage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(items))
    }
  } catch {
    // Storage lleno o no disponible
  }
}

export function encolarAccionOffline(
  storage: StorageBasico | null | undefined,
  payload: Record<string, any>,
  ahora: number = Date.now()
): ItemColaOffline[] {
  const { items } = leerColaOffline(storage, ahora)
  const nuevoItem: ItemColaOffline = { payload, timestamp: ahora, intentos: 0 }

  // Deduplicar creaciones por pedido.id para evitar duplicar en la cola local
  if (payload?.accion === 'crear' && payload?.pedido?.id) {
    const idNuevo = String(payload.pedido.id)
    const filtrados = items.filter(
      (it) => !(it.payload?.accion === 'crear' && String(it.payload?.pedido?.id) === idNuevo)
    )
    const actualizados = [...filtrados, nuevoItem]
    guardarColaOffline(storage, actualizados)
    return actualizados
  }

  const actualizados = [...items, nuevoItem]
  guardarColaOffline(storage, actualizados)
  return actualizados
}

export function extraerPedidosPendientesColaOffline(
  colaOffline: ItemColaOffline[],
  ahora: number = Date.now()
): Pedido[] {
  const porId = new Map<string, Pedido>()
  for (const item of colaOffline) {
    if (item.payload?.accion !== 'crear') continue
    if (ahora - item.timestamp > MAX_ANTIGUEDAD_COLA_OFFLINE_MS) continue
    const pedido = item.payload?.pedido as Pedido | undefined
    if (pedido && typeof pedido.id === 'string' && pedido.id.trim()) {
      porId.set(pedido.id, pedido)
    }
  }
  return Array.from(porId.values())
}

function lockSigueVigente(reg: RegistroCambioLocal | undefined, ahora: number): boolean {
  if (!reg) return false
  if (typeof reg === 'number') {
    return reg > 0 && ahora - reg < VENTANA_LOCK_LOCAL_MS
  }
  const ts = reg.timestamp || 0
  if (!ts) return false
  const ventana = reg.enVuelo ? VENTANA_LOCK_EN_VUELO_MS : VENTANA_LOCK_LOCAL_MS
  return ahora - ts < ventana
}

export interface ParametrosReconciliacion {
  pedidosServidor: Pedido[]
  pedidosLocalesPrevios: Pedido[]
  cambiosMap: Record<string, RegistroCambioLocal>
  eliminadosMap: Record<string, number>
  colaOffline?: ItemColaOffline[]
  ahora?: number
}

/**
 * Reconcilia la lista fresca que devuelve el servidor con:
 *  1) Eliminaciones locales recientes (evita que un pedido borrado reaparezca).
 *  2) Mutaciones locales recientes o todavía en vuelo (evita parpadeos o reverts).
 *  3) Pedidos recién creados que aún no aparecen en la respuesta del servidor
 *     (leyendo primero de cambiosMap.pedidoCompleto para no depender del commit
 *     de prevPedidosRef, y luego de pedidosLocalesPrevios).
 *  4) Pedidos pendientes de sincronizar en `chefsy-offline-queue`.
 */
export function reconciliarPedidosConEstadoLocal({
  pedidosServidor,
  pedidosLocalesPrevios,
  cambiosMap,
  eliminadosMap,
  colaOffline = [],
  ahora = Date.now(),
}: ParametrosReconciliacion): Pedido[] {
  const idsEliminados = new Set(
    Object.entries(eliminadosMap)
      .filter(([, ts]) => ahora - ts < VENTANA_ELIMINADO_LOCAL_MS)
      .map(([id]) => id)
  )

  let resultado = pedidosServidor.filter((p) => !idsEliminados.has(p.id))

  // 1) Proteger mutaciones recientes en pedidos que el servidor ya devolvió
  resultado = resultado.map((pServidor) => {
    const reg = cambiosMap[pServidor.id]
    if (!reg) return pServidor

    if (!lockSigueVigente(reg, ahora)) {
      delete cambiosMap[pServidor.id]
      return pServidor
    }

    const cambios = typeof reg === 'object' && reg.cambios ? reg.cambios : null
    if (!cambios) return pServidor

    // Si era un pedido recién creado y el servidor ya lo tiene, liberamos el lock
    // en cuanto el POST haya finalizado (o si todos los campos clave coinciden).
    if (typeof reg === 'object' && reg.pedidoCompleto && !reg.enVuelo) {
      delete cambiosMap[pServidor.id]
      return pServidor
    }

    let servidorYaAlDia = true
    for (const [clave, valor] of Object.entries(cambios)) {
      if (clave === 'productos' || clave === 'coordenadas') continue
      if ((pServidor as any)[clave] !== valor) {
        servidorYaAlDia = false
        break
      }
    }

    if (servidorYaAlDia && !(typeof reg === 'object' && reg.enVuelo)) {
      delete cambiosMap[pServidor.id]
      return pServidor
    }

    return {
      ...pServidor,
      ...cambios,
    }
  })

  const idsPresentes = new Set(resultado.map((p) => p.id))
  const paraAnteponer: Pedido[] = []

  // 2) Preservar creaciones optimistas directamente desde cambiosMap.pedidoCompleto
  //    (inmune a carreras donde Realtime dispara antes de actualizar prevPedidosRef)
  for (const [id, reg] of Object.entries(cambiosMap)) {
    if (idsPresentes.has(id) || idsEliminados.has(id)) continue
    if (!lockSigueVigente(reg, ahora)) {
      delete cambiosMap[id]
      continue
    }
    if (typeof reg === 'object' && reg.pedidoCompleto) {
      paraAnteponer.push(reg.pedidoCompleto)
      idsPresentes.add(id)
    }
  }

  // 3) Respaldo: pedidos locales previos todavía bajo ventana de protección
  for (const pedidoLocal of pedidosLocalesPrevios) {
    if (idsPresentes.has(pedidoLocal.id) || idsEliminados.has(pedidoLocal.id)) continue
    const reg = cambiosMap[pedidoLocal.id]
    if (lockSigueVigente(reg, ahora)) {
      paraAnteponer.push(pedidoLocal)
      idsPresentes.add(pedidoLocal.id)
    }
  }

  // 4) Preservar pedidos con 'crear' encolado offline hasta que logren persistirse
  const pedidosOffline = extraerPedidosPendientesColaOffline(colaOffline, ahora)
  for (const pedidoOffline of pedidosOffline) {
    if (idsPresentes.has(pedidoOffline.id) || idsEliminados.has(pedidoOffline.id)) continue
    paraAnteponer.push(pedidoOffline)
    idsPresentes.add(pedidoOffline.id)
  }

  if (paraAnteponer.length > 0) {
    return [...paraAnteponer, ...resultado]
  }

  return resultado
}
