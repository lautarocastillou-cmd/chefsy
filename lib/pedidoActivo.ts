// -----------------------------------------------------
// lib/pedidoActivo.ts
// Funciones puras de lectura/escritura de pedidos activos
// en localStorage. Extraídas de BotonPedidoFlotante.tsx
// para evitar que CarritoContexto importe de un componente React.
// -----------------------------------------------------

import { PedidoActivo } from '@/tipos'

const STORAGE_KEY = 'chefsy_pedidos_activos'
const MAX_EDAD_HS = 4    // Expira si tiene mas de 4 horas
const MAX_PEDIDOS = 3    // Maximo 3 pedidos en paralelo

function esPedidoExpirado(p: PedidoActivo): boolean {
  const hs = (Date.now() - p.timestamp) / 1000 / 3600
  return hs > MAX_EDAD_HS || p.estado === 'entregado' || p.estado === 'cancelado'
}

function leerArray(): PedidoActivo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr: PedidoActivo[] = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(p => !esPedidoExpirado(p))
  } catch { return [] }
}

function escribirArray(arr: PedidoActivo[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
    window.dispatchEvent(new Event('pedidoActivo:cambio'))
  } catch {}
}

/** Agrega o actualiza un pedido activo en el array de localStorage */
export function guardarPedidoActivo(data: Omit<PedidoActivo, 'timestamp'>) {
  try {
    const arr = leerArray()
    const idx = arr.findIndex(p => p.id === data.id)
    const payload: PedidoActivo = { ...data, timestamp: idx >= 0 ? arr[idx].timestamp : Date.now() }
    if (idx >= 0) {
      arr[idx] = payload
    } else {
      arr.unshift(payload)
      if (arr.length > MAX_PEDIDOS) arr.pop()
    }
    escribirArray(arr)
  } catch {}
}

/** Devuelve el pedido activo mas reciente (para el boton flotante) */
export function leerPedidoActivo(): PedidoActivo | null {
  const arr = leerArray()
  return arr.length > 0 ? arr[0] : null
}

/** Devuelve todos los pedidos activos */
export function leerTodosPedidosActivos(): PedidoActivo[] {
  return leerArray()
}

/** Elimina un pedido especifico (o todos) del array */
export function limpiarPedidoActivo(id?: string) {
  try {
    if (!id) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      const arr = leerArray().filter(p => p.id !== id)
      escribirArray(arr)
    }
    window.dispatchEvent(new Event('pedidoActivo:cambio'))
  } catch {}
}
