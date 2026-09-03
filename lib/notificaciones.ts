import toast from 'react-hot-toast'

/**
 * Muestra una notificación sobria, elegante y rápida al copiar al portapapeles.
 * Evita el alert() nativo que bloquea la pantalla con botón "Aceptar".
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
