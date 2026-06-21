import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('chefsy-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { imagen } = await request.json()
    if (!imagen) {
      return NextResponse.json({ error: 'Imagen requerida.' }, { status: 400 })
    }

    const matches = imagen.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: 'Formato base64 inválido' }, { status: 400 })
    }

    const mimeType = matches[1]
    const buffer = Buffer.from(matches[2], 'base64')
    const ext = mimeType.split('/')[1] || 'png'
    const fileName = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
