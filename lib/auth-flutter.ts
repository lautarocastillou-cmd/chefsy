import { NextResponse } from 'next/server'

/**
 * Valida el token Bearer enviado por la app móvil Flutter.
 * Implementa fail-closed: Si FLUTTER_SECRET_TOKEN no está definido en las variables de entorno
 * del servidor, rechaza con HTTP 500 y NUNCA recurre a tokens por defecto en código.
 */
export function verificarTokenFlutter(request: Request): { autorizado: boolean; errorResponse?: NextResponse } {
  const tokenSecreto = process.env.FLUTTER_SECRET_TOKEN

  if (!tokenSecreto || !tokenSecreto.trim()) {
    console.error('[Seguridad Flutter] Error crítico: FLUTTER_SECRET_TOKEN no está configurado en las variables de entorno.')
    return {
      autorizado: false,
      errorResponse: NextResponse.json(
        { error: 'Servicio móvil no configurado en el servidor' },
        { status: 500 }
      )
    }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader || authHeader !== `Bearer ${tokenSecreto.trim()}`) {
    return {
      autorizado: false,
      errorResponse: NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  return { autorizado: true }
}
