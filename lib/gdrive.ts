// ─────────────────────────────────────────────────────
// lib/gdrive.ts
// Utilidades para parsing, extracción y descarga de fotos
// desde Google Drive en Chefsy.
// ─────────────────────────────────────────────────────

/**
 * Extrae todos los File IDs de Google Drive presentes en un texto o array de textos.
 */
export function extraerGoogleDriveFileIds(input: string | string[]): string[] {
  if (!input) return []
  const texto = Array.isArray(input) ? input.join('\n') : input
  const ids: string[] = []

  // 1. Buscar todos los patrones /file/d/{ID}
  const regexFileD = /\/file\/d\/([a-zA-Z0-9_-]{20,})/gi
  let match
  while ((match = regexFileD.exec(texto)) !== null) {
    if (match[1]) ids.push(match[1])
  }

  // 2. Buscar todos los patrones id={ID} o ?id={ID}
  const regexId = /[?&]id=([a-zA-Z0-9_-]{20,})/gi
  while ((match = regexId.exec(texto)) !== null) {
    if (match[1]) ids.push(match[1])
  }

  // 3. Buscar /d/{ID}
  const regexD = /\/d\/([a-zA-Z0-9_-]{20,})/gi
  while ((match = regexD.exec(texto)) !== null) {
    if (match[1]) ids.push(match[1])
  }

  // 4. Buscar /open?id={ID}
  const regexOpen = /\/open\?id=([a-zA-Z0-9_-]{20,})/gi
  while ((match = regexOpen.exec(texto)) !== null) {
    if (match[1]) ids.push(match[1])
  }

  // 5. Si no se encontró nada por regex, dividir por líneas y verificar si hay IDs puros
  if (ids.length === 0) {
    const lineas = texto.split(/[\r\n,\s;]+/).map(s => s.trim()).filter(Boolean)
    for (const l of lineas) {
      if (/^[a-zA-Z0-9_-]{25,50}$/.test(l)) {
        ids.push(l)
      }
    }
  }

  // Eliminar duplicados
  return Array.from(new Set(ids))
}

/**
 * Extrae un único File ID de un enlace o texto de Google Drive.
 */
export function extraerGoogleDriveFileId(input: string): string | null {
  const ids = extraerGoogleDriveFileIds(input)
  return ids.length > 0 ? ids[0] : null
}

/**
 * Genera enlaces directos de visualización CDN para un archivo de Google Drive.
 */
export function obtenerUrlsDirectasGoogleDrive(fileId: string): {
  thumbnailUrl: string
  cdnUrl: string
  downloadUrl: string
} {
  return {
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w2048`,
    cdnUrl: `https://lh3.googleusercontent.com/d/${fileId}=w2048`,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
  }
}
