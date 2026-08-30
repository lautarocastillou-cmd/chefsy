'use client'

import React, { useState } from 'react'
import { formatearPrecio } from '@/lib/utils'
import AdministradorCuentasClientes from '@/components/clientes/AdministradorCuentasClientes'
import {
  Search,
  MapPin,
  ShoppingBag,
  MessageCircle,
  Calendar,
  X,
  User,
  Users,
  Award,
  DollarSign,
  ChevronRight,
  Star,
  AlertTriangle,
  Sparkles,
  Gem,
  ArrowUpDown,
  ExternalLink,
  Send,
  Flame,
  Gift,
  Clock
} from 'lucide-react'
import { useAgendaClientes, ClienteAgrupado, TipoSegmentoCliente, CriterioOrdenCliente } from '@/hooks/useAgendaClientes'

export default function PaginaAgendaClientes() {
  const {
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
  } = useAgendaClientes()

  const [pestaña, setPestaña] = useState<'agenda' | 'cuentas'>('agenda')

  // Enviar mensaje de WhatsApp con plantillas estratégicas
  const enviarWhatsAppPlantilla = (cliente: ClienteAgrupado, tipo: 'saludo' | 'vip' | 'rescate' | 'favorito') => {
    if (!cliente) return
    const tel = (cliente.telefono || '').toString().replace(/\D/g, '')
    const nombre = (cliente.nombre || 'amigo').split(' ')[0]
    
    let mensaje = `Hola ${nombre}, te saludamos de Chefsy! 🍔`

    if (tipo === 'vip') {
      mensaje = `¡Hola ${nombre}! ⭐ Sos uno de los clientes más fieles de Chefsy. ¡Queremos premiarte con un beneficio exclusivo para tu próximo pedido! 🍔🍟`
    } else if (tipo === 'rescate') {
      mensaje = `¡Hola ${nombre}! ❤️ Hace días que no sabemos de vos en Chefsy. ¡Hoy te regalamos el costo de envío con tu cena! Pedí por la app cuando gustes 🛵🍔`
    } else if (tipo === 'favorito' && cliente.platoFavorito && cliente.platoFavorito !== 'Sin registros') {
      mensaje = `¡Hola ${nombre}! 🍔 Vimos que tu plato favorito en Chefsy es *${cliente.platoFavorito}*. ¡Hoy tenemos una promo especial en cocina para vos!`
    }

    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const toggleOrden = (campo: 'pedidos' | 'gasto' | 'ticket' | 'reciente' | 'nombre') => {
    if (campo === 'pedidos') {
      setCriterioOrden(prev => prev === 'pedidos_desc' ? 'gasto_desc' : 'pedidos_desc')
    } else if (campo === 'gasto') {
      setCriterioOrden(prev => prev === 'gasto_desc' ? 'pedidos_desc' : 'gasto_desc')
    } else if (campo === 'ticket') {
      setCriterioOrden(prev => prev === 'ticket_desc' ? 'gasto_desc' : 'ticket_desc')
    } else if (campo === 'reciente') {
      setCriterioOrden(prev => prev === 'reciente_desc' ? 'pedidos_desc' : 'reciente_desc')
    } else if (campo === 'nombre') {
      setCriterioOrden(prev => prev === 'nombre_asc' ? 'pedidos_desc' : 'nombre_asc')
    }
  }

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      
      {/* Cabecera Principal */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 leading-tight">Gestión de Clientes</h1>
            <p className="text-xs text-gray-400 dark:text-slate-400">
              Administrá cuentas de soporte y analizá métricas de consumo de tus clientes
            </p>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setPestaña('agenda')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              pestaña === 'agenda'
                ? 'bg-white dark:bg-slate-900 text-chefsy shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            📊 Agenda y Métricas
          </button>
          <button
            onClick={() => setPestaña('cuentas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              pestaña === 'cuentas'
                ? 'bg-white dark:bg-slate-900 text-chefsy shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            🛠️ Administrar Cuentas
          </button>
        </div>
      </div>

      {pestaña === 'cuentas' ? (
        <AdministradorCuentasClientes />
      ) : cargando ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 border-4 border-chefsy-300 border-t-chefsy rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Cargando agenda de clientes...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <p className="text-red-500 font-bold text-lg">⚠️ Ocurrió un error</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">

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

          {/* Barra de Segmentos Inteligentes y Buscador */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Filtros por Segmento */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide text-xs">
              <button
                onClick={() => setSegmentoActivo('todos')}
                className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  segmentoActivo === 'todos'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>Todos</span>
                <span className="text-[10px] opacity-75 font-mono">({metricas.totalClientes})</span>
              </button>

              <button
                onClick={() => setSegmentoActivo('vip')}
                className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  segmentoActivo === 'vip'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-950/50'
                }`}
              >
                <Star size={13} className={segmentoActivo === 'vip' ? 'fill-white' : 'fill-amber-500 text-amber-500'} />
                <span>⭐ VIPs (+5)</span>
                <span className="text-[10px] font-mono">({metricas.conteoVip})</span>
              </button>

              <button
                onClick={() => setSegmentoActivo('en_riesgo')}
                className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  segmentoActivo === 'en_riesgo'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/50'
                }`}
              >
                <AlertTriangle size={13} />
                <span>⚠️ En Riesgo (+25d)</span>
                <span className="text-[10px] font-mono">({metricas.conteoEnRiesgo})</span>
              </button>

              <button
                onClick={() => setSegmentoActivo('nuevos')}
                className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  segmentoActivo === 'nuevos'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'
                }`}
              >
                <Sparkles size={13} />
                <span>✨ Nuevos</span>
                <span className="text-[10px] font-mono">({metricas.conteoNuevos})</span>
              </button>

              <button
                onClick={() => setSegmentoActivo('top_ticket')}
                className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  segmentoActivo === 'top_ticket'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/50'
                }`}
              >
                <Gem size={13} />
                <span>💎 Top Ticket</span>
                <span className="text-[10px] font-mono">({metricas.conteoTopTicket})</span>
              </button>
            </div>

            {/* Buscador */}
            <div className="w-full md:w-64 flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 shadow-xs focus-within:ring-2 focus-within:ring-chefsy/50 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
              <Search size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Buscar cliente o celular…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-transparent border-none text-xs outline-none text-slate-700 dark:text-slate-200 w-full placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="text-gray-400 hover:text-gray-600 dark:text-slate-500">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Tabla e interfaz responsiva */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden transition-colors">
            
            {/* Vista Desktop (Tabla) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider select-none">
                    <th onClick={() => toggleOrden('nombre')} className="px-5 py-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>Cliente</span>
                        <ArrowUpDown size={12} className={criterioOrden === 'nombre_asc' ? 'text-chefsy' : 'text-slate-300'} />
                      </div>
                    </th>
                    <th className="px-5 py-3.5">Celular</th>
                    <th className="px-5 py-3.5">Dirección Frecuente</th>
                    <th onClick={() => toggleOrden('pedidos')} className="px-5 py-3.5 text-center cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Pedidos</span>
                        <ArrowUpDown size={12} className={criterioOrden === 'pedidos_desc' ? 'text-chefsy' : 'text-slate-300'} />
                      </div>
                    </th>
                    <th onClick={() => toggleOrden('gasto')} className="px-5 py-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>Consumo Total</span>
                        <ArrowUpDown size={12} className={criterioOrden === 'gasto_desc' ? 'text-chefsy' : 'text-slate-300'} />
                      </div>
                    </th>
                    <th onClick={() => toggleOrden('reciente')} className="px-5 py-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>Último Pedido</span>
                        <ArrowUpDown size={12} className={criterioOrden === 'reciente_desc' ? 'text-chefsy' : 'text-slate-300'} />
                      </div>
                    </th>
                    <th className="px-5 py-3.5">Plato Favorito</th>
                    <th className="px-5 py-3.5 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30 text-xs">
                  {clientesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-450 dark:text-slate-500">
                        <User size={36} className="mx-auto text-slate-300 dark:text-slate-650 mb-2" />
                        No se encontraron clientes para este segmento o criterio de búsqueda.
                      </td>
                    </tr>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <tr
                        key={cliente.telefono}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors group"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0 text-xs">
                              {(cliente.nombre || 'C').toString().substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[150px]">{cliente.nombre}</span>
                                {cliente.esVip && (
                                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">
                                    ⭐ VIP
                                  </span>
                                )}
                                {cliente.enRiesgo && (
                                  <span className="bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">
                                    ⚠️ Inactivo
                                  </span>
                                )}
                                {cliente.esNuevo && (
                                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">
                                    ✨ Nuevo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono font-medium text-slate-600 dark:text-slate-350">
                          {cliente.telefono}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-350 max-w-[180px]">
                          {cliente.direccionMasReciente.startsWith('http') ? (
                            <a
                              href={cliente.direccionMasReciente}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-chefsy hover:underline font-bold text-[11px] bg-chefsy/10 px-2 py-0.5 rounded-md"
                            >
                              <MapPin size={11} /> Ubicación GPS <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="truncate block" title={cliente.direccionMasReciente}>
                              {cliente.direccionMasReciente}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-900 dark:text-slate-100">
                          {cliente.totalPedidos}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-50">
                          {formatearPrecio(cliente.totalGastado)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium">
                          {cliente.diasDesdeUltimoPedido === 0 
                            ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">Hoy</span>
                            : cliente.diasDesdeUltimoPedido === 1 
                            ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">Ayer</span>
                            : cliente.diasDesdeUltimoPedido >= 25 
                            ? <span className="text-red-500 dark:text-red-400 font-bold">Hace {cliente.diasDesdeUltimoPedido} días</span>
                            : `Hace ${cliente.diasDesdeUltimoPedido} días`}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="bg-chefsy-50 dark:bg-slate-800 text-chefsy-800 dark:text-chefsy-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block truncate max-w-[140px]" title={cliente.platoFavorito}>
                            🍔 {cliente.platoFavorito}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setClienteSeleccionado(cliente)}
                            className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-300 hover:text-chefsy-800 dark:hover:text-chefsy-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all font-semibold cursor-pointer"
                            title="Ver Historial y Campañas"
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
                        {(cliente.nombre || 'C').toString().substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{cliente.nombre}</h4>
                          {cliente.esVip && (
                            <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">
                              ⭐ VIP
                            </span>
                          )}
                          {cliente.enRiesgo && (
                            <span className="bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">
                              ⚠️ Inactivo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{cliente.telefono}</p>
                        <div className="flex gap-2 items-center mt-1.5 flex-wrap">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold">
                            {cliente.totalPedidos} ped.
                          </span>
                          <span className="text-[10px] font-black text-slate-800 dark:text-slate-100">
                            {formatearPrecio(cliente.totalGastado)}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {cliente.diasDesdeUltimoPedido === 0 ? 'Hoy' : `Hace ${cliente.diasDesdeUltimoPedido}d`}
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

          {/* Modal Lateral de Historial y Campañas de WhatsApp */}
          {clienteSeleccionado && (
            <div className="fixed inset-0 z-50 flex justify-end">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-slate-950/80 transition-opacity will-change-opacity"
                onClick={() => setClienteSeleccionado(null)}
              />

              {/* Panel */}
              <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 will-change-transform">
                {/* Cabecera del Panel */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-chefsy text-white flex items-center justify-center font-bold">
                      {(clienteSeleccionado.nombre || 'C').toString().substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-base text-gray-800 dark:text-slate-100 leading-tight">
                          {clienteSeleccionado.nombre}
                        </h3>
                        {clienteSeleccionado.esVip && (
                          <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">
                            VIP
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-400 font-mono mt-0.5">
                        {clienteSeleccionado.telefono}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setClienteSeleccionado(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 transition-all focus:outline-none cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Cuerpo del Panel */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">

                  {/* Acciones Rápidas de WhatsApp / Campañas de Fidelización */}
                  <div className="space-y-2.5">
                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <MessageCircle size={13} className="text-emerald-500" /> Plantillas de WhatsApp con 1 Clic
                    </h4>

                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => enviarWhatsAppPlantilla(clienteSeleccionado, 'saludo')}
                        className="w-full bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60 p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all shadow-xs active:scale-98 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Send size={13} /> Saludo Estándar
                        </span>
                        <span className="text-[10px] opacity-75 font-normal">Hola {clienteSeleccionado.nombre.split(' ')[0]}...</span>
                      </button>

                      {clienteSeleccionado.platoFavorito && clienteSeleccionado.platoFavorito !== 'Sin registros' && (
                        <button
                          onClick={() => enviarWhatsAppPlantilla(clienteSeleccionado, 'favorito')}
                          className="w-full bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60 p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all shadow-xs active:scale-98 cursor-pointer"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Flame size={13} className="text-amber-600 shrink-0" /> Promo Plato Favorito
                          </span>
                          <span className="text-[10px] opacity-75 font-normal truncate max-w-[130px]">{clienteSeleccionado.platoFavorito}</span>
                        </button>
                      )}

                      {clienteSeleccionado.enRiesgo ? (
                        <button
                          onClick={() => enviarWhatsAppPlantilla(clienteSeleccionado, 'rescate')}
                          className="w-full bg-red-50 dark:bg-red-950/20 hover:bg-red-100/60 dark:hover:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200/60 dark:border-red-900/60 p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all shadow-xs active:scale-98 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Gift size={13} className="text-red-500" /> Rescate: Envío Gratis
                          </span>
                          <span className="text-[10px] opacity-75 font-normal">¡Te extrañamos!</span>
                        </button>
                      ) : clienteSeleccionado.esVip ? (
                        <button
                          onClick={() => enviarWhatsAppPlantilla(clienteSeleccionado, 'vip')}
                          className="w-full bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all shadow-xs active:scale-98 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Star size={13} className="text-blue-500 fill-blue-500" /> Beneficio Exclusivo VIP
                          </span>
                          <span className="text-[10px] opacity-75 font-normal">Premio Fidelidad</span>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Ficha Resumen */}
                  <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-3.5">
                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                      Ficha del Cliente
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Consumo</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">{formatearPrecio(clienteSeleccionado.totalGastado)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Pedidos</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">{clienteSeleccionado.totalPedidos}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Ticket Prom.</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">{formatearPrecio(clienteSeleccionado.ticketPromedio)}</span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Última Compra</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 mt-1 block flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400 shrink-0" />
                          {clienteSeleccionado.fechaUltimoPedido} ({clienteSeleccionado.diasDesdeUltimoPedido === 0 ? 'Hoy' : `hace ${clienteSeleccionado.diasDesdeUltimoPedido} días`})
                        </span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Dirección Frecuente</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 mt-1 block flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          {clienteSeleccionado.direccionMasReciente.startsWith('http') ? (
                            <a href={clienteSeleccionado.direccionMasReciente} target="_blank" rel="noopener noreferrer" className="text-chefsy font-bold hover:underline">
                              Abrir enlace de Google Maps
                            </a>
                          ) : (
                            <span className="truncate">{clienteSeleccionado.direccionMasReciente}</span>
                          )}
                        </span>
                      </div>
                      <div className="col-span-3">
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
                      <Calendar size={14} /> Historial de compras ({clienteSeleccionado.pedidosHistoricos.length})
                    </h4>
                    
                    <div className="space-y-2.5">
                      {clienteSeleccionado.pedidosHistoricos.map((ped) => {
                        const statusColors: Record<string, string> = {
                          nuevo: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/60',
                          en_cocina: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/60',
                          listo: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/60',
                          en_camino: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/60',
                          entregado: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950/20 dark:text-green-300 dark:border-green-900/60',
                          cancelado: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/60',
                        }

                        const statusNombres: Record<string, string> = {
                          nuevo: 'Nuevo',
                          en_cocina: 'En Cocina',
                          listo: 'Listo',
                          en_camino: 'En Camino',
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
      )}
    </div>
  )
}
