import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // 1. Verificar sesión de administrador usando el token
    const cookieStore = await cookies()
    const token = cookieStore.get('chefsy-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { imagen, transformacion } = await request.json()
    if (!imagen) {
      return NextResponse.json({ error: 'Imagen en base64 es requerida.' }, { status: 400 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret || apiSecret.includes('***')) {
      return NextResponse.json({
        urlOriginal: imagen,
        urlTransformada: imagen,
        modoDemo: true,
        mensaje: 'Modo simulación activo. Faltan credenciales.'
      })
    }

    const timestamp = Math.round(new Date().getTime() / 1000)
    const stringToSign = `timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex')

    const formData = new FormData()
    formData.append('file', imagen)
    formData.append('timestamp', String(timestamp))
    formData.append('api_key', apiKey)
    formData.append('signature', signature)

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `Error ${response.status} de Cloudinary`)
    }

    const uploadData = await response.json()
    const secureUrl = uploadData.secure_url

    let urlTransformada = secureUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_800/')
    if (transformacion === 'eliminar_fondo') {
      urlTransformada = secureUrl.replace('/image/upload/', '/image/upload/e_background_removal,f_auto,q_auto,w_800/')
    }

    return NextResponse.json({
      urlOriginal: secureUrl,
      urlTransformada,
      modoDemo: false
    })

  } catch (error: any) {
    console.error('[Cloudinary Admin API] Error:', error)
    return NextResponse.json({ error: 'Error al subir la imagen.' }, { status: 500 })
  }
}
