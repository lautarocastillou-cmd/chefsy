/**
 * Rate Limiter en memoria con ventana deslizante para Next.js Server / API Routes.
 * Previene ataques de fuerza bruta, escaneos masivos y saturación de APIs.
 */

interface RateLimitEntry {
  contador: number
  reseteo: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

/**
 * Obtiene la IP cliente de forma consistente y segura desde las cabeceras HTTP.
 */
export function obtenerIpCliente(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const primeraIp = forwarded.split(',')[0].trim()
    if (primeraIp && /^[0-9a-fA-F:\.]+$/.test(primeraIp)) {
      return primeraIp
    }
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp && /^[0-9a-fA-F:\.]+$/.test(realIp.trim())) {
    return realIp.trim()
  }

  return '127.0.0.1'
}

/**
 * Verifica si una clave (ej: IP + endpoint) ha superado el límite de peticiones permitido.
 * 
 * @param clave Identificador único para el bucket (ej: `cadete-ubicacion:${ip}`)
 * @param maxPeticiones Número máximo de peticiones permitidas en la ventana
 * @param ventanaSegundos Duración de la ventana de tiempo en segundos
 */
export function verificarRateLimit(
  clave: string,
  maxPeticiones: number,
  ventanaSegundos: number
): { permitido: boolean; restante: number; segundosParaReset: number } {
  const ahora = Date.now()
  const ventanaMs = ventanaSegundos * 1000

  // Limpieza preventiva si el mapa crece
  if (rateLimitMap.size > 2000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (ahora > v.reseteo) {
        rateLimitMap.delete(k)
      }
    }
  }

  const registro = rateLimitMap.get(clave)

  if (!registro || ahora > registro.reseteo) {
    // Nueva ventana
    rateLimitMap.set(clave, {
      contador: 1,
      reseteo: ahora + ventanaMs
    })
    return {
      permitido: true,
      restante: maxPeticiones - 1,
      segundosParaReset: ventanaSegundos
    }
  }

  if (registro.contador >= maxPeticiones) {
    const segundosParaReset = Math.max(1, Math.ceil((registro.reseteo - ahora) / 1000))
    return {
      permitido: false,
      restante: 0,
      segundosParaReset
    }
  }

  registro.contador += 1
  const segundosParaReset = Math.max(1, Math.ceil((registro.reseteo - ahora) / 1000))
  return {
    permitido: true,
    restante: maxPeticiones - registro.contador,
    segundosParaReset
  }
}

/**
 * Resetea el contador de rate limit para una clave dada (ej: tras login exitoso).
 */
export function resetearRateLimit(clave: string): void {
  rateLimitMap.delete(clave)
}

