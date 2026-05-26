/**
 * Calcula los minutos transcurridos desde la hora de creación del pedido hasta el momento actual.
 * Evita el uso de librerías externas para mantener el rendimiento al máximo.
 *
 * @param fecha Cadena de texto de la fecha en formato "YYYY-MM-DD"
 * @param hora Cadena de texto de la hora en formato "HH:MM" o "HH:MM:SS"
 * @returns Cantidad de minutos transcurridos (siempre mayor o igual a 0)
 */
export function calcularTiempoTranscurrido(fecha: string, hora: string): number {
  if (!fecha || !hora) return 0

  // Separar fecha y hora
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const [horas, minutos] = hora.split(':').map(Number)

  // Crear objeto de fecha en la zona horaria local del cliente
  const fechaCreacion = new Date(anio, mes - 1, dia, horas, minutos, 0)
  const ahora = new Date()

  // Calcular la diferencia en milisegundos
  const diferenciaMilisegundos = ahora.getTime() - fechaCreacion.getTime()

  // Si por diferencias de reloj local da negativo, devolver 0
  if (diferenciaMilisegundos < 0) return 0

  // Convertir milisegundos a minutos redondeando hacia abajo
  const minutosTranscurridos = Math.floor(diferenciaMilisegundos / 1000 / 60)
  return minutosTranscurridos
}

/**
 * Obtiene las clases CSS de Tailwind que determinan el color del timer de acuerdo
 * al tiempo transcurrido, optimizando la legibilidad bajo estrés operativo.
 *
 * @param minutos Minutos transcurridos
 * @returns Clases CSS de Tailwind para color de fondo, texto y bordes
 */
export function obtenerEstilosTimer(minutos: number): string {
  // Menos de 15 minutos: Estado normal (Verde/Gris suave)
  if (minutos < 15) {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
  }
  
  // Entre 15 y 30 minutos: Estado de alerta intermedia (Amarillo)
  if (minutos < 30) {
    return 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 font-medium'
  }

  // Más de 30 minutos: Estado crítico (Rojo con parpadeo)
  return 'bg-red-50 text-red-700 border border-red-150 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 font-bold animate-pulse'
}
