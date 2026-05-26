'use client'

import { usarPedidos } from '@/contexto/PedidosContexto'
import { formatearPrecio } from '@/lib/utils'
import { useState, useMemo } from 'react'
import {
  Search,
  Phone,
  MapPin,
  ShoppingBag,
  TrendingUp,
  MessageCircle,
  Calendar,
  X,
  User,
  Users,
  Award,
  DollarSign,
  ChevronRight,
} from 'lucide-react'
import { Pedido } from '@/tipos'

interface ClienteAgrupado {
  telefono: string
  nombre: string
  direccionMasReciente: string
  totalPedidos: number
  totalGastado: number
  platoFavorito: string
  fechaUltimoPedido: string
  pedidosHistoricos: Pedido[]
}

export default function PaginaAgendaClientes() {
  const { pedidos } = usarPedidos()

  // Filtro de búsqueda
  const [busqueda, setBusqueda] = useState('')
  // Cliente seleccionado para el modal/detalle histórico
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteAgrupado | null>(null)

  // Agrupar pedidos por cliente (teléfono único)
  const clientesAgrupados = useMemo(() => {
    const grupos: Record<string, Pedido[]> = {}

    // Agrupar pedidos por teléfono
    pedidos.forEach((p) => {
      const tel = p.telefono.trim()
      if (!tel) return
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

      // Buscar la dirección más reciente utilizada en entregas tipo delivery
      const ultimoDelivery = ordenados.find((p) => p.tipoEntrega === 'delivery')
      const direccionMasReciente = ultimoDelivery?.direccion || 'Retiro / Consumo Local'

      // Contar pedidos válidos (no cancelados) para calcular gasto total
      const pedidosValidos = pedidosCliente.filter((p) => p.estado !== 'cancelado')
      const totalGastado = pedidosValidos.reduce((sum, p) => sum + p.total, 0)

      // Encontrar plato preferido (más pedido)
      const contadorPlatos: Record<string, number> = {}
      pedidosCliente.forEach((p) => {
        p.productos.forEach((prod) => {
          // Extraemos solo el nombre principal del producto para contar bien, quitando modificadores entre paréntesis si los hay
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
  }, [pedidos])

  // Filtrar clientes
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

  // Enviar mensaje de WhatsApp
  const enviarWhatsApp = (cliente: ClienteAgrupado) => {
    const saludo = `Hola ${cliente.nombre}, te saludamos de Chefsy! 🍔`
    window.open(`https://wa.me/${cliente.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(saludo)}`, '_blank')
  }

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      
      {/* Cabecera Principal */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">👥 Agenda de Clientes</h1>
          <p className="text-xs text-gray-400 dark:text-slate-400">
            Fidelizá y analizá el comportamiento de consumo de tus clientes frecuentes
          </p>
        </div>

        {/* Buscador */}
        <div className="w-full sm:w-72 flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-chefsy/50 transition-all">
          <Search size={16} className="text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o celular…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-transparent border-none text-base md:text-sm outline-none text-slate-700 dark:text-slate-200 w-full placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-350">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* KPIs Macro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex items-center gap-4 transition-colors">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-450 dark:text-slate-400 font-bold uppercase tracking-wider">Clientes Únicos</p>
            <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{metricas.totalClientes} clientes</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex items-center gap-4 transition-colors">
          <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 p-3 rounded-xl">
            <Award size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-455 dark:text-slate-400 font-bold uppercase tracking-wider">Cliente Estrella</p>
            <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate max-w-[180px]">{metricas.clienteEstrella}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{metricas.maxPedidos} compras</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex items-center gap-4 transition-colors">
          <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 p-3 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-455 dark:text-slate-400 font-bold uppercase tracking-wider">Mayor Comprador</p>
            <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate max-w-[180px]">{metricas.clienteTopSpender}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{formatearPrecio(metricas.maxGasto)} gastados</p>
          </div>
        </div>
      </div>

      {/* Tabla e interfaz responsiva */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden transition-colors">
        
        {/* Vista Desktop (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Celular</th>
                <th className="px-5 py-3">Dirección Frecuente</th>
                <th className="px-5 py-3 text-center">Pedidos</th>
                <th className="px-5 py-3">Consumo Total</th>
                <th className="px-5 py-3">Plato Favorito</th>
                <th className="px-5 py-3 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30 text-xs">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-450 dark:text-slate-500">
                    <User size={36} className="mx-auto text-slate-300 dark:text-slate-650 mb-2" />
                    No se encontraron clientes registrados con ese criterio.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.telefono}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
                          {cliente.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{cliente.nombre}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono font-medium text-slate-600 dark:text-slate-350">
                      {cliente.telefono}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-350 truncate max-w-[200px]" title={cliente.direccionMasReciente}>
                      {cliente.direccionMasReciente}
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-slate-900 dark:text-slate-100">
                      {cliente.totalPedidos}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-50">
                      {formatearPrecio(cliente.totalGastado)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="bg-chefsy-50 dark:bg-slate-800 text-chefsy-800 dark:text-chefsy-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        🍔 {cliente.platoFavorito}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setClienteSeleccionado(cliente)}
                        className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-300 hover:text-chefsy-800 dark:hover:text-chefsy-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all font-semibold"
                        title="Ver Historial"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Vista Mobile (Tarjetas) */}
        <div className="md:hidden divide-y divide-slate-50 dark:divide-slate-800/40">
          {clientesFiltrados.length === 0 ? (
            <div className="text-center py-12 text-slate-450 dark:text-slate-500">
              <User size={36} className="mx-auto text-slate-300 dark:text-slate-650 mb-2" />
              No se encontraron clientes.
            </div>
          ) : (
            clientesFiltrados.map((cliente) => (
              <div
                key={cliente.telefono}
                onClick={() => setClienteSeleccionado(cliente)}
                className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/10 active:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
                    {cliente.nombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{cliente.nombre}</h4>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{cliente.telefono}</p>
                    <div className="flex gap-2 items-center mt-1.5 flex-wrap">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold">
                        {cliente.totalPedidos} ped.
                      </span>
                      <span className="text-[10px] font-black text-slate-800 dark:text-slate-100">
                        {formatearPrecio(cliente.totalGastado)}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 shrink-0 ml-2" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Lateral de Historial y Detalle */}
      {clienteSeleccionado && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setClienteSeleccionado(null)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100">
            {/* Cabecera del Panel */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-chefsy text-white flex items-center justify-center font-bold">
                  {clienteSeleccionado.nombre.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-800 dark:text-slate-100 leading-tight">
                    {clienteSeleccionado.nombre}
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-slate-400 font-mono mt-0.5">
                    {clienteSeleccionado.telefono}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setClienteSeleccionado(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 transition-all focus:outline-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Panel */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Tarjeta WhatsApp */}
              <button
                onClick={() => enviarWhatsApp(clienteSeleccionado)}
                className="w-full bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/60 p-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <MessageCircle size={16} /> Enviar Mensaje por WhatsApp
              </button>

              {/* Ficha Resumen */}
              <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-3.5">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                  Ficha del Cliente
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Consumo Total</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">{formatearPrecio(clienteSeleccionado.totalGastado)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Pedidos</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">{clienteSeleccionado.totalPedidos} compras</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Dirección Frecuente</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 mt-1 block flex items-center gap-1">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{clienteSeleccionado.direccionMasReciente}</span>
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Plato Favorito</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block flex items-center gap-1">
                      <ShoppingBag size={12} className="text-chefsy shrink-0" />
                      <span>{clienteSeleccionado.platoFavorito}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Historial de Compras */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar size={14} /> Historial de compras
                </h4>
                
                <div className="space-y-2.5">
                  {clienteSeleccionado.pedidosHistoricos.map((ped) => {
                    const statusColors: Record<string, string> = {
                      nuevo: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/60',
                      en_cocina: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/60',
                      listo: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/60',
                      en_reparto: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/60',
                      entregado: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950/20 dark:text-green-300 dark:border-green-900/60',
                      cancelado: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/60',
                    }

                    const statusNombres: Record<string, string> = {
                      nuevo: 'Nuevo',
                      en_cocina: 'En Cocina',
                      listo: 'Listo',
                      en_reparto: 'En Reparto',
                      entregado: 'Entregado',
                      cancelado: 'Cancelado',
                    }

                    return (
                      <div
                        key={ped.id}
                        className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3.5 space-y-2 shadow-sm transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono text-[10px] text-slate-400">{ped.fecha} • {ped.hora}</span>
                          <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-full ${statusColors[ped.estado] || ''}`}>
                            {statusNombres[ped.estado] || ped.estado}
                          </span>
                        </div>

                        {/* Listado de Productos del pedido */}
                        <div className="divide-y divide-slate-50 dark:divide-slate-800/40 text-[11px] text-slate-600 dark:text-slate-350">
                          {ped.productos.map((prod) => (
                            <div key={prod.id} className="py-1 flex items-center justify-between">
                              <span className="font-semibold">{prod.cantidad}x {prod.nombre}</span>
                              <span className="font-medium text-slate-500 dark:text-slate-450">{formatearPrecio(prod.precio * prod.cantidad)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                          <span>Total</span>
                          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{formatearPrecio(ped.total)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
