import { Pedido, EstadoPedido } from '@/tipos'
import { parsearFechaHora, calcularDiferenciaSegundos } from './tiempo'
import configuracionOperativa from '../config/operacion.json'

export type TipoProblema =
  | 'atrasado'
  | 'listo_demorado'
  | 'sin_cadete'
  | 'cocina_demorado'
  | 'olvidado'

export type PrioridadProblema = 'alta' | 'media' | 'baja'

export interface AlertaOperativa {
  id: string
  pedidoId: string
  cliente: string
  mensaje: string
  tipo: TipoProblema
  prioridad: PrioridadProblema
  minutosTranscurridos: number
  pedido: Pedido
}

// Extraer límites y prioridades configuradas
let limitesConfig = configuracionOperativa.limites
let prioridadesConfig = configuracionOperativa.prioridades

/**
 * Sobrescribe dinámicamente los límites y prioridades de tiempo en caliente
 */
export function actualizarConfiguracionLocal(nuevaConfig: typeof configuracionOperativa) {
  limitesConfig = nuevaConfig.limites
  prioridadesConfig = nuevaConfig.prioridades
}

/**
 * Parsea una fecha de forma segura soportando diferentes formatos (ISO, fechas de negocio, Safari, etc.)
 */
function parsearFechaSegura(valor: any, fechaNegocio?: string, horaNegocio?: string): Date {
  if (!valor) {
    if (fechaNegocio && horaNegocio) {
      return parsearFechaHora(fechaNegocio, horaNegocio)
    }
    return new Date()
  }
  if (valor instanceof Date) return isNaN(valor.getTime()) ? new Date() : valor

  let fechaObj = new Date(valor)
  if (!isNaN(fechaObj.getTime())) return fechaObj

  if (typeof valor === 'string') {
    const normalizada = valor.replace(' ', 'T')
    fechaObj = new Date(normalizada)
    if (!isNaN(fechaObj.getTime())) return fechaObj

    const limpia = normalizada.split('.')[0]
    fechaObj = new Date(limpia)
    if (!isNaN(fechaObj.getTime())) return fechaObj
  }

  if (fechaNegocio && horaNegocio) {
    return parsearFechaHora(fechaNegocio, horaNegocio)
  }
  return new Date()
}

/**
 * Calcula los minutos transcurridos desde una fecha de inicio hasta la fecha actual (o fecha fin)
 */
export function obtenerMinutosTranscurridos(
  fechaInicio: Date | string | null | undefined,
  fechaFin: Date = new Date(),
  fechaNegocio?: string,
  horaNegocio?: string
): number {
  if (!fechaInicio && (!fechaNegocio || !horaNegocio)) return 0
  const inicio = parsearFechaSegura(fechaInicio, fechaNegocio, horaNegocio)
  const segundos = calcularDiferenciaSegundos(inicio, fechaFin)
  return Math.floor(segundos / 60)
}

/**
 * Calcula la prioridad del problema basado en su tipo y los minutos transcurridos según la configuración
 */
export function calcularPrioridadProblema(tipo: TipoProblema, minutos: number): PrioridadProblema {
  switch (tipo) {
    case 'atrasado':
      return minutos >= prioridadesConfig.pedidoAtrasadoAltaMinutos ? 'alta' : 'media'
    case 'listo_demorado':
      return minutos >= prioridadesConfig.listoDemoradoAltaMinutos ? 'alta' : 'media'
    case 'sin_cadete':
      return minutos >= prioridadesConfig.sinCadeteAltaMinutos ? 'alta' : 'media'
    case 'cocina_demorado':
      return minutos >= prioridadesConfig.cocinaDemoradoAltaMinutos ? 'alta' : 'media'
    case 'olvidado':
      return 'alta'
    default:
      return 'baja'
  }
}

/**
 * Retorna todos los pedidos activos que llevan más de los minutos configurados desde su creación
 */
export function obtenerPedidosAtrasados(pedidos: Pedido[]): Pedido[] {
  const ahora = new Date()
  return pedidos.filter((pedido) => {
    // Excluir entregados y cancelados
    if (['entregado', 'cancelado'].includes(pedido.estado)) return false

    const minutosActivo = obtenerMinutosTranscurridos(
      pedido.created_at,
      ahora,
      pedido.fecha,
      pedido.hora
    )
    return minutosActivo > limitesConfig.pedidoAtrasadoMinutos
  })
}

/**
 * Analiza los pedidos y retorna una lista de alertas operativas en tiempo real usando límites de configuración
 */
export function obtenerProblemasOperativos(pedidos: Pedido[]): AlertaOperativa[] {
  const alertas: AlertaOperativa[] = []
  const ahora = new Date()

  pedidos.forEach((pedido) => {
    // Si el pedido ya se entregó o canceló, no genera alertas operativas
    if (['entregado', 'cancelado'].includes(pedido.estado)) return

    const fechaCreacion = parsearFechaSegura(pedido.created_at, pedido.fecha, pedido.hora)
    const minutosDesdeCreacion = obtenerMinutosTranscurridos(fechaCreacion, ahora)

    // 1. Pedido atrasado (más de los minutos de configuración activos)
    if (minutosDesdeCreacion > limitesConfig.pedidoAtrasadoMinutos) {
      alertas.push({
        id: `${pedido.id}-atrasado`,
        pedidoId: pedido.id,
        cliente: pedido.cliente,
        mensaje: `Pedido atrasado: lleva ${minutosDesdeCreacion} min activo`,
        tipo: 'atrasado',
        prioridad: calcularPrioridadProblema('atrasado', minutosDesdeCreacion),
        minutosTranscurridos: minutosDesdeCreacion,
        pedido,
      })
    }

    // 2. Pedidos listos hace mucho (estado "Listo" por más del límite de configuración en minutos)
    if (pedido.estado === 'listo' && pedido.listo_at) {
      const minutosEnListo = obtenerMinutosTranscurridos(pedido.listo_at, ahora)
      if (minutosEnListo > limitesConfig.listoDemoradoMinutos) {
        alertas.push({
          id: `${pedido.id}-listo_demorado`,
          pedidoId: pedido.id,
          cliente: pedido.cliente,
          mensaje: `Listo hace mucho: lleva ${minutosEnListo} min esperando salida`,
          tipo: 'listo_demorado',
          prioridad: calcularPrioridadProblema('listo_demorado', minutosEnListo),
          minutosTranscurridos: minutosEnListo,
          pedido,
        })
      }
    }

    // 3. Pedidos sin cadete asignado (estado "listo", "en_cocina", "nuevo" + delivery + sin cadete)
    const esParaDelivery = pedido.tipoEntrega === 'delivery'
    const noTieneCadete = !pedido.cadete_id
    const estaEnEsperaDeCadete = ['nuevo', 'en_cocina', 'listo'].includes(pedido.estado)

    if (esParaDelivery && noTieneCadete && estaEnEsperaDeCadete) {
      // Calculamos cuánto tiempo lleva esperando asignación.
      // Si ya está listo, cuenta desde listo_at. Si no, cuenta desde created_at.
      const inicioEspera = pedido.listo_at || fechaCreacion
      const minutosEsperandoCadete = obtenerMinutosTranscurridos(inicioEspera, ahora)
      
      alertas.push({
        id: `${pedido.id}-sin_cadete`,
        pedidoId: pedido.id,
        cliente: pedido.cliente,
        mensaje: `Pedido de delivery sin cadete asignado hace ${minutosEsperandoCadete} min`,
        tipo: 'sin_cadete',
        prioridad: calcularPrioridadProblema('sin_cadete', minutosEsperandoCadete),
        minutosTranscurridos: minutosEsperandoCadete,
        pedido,
      })
    }

    // 4. Pedidos demasiado tiempo en cocina (estado "Preparando"/"en_cocina" por más del límite en cocina)
    if (pedido.estado === 'en_cocina') {
      const inicioCocina = pedido.cocina_at || fechaCreacion
      const minutosEnCocina = obtenerMinutosTranscurridos(inicioCocina, ahora)
      if (minutosEnCocina > limitesConfig.cocinaDemoradoMinutos) {
        alertas.push({
          id: `${pedido.id}-cocina_demorado`,
          pedidoId: pedido.id,
          cliente: pedido.cliente,
          mensaje: `Demorado en cocina: lleva ${minutosEnCocina} min preparándose`,
          tipo: 'cocina_demorado',
          prioridad: calcularPrioridadProblema('cocina_demorado', minutosEnCocina),
          minutosTranscurridos: minutosEnCocina,
          pedido,
        })
      }
    }

    // 5. Pedidos olvidados (sin cambios de estado hace más del límite configurado)
    // Buscamos la fecha del último evento relevante
    const fechasEventos = [
      fechaCreacion,
      pedido.cocina_at ? parsearFechaSegura(pedido.cocina_at) : null,
      pedido.listo_at ? parsearFechaSegura(pedido.listo_at) : null,
    ].filter((f): f is Date => f !== null)

    const ultimaFechaActividad = fechasEventos.reduce((max, f) => (f.getTime() > max.getTime() ? f : max), fechaCreacion)
    const minutosSinActividad = obtenerMinutosTranscurridos(ultimaFechaActividad, ahora)

    if (minutosSinActividad > limitesConfig.pedidoOlvidadoMinutos) {
      alertas.push({
        id: `${pedido.id}-olvidado`,
        pedidoId: pedido.id,
        cliente: pedido.cliente,
        mensaje: `Pedido sin cambios de estado ni actividad hace ${minutosSinActividad} min`,
        tipo: 'olvidado',
        prioridad: calcularPrioridadProblema('olvidado', minutosSinActividad),
        minutosTranscurridos: minutosSinActividad,
        pedido,
      })
    }
  })

  // Ordenar por prioridad (alta -> media -> baja) y luego por minutos transcurridos descendente
  const ordenPrioridades: Record<PrioridadProblema, number> = {
    alta: 3,
    media: 2,
    baja: 1,
  }

  return alertas.sort((a, b) => {
    const diffPrioridad = ordenPrioridades[b.prioridad] - ordenPrioridades[a.prioridad]
    if (diffPrioridad !== 0) return diffPrioridad
    return b.minutosTranscurridos - a.minutosTranscurridos
  })
}
