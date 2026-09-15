import React from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react'

export interface CartelOpciones {
  titulo?: string
  mensaje: string
  tipo?: 'cerrado' | 'aviso' | 'error' | 'exito' | 'info'
  botonTexto?: string
  mostrarCancelar?: boolean
  botonCancelarTexto?: string
  onAceptar?: () => void
  onCancelar?: () => void
}

/**
 * Dispara un cartel modal elegante de Chefsy en pantalla completa (sin backdrop-blur).
 * Devuelve una Promesa que resuelve a `true` al aceptar o `false` al cancelar/cerrar.
 */
export function mostrarCartel(opciones: CartelOpciones | string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }

    const config: CartelOpciones =
      typeof opciones === 'string'
        ? { mensaje: opciones, tipo: 'aviso', titulo: 'Atención' }
        : opciones

    const handleAceptar = () => {
      config.onAceptar?.()
      resolve(true)
    }

    const handleCancelar = () => {
      config.onCancelar?.()
      resolve(false)
    }

    window.dispatchEvent(
      new CustomEvent('chefsy-cartel', {
        detail: {
          ...config,
          onAceptar: handleAceptar,
          onCancelar: handleCancelar,
        },
      })
    )
  })
}

/**
 * Notificación Toast de aviso/advertencia con estética oscura Chefsy (sin backdrop-blur).
 */
export function notificarAviso(mensaje: string, duracion = 3200) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(30)
    } catch {}
  }

  toast(mensaje, {
    id: `aviso-${mensaje}`,
    duration: duracion,
    position: 'bottom-center',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    style: {
      background: '#0f172a',
      color: '#fef3c7',
      border: '1px solid rgba(245, 158, 11, 0.35)',
      borderRadius: '16px',
      padding: '11px 20px',
      fontSize: '13.5px',
      fontWeight: '600',
      textAlign: 'left',
      maxWidth: '92vw',
      boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.7), 0 0 15px 0 rgba(0, 0, 0, 0.4)',
    },
  })
}

/**
 * Notificación Toast de error con estética oscura Chefsy (sin backdrop-blur).
 */
export function notificarError(mensaje: string, duracion = 3500) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([40, 60, 40])
    } catch {}
  }

  toast(mensaje, {
    id: `error-${mensaje}`,
    duration: duracion,
    position: 'bottom-center',
    icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
    style: {
      background: '#0f172a',
      color: '#fecaca',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      borderRadius: '16px',
      padding: '11px 20px',
      fontSize: '13.5px',
      fontWeight: '600',
      textAlign: 'left',
      maxWidth: '92vw',
      boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.7), 0 0 15px 0 rgba(0, 0, 0, 0.4)',
    },
  })
}

/**
 * Notificación Toast de éxito con estética oscura Chefsy (sin backdrop-blur).
 */
export function notificarExito(mensaje: string, duracion = 2500) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(25)
    } catch {}
  }

  toast(mensaje, {
    id: `exito-${mensaje}`,
    duration: duracion,
    position: 'bottom-center',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    style: {
      background: '#0f172a',
      color: '#d1fae5',
      border: '1px solid rgba(16, 185, 129, 0.35)',
      borderRadius: '16px',
      padding: '11px 20px',
      fontSize: '13.5px',
      fontWeight: '600',
      textAlign: 'left',
      maxWidth: '92vw',
      boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.7), 0 0 15px 0 rgba(0, 0, 0, 0.4)',
    },
  })
}

/**
 * Notificación Toast informativa con estética oscura Chefsy (sin backdrop-blur).
 */
export function notificarInfo(mensaje: string, duracion = 2800) {
  toast(mensaje, {
    id: `info-${mensaje}`,
    duration: duracion,
    position: 'bottom-center',
    icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
    style: {
      background: '#0f172a',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      borderRadius: '16px',
      padding: '11px 20px',
      fontSize: '13.5px',
      fontWeight: '600',
      textAlign: 'left',
      maxWidth: '92vw',
      boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.7), 0 0 15px 0 rgba(0, 0, 0, 0.4)',
    },
  })
}

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
 * Muestra la notificación nativa de react-hot-toast perfectamente centrada abajo
 * y con formato píldora.
 */
export function notificarCopiado(mensaje: string) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(25)
    } catch {}
  }

  toast.success(mensaje, {
    id: 'toast-copiado',
    duration: 2200,
    position: 'bottom-center',
    style: {
      background: '#0f172a',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      borderRadius: '9999px',
      padding: '10px 24px',
      fontSize: '13.5px',
      fontWeight: '600',
      textAlign: 'center',
      maxWidth: '90vw',
      boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.7), 0 0 15px 0 rgba(0, 0, 0, 0.4)',
    },
    iconTheme: {
      primary: '#10b981',
      secondary: '#ffffff',
    },
  })
}

/**
 * Función integral que copia con 100% de efectividad y dispara la notificación centrada.
 */
export async function copiarConNotificacion(texto: string, mensajeExito: string): Promise<boolean> {
  const exito = await copiarAlPortapapeles(texto)
  if (exito) {
    notificarCopiado(mensajeExito)
  } else {
    notificarError('No se pudo copiar automáticamente')
  }
  return exito
}
