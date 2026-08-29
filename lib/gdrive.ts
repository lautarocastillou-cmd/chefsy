// ─────────────────────────────────────────────────────
// lib/gdrive.ts
// Utilidades para parsing, extracción y descarga de fotos
// desde Google Drive en Chefsy.
// ─────────────────────────────────────────────────────

/**
 * Extrae el File ID de un enlace o texto de Google Drive.
 * Soporta formatos:
 * - https://drive.google.com/file/d/1BxiMVs.../view?usp=sharing
 * - https://drive.google.com/open?id=1BxiMVs...
 * - https://drive.google.com/uc?id=1BxiMVs...
 * - https://lh3.googleusercontent.com/d/1BxiMVs...
 * - ID puro de 25+ caracteres alfanuméricos
 */
export function extraerGoogleDriveFileId(input: string): string | null {
  if (!input) return null
  const limpio = input.trim()

  // 1. /file/d/{ID}
  const matchFileD = limpio.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/i)
  if (matchFileD && matchFileD[1]) return matchFileD[1]

  // 2. id={ID} o ?id={ID}
  const matchIdParam = limpio.match(/[?&]id=([a-zA-Z0-9_-]{20,})/i)
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1]

  // 3. /d/{ID}
  const matchD = limpio.match(/\/d\/([a-zA-Z0-9_-]{20,})/i)
  if (matchD && matchD[1]) return matchD[1]

  // 4. /open?id={ID}
  const matchOpen = limpio.match(/\/open\?id=([a-zA-Z0-9_-]{20,})/i)
  if (matchOpen && matchOpen[1]) return matchOpen[1]

  // 5. Si ya es un ID de Google Drive puro (sin URL)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(limpio)) {
    return limpio
  }

  return null
}

/**
 * Genera enlaces directos de visualización CDN para un archivo de Google Drive.
 */
export function obtenerUrlsDirectasGoogleDrive(fileId: string): {
  cdnUrl: string
  thumbnailUrl: string
  downloadUrl: string
} {
  return {
    cdnUrl: `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
  }
}
