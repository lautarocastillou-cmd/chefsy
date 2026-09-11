// ─────────────────────────────────────────────────────────────
// lib/visorCache.ts
// Sistema de caché dedicado para imágenes vistas en el visor de productos.
//
// Reglas de negocio:
// 1. Solo guarda y acelera las fotos que el usuario efectivamente vio en el visor.
// 2. Las previsualizaciones del catálogo no activan esta caché.
// 3. Retiene bitmaps decodificados en memoria viva (HTMLImageElement) para que al
//    volver a abrir el producto, la imagen pinte al instante a 0ms sin parpadeos.
// 4. Mantiene un registro en sessionStorage para persistir entre navegaciones de sesión.
// ─────────────────────────────────────────────────────────────

const FOTOS_VISTAS_KEY = 'chefsy_visor_fotos_vistas'

// Pool de elementos Image en memoria viva para retener los bitmaps decodificados en la GPU/RAM del navegador
const poolImagenesMemoria = new Map<string, HTMLImageElement>()

// Conjunto de URLs que ya fueron vistas por el usuario en el visor
const setFotosVistas = new Set<string>()

// Inicializar desde sessionStorage si estamos en el cliente
if (typeof window !== 'undefined') {
  try {
    const guardadas = sessionStorage.getItem(FOTOS_VISTAS_KEY)
    if (guardadas) {
      const urls: string[] = JSON.parse(guardadas)
      urls.forEach(u => {
        if (typeof u === 'string' && u.trim()) {
          setFotosVistas.add(u.trim())
        }
      })
    }
  } catch {
    // Si falla sessionStorage (navegación privada estricta), opera en memoria normalmente
  }
}

/**
 * Normaliza una URL para comparaciones limpias
 */
function normalizarUrl(url: string): string {
  if (!url) return ''
  return url.trim().split('#')[0]
}

/**
 * Registra una foto como vista en el visor.
 * Retiene la instancia de Image en memoria para evitar que el navegador
 * descarte el bitmap decodificado y la guarda en el registro de la sesión.
 */
export function registrarFotoVista(url: string, urlOriginal?: string): void {
  if (typeof window === 'undefined') return
  const limpia = normalizarUrl(url)
  if (!limpia) return

  let huboCambio = false

  if (!setFotosVistas.has(limpia)) {
    setFotosVistas.add(limpia)
    huboCambio = true
  }

  if (urlOriginal) {
    const origLimpia = normalizarUrl(urlOriginal)
    if (origLimpia && !setFotosVistas.has(origLimpia)) {
      setFotosVistas.add(origLimpia)
      huboCambio = true
    }
  }

  if (huboCambio) {
    try {
      // Guardar hasta las últimas 80 imágenes vistas para no sobrecargar storage
      const arr = Array.from(setFotosVistas).slice(-80)
      sessionStorage.setItem(FOTOS_VISTAS_KEY, JSON.stringify(arr))
    } catch {
      // Ignorar si se excede la cuota de sessionStorage
    }
  }

  // Si no está en el pool de memoria, creamos y retenemos el objeto Image decodificado
  if (!poolImagenesMemoria.has(limpia)) {
    try {
      const img = new window.Image()
      img.src = limpia
      poolImagenesMemoria.set(limpia, img)

      // Limitar pool a 60 imágenes para no saturar memoria en dispositivos de gama baja
      if (poolImagenesMemoria.size > 60) {
        const primerKey = poolImagenesMemoria.keys().next().value
        if (primerKey) poolImagenesMemoria.delete(primerKey)
      }
    } catch {
      // Ignorar fallos de instanciación
    }
  }
}

/**
 * Verifica si una imagen (o su URL original) ya fue vista previamente en el visor.
 */
export function esFotoVista(url: string, urlOriginal?: string): boolean {
  if (!url) return false
  const limpia = normalizarUrl(url)
  if (setFotosVistas.has(limpia)) return true
  if (urlOriginal) {
    const origLimpia = normalizarUrl(urlOriginal)
    if (origLimpia && setFotosVistas.has(origLimpia)) return true
  }
  return false
}
