/**
 * In-memory TTL Cache for Next.js Server / API Routes
 * Prevents redundant round-trips to Supabase for frequently polled data,
 * saving bandwidth (egress) and database query quotas.
 */

interface CacheEntry<T> {
  data: T
  expiraEn: number
}

// Global in-memory map persisted across requests in warm serverless / Node process
const cacheGlobal = new Map<string, CacheEntry<any>>()

/**
 * Retrieves a cached value if it exists and has not expired.
 */
export function obtenerDeCache<T>(clave: string): T | null {
  const entry = cacheGlobal.get(clave)
  if (!entry) return null
  if (Date.now() > entry.expiraEn) {
    cacheGlobal.delete(clave)
    return null
  }
  return entry.data as T
}

/**
 * Stores a value in memory with a given Time-To-Live (in seconds).
 */
export function guardarEnCache<T>(clave: string, data: T, ttlSegundos: number): void {
  // Housekeeping: prevent memory leaks if map grows large
  if (cacheGlobal.size > 1000) {
    const ahora = Date.now()
    for (const [k, v] of cacheGlobal.entries()) {
      if (ahora > v.expiraEn) {
        cacheGlobal.delete(k)
      }
    }
  }

  cacheGlobal.set(clave, {
    data,
    expiraEn: Date.now() + ttlSegundos * 1000,
  })
}

/**
 * Invalidates a specific key or all keys matching a prefix.
 */
export function invalidarCache(claveOPrefijo: string): void {
  for (const k of cacheGlobal.keys()) {
    if (k === claveOPrefijo || k.startsWith(claveOPrefijo)) {
      cacheGlobal.delete(k)
    }
  }
}
