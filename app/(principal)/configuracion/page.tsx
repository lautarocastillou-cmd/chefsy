'use client'

import { usarPedidos } from '@/contexto/PedidosContexto'
import { useState, useEffect } from 'react'
import { Save, RefreshCw, Clock, ChefHat, Bike, AlertTriangle } from 'lucide-react'

export default function PaginaConfiguracion() {
  const { configuracionOperativa, guardarConfiguracionOperativa } = usarPedidos()

  // Estados locales para los límites de tiempo
  const [pedidoAtrasadoMinutos, setPedidoAtrasadoMinutos] = useState(30)
  const [listoDemoradoMinutos, setListoDemoradoMinutos] = useState(10)
  const [cocinaDemoradoMinutos, setCocinaDemoradoMinutos] = useState(20)
  const [pedidoOlvidadoMinutos, setPedidoOlvidadoMinutos] = useState(45)

  // Estados locales para los umbrales de prioridad alta
  const [pedidoAtrasadoAltaMinutos, setPedidoAtrasadoAltaMinutos] = useState(45)
  const [listoDemoradoAltaMinutos, setListoDemoradoAltaMinutos] = useState(15)
  const [sinCadeteAltaMinutos, setSinCadeteAltaMinutos] = useState(15)
  const [cocinaDemoradoAltaMinutos, setCocinaDemoradoAltaMinutos] = useState(30)

  const [guardando, setGuardando] = useState(false)

  // Cargar valores iniciales desde la configuración centralizada
  useEffect(() => {
    if (configuracionOperativa) {
      setPedidoAtrasadoMinutos(configuracionOperativa.limites.pedidoAtrasadoMinutos)
      setListoDemoradoMinutos(configuracionOperativa.limites.listoDemoradoMinutos)
      setCocinaDemoradoMinutos(configuracionOperativa.limites.cocinaDemoradoMinutos)
      setPedidoOlvidadoMinutos(configuracionOperativa.limites.pedidoOlvidadoMinutos)

      setPedidoAtrasadoAltaMinutos(configuracionOperativa.prioridades.pedidoAtrasadoAltaMinutos)
      setListoDemoradoAltaMinutos(configuracionOperativa.prioridades.listoDemoradoAltaMinutos)
      setSinCadeteAltaMinutos(configuracionOperativa.prioridades.sinCadeteAltaMinutos)
      setCocinaDemoradoAltaMinutos(configuracionOperativa.prioridades.cocinaDemoradoAltaMinutos)
    }
  }, [configuracionOperativa])

  // Guardar configuración modificada en el archivo del servidor
  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    const nuevaConfig = {
      limites: {
        pedidoAtrasadoMinutos: Number(pedidoAtrasadoMinutos),
        listoDemoradoMinutos: Number(listoDemoradoMinutos),
        cocinaDemoradoMinutos: Number(cocinaDemoradoMinutos),
        pedidoOlvidadoMinutos: Number(pedidoOlvidadoMinutos),
      },
      prioridades: {
        pedidoAtrasadoAltaMinutos: Number(pedidoAtrasadoAltaMinutos),
        listoDemoradoAltaMinutos: Number(listoDemoradoAltaMinutos),
        sinCadeteAltaMinutos: Number(sinCadeteAltaMinutos),
        cocinaDemoradoAltaMinutos: Number(cocinaDemoradoAltaMinutos),
      },
    }

    await guardarConfiguracionOperativa(nuevaConfig)
    setGuardando(false)
  }

  // Restaurar los límites predeterminados recomendados
  const restaurarPredeterminados = () => {
    if (window.confirm('¿Deseas restablecer todos los límites de alerta a los valores recomendados de fábrica?')) {
      setPedidoAtrasadoMinutos(30)
      setListoDemoradoMinutos(10)
      setCocinaDemoradoMinutos(20)
      setPedidoOlvidadoMinutos(45)

      setPedidoAtrasadoAltaMinutos(45)
      setListoDemoradoAltaMinutos(15)
      setSinCadeteAltaMinutos(15)
      setCocinaDemoradoAltaMinutos(30)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl pb-12 text-slate-800 dark:text-[#e6e6e6]">
      {/* Explicación / Cabecera */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="text-xl font-bold">⚙️ Parámetros de Operación</h1>
          <p className="text-xs text-gray-400 dark:text-slate-400">
            Ajustá los minutos de tolerancia antes de que el panel inteligente resalte alarmas operativas
          </p>
        </div>
      </div>

      <form onSubmit={manejarGuardar} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Tarjeta 1: Límites para Detección */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-chefsy-800 dark:text-chefsy-300 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <Clock size={16} /> Tiempos de Alerta (Minutos)
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Pedidos Atrasados</label>
                <input
                  type="number"
                  min="1"
                  value={pedidoAtrasadoMinutos}
                  onChange={(e) => setPedidoAtrasadoMinutos(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-chefsy/50"
                  required
                />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                  Minutos activo antes de considerarse atrasado (Por defecto: 30)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Pedidos Listos Demorados</label>
                <input
                  type="number"
                  min="1"
                  value={listoDemoradoMinutos}
                  onChange={(e) => setListoDemoradoMinutos(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-chefsy/50"
                  required
                />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                  Minutos en estado "Listo" esperando entrega o cadete (Por defecto: 10)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Pedidos Demorados en Cocina</label>
                <input
                  type="number"
                  min="1"
                  value={cocinaDemoradoMinutos}
                  onChange={(e) => setCocinaDemoradoMinutos(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-chefsy/50"
                  required
                />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                  Minutos tolerables de preparación en la cocina (Por defecto: 20)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Pedidos Olvidados</label>
                <input
                  type="number"
                  min="1"
                  value={pedidoOlvidadoMinutos}
                  onChange={(e) => setPedidoOlvidadoMinutos(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-chefsy/50"
                  required
                />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                  Minutos sin cambios de estado ni actividad para considerarse olvidado (Por defecto: 45)
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Escalamiento de Prioridad */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-red-650 dark:text-red-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <AlertTriangle size={16} /> Escalamiento a Prioridad Alta (Minutos)
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Atrasados a Alta Prioridad</label>
                <input
                  type="number"
                  min="1"
                  value={pedidoAtrasadoAltaMinutos}
                  onChange={(e) => setPedidoAtrasadoAltaMinutos(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500/30"
                  required
                />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                  Minutos activos totales antes de pasar a rojo crítico (Por defecto: 45)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Listo Demorado a Alta Prioridad</label>
                <input
                  type="number"
                  min="1"
                  value={listoDemoradoAltaMinutos}
                  onChange={(e) => setListoDemoradoAltaMinutos(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500/30"
                  required
                />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                  Minutos en "Listo" antes de alertar con color rojo (Por defecto: 15)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Sin Cadete a Alta Prioridad</label>
                <input
                  type="number"
                  min="1"
                  value={sinCadeteAltaMinutos}
                  onChange={(e) => setSinCadeteAltaMinutos(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500/30"
                  required
                />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                  Minutos sin repartidor asignado antes de catalogarlo como crítico (Por defecto: 15)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Cocina Demorada a Alta Prioridad</label>
                <input
                  type="number"
                  min="1"
                  value={cocinaDemoradoAltaMinutos}
                  onChange={(e) => setCocinaDemoradoAltaMinutos(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500/30"
                  required
                />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                  Minutos cocinando antes de marcar en alerta máxima (Por defecto: 30)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones del Formulario */}
        <div className="flex items-center gap-3 justify-end pt-3">
          <button
            type="button"
            onClick={restaurarPredeterminados}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-[#e6e6e6] text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} /> Restablecer Predeterminados
          </button>
          
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center gap-1.5 bg-chefsy hover:bg-chefsy-700 text-white text-xs font-extrabold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save size={14} /> {guardando ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  )
}
