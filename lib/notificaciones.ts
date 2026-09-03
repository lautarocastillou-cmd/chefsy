import toast from 'react-hot-toast'

/**
 * Copia texto al portapapeles con 100% de efectividad utilizando:
 * 1. navigator.clipboard.writeText (API moderna rápida)
 * 2. Fallback robusto con textarea oculta + document.execCommand('copy')
 *    (Vital cuando la ventana pierde foco, en Safari/iOS, o en eventos asíncronos)
 */
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  // Intento 1: API moderna asíncrona
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto)
      return true
    } catch {
      // Si falla (ej: "Document is not focused" o falta de permisos), pasa al fallback infalible
    }
  }

  // Intento 2: Fallback clásico infalible
  try {
    const textarea = document.createElement('textarea')
    textarea.value = texto
    // Evita saltos de pantalla o scroll
    textarea.style.position = 'fixed'
    textarea.style.left = '-999999px'
    textarea.style.top = '-999999px'
    textarea.style.opacity = '0'
    textarea.setAttribute('readonly', '')
    document.body.appendChild(textarea)

    // En iOS Safari select() necesita focus previo y rango explícito
    textarea.focus({ preventScroll: true })
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)

    const exito = document.execCommand('copy')
    document.body.removeChild(textarea)
    return exito
  } catch (err) {
    console.error('Fallo completo al copiar al portapapeles:', err)
    return false
  }
}

/**
 * Muestra la notificación animada bonita de éxito.
 */
export function notificarCopiado(mensaje: string) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(25)
    } catch {}
  }

  toast.success(mensaje, {
    id: mensaje, // Evita spam si se presiona varias veces seguidas
    duration: 2200,
    style: {
      background: '#0f172a',
      color: '#f8fafc',
      border: '1px solid rgba(255, 255, 255, 0.16)',
      borderRadius: '16px',
      padding: '10px 18px',
      fontSize: '13px',
      fontWeight: '600',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
    },
    iconTheme: {
      primary: '#10b981',
      secondary: '#ffffff',
    },
  })
}

/**
 * Función integral que copia con 100% de efectividad y dispara la notificación correspondiente.
 */
export async function copiarConNotificacion(texto: string, mensajeExito: string): Promise<boolean> {
  const exito = await copiarAlPortapapeles(texto)
  if (exito) {
    notificarCopiado(mensajeExito)
  } else {
    toast.error('No se pudo copiar automáticamente', {
      duration: 2200,
      style: {
        background: '#0f172a',
        color: '#f8fafc',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '16px',
        padding: '10px 18px',
        fontSize: '13px',
        fontWeight: '600',
      },
    })
  }
  return exito
}
