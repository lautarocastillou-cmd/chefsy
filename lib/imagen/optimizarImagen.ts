import sharp from 'sharp'
import heicConvert from 'heic-convert'

interface OpcionesOptimizacion {
  maxAncho?: number
  maxAlto?: number
  calidad?: number
  esHeic?: boolean
}

/**
 * Detecta si los magic bytes corresponden a un contenedor HEIC/HEIF/HEVC
 */
function esBufferHeic(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false
  const ftyp = buffer.slice(4, 8).toString('ascii')
  if (ftyp === 'ftyp') {
    const brand = buffer.slice(8, 12).toString('ascii').toLowerCase()
    return ['heic', 'heix', 'hevc', 'hevx', 'heif', 'mif1', 'msf1'].includes(brand)
  }
  return false
}

/**
 * Optimiza cualquier buffer de imagen a formato WebP ultraliviano para web.
 * - Soporte nativo para HEIC / HEIF / HEVC (iPhone, Samsung) mediante heic-convert + Sharp.
 * - Dimensiones optimizadas para e-commerce gastronómico móvil/desktop: max 900x900px.
 * - Calidad WebP 75 (excelente nitidez visual con peso promedio de 30KB a 65KB).
 * - Elimina metadatos EXIF innecesarios y auto-rota según la posición de la cámara.
 */
export async function optimizarImagenWebP(
  bufferOriginal: Buffer,
  opciones: OpcionesOptimizacion = {}
): Promise<{ buffer: Buffer; contentType: string; ext: string; tamanoBytes: number }> {
  const maxAncho = opciones.maxAncho || 900
  const maxAlto = opciones.maxAlto || 900
  const calidad = opciones.calidad || 75

  let bufferAProcesar = bufferOriginal

  // 1. Si es HEIC/HEVC, convertir primero a JPEG estándar con heic-convert (libde265 WASM)
  if (opciones.esHeic || esBufferHeic(bufferOriginal)) {
    try {
      const jpegConvertido = await heicConvert({
        buffer: bufferOriginal,
        format: 'JPEG',
        quality: 0.92,
      })
      bufferAProcesar = Buffer.from(jpegConvertido)
    } catch (heicErr) {
      console.warn('[Optimizador HEIC] Error al convertir HEIC con heic-convert:', heicErr)
    }
  }

  // 2. Procesar con Sharp hacia WebP
  try {
    const bufferOptimizado = await sharp(bufferAProcesar, {
      failOn: 'none',
      animated: false,
    })
      .rotate() // Auto-rotar según orientación EXIF de celulares (iPhone/Android)
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
  } catch (sharpErr) {
    console.warn('[Optimizador Sharp] Primer intento con Sharp falló, probando fallback heic-convert:', sharpErr)
    
    // Si falló y no habíamos probado heic-convert, intentamos heic-convert como último recurso
    try {
      const jpegConvertido = await heicConvert({
        buffer: bufferOriginal,
        format: 'JPEG',
        quality: 0.90,
      })
      const bufferJpg = Buffer.from(jpegConvertido)
      const bufferFinal = await sharp(bufferJpg)
        .rotate()
        .resize({ width: maxAncho, height: maxAlto, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: calidad })
        .toBuffer()

      return {
        buffer: bufferFinal,
        contentType: 'image/webp',
        ext: 'webp',
        tamanoBytes: bufferFinal.length,
      }
    } catch (errFallback) {
      console.error('[Optimizador Sharp] Fallback falló completamente:', errFallback)
      return {
        buffer: bufferOriginal,
        contentType: 'image/jpeg',
        ext: 'jpg',
        tamanoBytes: bufferOriginal.length,
      }
    }
  }
}
