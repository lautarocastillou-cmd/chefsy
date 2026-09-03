'use client'

// ─────────────────────────────────────────────────────
// app/(principal)/pedidos/page.tsx
// Lista completa de pedidos con filtros por estado y fecha.
// ─────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import TarjetaPedido from '@/components/pedidos/TarjetaPedido'
import VistaKanban from '@/components/pedidos/VistaKanban'
import { EstadoPedido, TipoEntrega, Pedido } from '@/tipos'
import { opcionesTipoEntrega } from '@/lib/entrega'
import { cn } from '@/lib/utils'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { Plus, X, Calendar, LayoutGrid, List, Grid, Columns, Zap } from 'lucide-react'
import FormularioPedido from '@/components/pedidos/FormularioPedido'
import { usarTemaNotificacion } from '@/contexto/TemaNotificacionContexto'
import { useAtajoNuevoPedido } from '@/hooks/useAtajoNuevoPedido'
import IconoTipoEntrega from '@/components/ui/IconoTipoEntrega'
import BannerSugerenciasRuta from '@/components/pedidos/BannerSugerenciasRuta'

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

  useAtajoNuevoPedido({
    modalAbierto: modalNuevoPedidoAbierto || Boolean(pedidoAEditar),
    onAbrirModal: handleAbrirNuevoPedido,
  })

  // Cargar pedidos del día seleccionado cuando corresponda (solo al cambiar fecha o entrar a historial)
  useEffect(() => {
    if (vista !== 'historial') return
    let activo = true
    async function cargar() {
      setCargandoHistorial(true)
      try {
        const data = await obtenerPedidosPorFecha(fechaSeleccionada)
        if (activo) {
          setPedidosHistoricos(data)
        }
      } finally {
        if (activo) {
          setCargandoHistorial(false)
        }
      }
    }
    cargar()
    return () => {
      activo = false
    }
  }, [fechaSeleccionada, vista, obtenerPedidosPorFecha])

  // Determinar el conjunto base de pedidos según la pestaña activa
  const pedidosBase = vista === 'activos' ? pedidos : pedidosHistoricos

  // Memorizar la lista filtrada para evitar recalcular en cada tick o render menor
  const pedidosFiltrados = useMemo(() => {
    return pedidosBase.filter((p) => {
      const coincideEstado = filtroActivo === 'todos' 
        ? (vista === 'activos' ? p.estado !== 'cancelado' : true)
        : p.estado === filtroActivo
      const coincideEntrega = filtroEntrega === 'todos' || p.tipoEntrega === filtroEntrega
      return coincideEstado && coincideEntrega
    })
  }, [pedidosBase, filtroActivo, filtroEntrega, vista])

  // Conteos por estado en una sola pasada O(n) — evita N filtros inline en el render
  const conteosPorEstado = useMemo(() => {
    const conteos: Record<string, number> = { todos: 0 }
    for (const p of pedidosBase) {
      if (vista === 'activos' && p.estado === 'cancelado') continue
      conteos.todos = (conteos.todos || 0) + 1
      conteos[p.estado] = (conteos[p.estado] || 0) + 1
    }
    return conteos
  }, [pedidosBase, vista])

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
            <span className="inline-flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" /> Pedidos Activos
            </span>
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
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" /> Historial por Fecha
            </span>
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
          {/* ── Barra de Filtros de Estado Móvil y Desktop ── */}
          <div className="space-y-2.5">
            {/* Carrusel Horizontal de Estados con Conteo y Badges */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none snap-x py-1 -mx-3 px-3 md:mx-0 md:px-0">
              {opcionesFiltro.map((opcion) => {
                const count = conteosPorEstado[opcion.valor] || 0
                const activo = filtroActivo === opcion.valor

                return (
                  <button
                    key={opcion.valor}
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
                      setFiltroActivo(opcion.valor)
                    }}
                    className={cn(
                      'snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 active:scale-95 select-none shadow-xs',
                      activo
                        ? 'bg-chefsy text-white shadow-md shadow-chefsy/20'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                    )}
                  >
                    <span>{opcion.etiqueta}</span>
                    <span
                      className={cn(
                        'text-[10px] font-black px-1.5 py-0.2 rounded-full',
                        activo
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Filtros de Tipo de Entrega */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none snap-x py-0.5 -mx-3 px-3 md:mx-0 md:px-0">
              <button
                onClick={() => setFiltroEntrega('todos')}
                className={cn(
                  'snap-start shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer active:scale-95 select-none',
                  filtroEntrega === 'todos'
                    ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                )}
              >
                Todos los tipos
              </button>
              {opcionesTipoEntrega.map((opcion) => (
                <button
                  key={opcion.valor}
                  onClick={() => setFiltroEntrega(opcion.valor)}
                  className={cn(
                    'snap-start shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 select-none',
                    filtroEntrega === opcion.valor
                      ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                  )}
                >
                  <IconoTipoEntrega tipo={opcion.valor} />
                  <span>{opcion.etiqueta}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Contador e info de modo ── */}
          <div className="flex justify-between items-center text-xs text-gray-400">
            <p className="font-semibold">
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

      {/* ── Rutas y Grupos Inteligentes (Smart Batching) ── */}
      {vista === 'activos' && <BannerSugerenciasRuta />}

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
            <TarjetaPedido 
              key={pedido.id} 
              pedido={pedido} 
              onEditarPedido={(p) => setPedidoAEditar(p)} 
            />
          ))}
        </div>
      )}

      {/* ── Botón Flotante para Crear Pedido (Solo Desktop/Tablet, en Móvil está en BottomNav) ── */}
      <button
        onClick={handleAbrirNuevoPedido}
        className="hidden md:flex fixed bottom-6 right-6 z-40 bg-chefsy hover:bg-chefsy-700 text-white font-bold py-3 px-5 rounded-full shadow-lg shadow-chefsy/20 items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer"
      >
        <Plus size={18} />
        <span>Crear Pedido</span>
      </button>

      {/* ── Modal de Nuevo / Editar Pedido (Fullscreen en Móvil, Diálogo en Desktop) ── */}
      {(modalNuevoPedidoAbierto || pedidoAEditar) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-950/85 transition-opacity duration-200 will-change-opacity animate-in fade-in">
          <div 
            className="bg-white dark:bg-slate-900 border-0 md:border border-slate-200/50 dark:border-slate-800 rounded-none md:rounded-3xl shadow-2xl max-w-5xl w-full h-full md:h-auto md:max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-200 relative will-change-transform flex flex-col" 
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-4 md:px-6 py-3 md:py-4 shrink-0">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  {pedidoAEditar ? '✏️ Editar Pedido' : '📝 Nuevo Pedido'}
                </h2>
                <p className="text-[11px] text-gray-400 dark:text-slate-400">
                  {pedidoAEditar ? 'Modificar detalles de la orden' : 'Registrar una orden desde el panel'}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalNuevoPedidoAbierto(false)
                  setPedidoAEditar(null)
                }}
                className="text-slate-450 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors focus:outline-none cursor-pointer active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
            {/* Contenido del Modal */}
            <div className="p-3 md:p-6 pb-28 md:pb-6 flex-1 overflow-y-auto">
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

