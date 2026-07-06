import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'

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
      mimeType = file.type
      ext = mimeType.split('/')[1] || 'png'
    } else if (contentType.includes('application/json')) {
      const body = await request.json()
      const imagen = body.imagen
      if (!oldUrl) oldUrl = body.oldUrl || null

      if (!imagen) {
        return NextResponse.json({ error: 'Imagen requerida.' }, { status: 400 })
      }

      const matches = imagen.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
      if (!matches || matches.length !== 3) {
        return NextResponse.json({ error: 'Formato base64 inválido' }, { status: 400 })
      }

      mimeType = matches[1]
      buffer = Buffer.from(matches[2], 'base64')
      ext = mimeType.split('/')[1] || 'png'
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
          ext = nameParts.pop() || ext
        }
      }
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
      urlOriginal: publicData.publicUrl,
      urlTransformada: publicData.publicUrl
    })
  } catch (err: any) {
    console.error('[Upload API] Error interno:', err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
