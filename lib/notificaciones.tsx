import React from 'react'
import toast from 'react-hot-toast'
import { Check } from 'lucide-react'

/**
 * Copia texto al portapapeles con 100% de efectividad utilizando:
 * 1. navigator.clipboard.writeText (API moderna rápida)
 * 2. Fallback robusto con textarea oculta + document.execCommand('copy')
 */
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  // Intento 1: API moderna asíncrona
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto)
      return true
    } catch {
      // Si falla por falta de foco o permisos, pasa al fallback
    }
  }

  // Intento 2: Fallback clásico infalible
  try {
    const textarea = document.createElement('textarea')
    textarea.value = texto
    textarea.style.position = 'fixed'
    textarea.style.left = '-999999px'
    textarea.style.top = '-999999px'
    textarea.style.opacity = '0'
    textarea.setAttribute('readonly', '')
    document.body.appendChild(textarea)

    textarea.focus({ preventScroll: true })
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)

    const exito = document.execCommand('copy')
    document.body.removeChild(textarea)
    return exito
  } catch (err) {
    console.error('Fallo al copiar:', err)
    return false
  }
}

/**
 * Muestra la notificación animada bonita, perfectamente centrada abajo y sin cortes de texto.
 */
export function notificarCopiado(mensaje: string) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(25)
    } catch {}
  }

  toast.custom(
    (t) => (
      <div
        className={`flex items-center justify-center gap-2.5 bg-[#0b1120] text-slate-100 border border-white/20 px-5 py-2.5 rounded-full shadow-2xl shadow-black/90 text-xs sm:text-sm font-semibold tracking-wide transition-all duration-200 pointer-events-none mx-auto select-none ${
          t.visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        <div className="w-5 h-5 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-400 flex items-center justify-center shrink-0">
          <Check size={12} strokeWidth={3} />
        </div>
        <span className="text-center whitespace-nowrap text-slate-100">
          {mensaje}
        </span>
      </div>
    ),
    {
      id: mensaje,
      duration: 2200,
      position: 'bottom-center',
    }
  )
}

/**
 * Función integral que copia con 100% de efectividad y dispara la notificación centrada.
 */
export async function copiarConNotificacion(texto: string, mensajeExito: string): Promise<boolean> {
  const exito = await copiarAlPortapapeles(texto)
  if (exito) {
    notificarCopiado(mensajeExito)
  } else {
    toast.error('No se pudo copiar automáticamente', {
      duration: 2200,
      style: {
        background: '#0b1120',
        color: '#f8fafc',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '9999px',
        padding: '10px 18px',
        fontSize: '13px',
        fontWeight: '600',
        textAlign: 'center',
        margin: '0 auto',
      },
    })
  }
  return exito
}
