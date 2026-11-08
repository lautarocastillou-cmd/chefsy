// Cola de impresión automática de comandas de cocina.
// Se apoya en la configuración local de la impresora porque cada PC tiene
// su propia comandera. La cola evita que dos pedidos se pisen cuando llegan
// juntos y el fallback por iframe necesita tiempo entre impresiones.

import { Pedido } from '@/tipos'
import { gestorImpresora } from './impresoraTermica'

const CLAVE_IMPRESOS = 'chefsy_comandas_autoimpresas_v1'
const MAX_REGISTROS = 250
const PAUSA_ENTRE_COMANDAS_MS = 1200

type ItemColaImpresion = {
  pedido: Pedido
  onError?: (error: unknown) => void
}

const cola: ItemColaImpresion[] = []
let procesando = false

function leerImpresos(): Record<string, number> {
  if (typeof window === 'undefined') return {}

  try {
    const guardado = localStorage.getItem(CLAVE_IMPRESOS)
    if (!guardado) return {}
    const parseado = JSON.parse(guardado)
    if (!parseado || typeof parseado !== 'object' || Array.isArray(parseado)) return {}
    return parseado as Record<string, number>
  } catch {
    return {}
  }
}

function guardarImpresos(registro: Record<string, number>): void {
  if (typeof window === 'undefined') return

  try {
    const recientes = Object.entries(registro)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_REGISTROS)
    localStorage.setItem(CLAVE_IMPRESOS, JSON.stringify(Object.fromEntries(recientes)))
  } catch {
    // Si el navegador bloquea localStorage, la cola y los bloqueos evitan duplicados inmediatos.
  }
}

function yaFueImpresa(id: string): boolean {
  return Boolean(leerImpresos()[id])
}

function marcarComoImpresa(id: string): void {
  const registro = leerImpresos()
  registro[id] = Date.now()
  guardarImpresos(registro)
}

type NavigatorConLocks = Navigator & {
  locks?: {
    request: (
      name: string,
      options: { ifAvailable: boolean },
      callback: (lock: unknown | null) => Promise<boolean>
    ) => Promise<boolean>
  }
}

async function reclamarImpresion(id: string): Promise<boolean> {
  if (yaFueImpresa(id)) return false

  // Chrome/Edge permiten coordinar pestañas abiertas en la misma PC.
  // Si otra pestaña ya tomó la comanda, esta no la vuelve a imprimir.
  const locks = (navigator as NavigatorConLocks).locks
  if (locks?.request) {
    try {
      return await locks.request(
        `chefsy-comanda-${id}`,
        { ifAvailable: true },
        async (lock) => {
          if (!lock || yaFueImpresa(id)) return false
          marcarComoImpresa(id)
          return true
        }
      )
    } catch (error) {
      console.warn('[Auto-impresión] No se pudo coordinar entre pestañas:', error)
    }
  }

  if (yaFueImpresa(id)) return false
  marcarComoImpresa(id)
  return true
}

async function procesarCola(): Promise<void> {
  if (procesando) return
  procesando = true

  try {
    while (cola.length > 0) {
      // Si se desactivó la auto-impresión, no seguir vaciando la cola.
      if (!gestorImpresora.obtenerConfiguracion().autoImprimirPedidosNuevos) {
        cola.length = 0
        break
      }

      const item = cola.shift()
      if (!item) continue

      try {
        await gestorImpresora.imprimirPedido(item.pedido, 'cocina')
      } catch (error) {
        console.error('[Auto-impresión] Error al imprimir comanda:', error)
        try {
          item.onError?.(error)
        } catch (callbackError) {
          console.error('[Auto-impresión] Error en el callback de error:', callbackError)
        }
      }

      if (cola.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, PAUSA_ENTRE_COMANDAS_MS))
      }
    }
  } finally {
    procesando = false
  }
}

export function encolarComandaAutomatica(
  pedido: Pedido,
  onError?: (error: unknown) => void
): void {
  if (typeof window === 'undefined') return
  if (!gestorImpresora.obtenerConfiguracion().autoImprimirPedidosNuevos) return
  if (pedido.estado === 'cancelado' || pedido.estado === 'entregado') return
  if (cola.some((item) => item.pedido.id === pedido.id)) return

  void (async () => {
    if (!(await reclamarImpresion(pedido.id))) return
    if (!gestorImpresora.obtenerConfiguracion().autoImprimirPedidosNuevos) return

    cola.push({ pedido, onError })
    void procesarCola()
  })().catch((error) => {
    console.error('[Auto-impresión] No se pudo encolar la comanda:', error)
  })
}
