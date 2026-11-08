'use client'

// ─────────────────────────────────────────────────────────────────────────────
// components/ui/ChefsyToast.tsx
// Render propio de los toasts de react-hot-toast.
//
// POR QUÉ EXISTE
// El toast por defecto entra desde 200% abajo con un rebote de 350 ms y una
// estética azul marino genérica. Acá usamos el renderer de <Toaster children>
// para tener control total: tarjeta compacta con la paleta de Chefsy, icono en
// chip verde y una entrada/salida corta (150 ms / 120 ms) sin overshoot.
//
// La salida la maneja react-hot-toast: al hacer dismiss pone `visible: false`,
// nuestro CSS aplica la animación de salida y `removeDelay` (ver
// ToasterProvider) desmonta el nodo justo cuando termina.
// ─────────────────────────────────────────────────────────────────────────────

import { AlertCircle, AlertTriangle, Check, ChefHat, Info, Loader2 } from 'lucide-react'
import { resolveValue, type Toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { CLASE_AVISO, CLASE_INFO } from '@/lib/notificaciones'

type Tono = 'neutral' | 'exito' | 'aviso' | 'error'

const CHIP: Record<Tono, string> = {
  neutral: 'border-chefsy-300/25 bg-chefsy-500/15 text-chefsy-200',
  exito: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  aviso: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
  error: 'border-rose-400/25 bg-rose-500/10 text-rose-300',
}

function esClase(t: Toast, clase: string): boolean {
  return typeof t.className === 'string' && t.className.includes(clase)
}

function tonoDe(t: Toast): Tono {
  if (t.type === 'error') return 'error'
  if (t.type === 'success') return 'exito'
  // react-hot-toast no tiene un tipo "warning": los avisos se marcan con una
  // clase desde lib/notificaciones.tsx.
  if (esClase(t, CLASE_AVISO)) return 'aviso'
  return 'neutral'
}

function Icono({ toast }: { toast: Toast }) {
  // Un icono explícito siempre gana.
  if (toast.icon !== undefined) {
    return typeof toast.icon === 'string'
      ? <span className="text-[14px] leading-none">{toast.icon}</span>
      : <>{toast.icon}</>
  }

  if (toast.type === 'success') return <Check size={15} strokeWidth={2.75} />
  if (toast.type === 'error') return <AlertCircle size={15} strokeWidth={2.5} />
  if (toast.type === 'loading') {
    return <Loader2 size={15} strokeWidth={2.5} className="animate-spin" />
  }
  if (esClase(toast, CLASE_AVISO)) return <AlertTriangle size={15} strokeWidth={2.5} />
  if (esClase(toast, CLASE_INFO)) return <Info size={15} strokeWidth={2.5} />
  // Marca por defecto de los avisos neutros: el gorro de chef, no un sparkle.
  return <ChefHat size={15} strokeWidth={2.2} />
}

export default function ChefsyToast({ toast }: { toast: Toast }) {
  const tono = tonoDe(toast)

  return (
    <div
      {...toast.ariaProps}
      data-visible={toast.visible ? 'true' : 'false'}
      className={cn(
        'chefsy-toast flex max-w-[min(92vw,26rem)] items-center gap-2.5 rounded-[14px] border border-white/[0.08] bg-[#141416] py-2 pl-2 pr-3.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.95),0_2px_8px_rgba(0,0,0,0.35)]',
        !toast.visible && 'pointer-events-none'
      )}
    >
      <span
        className={cn(
          'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] border',
          CHIP[tono]
        )}
      >
        <Icono toast={toast} />
      </span>

      <span className="text-[13px] font-semibold leading-snug tracking-[-0.01em] text-[#F2F4F0]">
        {resolveValue(toast.message, toast)}
      </span>
    </div>
  )
}
