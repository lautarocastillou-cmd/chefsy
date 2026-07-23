'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, X } from 'lucide-react'

const STORAGE_KEY = 'chefsy_pedidos_activos'
const MAX_EDAD_HS = 4     // Expira si tiene más de 4 horas
const MAX_PEDIDOS  = 3    // Máximo 3 pedidos en paralelo

export interface PedidoActivo {
  id: string
  clienteNombre: string
  tipoEntrega: 'delivery' | 'retiro'
  timestamp: number
  estado?: string
}

// ── Helpers internos ──────────────────────────────────────────────────────────

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
    // Filtrar expirados
    return arr.filter(p => !esPedidoExpirado(p))
  } catch { return [] }
}

function escribirArray(arr: PedidoActivo[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
    window.dispatchEvent(new Event('pedidoActivo:cambio'))
  } catch {}
}

// ── API pública ───────────────────────────────────────────────────────────────

/** Agrega o actualiza un pedido activo en el array localStorage */
export function guardarPedidoActivo(data: Omit<PedidoActivo, 'timestamp'>) {
  try {
    const arr = leerArray()
    const idx = arr.findIndex(p => p.id === data.id)
    const payload: PedidoActivo = { ...data, timestamp: idx >= 0 ? arr[idx].timestamp : Date.now() }
    if (idx >= 0) {
      arr[idx] = payload  // Actualizar existente (estado, etc.)
    } else {
      arr.unshift(payload)  // Agregar al principio (más reciente primero)
      if (arr.length > MAX_PEDIDOS) arr.pop()  // Limitar a MAX_PEDIDOS
    }
    escribirArray(arr)
  } catch {}
}

/** Devuelve el pedido activo más reciente (para el botón flotante) */
export function leerPedidoActivo(): PedidoActivo | null {
  const arr = leerArray()
  return arr.length > 0 ? arr[0] : null
}

/** Devuelve todos los pedidos activos */
export function leerTodosPedidosActivos(): PedidoActivo[] {
  return leerArray()
}

/** Elimina un pedido específico del array */
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

// ── Componente Botón Flotante ─────────────────────────────────────────────────
export default function BotonPedidoFlotante() {
  const [pedido, setPedido] = useState<PedidoActivo | null>(null)
  const [cantidadExtra, setCantidadExtra] = useState(0)
  const [visible, setVisible] = useState(false)
  const [cerrado, setCerrado] = useState(false)
  const router = useRouter()

  const sincronizar = () => {
    const todos = leerTodosPedidosActivos()
    const primero = todos[0] ?? null
    setPedido(primero)
    setCantidadExtra(Math.max(0, todos.length - 1))
    if (primero && !cerrado) setVisible(true)
    else setVisible(false)
  }

  useEffect(() => {
    sincronizar()
    window.addEventListener('pedidoActivo:cambio', sincronizar)
    window.addEventListener('storage', sincronizar)
    return () => {
      window.removeEventListener('pedidoActivo:cambio', sincronizar)
      window.removeEventListener('storage', sincronizar)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cerrado])

  if (!visible || !pedido) return null

  return (
    <div
      className="fixed bottom-28 right-4 z-[999] flex items-center gap-2 animate-in slide-in-from-right-4 duration-300"
      style={{ filter: 'drop-shadow(0 4px 24px rgba(16,185,129,0.4))' }}
    >
      {/* Botón principal */}
      <button
        onClick={() => router.push(`/cadete-en-vivo/${pedido.id}`)}
        className="group relative flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs px-4 py-3 rounded-2xl shadow-2xl transition-all duration-200 active:scale-95 border border-emerald-400/40"
      >
        {/* Pulso animado */}
        <span className="absolute -top-1 -right-1 w-3 h-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300" />
        </span>

        <MapPin size={16} className="shrink-0" />
        <span className="tracking-wide">SEGUIR MI PEDIDO</span>
        {/* Badge de pedidos extra */}
        {cantidadExtra > 0 && (
          <span className="ml-0.5 bg-white/25 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shrink-0">
            +{cantidadExtra}
          </span>
        )}
      </button>

      {/* Botón cerrar */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setCerrado(true)
          setVisible(false)
        }}
        className="w-7 h-7 rounded-full bg-[#252525] border border-[#3d3d3d] flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#333] transition-colors shadow-lg"
        aria-label="Cerrar"
      >
        <X size={13} />
      </button>
    </div>
  )
}
