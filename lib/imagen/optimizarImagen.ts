import sharp from 'sharp'

interface OpcionesOptimizacion {
  maxAncho?: number
  maxAlto?: number
  calidad?: number
}

/**
 * Optimiza cualquier buffer de imagen a formato WebP ultraliviano para web.
 * - Dimensiones optimizadas para e-commerce gastronómico móvil/desktop: max 900x900px.
 * - Calidad WebP 75 (excelente nitidez visual con peso promedio de 30KB a 65KB).
 * - Elimina metadatos EXIF innecesarios de cámaras y celulares.
 */
export async function optimizarImagenWebP(
  bufferOriginal: Buffer,
  opciones: OpcionesOptimizacion = {}
): Promise<{ buffer: Buffer; contentType: string; ext: string; tamanoBytes: number }> {
  const maxAncho = opciones.maxAncho || 900
  const maxAlto = opciones.maxAlto || 900
  const calidad = opciones.calidad || 75

  try {
    const bufferOptimizado = await sharp(bufferOriginal)
      .rotate() // Auto-rotar según orientación EXIF de celulares
      .resize({
        width: maxAncho,
        height: maxAlto,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: calidad,
        effort: 5,
        smartSubsample: true,
      })
      .toBuffer()

    return {
      buffer: bufferOptimizado,
      contentType: 'image/webp',
      ext: 'webp',
      tamanoBytes: bufferOptimizado.length,
    }
  } catch (err) {
    console.warn('[Optimizador Sharp] Fallback por error al procesar con sharp:', err)
    return {
      buffer: bufferOriginal,
      contentType: 'image/jpeg',
      ext: 'jpg',
      tamanoBytes: bufferOriginal.length,
    }
  }
}
