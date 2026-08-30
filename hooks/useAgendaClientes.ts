import { useState, useMemo, useEffect } from 'react'
import { Pedido } from '@/tipos'
import { obtenerPedidosHistoricos } from '@/servicios/supabase/pedidos'

export type TipoSegmentoCliente = 'todos' | 'vip' | 'en_riesgo' | 'nuevos' | 'top_ticket'
export type CriterioOrdenCliente = 'pedidos_desc' | 'gasto_desc' | 'reciente_desc' | 'nombre_asc' | 'ticket_desc'

export interface ClienteAgrupado {
  telefono: string
  nombre: string
  direccionMasReciente: string
  totalPedidos: number
  totalGastado: number
  ticketPromedio: number
  platoFavorito: string
  fechaUltimoPedido: string
  diasDesdeUltimoPedido: number
  esVip: boolean
  enRiesgo: boolean
  esNuevo: boolean
  esTopTicket: boolean
  pedidosHistoricos: Pedido[]
}

export function useAgendaClientes() {
  const [pedidosHistoricos, setPedidosHistoricos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [segmentoActivo, setSegmentoActivo] = useState<TipoSegmentoCliente>('todos')
  const [criterioOrden, setCriterioOrden] = useState<CriterioOrdenCliente>('pedidos_desc')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteAgrupado | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargarPedidos() {
      try {
        setError(null)
        const data = await obtenerPedidosHistoricos()
        setPedidosHistoricos(data)
      } catch (err: unknown) {
        const mensaje = err instanceof Error ? err.message : 'Error al cargar clientes'
        setError(mensaje)
        console.error('Error cargando pedidos históricos:', err)
      } finally {
        setCargando(false)
      }
    }
    cargarPedidos()
  }, [])

  // Agrupar pedidos por cliente (teléfono único)
  const clientesAgrupados = useMemo(() => {
    if (!Array.isArray(pedidosHistoricos)) return []
    const grupos: Record<string, Pedido[]> = {}

    // Agrupar pedidos por teléfono
    pedidosHistoricos.forEach((p) => {
      if (!p) return
      const tel = (p.telefono || '').toString().trim()
      const telNormalizado = tel.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      // Ignorar teléfonos no válidos o "sin especificar"
      if (
        !tel || 
        telNormalizado === 'sesp' || 
        telNormalizado === 'sinespecificar' || 
        telNormalizado === 'undefined' || 
        telNormalizado === 'null'
      ) {
        return
      }

      if (!grupos[tel]) {
        grupos[tel] = []
      }
      grupos[tel].push(p)
    })

    const ahoraMs = Date.now()

    // Mapear cada grupo a estadísticas acumuladas
    const listaClientes: ClienteAgrupado[] = Object.entries(grupos).map(([telefono, pedidosCliente]) => {
      // Ordenar pedidos del más nuevo al más viejo
      const ordenados = [...pedidosCliente].sort((a, b) => {
        const fechaA = new Date(`${a?.fecha || ''}T${a?.hora || '00:00'}`)
        const fechaB = new Date(`${b?.fecha || ''}T${b?.hora || '00:00'}`)
        return (isNaN(fechaB.getTime()) ? 0 : fechaB.getTime()) - (isNaN(fechaA.getTime()) ? 0 : fechaA.getTime())
      })

      const ultimoPedido = ordenados[0] || {}
      const nombre = (ultimoPedido.cliente || 'Cliente Anónimo').toString()

      // Buscar la dirección más reciente
      const ultimoDelivery = ordenados.find((p) => p?.tipoEntrega === 'delivery')
      const direccionMasReciente = (ultimoDelivery?.direccion || 'Retiro / Consumo Local').toString()

      // Contar pedidos válidos para gasto total
      const pedidosValidos = pedidosCliente.filter((p) => p && p.estado !== 'cancelado')
      const totalGastado = pedidosValidos.reduce((sum, p) => sum + (Number(p?.total) || 0), 0)
      const totalPedidos = pedidosCliente.length
      const ticketPromedio = totalPedidos > 0 ? Math.round(totalGastado / totalPedidos) : 0

      // Días desde última compra
      const fechaStr = ultimoPedido.created_at || (ultimoPedido.fecha ? `${ultimoPedido.fecha}T12:00:00` : '')
      const timestamp = fechaStr ? new Date(fechaStr).getTime() : 0
      const diasDesdeUltimoPedido = timestamp > 0 ? Math.max(0, Math.floor((ahoraMs - timestamp) / (1000 * 60 * 60 * 24))) : 999

      // Encontrar plato preferido
      const contadorPlatos: Record<string, number> = {}
      pedidosCliente.forEach((p) => {
        const prods = Array.isArray(p?.productos) ? p.productos : []
        prods.forEach((prod) => {
          if (!prod) return
          const nom = (prod.nombre || 'Plato').toString()
          const nombreBase = nom.split(' (+')[0] || 'Plato'
          contadorPlatos[nombreBase] = (contadorPlatos[nombreBase] || 0) + (Number(prod.cantidad) || 1)
        })
      })

      let platoFavorito = 'Sin registros'
      let maxCantidad = 0
      Object.entries(contadorPlatos).forEach(([plato, cant]) => {
        if (cant > maxCantidad) {
          maxCantidad = cant
          platoFavorito = plato
        }
      })

      // Segmentaciones inteligentes:
      // VIP: 5 o más pedidos
      const esVip = totalPedidos >= 5
      // En Riesgo / Inactivo: Compró al menos 2 veces en el pasado pero no pide hace 25+ días
      const enRiesgo = totalPedidos >= 2 && diasDesdeUltimoPedido >= 25
      // Nuevo: 1 pedido realizado en los últimos 30 días
      const esNuevo = totalPedidos === 1 && diasDesdeUltimoPedido <= 30
      // Top Ticket: Ticket promedio alto (ej. >= $18.000)
      const esTopTicket = ticketPromedio >= 18000

      return {
        telefono,
        nombre,
        direccionMasReciente,
        totalPedidos,
        totalGastado,
        ticketPromedio,
        platoFavorito,
        fechaUltimoPedido: (ultimoPedido.fecha || '').toString(),
        diasDesdeUltimoPedido,
        esVip,
        enRiesgo,
        esNuevo,
        esTopTicket,
        pedidosHistoricos: ordenados,
      }
    })

    return listaClientes
  }, [pedidosHistoricos])

  // Métricas Macro y Conteo por Segmentos
  const metricas = useMemo(() => {
    const totalClientes = clientesAgrupados.length
    
    let clienteEstrella = 'N/A'
    let maxPedidos = 0
    let clienteTopSpender = 'N/A'
    let maxGasto = 0

    let conteoVip = 0
    let conteoEnRiesgo = 0
    let conteoNuevos = 0
    let conteoTopTicket = 0

    clientesAgrupados.forEach((c) => {
      if (!c) return
      if (c.esVip) conteoVip++
      if (c.enRiesgo) conteoEnRiesgo++
      if (c.esNuevo) conteoNuevos++
      if (c.esTopTicket) conteoTopTicket++

      if ((c.totalPedidos || 0) > maxPedidos) {
        maxPedidos = c.totalPedidos
        clienteEstrella = c.nombre || 'N/A'
      }
      if ((c.totalGastado || 0) > maxGasto) {
        maxGasto = c.totalGastado
        clienteTopSpender = c.nombre || 'N/A'
      }
    })

    return {
      totalClientes,
      clienteEstrella,
      maxPedidos,
      clienteTopSpender,
      maxGasto,
      conteoVip,
      conteoEnRiesgo,
      conteoNuevos,
      conteoTopTicket,
    }
  }, [clientesAgrupados])

  // Filtrar y ordenar clientes
  const clientesFiltrados = useMemo(() => {
    if (!Array.isArray(clientesAgrupados)) return []
    const query = (busqueda || '').toLowerCase()

    let resultado = clientesAgrupados.filter((c) => {
      if (!c) return false
      const nom = (c.nombre || '').toLowerCase()
      const tel = (c.telefono || '').toLowerCase()
      const coincideBusqueda = nom.includes(query) || tel.includes(query)
      if (!coincideBusqueda) return false

      if (segmentoActivo === 'vip') return c.esVip
      if (segmentoActivo === 'en_riesgo') return c.enRiesgo
      if (segmentoActivo === 'nuevos') return c.esNuevo
      if (segmentoActivo === 'top_ticket') return c.esTopTicket
      return true
    })

    // Ordenamiento
    resultado.sort((a, b) => {
      if (criterioOrden === 'pedidos_desc') {
        return b.totalPedidos - a.totalPedidos || b.totalGastado - a.totalGastado
      }
      if (criterioOrden === 'gasto_desc') {
        return b.totalGastado - a.totalGastado || b.totalPedidos - a.totalPedidos
      }
      if (criterioOrden === 'ticket_desc') {
        return b.ticketPromedio - a.ticketPromedio
      }
      if (criterioOrden === 'reciente_desc') {
        return a.diasDesdeUltimoPedido - b.diasDesdeUltimoPedido
      }
      if (criterioOrden === 'nombre_asc') {
        return a.nombre.localeCompare(b.nombre)
      }
      return 0
    })

    return resultado
  }, [clientesAgrupados, busqueda, segmentoActivo, criterioOrden])

  return {
    cargando,
    error,
    busqueda,
    setBusqueda,
    segmentoActivo,
    setSegmentoActivo,
    criterioOrden,
    setCriterioOrden,
    clienteSeleccionado,
    setClienteSeleccionado,
    clientesFiltrados,
    metricas
  }
}
