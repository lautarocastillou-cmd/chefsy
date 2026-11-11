// ─────────────────────────────────────────────────────
// lib/impresion/actualizacionAgente.ts
// Manifiesto de la versión publicada del agente y comparación
// de versiones. El binario y version.json viven en public/agente
// y se generan con scripts/publicar-agente.ps1.
// ─────────────────────────────────────────────────────

export interface ManifiestoAgente {
  version: string
  sha256: string
  bytes?: number
  fecha?: string
  notas?: string
}

const URL_MANIFIESTO = '/agente/version.json'

/** Compara versiones semver simples. Devuelve >0 si `a` es mayor que `b`. */
export function compararVersiones(a: string, b: string): number {
  const partesA = (a || '').split('.').map((n) => parseInt(n, 10) || 0)
  const partesB = (b || '').split('.').map((n) => parseInt(n, 10) || 0)
  const largo = Math.max(partesA.length, partesB.length)

  for (let i = 0; i < largo; i++) {
    const x = partesA[i] ?? 0
    const y = partesB[i] ?? 0
    if (x > y) return 1
    if (x < y) return -1
  }

  return 0
}

/** Lee el manifiesto publicado. Devuelve null si no existe o es inválido. */
export async function obtenerManifiestoAgente(): Promise<ManifiestoAgente | null> {
  try {
    const respuesta = await fetch(URL_MANIFIESTO, { cache: 'no-store' })
    if (!respuesta.ok) return null

    const datos = await respuesta.json()
    const version = typeof datos?.version === 'string' ? datos.version.trim() : ''
    const sha256 = typeof datos?.sha256 === 'string' ? datos.sha256.trim().toLowerCase() : ''

    if (!/^\d+\.\d+\.\d+$/.test(version)) return null
    if (!/^[a-f0-9]{64}$/.test(sha256)) return null

    return {
      version,
      sha256,
      bytes: typeof datos?.bytes === 'number' ? datos.bytes : undefined,
      fecha: typeof datos?.fecha === 'string' ? datos.fecha : undefined,
      notas: typeof datos?.notas === 'string' ? datos.notas : undefined,
    }
  } catch {
    return null
  }
}
