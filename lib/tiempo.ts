// ─────────────────────────────────────────────────────
// lib/tiempo.ts
// Lógica utilitaria para la gestión de tiempos y contadores
// ─────────────────────────────────────────────────────

/**
 * Parsea una fecha en formato "YYYY-MM-DD" y hora en formato 12h o 24h a un objeto Date local.
 * Soporta formatos de hora como "17:35", "17:35:12", "05:35 p. m.", "05:35 PM", etc.
 * Resuelve el bug del NaN al ignorar caracteres no numéricos tras separar horas/minutos/segundos.
 *
 * @param fecha Cadena de texto de la fecha en formato "YYYY-MM-DD"
 * @param hora Cadena de texto de la hora en formato "HH:MM" o "HH:MM:SS" (con o sin meridiano)
 * @returns Objeto Date correspondiente a la zona horaria local
 */
export function parsearFechaHora(fecha: string, hora: string): Date {
  if (!fecha || !hora) return new Date()

  // Separar fecha
  const partsFecha = fecha.split('-')
  const anio = Number(partsFecha[0]) || new Date().getFullYear()
  const mes = (Number(partsFecha[1]) || 1) - 1 // 0-indexed
  const dia = Number(partsFecha[2]) || new Date().getDate()

  // Limpiar y normalizar la hora
  let horaLimpia = hora.trim()
  
  // Detectar AM / PM
  const esPM = /p\.?\s*m\.?|pm/i.test(horaLimpia)
  const esAM = /a\.?\s*m\.?|am/i.test(horaLimpia)

  // Eliminar meridianos para parsear números
  horaLimpia = horaLimpia.replace(/a\.?\s*m\.?|p\.?\s*m\.?|am|pm/i, '').trim()

  // Separar horas, minutos, segundos
  const partsHora = horaLimpia.split(':')
  let horas = Number(partsHora[0]) || 0
  const minutos = Number(partsHora[1]) || 0
  const segundos = Number(partsHora[2]) || 0

  // Ajustar formato 12h a 24h
  if (esPM && horas < 12) {
    horas += 12
  } else if (esAM && horas === 12) {
    horas = 0
  }

  return new Date(anio, mes, dia, horas, minutos, segundos)
}

/**
 * Calcula la diferencia en segundos entre dos fechas, garantizando un mínimo de 1 segundo.
 *
 * @param inicio Objeto Date de inicio
 * @param fin Objeto Date de fin
 * @returns Cantidad de segundos transcurridos
 */
export function calcularDiferenciaSegundos(inicio: Date, fin: Date): number {
  const diff = fin.getTime() - inicio.getTime()
  return Math.max(1, Math.floor(diff / 1000))
}

/**
 * Formatea un total de segundos en una cadena con formato "MM:SS".
 *
 * @param segundosTotales Cantidad de segundos transcurridos
 * @returns Cadena con formato "MM:SS" (ej: "03:45", "102:05")
 */
export function formatearSegundos(segundosTotales: number): string {
  const minutos = Math.floor(segundosTotales / 60)
  const segundos = segundosTotales % 60

  const strMinutos = minutos.toString().padStart(2, '0')
  const strSegundos = segundos.toString().padStart(2, '0')

  return `${strMinutos}:${strSegundos}`
}
