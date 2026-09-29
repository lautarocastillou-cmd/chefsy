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
 * Valida que un segmento de cabecera tenga forma de IPv4 o IPv6.
 * Descarta valores que no son IPs (que un cliente malicioso podría colar).
 */
function esIpValida(ip: string): boolean {
  return /^[0-9a-fA-F:.]+$/.test(ip) && ip.length <= 45
}

/**
 * Obtiene la IP cliente de forma consistente y segura desde las cabeceras HTTP.
 *
 * ⚠️ X-Forwarded-For es una CABECERA COMPUESTA: cada proxy en la cadena
 * AGREGA su valor al final. El primero lo pone el cliente y es 100%
 * falsificable mandando `X-Forwarded-For: <ip-cualquiera>`.
 * El ÚLTIMO lo agregó el último proxy (el CDN/plataforma de hosting),
 * que es el único que conoce la IP real de la conexión.
 *
 * Por eso se toma la ÚLTIMA IP válida, no la primera.
 */
export function obtenerIpCliente(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // Recorremos de derecha a izquierda: la última entry válida es la del
    // proxy más cercano al origen, que es la que no puede falsearse.
    const candidatas = forwarded.split(',').map((ip) => ip.trim())
    for (let i = candidatas.length - 1; i >= 0; i--) {
      const ip = candidatas[i]
      if (ip && esIpValida(ip)) {
        return ip
      }
    }
  }

  // Fallback: algunos setups exponen la IP real en una cabecera dedicada.
  // Esta sí la controla el servidor, no el cliente.
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    const ip = realIp.trim()
    if (esIpValida(ip)) {
      return ip
    }
  }

  // Vercel / plataformas con cabecera propia
  const vercelIp = request.headers.get('x-vercel-forwarded-for')
  if (vercelIp) {
    const ip = vercelIp.trim()
    if (esIpValida(ip)) {
      return ip
    }
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

