import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'
import { extraerGoogleDriveFileIds, obtenerUrlsDirectasGoogleDrive } from '@/lib/gdrive'

export const dynamic = 'force-dynamic'

/**
 * Detecta el tipo de imagen mediante magic bytes
 */
function detectarTipoImagen(buffer: Buffer): { contentType: string; ext: string } | null {
  if (buffer.length < 8) return null

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { contentType: 'image/jpeg', ext: 'jpg' }
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47
  ) {
    return { contentType: 'image/png', ext: 'png' }
  }

  // GIF: GIF87a o GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return { contentType: 'image/gif', ext: 'gif' }
  }

  // WebP: RIFF....WEBP
  if (
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { contentType: 'image/webp', ext: 'webp' }
  }

  return null
}

/**
 * Descarga una imagen desde Google Drive utilizando diferentes endpoints de Google
 */
async function descargarImagenDeGoogleDrive(fileId: string): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const { thumbnailUrl, cdnUrl, downloadUrl } = obtenerUrlsDirectasGoogleDrive(fileId)

  // Lista priorizada de endpoints de descarga directa de Google
  const urlsAProbar = [thumbnailUrl, cdnUrl, downloadUrl]

  for (const url of urlsAProbar) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        redirect: 'follow',
      })

      if (!res.ok) continue

      const arrayBuf = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuf)

      if (buffer.length < 500) continue

      // Verificar si es imagen por magic bytes
      const infoTipo = detectarTipoImagen(buffer)
      if (infoTipo) {
        return { buffer, contentType: infoTipo.contentType, ext: infoTipo.ext }
      }

      // Si el header dice image/ pero no coincidieron magic bytes
      const headerType = res.headers.get('content-type') || ''
      if (headerType.startsWith('image/')) {
        const ext = headerType.split('/')[1]?.split(';')[0]?.replace('jpeg', 'jpg') || 'jpg'
        return { buffer, contentType: headerType, ext }
      }
    } catch (e) {
      console.warn(`[GDrive API] Intento fallido con URL ${url}:`, e)
    }
  }

  throw new Error(`No se pudo descargar la imagen (${fileId}). Verificá que el archivo en Google Drive tenga el enlace compartido como "Cualquier persona con el enlace".`)
}

export async function POST(req: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado. Se requiere sesión de administrador.' }, { status: 403 })
    }

    const body = await req.json()
    const { url, urls, fileId, texto } = body

    // Extraer todos los File IDs pasados en cualquiera de los campos
    const inputs: string[] = []
    if (fileId) inputs.push(fileId)
    if (url) inputs.push(url)
    if (texto) inputs.push(texto)
    if (Array.isArray(urls)) inputs.push(...urls)

    const idsDetectados = extraerGoogleDriveFileIds(inputs)

    if (idsDetectados.length === 0) {
      return NextResponse.json({
        error: 'No se detectaron enlaces o IDs válidos de Google Drive. Pegá enlaces de tipo "https://drive.google.com/file/d/..."',
      }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const resultados: { fileId: string; urlPublica: string; nombreArchivo: string }[] = []
    const errores: { fileId: string; error: string }[] = []

    for (const id of idsDetectados) {
      try {
        const { buffer, contentType, ext } = await descargarImagenDeGoogleDrive(id)
        const fileName = `gdrive_${Date.now()}_${id.substring(0, 10)}.${ext}`

        const { error: uploadError } = await supabaseAdmin.storage
          .from('images')
          .upload(fileName, buffer, {
            contentType,
            upsert: true,
          })

        if (uploadError) {
          throw new Error(`Error al guardar en Supabase Storage: ${uploadError.message}`)
        }

        const { data: publicData } = supabaseAdmin.storage
          .from('images')
          .getPublicUrl(fileName)

        resultados.push({
          fileId: id,
          urlPublica: publicData.publicUrl,
          nombreArchivo: fileName,
        })
      } catch (err: any) {
        errores.push({ fileId: id, error: err.message || 'Error procesando archivo' })
      }
    }

    if (resultados.length === 0 && errores.length > 0) {
      return NextResponse.json({
        error: errores[0].error,
        detalles: errores,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      importadas: resultados.length,
      items: resultados,
      urls: resultados.map(r => r.urlPublica),
      errores: errores.length > 0 ? errores : undefined,
    })
  } catch (error: any) {
    console.error('[GDrive API] Error interno:', error)
    return NextResponse.json({ error: error?.message || 'Error interno del servidor.' }, { status: 500 })
  }
}
