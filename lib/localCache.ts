/**
 * lib/localCache.ts
 * Utilidades de localStorage con TTL (tiempo de vida) y versionado de esquema.
 *
 * Uso:
 *   setCache('mi-clave', datos, 2)          // expira en 2 horas
 *   getCache<MiTipo>('mi-clave', 2)         // devuelve null si expiró
 *   setCacheConTs('mi-clave', datos)        // alias corto (TTL default 1h)
 */

// ── Versionado de esquema ───────────────────────────────────────────────────
// Cambiá este valor cada vez que modifiques la estructura de PerfilCliente u
// otro dato crítico que viva en localStorage. Al detectar una versión distinta,
// el módulo limpia automáticamente todos los cachés `chefsy_*`.

const SCHEMA_VERSION = '2025-v1'
const SCHEMA_KEY      = 'chefsy_schema_version'

/**
 * Verifica si el esquema en localStorage coincide con el actual.
 * Si difiere, elimina todas las claves `chefsy_*` y actualiza la versión.
 * Llama a esta función UNA sola vez al arrancar la app (p.ej. en el Provider raíz).
 */
export function verificarVersionEsquema() {
  if (typeof window === 'undefined') return
  try {
    const guardada = localStorage.getItem(SCHEMA_KEY)
    if (guardada !== SCHEMA_VERSION) {
      console.info(`[Schema] Versión de esquema cambiada (${guardada} → ${SCHEMA_VERSION}). Limpiando cachés...`)
      const claves = Object.keys(localStorage).filter(k =>
        k.startsWith('chefsy') || k.startsWith('chefsy-')
      )
      claves.forEach(k => localStorage.removeItem(k))
      localStorage.setItem(SCHEMA_KEY, SCHEMA_VERSION)
    }
  } catch {}
}

// ── Caché con TTL ──────────────────────────────────────────────────────────

interface EntradaCache<T> {
  v:  T
  ts: number   // timestamp de escritura en ms
}

/**
 * Guarda un valor en localStorage junto a un timestamp para controlar TTL.
 */
export function setCache<T>(clave: string, datos: T): void {
  if (typeof window === 'undefined') return
  try {
    const entrada: EntradaCache<T> = { v: datos, ts: Date.now() }
    localStorage.setItem(clave, JSON.stringify(entrada))
  } catch {}
}

/**
 * Lee un valor desde localStorage.
 * Devuelve `null` si la clave no existe, el dato está corrupto o superó el TTL.
 * @param ttlHoras Tiempo de vida en horas (default 1h)
 */
export function getCache<T>(clave: string, ttlHoras = 1): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(clave)
    if (!raw) return null

    const entrada = JSON.parse(raw) as EntradaCache<T>

    // Compatibilidad: si el dato guardado no tiene la forma { v, ts }, es un
    // caché viejo sin TTL — lo descartamos y forzamos refetch limpio.
    if (!entrada || typeof entrada.ts !== 'number') {
      localStorage.removeItem(clave)
      return null
    }

    const edadHoras = (Date.now() - entrada.ts) / 3_600_000
    if (edadHoras > ttlHoras) {
      localStorage.removeItem(clave)
      return null
    }

    return entrada.v
  } catch {
    localStorage.removeItem(clave)
    return null
  }
}

/**
 * Elimina una clave del localStorage de forma segura.
 */
export function removeCache(clave: string): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(clave) } catch {}
}
