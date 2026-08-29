// ─────────────────────────────────────────────────────
// lib/imagen/quitarFondo.ts
// Motor de eliminación de fondo con Inteligencia Artificial
// para platos de comida y productos gastronómicos.
// ─────────────────────────────────────────────────────

/**
 * Convierte un Blob a una cadena DataURL Base64
 */
export function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Recorta y elimina el fondo de una imagen de comida utilizando IA en el navegador.
 * @param imagenUrlOrBase64 URL remota o string Base64 data:image/...
 * @param onProgreso Callback opcional de progreso (0% a 100%)
 * @returns Cadena Base64 con el fondo transparente (PNG)
 */
export async function recortarFondoComida(
  imagenUrlOrBase64: string,
  onProgreso?: (porcentaje: number, mensaje: string) => void
): Promise<string> {
  try {
    if (onProgreso) onProgreso(10, 'Cargando modelo de Inteligencia Artificial...')

    // Carga diferida dinámica de la librería de IA para no penalizar la carga inicial de la web
    const { removeBackground } = await import('@imgly/background-removal')

    if (onProgreso) onProgreso(30, 'Analizando bordes y comida en la foto...')

    // Si es una URL remota que podría tener problemas de CORS, podemos fetchearla primero como blob
    let inputFuente: string | Blob = imagenUrlOrBase64

    if (imagenUrlOrBase64.startsWith('http://') || imagenUrlOrBase64.startsWith('https://')) {
      try {
        const respuesta = await fetch(imagenUrlOrBase64, { mode: 'cors' })
        if (respuesta.ok) {
          inputFuente = await respuesta.blob()
        }
      } catch (errCors) {
        console.warn('Fallback a URL directa por política de CORS:', errCors)
        inputFuente = imagenUrlOrBase64
      }
    }

    if (onProgreso) onProgreso(50, 'Recortando cables, manteles y fondo...')

    const blobResultado = await removeBackground(inputFuente, {
      progress: (key: string, current: number, total: number) => {
        if (onProgreso && total > 0) {
          const ratio = Math.min(1, current / total)
          const pct = Math.round(50 + ratio * 40)
          onProgreso(pct, `Segmentando plato... ${Math.round(ratio * 100)}%`)
        }
      },
    })

    if (onProgreso) onProgreso(95, 'Generando imagen PNG transparente...')

    const base64Final = await blobABase64(blobResultado)

    if (onProgreso) onProgreso(100, '¡Fondo eliminado con éxito!')

    return base64Final
  } catch (error: any) {
    console.error('[Recorte IA] Error eliminando fondo:', error)
    throw new Error(error?.message || 'No se pudo eliminar el fondo de la imagen.')
  }
}
