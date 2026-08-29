import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'
import { extraerGoogleDriveFileId, obtenerUrlsDirectasGoogleDrive } from '@/lib/gdrive'

export const dynamic = 'force-dynamic'

/**
 * Descarga una imagen desde Google Drive utilizando diferentes endpoints de Google
 */
async function descargarImagenDeGoogleDrive(fileId: string): Promise<{ buffer: Buffer; contentType: string }> {
  const { cdnUrl, downloadUrl, thumbnailUrl } = obtenerUrlsDirectasGoogleDrive(fileId)

  // Intentar primero con el CDN de alta velocidad de Google
  const urlsAProbar = [cdnUrl, downloadUrl, thumbnailUrl]

  for (const url of urlsAProbar) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        redirect: 'follow',
      })

      if (!res.ok) continue

      const contentType = res.headers.get('content-type') || ''
      // Verificar que realmente sea una imagen y no una página HTML de advertencia de virus o login
      if (contentType.startsWith('image/')) {
        const arrayBuf = await res.arrayBuffer()
        const buffer = Buffer.from(arrayBuf)
        if (buffer.length > 500) {
          return { buffer, contentType }
        }
      }
    } catch (e) {
      console.warn(`[GDrive API] Intento fallido con URL ${url}:`, e)
    }
  }

  throw new Error('No se pudo acceder a la imagen de Google Drive. Asegurate de que el archivo tenga el enlace compartido como "Cualquier persona con el enlace".')
}

export async function POST(req: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado. Se requiere sesión de administrador.' }, { status: 403 })
    }

    const body = await req.json()
    const { url, urls, fileId } = body

    // Lista de enlaces o IDs a procesar
    const listaInputs: string[] = []
    if (fileId) listaInputs.push(fileId)
    if (url) listaInputs.push(url)
    if (Array.isArray(urls)) listaInputs.push(...urls)

    if (listaInputs.length === 0) {
      return NextResponse.json({ error: 'Se requiere un enlace o ID de Google Drive.' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const resultados: { fileId: string; urlOriginal: string; urlPublica: string }[] = []
    const errores: { input: string; error: string }[] = []

    for (const input of listaInputs) {
      const idExtraido = extraerGoogleDriveFileId(input)
      if (!idExtraido) {
        errores.push({ input, error: 'Formato de enlace de Google Drive inválido' })
        continue
      }

      try {
        const { buffer, contentType } = await descargarImagenDeGoogleDrive(idExtraido)
        const ext = contentType.split('/')[1]?.split(';')[0]?.replace('jpeg', 'jpg') || 'jpg'
        const fileName = `gdrive_${Date.now()}_${idExtraido.substring(0, 8)}.${ext}`

        const { error: uploadError } = await supabaseAdmin.storage
          .from('images')
          .upload(fileName, buffer, {
            contentType,
            upsert: true,
          })

        if (uploadError) {
          throw new Error(`Error subiendo a Supabase Storage: ${uploadError.message}`)
        }

        const { data: publicData } = supabaseAdmin.storage
          .from('images')
          .getPublicUrl(fileName)

        resultados.push({
          fileId: idExtraido,
          urlOriginal: input,
          urlPublica: publicData.publicUrl,
        })
      } catch (err: any) {
        errores.push({ input, error: err.message || 'Error procesando archivo' })
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
      errores: errores.length > 0 ? errores : undefined,
    })
  } catch (error: any) {
    console.error('[GDrive API] Error interno:', error)
    return NextResponse.json({ error: error?.message || 'Error interno del servidor.' }, { status: 500 })
  }
}
