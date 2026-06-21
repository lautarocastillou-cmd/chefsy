'use client'

// ─────────────────────────────────────────────────────
// app/(principal)/pedidos/page.tsx
// Lista completa de pedidos con filtros por estado y fecha.
// ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import TarjetaPedido from '@/components/pedidos/TarjetaPedido'
import VistaKanban from '@/components/pedidos/VistaKanban'
import { EstadoPedido, TipoEntrega, Pedido } from '@/tipos'
import { opcionesTipoEntrega } from '@/lib/entrega'
import { cn } from '@/lib/utils'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { Plus, X, Calendar, LayoutGrid, List, Grid, Columns } from 'lucide-react'
import FormularioPedido from '@/components/pedidos/FormularioPedido'
import { usarTemaNotificacion } from '@/contexto/TemaNotificacionContexto'

// Opciones del filtro de estado
const opcionesFiltro: { valor: EstadoPedido | 'todos'; etiqueta: string }[] = [
  { valor: 'todos',      etiqueta: 'Todos' },
  { valor: 'nuevo',      etiqueta: 'Nuevos' },
  { valor: 'en_cocina',  etiqueta: 'En Cocina' },
  { valor: 'listo',      etiqueta: 'Listos' },
  { valor: 'entregado',  etiqueta: 'Entregados' },
  { valor: 'cancelado',  etiqueta: 'Cancelados' },
]

export default function PaginaPedidos() {
  const { pedidos, obtenerPedidosPorFecha, estadoTurno } = usarPedidos()
  const { agregarNotificacion } = usarTemaNotificacion()
  
  // Vistas: activos (no archivados, tiempo real) o historial (por fecha, incluye archivados)
  const [vista, setVista] = useState<'activos' | 'historial'>('activos')
  // Modo de vista para activos: cuadricula, lista vertical o tablero
  const [modoVista, setModoVista] = useState<'cuadricula' | 'lista_vertical' | 'tablero'>('cuadricula')
  
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => obtenerFechaNegocio())
  const [pedidosHistoricos, setPedidosHistoricos] = useState<Pedido[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const [filtroActivo, setFiltroActivo] = useState<EstadoPedido | 'todos'>('todos')
  const [filtroEntrega, setFiltroEntrega] = useState<TipoEntrega | 'todos'>('todos')
  
  const [modalNuevoPedidoAbierto, setModalNuevoPedidoAbierto] = useState(false)
  const [pedidoAEditar, setPedidoAEditar] = useState<Pedido | null>(null)

  const handleAbrirNuevoPedido = () => {
    if (!estadoTurno.activo) {
      agregarNotificacion('Debés iniciar el turno desde "Cierre de Caja" para cargar pedidos.', 'warning')
      return
    }
    setModalNuevoPedidoAbierto(true)
  }

  // Cargar pedidos del día seleccionado cuando corresponda (sincronizado con cambios en tiempo real)
  useEffect(() => {
    if (vista !== 'historial') return
    let activo = true
    async function cargar() {
      setCargandoHistorial(true)
      const data = await obtenerPedidosPorFecha(fechaSeleccionada)
      if (activo) {
        setPedidosHistoricos(data)
        setCargandoHistorial(false)
      }
    }
    cargar()
    return () => {
      activo = false
    }
  }, [fechaSeleccionada, vista, obtenerPedidosPorFecha, pedidos])

  // Determinar el conjunto base de pedidos según la pestaña activa
  const pedidosBase = vista === 'activos' ? pedidos : pedidosHistoricos

  const pedidosFiltrados = pedidosBase.filter((p) => {
    // Si estamos en activos, por defecto el filtro 'todos' excluye los cancelados.
    // Si estamos en historial, el filtro 'todos' incluye absolutamente todo.
    const coincideEstado = filtroActivo === 'todos' 
      ? (vista === 'activos' ? p.estado !== 'cancelado' : true)
      : p.estado === filtroActivo
    const coincideEntrega = filtroEntrega === 'todos' || p.tipoEntrega === filtroEntrega
    return coincideEstado && coincideEntrega
  })

  return (
    <div className="space-y-5">

      {/* ── Selector de Vista (Activos vs Historial) ── */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-150 dark:border-slate-800 pb-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setVista('activos')
              setFiltroActivo('todos')
            }}
            className={cn(
              "pb-2.5 px-4 font-semibold text-sm transition-all border-b-2 -mb-[13px] cursor-pointer",
              vista === 'activos'
                ? "border-chefsy text-chefsy dark:text-chefsy-400"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
            )}
          >
            ⚡ Pedidos Activos
          </button>
          <button
            onClick={() => {
              setVista('historial')
              setFiltroActivo('todos')
              setModoVista('cuadricula') // Historial siempre en cuadricula
            }}
            className={cn(
              "pb-2.5 px-4 font-semibold text-sm transition-all border-b-2 -mb-[13px] cursor-pointer",
              vista === 'historial'
                ? "border-chefsy text-chefsy dark:text-chefsy-400"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
            )}
          >
            📅 Historial por Fecha
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle de Modo Vista (Solo visible en 'activos' y oculto en móvil) */}
          {vista === 'activos' && (
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setModoVista('cuadricula')}
                className={cn(
                  "p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all",
                  modoVista === 'cuadricula'
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                )}
                title="Vista de Cuadrículas"
              >
                <Grid size={16} /> Cuadrículas
              </button>
              <button
                onClick={() => setModoVista('lista_vertical')}
                className={cn(
                  "p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all",
                  modoVista === 'lista_vertical'
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                )}
                title="Vista de Lista"
              >
                <List size={16} /> Lista
              </button>
              <button
                onClick={() => setModoVista('tablero')}
                className={cn(
                  "p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all",
                  modoVista === 'tablero'
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                )}
                title="Vista Kanban"
              >
                <Columns size={16} /> Tablero
              </button>
            </div>
          )}

          {vista === 'historial' && (
            <div className="sm:ml-auto flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 px-3 py-1.5 rounded-2xl shadow-sm animate-in fade-in duration-200">
              <Calendar className="w-4 h-4 text-chefsy dark:text-chefsy-400" />
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-700 dark:text-slate-200 border-none outline-none focus:ring-0 p-0 w-32 cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          )}
        </div>
      </div>

      {/* En vista Kanban, no mostramos los filtros porque las columnas actúan como filtros */}
      {modoVista !== 'tablero' && (
        <>
          {/* ── Barra superior (Filtros de Estado y Entrega) ── */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Filtros de Estado */}
            <div className="flex flex-wrap gap-1.5">
              {opcionesFiltro.map((opcion) => (
                <button
                  key={opcion.valor}
                  onClick={() => setFiltroActivo(opcion.valor)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer',
                    filtroActivo === opcion.valor
                      ? 'bg-chefsy text-white'
                      : 'bg-white dark:bg-slate-900 border border-chefsy-200/60 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-chefsy-50 dark:hover:bg-slate-850'
                  )}
                >
                  {opcion.etiqueta}
                </button>
              ))}
            </div>

            {/* Filtros de Entrega */}
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setFiltroEntrega('todos')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer',
                  filtroEntrega === 'todos'
                    ? 'bg-gray-800 dark:bg-slate-700 text-white border-gray-800 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-850'
                )}
              >
                Todos los tipos
              </button>
              {opcionesTipoEntrega.map((opcion) => (
                <button
                  key={opcion.valor}
                  onClick={() => setFiltroEntrega(opcion.valor)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer',
                    filtroEntrega === opcion.valor
                      ? 'bg-gray-800 dark:bg-slate-700 text-white border-gray-800 dark:border-slate-700'
                      : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-850'
                  )}
                >
                  {opcion.icono} {opcion.etiqueta}
                </button>
              ))}
            </div>
          </div>

          {/* ── Contador e info de modo ── */}
          <div className="flex justify-between items-center text-sm text-gray-400">
            <p>
              {pedidosFiltrados.length}{' '}
              {pedidosFiltrados.length === 1 ? 'pedido' : 'pedidos'}
            </p>
            {vista === 'historial' && (
              <p className="text-xs text-chefsy dark:text-chefsy-400 font-medium">
                Visualizando pedidos del {new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-AR')}
              </p>
            )}
          </div>
        </>
      )}

      {/* ── Vista principal ── */}
      {vista === 'historial' && cargandoHistorial ? (
        <div className="text-center py-16 text-gray-400 text-sm animate-pulse">
          Cargando historial de pedidos...
        </div>
      ) : modoVista === 'tablero' ? (
        <div className="animate-in fade-in duration-200 mt-2">
          {/* Ocultamos el Kanban en mobile usando la directiva de Tailwind si se forzara (aunque no debería poder elegirse por no tener botón, por si acaso) */}
          <div className="hidden md:block">
            <VistaKanban 
              pedidos={pedidosFiltrados} 
              onEditarPedido={(pedido) => setPedidoAEditar(pedido)} 
            />
          </div>
          <div className="md:hidden text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <p className="text-slate-500 font-medium">La vista de Tablero no está disponible en móviles.</p>
            <button 
              onClick={() => setModoVista('cuadricula')}
              className="mt-4 text-chefsy font-bold underline"
            >
              Volver a las Cuadrículas
            </button>
          </div>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No hay pedidos en este estado para mostrar.
        </div>
      ) : (
        <div className={cn(
          "animate-in fade-in duration-200",
          modoVista === 'lista_vertical' 
            ? "flex flex-col gap-3.5 max-w-3xl mx-auto w-full" 
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5"
        )}>
          {pedidosFiltrados.map((pedido) => (
            <TarjetaPedido key={pedido.id} pedido={pedido} />
          ))}
        </div>
      )}

      {/* ── Botón Flotante para Crear Pedido ── */}
      <button
        onClick={handleAbrirNuevoPedido}
        className="fixed bottom-6 right-6 z-40 bg-chefsy hover:bg-chefsy-700 text-white font-bold py-3 px-5 rounded-full shadow-lg shadow-chefsy/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer"
      >
        <Plus size={18} />
        <span>Crear Pedido</span>
      </button>

      {/* ── Modal de Nuevo / Editar Pedido ── */}
      {(modalNuevoPedidoAbierto || pedidoAEditar) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-200 relative">
            {/* Header del Modal */}
            <div className="sticky top-0 z-10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md flex items-center justify-between border-b border-gray-150 dark:border-slate-800 p-6 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  {pedidoAEditar ? '✏️ Editar Pedido' : '📝 Nuevo Pedido'}
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-400">
                  {pedidoAEditar ? 'Modificar detalles de la orden' : 'Registrar una orden desde el panel'}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalNuevoPedidoAbierto(false)
                  setPedidoAEditar(null)
                }}
                className="text-slate-450 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            {/* Contenido del Modal */}
            <div className="px-6 pb-6">
              <FormularioPedido 
                pedidoInicial={pedidoAEditar || undefined}
                onClose={() => {
                  setModalNuevoPedidoAbierto(false)
                  setPedidoAEditar(null)
                }} 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

