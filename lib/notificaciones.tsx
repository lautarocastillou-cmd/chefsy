import toast from 'react-hot-toast'

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
 * y con formato píldora en una sola línea.
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
      whiteSpace: 'nowrap',
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
    toast.error('No se pudo copiar automáticamente', {
      duration: 2200,
      position: 'bottom-center',
      style: {
        background: '#0f172a',
        color: '#f8fafc',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '9999px',
        padding: '10px 20px',
        fontSize: '13px',
        fontWeight: '600',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      },
    })
  }
  return exito
}
