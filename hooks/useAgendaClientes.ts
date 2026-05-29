import { useState, useMemo, useEffect } from 'react'
import { Pedido } from '@/tipos'
import { obtenerPedidosHistoricos } from '@/servicios/supabase/pedidos'

export interface ClienteAgrupado {
  telefono: string
  nombre: string
  direccionMasReciente: string
  totalPedidos: number
  totalGastado: number
  platoFavorito: string
  fechaUltimoPedido: string
  pedidosHistoricos: Pedido[]
}

export function useAgendaClientes() {
  const [pedidosHistoricos, setPedidosHistoricos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
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
    const grupos: Record<string, Pedido[]> = {}

    // Agrupar pedidos por teléfono
    pedidosHistoricos.forEach((p) => {
      const tel = p.telefono.trim()
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

    // Mapear cada grupo a estadísticas acumuladas
    const listaClientes: ClienteAgrupado[] = Object.entries(grupos).map(([telefono, pedidosCliente]) => {
      // Ordenar pedidos del más nuevo al más viejo
      const ordenados = [...pedidosCliente].sort((a, b) => {
        const fechaA = new Date(`${a.fecha}T${a.hora || '00:00'}`)
        const fechaB = new Date(`${b.fecha}T${b.hora || '00:00'}`)
        return fechaB.getTime() - fechaA.getTime()
      })

      const ultimoPedido = ordenados[0]
      const nombre = ultimoPedido.cliente

      // Buscar la dirección más reciente
      const ultimoDelivery = ordenados.find((p) => p.tipoEntrega === 'delivery')
      const direccionMasReciente = ultimoDelivery?.direccion || 'Retiro / Consumo Local'

      // Contar pedidos válidos para gasto total
      const pedidosValidos = pedidosCliente.filter((p) => p.estado !== 'cancelado')
      const totalGastado = pedidosValidos.reduce((sum, p) => sum + p.total, 0)

      // Encontrar plato preferido
      const contadorPlatos: Record<string, number> = {}
      pedidosCliente.forEach((p) => {
        p.productos.forEach((prod) => {
          const nombreBase = prod.nombre.split(' (+')[0]
          contadorPlatos[nombreBase] = (contadorPlatos[nombreBase] || 0) + prod.cantidad
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

      return {
        telefono,
        nombre,
        direccionMasReciente,
        totalPedidos: pedidosCliente.length,
        totalGastado,
        platoFavorito,
        fechaUltimoPedido: ultimoPedido.fecha,
        pedidosHistoricos: ordenados,
      }
    })

    return listaClientes
  }, [pedidosHistoricos])

  // Filtrar clientes por búsqueda
  const clientesFiltrados = useMemo(() => {
    return clientesAgrupados.filter((c) => {
      const query = busqueda.toLowerCase()
      return c.nombre.toLowerCase().includes(query) || c.telefono.includes(query)
    })
  }, [clientesAgrupados, busqueda])

  // Métricas Macro
  const metricas = useMemo(() => {
    const totalClientes = clientesAgrupados.length
    
    let clienteEstrella = 'N/A'
    let maxPedidos = 0
    let clienteTopSpender = 'N/A'
    let maxGasto = 0

    clientesAgrupados.forEach((c) => {
      if (c.totalPedidos > maxPedidos) {
        maxPedidos = c.totalPedidos
        clienteEstrella = c.nombre
      }
      if (c.totalGastado > maxGasto) {
        maxGasto = c.totalGastado
        clienteTopSpender = c.nombre
      }
    })

    return {
      totalClientes,
      clienteEstrella,
      maxPedidos,
      clienteTopSpender,
      maxGasto,
    }
  }, [clientesAgrupados])

  return {
    cargando,
    error,
    busqueda,
    setBusqueda,
    clienteSeleccionado,
    setClienteSeleccionado,
    clientesFiltrados,
    metricas
  }
}
