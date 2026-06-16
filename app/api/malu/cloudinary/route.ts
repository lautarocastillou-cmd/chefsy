// ─────────────────────────────────────────────────────
// app/api/malu/cloudinary/route.ts
// Endpoint para subir imágenes a Cloudinary usando firmas
// seguras en el servidor y aplicar transformaciones automáticas (IA).
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import crypto from 'crypto'

async function verificarSesionMalu(request: Request): Promise<boolean> {
  const auth = request.headers.get('x-malu-auth')
  return auth === process.env.MALU_PASS
}

export async function POST(request: Request) {
  try {
    if (!await verificarSesionMalu(request)) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { imagen, transformacion } = await request.json()
    if (!imagen) {
      return NextResponse.json({ error: 'Imagen en base64 es requerida.' }, { status: 400 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    // Si las variables de Cloudinary no están configuradas
    if (!cloudName || !apiKey || !apiSecret || apiSecret.includes('***')) {
      console.warn('[Cloudinary API] Credenciales de Cloudinary no están totalmente configuradas. Usando modo simulación.')
      // Retornar un mock que simula la transformación
      let urlMock = imagen
      // Para simular de manera visual, podemos agregarle un borde o filtro visual al base64 si es necesario, 
      // pero devolver la misma imagen es suficiente para pruebas de interacción.
      return NextResponse.json({
        urlOriginal: imagen,
        urlTransformada: urlMock,
        modoDemo: true,
        mensaje: 'Modo simulación activo. Sube credenciales válidas en .env.local para procesar imágenes en la nube de Cloudinary.'
      })
    }

    // 1. Generar la firma de Cloudinary
    const timestamp = Math.round(new Date().getTime() / 1000)
    // El orden de las claves alfabéticamente para firmar es crítico
    const stringToSign = `timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex')

    // 2. Construir FormData
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
      console.error('[Cloudinary API] Error al subir a Cloudinary:', err)
      throw new Error(err.error?.message || `Error ${response.status} de Cloudinary`)
    }

    const uploadData = await response.json()
    const secureUrl = uploadData.secure_url

    // 3. Aplicar transformaciones al URL retornado
    let urlTransformada = secureUrl
    if (transformacion === 'eliminar_fondo') {
      // e_background_removal elimina el fondo con la IA de Cloudinary
      urlTransformada = secureUrl.replace('/image/upload/', '/image/upload/e_background_removal/')
    } else if (transformacion === 'mejorar_iluminacion') {
      // e_improve mejora color y luces automáticamente
      urlTransformada = secureUrl.replace('/image/upload/', '/image/upload/e_improve/')
    }

    return NextResponse.json({
      urlOriginal: secureUrl,
      urlTransformada,
      modoDemo: false
    })

  } catch (error: any) {
    console.error('[Cloudinary API] Error en backend:', error)
    return NextResponse.json(
      { error: 'Error al subir la imagen.' },
      { status: 500 }
    )
  }
}
