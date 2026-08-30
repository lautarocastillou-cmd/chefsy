import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'
import { optimizarImagenWebP } from '@/lib/imagen/optimizarImagen'

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado. Se requiere sesión de administrador.' }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''
    const url = new URL(request.url)
    
    let buffer: Buffer
    let mimeType: string
    let ext: string
    let oldUrl: string | null = url.searchParams.get('oldUrl')

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      if (!oldUrl) oldUrl = formData.get('oldUrl') as string | null
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: 'Archivo requerido.' }, { status: 400 })
      }
      buffer = Buffer.from(await file.arrayBuffer())
      mimeType = file.type || ''
      const nameParts = file.name ? file.name.split('.') : []
      ext = nameParts.length > 1 ? (nameParts.pop()?.toLowerCase() || 'png') : 'png'
    } else if (contentType.includes('application/json')) {
      const body = await request.json()
      const imagen = body.imagen || body.base64
      if (!oldUrl) oldUrl = body.oldUrl || null

      if (!imagen) {
        return NextResponse.json({ error: 'Imagen requerida.' }, { status: 400 })
      }

      if (imagen.includes(';base64,')) {
        const parts = imagen.split(';base64,')
        mimeType = parts[0].replace('data:', '') || 'image/jpeg'
        buffer = Buffer.from(parts[1], 'base64')
        ext = mimeType.split('/')[1] || 'jpg'
      } else {
        mimeType = 'image/jpeg'
        buffer = Buffer.from(imagen, 'base64')
        ext = 'jpg'
      }
    } else {
      const arrayBuffer = await request.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      if (buffer.length === 0) {
        return NextResponse.json({ error: 'Archivo requerido.' }, { status: 400 })
      }
      mimeType = contentType
      ext = mimeType.split('/')[1] || 'bin'
      const fileNameHeader = request.headers.get('x-file-name')
      if (fileNameHeader) {
        const nameParts = decodeURIComponent(fileNameHeader).split('.')
        if (nameParts.length > 1) {
          ext = nameParts.pop()?.toLowerCase() || ext
        }
      }
    }

    const esVideo = mimeType.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext)

    if (!esVideo) {
      // Optimizar cualquier imagen (JPEG, PNG, HEIC, HEIF, HEVC, WebP, AVIF) a WebP ultraliviano
      const optimizada = await optimizarImagenWebP(buffer, { maxAncho: 1200, maxAlto: 1200, calidad: 78 })
      buffer = optimizada.buffer
      mimeType = optimizada.contentType
      ext = optimizada.ext
    }

    const fileName = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (oldUrl) {
      try {
        const oldFileName = oldUrl.split('/').pop()?.split('?')[0]
        if (oldFileName && oldUrl.includes('supabase.co')) {
          await supabaseAdmin.storage.from('images').remove([oldFileName])
        }
      } catch (e) {
        console.error('[Upload API] Error al borrar archivo antiguo:', e)
      }
    }

    const { error } = await supabaseAdmin.storage
      .from('images')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      })

    if (error) {
      console.error('[Upload API] Error subiendo a Supabase:', error)
      return NextResponse.json({ error: 'Error al subir la imagen al servidor.' }, { status: 500 })
    }

    const { data: publicData } = supabaseAdmin.storage
      .from('images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      url: publicData.publicUrl,
      urlOriginal: publicData.publicUrl,
      urlTransformada: publicData.publicUrl
    })
  } catch (err: any) {
    console.error('[Upload API] Error interno:', err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
