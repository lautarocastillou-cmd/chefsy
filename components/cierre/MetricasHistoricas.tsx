import React, { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
import { formatearPrecio } from '@/lib/utils'
import { TrendingUp, ShoppingBag, CalendarDays, DollarSign } from 'lucide-react'

export default function MetricasHistoricas() {
  const [datos, setDatos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch('/api/admin/cierres')
        const data = await res.json()
        if (Array.isArray(data)) {
          // Formatear la fecha para que se lea mejor (ej: "Jue, 15 Jun")
          const formateados = data.map(item => {
            const date = new Date(item.fecha + 'T00:00:00')
            let diaStr = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
            // Capitalizar la primera letra y quitar puntos
            diaStr = diaStr.charAt(0).toUpperCase() + diaStr.slice(1).replace(/\./g, '')

            return {
              ...item,
              fechaCortada: diaStr,
              // Agregar valor en crudo para las gráficas
              ingresos: Number(item.facturacion_neta),
              pedidos: Number(item.total_pedidos)
            }
          })
          setDatos(formateados)
        }
      } catch (error) {
        console.error('Error cargando historial', error)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (datos.length === 0) {
    return (
      <div className="bg-white dark:bg-[#252525] p-10 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] text-center shadow-sm">
        <p className="text-slate-500 dark:text-slate-400">Aún no hay cierres históricos guardados en la tabla segura.</p>
        <p className="text-sm mt-2 text-slate-400">Finalizá un turno para generar tu primer snapshot.</p>
      </div>
    )
  }

  // Calcular KPIs
  const totalIngresos = datos.reduce((acc, curr) => acc + curr.ingresos, 0)
  const totalPedidos = datos.reduce((acc, curr) => acc + curr.pedidos, 0)
  const promedioDiario = datos.length > 0 ? totalIngresos / datos.length : 0

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Tarjetas de Resumen (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#252525] p-4 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-emerald-500" />
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Generado</h3>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">{formatearPrecio(totalIngresos)}</p>
        </div>

        <div className="bg-white dark:bg-[#252525] p-4 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-blue-500" />
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Promedio Diario</h3>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">{formatearPrecio(promedioDiario)}</p>
        </div>

        <div className="bg-white dark:bg-[#252525] p-4 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={16} className="text-orange-500" />
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Pedidos</h3>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">{totalPedidos}</p>
        </div>

        <div className="bg-white dark:bg-[#252525] p-4 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays size={16} className="text-purple-500" />
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Días Analizados</h3>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">{datos.length} turnos</p>
        </div>
      </div>

      {/* Gráfico 1: Evolución de Ingresos (Area) */}
      <div className="bg-white dark:bg-[#252525] p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 dark:text-[#e6e6e6] mb-6">📈 Crecimiento de Ingresos</h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datos} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" opacity={0.2} />
              <XAxis 
                dataKey="fechaCortada" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#888' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#888' }}
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value: any) => [formatearPrecio(Number(value)), 'Ingresos']}
                labelStyle={{ fontWeight: 'bold', color: '#666', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="ingresos" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorIngresos)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: Volumen de Pedidos (Barras) */}
      <div className="bg-white dark:bg-[#252525] p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 dark:text-[#e6e6e6] mb-6">📊 Volumen de Pedidos (Últimos Turnos)</h2>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" opacity={0.2} />
              <XAxis 
                dataKey="fechaCortada" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#888' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#888' }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value: any) => [value, 'Pedidos']}
              />
              <Bar dataKey="pedidos" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla de Historial Seguro */}
      <div className="bg-white dark:bg-[#252525] rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-[#3d3d3d]">
          <h2 className="text-lg font-bold text-slate-800 dark:text-[#e6e6e6]">📜 Historial de Snapshots (Inmutables)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-[#2f2f2f] text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Pedidos</th>
                <th className="px-4 py-3 font-semibold">Neto</th>
                <th className="px-4 py-3 font-semibold">Caja Inicial</th>
                <th className="px-4 py-3 font-semibold">Efectivo Rendir</th>
                <th className="px-4 py-3 font-semibold">Delivery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#3d3d3d]">
              {[...datos].reverse().map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-[#2a2a2a] transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.fecha}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.pedidos}</td>
                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-500 font-semibold">{formatearPrecio(row.ingresos)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatearPrecio(row.caja_inicial)}</td>
                  <td className="px-4 py-3 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-900/10">
                    {formatearPrecio(row.efectivo_rendir)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.total_envios_delivery} envíos</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
