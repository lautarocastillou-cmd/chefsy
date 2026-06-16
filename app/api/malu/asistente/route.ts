// ─────────────────────────────────────────────────────
// app/api/malu/asistente/route.ts
// Endpoint del Asistente Personal de IA (Gemini 2.5 Flash).
// Procesa textos, historial e imágenes (multimodal).
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'

async function verificarSesionMalu(request: Request): Promise<boolean> {
  const auth = request.headers.get('x-malu-auth')
  return auth === process.env.MALU_PASS
}

export async function POST(request: Request) {
  try {
    if (!await verificarSesionMalu(request)) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { mensaje, historial, contexto, imagenDataUrl } = await request.json()
    const apiKey = process.env.GEMINI_API_KEY

    // Instrucción de Sistema estricta
    const systemInstruction = 
      "Eres el asistente personal de Abril, dueña de 'Malú Clothing', una boutique de ropa femenina elegante y minimalista. Tu tono es profesional, amable, servicial y sofisticado. Tienes acceso a los datos de stock, ventas y deudoras del local. BAJO NINGÚN CONCEPTO debes mencionar, referenciar o usar lógica relacionada con 'Chefsy', comida, hamburguesas o restaurantes. Tu universo se limita única y exclusivamente a la moda, el inventario de Malú y las finanzas de Abril."

    // Si no hay API Key o es la por defecto
    if (!apiKey || apiKey.includes('***') || apiKey === 'YOUR_GEMINI_KEY') {
      console.warn('[Asistente Malú] Clave de Gemini no configurada o inválida. Usando respuestas simuladas.')
      // Generador de respuestas mock sofisticadas basadas en el contexto y mensaje
      let respuestaSimulada = ''
      const msgLower = (mensaje || '').toLowerCase()

      if (msgLower.includes('cómo venimos') || msgLower.includes('hoy') || msgLower.includes('resumen') || msgLower.includes('balance')) {
        respuestaSimulada = `Hola Abril. Aquí tienes el balance actual de hoy:\n\n${contexto}\n\n¿Te gustaría que analicemos alguna categoría en particular o revisemos las clientas con deudas pendientes?`
      } else if (msgLower.includes('instagram') || msgLower.includes('post') || msgLower.includes('redact') || imagenDataUrl) {
        respuestaSimulada = `¡Por supuesto, Abril! Aquí tienes una propuesta de descripción para Instagram de esta prenda elegante y minimalista:\n\n"La sofisticación se encuentra en los detalles. ✨ Nueva blusa de lino, diseñada para acompañar tus días con frescura y un calce impecable. Minimalismo puro para tu placard.\n\nDisponible en tienda física y online. Consultas por mensaje directo o WhatsApp."\n\n¿Qué te parece? Podemos cambiar el tono si lo preferís.`
      } else if (msgLower.includes('chefsy') || msgLower.includes('hamburguesa') || msgLower.includes('comida') || msgLower.includes('restaurant')) {
        respuestaSimulada = `Abril, disculpa, pero mi asistencia se centra de forma exclusiva en el catálogo, clientes y las finanzas de tu boutique Malú Clothing. No tengo información ni relación alguna con ese tema.`
      } else {
        respuestaSimulada = `Hola Abril, ¿cómo puedo ayudarte hoy con la gestión de la boutique? Puedo darte detalles del stock actual, redactar propuestas estéticas para redes o asistirte con las cuentas corrientes de tus clientas.`
      }

      return NextResponse.json({ respuesta: respuestaSimulada, modoDemo: true })
    }

    // Preparar el cuerpo para Gemini
    const contents: any[] = []

    // Mapear historial existente
    // Gemini requiere el formato exacto: { role: 'user' | 'model', parts: [{ text: string }] }
    if (historial && Array.isArray(historial)) {
      historial.forEach((h: any) => {
        if (h.role && h.parts) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: typeof h.parts === 'string' ? [{ text: h.parts }] : h.parts
          })
        }
      })
    }

    // Turno actual del usuario
    const currentParts: any[] = []

    // Inyección de contexto oculto
    const userPrompt = `Contexto en tiempo real de Malú Clothing:\n${contexto}\n\nPregunta/Instrucción de Abril:\n${mensaje}`
    currentParts.push({ text: userPrompt })

    // Imagen en formato inlineData si existe
    if (imagenDataUrl && typeof imagenDataUrl === 'string' && imagenDataUrl.includes(';base64,')) {
      const parts = imagenDataUrl.split(';base64,')
      const mimeType = parts[0].split(':')[1]
      const base64Data = parts[1]
      currentParts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      })
    }

    contents.push({
      role: 'user',
      parts: currentParts
    })

    const geminiBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents
    }

    // Petición a Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiBody)
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error('[Gemini API] Error:', err)
      throw new Error(err.error?.message || `Error ${response.status} de Gemini API`)
    }

    const data = await response.json()
    const respuesta = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude procesar la respuesta.'

    return NextResponse.json({ respuesta, modoDemo: false })

  } catch (error: any) {
    console.error('[Asistente Malú] Error:', error)
    return NextResponse.json(
      { error: 'Error al procesar el mensaje.' },
      { status: 500 }
    )
  }
}
