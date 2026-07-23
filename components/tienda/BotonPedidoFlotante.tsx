'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, X } from 'lucide-react'

const STORAGE_KEY = 'chefsy_pedido_activo'
const MAX_EDAD_HS = 4 // Desaparece solo si tiene más de 4 horas

export interface PedidoActivo {
  id: string
  clienteNombre: string
  tipoEntrega: 'delivery' | 'retiro'
  timestamp: number
  estado?: string
}

// Helpers para leer/escribir/limpiar el pedido activo
export function guardarPedidoActivo(data: Omit<PedidoActivo, 'timestamp'>) {
  try {
    const payload: PedidoActivo = { ...data, timestamp: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    // Disparar evento para que otros componentes en la misma pestaña se enteren
    window.dispatchEvent(new Event('pedidoActivo:cambio'))
  } catch {}
}

export function leerPedidoActivo(): PedidoActivo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: PedidoActivo = JSON.parse(raw)
    // Limpiar si expiró (más de MAX_EDAD_HS horas) o está terminado
    const horasTranscurridas = (Date.now() - data.timestamp) / 1000 / 3600
    if (horasTranscurridas > MAX_EDAD_HS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (data.estado === 'entregado' || data.estado === 'cancelado') {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function limpiarPedidoActivo() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event('pedidoActivo:cambio'))
  } catch {}
}

// ─── Componente Botón Flotante ────────────────────────────────────────────────
export default function BotonPedidoFlotante() {
  const [pedido, setPedido] = useState<PedidoActivo | null>(null)
  const [visible, setVisible] = useState(false)
  const [cerrado, setCerrado] = useState(false)
  const router = useRouter()

  const sincronizar = () => {
    const p = leerPedidoActivo()
    setPedido(p)
    if (p && !cerrado) setVisible(true)
    else setVisible(false)
  }

  useEffect(() => {
    sincronizar()

    // Escuchar cambios en la misma pestaña
    window.addEventListener('pedidoActivo:cambio', sincronizar)
    // Escuchar cambios de otras pestañas
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
