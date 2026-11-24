'use client'

import React from 'react'
import { Pedido, MetodoPago } from '@/tipos'
import CampoUbicacion from '@/components/ubicacion/CampoUbicacion'
import SeccionProductosPedido from '@/components/productos/SeccionProductosPedido'
import SelectorTipoEntrega from '@/components/pedidos/SelectorTipoEntrega'
import PanelCRMCliente, { estiloEtiquetaCRM } from '@/components/pedidos/PanelCRMCliente'
import { formatearPrecio } from '@/lib/utils'
import { useFormularioPedido } from '@/hooks/useFormularioPedido'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import {
  Settings,
  AlertCircle,
  Sparkles,
  Check,
  ArrowRight,
  PauseCircle,
  RotateCcw,
  Trash2,
  X,
  Users,
  StickyNote,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  moverIndiceSugerencia,
  obtenerMotivoCoincidencia,
} from '@/lib/motor-clientes'

const claseInput =
  'w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-shadow shadow-sm'

interface PropsFormularioPedido {
  pedidoInicial?: Pedido
  onClose?: () => void
  conHeaderModal?: boolean
}

export default function FormularioPedido({ 
  pedidoInicial,
  onClose,
  conHeaderModal = false 
}: PropsFormularioPedido = {}) {
  const router = useRouter()
  const [indiceSugerenciaActiva, setIndiceSugerenciaActiva] = React.useState(-1)
  const [sugerenciasCerradasManualmente, setSugerenciasCerradasManualmente] = React.useState(false)
 
  useEscapeKey(() => {
    if (onClose) onClose()
    else router.push('/pedidos')
  })

  const {
    estado: { 
      clienteEncontrado, clienteSeleccionadoCRM, guardandoNotaCRM,
      tipoEntrega, cliente, telefono, direccion, coordenadas, 
      metodoPago, observaciones, filasProductos, error, cargandoEnvio, 
      envioManual, costoEnvioManualInput, distanciaKm,
      montoEfectivo, montoTransferencia, montoTarjeta,
      borradorGuardado, borradorActivoCargado,
      sugerenciasActivas, sugerenciasDetalladas, mostrarDropdownSugerencias,
      autocompletadoHabilitado, modoClienteNuevo, pareceClienteNuevo
    },
    setters: { 
      setCliente, setTelefono, setDireccion, setCoordenadas, setMetodoPago, 
      setObservaciones, setFilasProductos, setEnvioManual, setCostoEnvioManualInput,
      setMontoEfectivo, setMontoTransferencia, setMontoTarjeta,
      setMostrarDropdownSugerencias, cambiarClienteManual, cambiarTelefonoManual, cambiarDireccionManual
    },
    derivados: { 
      subtotal, pideDireccion, costoEnvioFinal, total, indiceClientes
    },
    acciones: { 
      aplicarDatosCRM, activarModoClienteNuevo, desactivarModoClienteNuevo, seleccionarSugerenciaCliente, manejarTipoEntrega, cargarEjemplo, manejarEnvio, cancelar,
      guardarBorrador, restaurarBorrador, descartarBorrador,
      limpiarClienteSeleccionadoCRM, aplicarObservacionSugerida, guardarNotasCRM
    }
  } = useFormularioPedido({ pedidoInicial, onClose })

  const motivoCoincidencia = obtenerMotivoCoincidencia({ nombre: cliente, telefono, direccion })
  const puedeMostrarSinCoincidencias = autocompletadoHabilitado && !modoClienteNuevo && cliente.trim().length >= 3 && sugerenciasActivas.length === 0
  const mostrarPanelCrmSeparado = conHeaderModal && !pedidoInicial && autocompletadoHabilitado

  return (
    <div
      data-formulario-pedido="true"
      className={
        conHeaderModal
          ? 'w-full h-full md:h-auto md:max-h-[92vh] flex flex-col lg:flex-row items-stretch justify-center gap-4 xl:gap-5 pointer-events-none'
          : 'w-full max-w-6xl mx-auto flex flex-col flex-1 gap-4'
      }
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          PANEL IZQUIERDO INDEPENDIENTE: CRM DE CLIENTES (Desktop)
          ═══════════════════════════════════════════════════════════════════════ */}
      {mostrarPanelCrmSeparado && (
        <PanelCRMCliente
          indiceClientes={indiceClientes}
          sugerenciasActivas={sugerenciasActivas}
          sugerenciasDetalladas={sugerenciasDetalladas}
          clienteEncontrado={clienteEncontrado}
          clienteSeleccionadoCRM={clienteSeleccionadoCRM}
          guardandoNotaCRM={guardandoNotaCRM}
          clienteInput={cliente}
          telefonoInput={telefono}
          motivoCoincidencia={motivoCoincidencia}
          puedeMostrarSinCoincidencias={puedeMostrarSinCoincidencias}
          pareceClienteNuevo={pareceClienteNuevo}
          modoClienteNuevo={modoClienteNuevo}
          indiceSugerenciaActiva={indiceSugerenciaActiva}
          onSeleccionarSugerencia={seleccionarSugerenciaCliente}
          onAplicarDatosCRM={aplicarDatosCRM}
          onActivarModoClienteNuevo={activarModoClienteNuevo}
          onDesactivarModoClienteNuevo={desactivarModoClienteNuevo}
          onLimpiarSeleccion={limpiarClienteSeleccionadoCRM}
          onResetIndiceSugerencia={() => setIndiceSugerenciaActiva(-1)}
          onAplicarObservacion={aplicarObservacionSugerida}
          onGuardarNotasCRM={guardarNotasCRM}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PANEL DERECHO INDEPENDIENTE: FORMULARIO NUEVO / EDITAR PEDIDO
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        data-lenis-prevent={conHeaderModal ? 'true' : undefined}
        onWheel={conHeaderModal ? (e) => e.stopPropagation() : undefined}
        onTouchMove={conHeaderModal ? (e) => e.stopPropagation() : undefined}
        className={
          conHeaderModal
            ? 'flex-1 min-w-0 w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] bg-white dark:bg-slate-900 border-0 md:border border-slate-200/80 dark:border-slate-800 rounded-none md:rounded-3xl shadow-2xl overflow-y-auto scrollbar-hide pointer-events-auto animate-in zoom-in-95 duration-200 flex flex-col'
            : 'w-full flex flex-col flex-1'
        }
      >
        {/* ── Header Sticky del Modal (solo cuando se abre en modal) ──── */}
        {conHeaderModal ? (
          <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-4 md:px-6 py-3 md:py-4 shrink-0">
            <div className="min-w-0 pr-2">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                {pedidoInicial ? 'Editar Pedido' : 'Nuevo Pedido'}
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-slate-400 truncate">
                {pedidoInicial ? 'Modificar productos, cliente o entrega' : 'Cargar comanda al sistema'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!pedidoInicial && (
                <>
                  {borradorGuardado && !borradorActivoCargado && (
                    <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={restaurarBorrador}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                        title={`Restaurar pedido guardado de ${borradorGuardado.cliente || 'cliente'}`}
                      >
                        <RotateCcw size={13} className="shrink-0" />
                        <span className="hidden sm:inline">Restaurar guardado</span>
                        <span className="sm:hidden">Restaurar</span>
                      </button>
                      <button
                        type="button"
                        onClick={descartarBorrador}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Descartar borrador guardado"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={guardarBorrador}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-500 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    title="Guardar temporalmente los datos cargados"
                  >
                    <PauseCircle size={14} className="shrink-0" />
                    <span className="hidden sm:inline">Guardar temporalmente</span>
                    <span className="sm:hidden">Guardar</span>
                  </button>
                </>
              )}

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-450 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors focus:outline-none cursor-pointer active:scale-90 ml-1"
                  title="Cerrar ventana"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Si se renderiza en página estándar sin conHeaderModal (ej: Editar Pedido) */
          !pedidoInicial && (
            <div className="flex items-center justify-end w-full gap-2 mb-2">
              {borradorGuardado && !borradorActivoCargado && (
                <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={restaurarBorrador}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                    title={`Restaurar pedido guardado de ${borradorGuardado.cliente || 'cliente'}`}
                  >
                    <RotateCcw size={13} className="shrink-0" />
                    <span>Restaurar guardado</span>
                  </button>
                  <button
                    type="button"
                    onClick={descartarBorrador}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Descartar borrador guardado"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={guardarBorrador}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-500 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="Guardar temporalmente los datos cargados"
              >
                <PauseCircle size={14} className="shrink-0" />
                <span>Guardar temporalmente</span>
              </button>
            </div>
          )
        )}

        {/* Contenido principal del formulario */}
        <div className={conHeaderModal ? 'p-4 md:p-6 pb-28 md:pb-6 space-y-6 flex-1' : 'space-y-6'}>
          {error && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
              <div className="flex items-center gap-2 text-sm font-bold text-red-400 bg-red-950 border border-red-900/80 rounded-2xl px-6 py-4 shadow-2xl shadow-red-900/20">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Nota fija / etiquetas CRM en móvil cuando hay cliente seleccionado */}
          {mostrarPanelCrmSeparado &&
            clienteSeleccionadoCRM &&
            (clienteSeleccionadoCRM.notaFija?.trim() || (clienteSeleccionadoCRM.etiquetas?.length || 0) > 0) && (
              <div className="lg:hidden rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1">
                    <StickyNote size={12} /> Notas del cliente ({clienteSeleccionadoCRM.nombre})
                  </span>
                  {clienteSeleccionadoCRM.notaFija?.trim() && (
                    <button
                      type="button"
                      onClick={() => aplicarObservacionSugerida(clienteSeleccionadoCRM.notaFija!)}
                      className="text-[10px] font-bold text-chefsy-700 dark:text-chefsy-400 hover:underline cursor-pointer"
                    >
                      + Copiar a obs.
                    </button>
                  )}
                </div>
                {(clienteSeleccionadoCRM.etiquetas?.length || 0) > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {clienteSeleccionadoCRM.etiquetas!.map((tag) => (
                      <span
                        key={tag}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${estiloEtiquetaCRM(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {clienteSeleccionadoCRM.notaFija?.trim() && (
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
                    {clienteSeleccionadoCRM.notaFija}
                  </p>
                )}
              </div>
            )}

          {/* CRM compacto solo para móvil / tablet (< lg) cuando hay coincidencias */}
          {mostrarPanelCrmSeparado && !modoClienteNuevo && (clienteEncontrado || sugerenciasDetalladas.length > 0 || pareceClienteNuevo) && (
            <div className="lg:hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Users size={12} className="text-chefsy" />
                  <span>Sugerencias CRM</span>
                </span>
                {sugerenciasDetalladas.length > 0 && !clienteEncontrado && (
                  <button
                    type="button"
                    onClick={activarModoClienteNuevo}
                    className="text-[10px] font-semibold normal-case tracking-normal text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 cursor-pointer"
                  >
                    Es cliente nuevo
                  </button>
                )}
              </div>
              {clienteEncontrado && (
                <button
                  type="button"
                  onClick={aplicarDatosCRM}
                  className="w-full bg-chefsy-50 dark:bg-chefsy-950/40 border border-chefsy-200 dark:border-chefsy-800 rounded-xl p-2.5 flex items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-chefsy-700 dark:text-chefsy-400 flex items-center gap-1">
                      <Sparkles size={11} /> Cliente registrado
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">
                      {clienteEncontrado.cliente}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-chefsy text-white shrink-0">
                    Aplicar
                  </span>
                </button>
              )}
              {!clienteEncontrado && sugerenciasDetalladas.length > 0 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {sugerenciasDetalladas.slice(0, 5).map((item, idx) => (
                    <button
                      key={`mob-${item.cliente.nombre}-${item.cliente.telefono}-${idx}`}
                      type="button"
                      onClick={() => {
                        seleccionarSugerenciaCliente(item.cliente)
                        setIndiceSugerenciaActiva(-1)
                      }}
                      className={`shrink-0 max-w-[210px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-left cursor-pointer ${
                        item.confianza === 'alta'
                          ? 'border-emerald-300 dark:border-emerald-700'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">
                        {item.cliente.nombre}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {item.cliente.direccion || 'Retiro en local'}
                      </span>
                      <span
                        className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          item.confianza === 'alta'
                            ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.motivo}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!clienteEncontrado && sugerenciasDetalladas.length === 0 && pareceClienteNuevo && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/50 px-3 py-2">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    Parece un cliente nuevo. Podés seguir cargando.
                  </span>
                  <button
                    type="button"
                    onClick={activarModoClienteNuevo}
                    className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0 cursor-pointer hover:underline"
                  >
                    Confirmar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── 2 COLUMNAS: Datos del cliente | Productos y pago ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
              
              {/* COLUMNA IZQUIERDA DEL MODAL: Entrega y Cliente */}
              <div className="lg:col-span-1 space-y-8">
                
                <section className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400">1</span>
                    Entrega (Delivery · Mostrador · Salón)
                  </h3>
                  <SelectorTipoEntrega valor={tipoEntrega} onCambio={manejarTipoEntrega} />
                </section>

                <section className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400">2</span>
                    Datos del cliente
                  </h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                        Nombre <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={cliente}
                        onChange={(e) => {
                          setIndiceSugerenciaActiva(-1)
                          setSugerenciasCerradasManualmente(false)
                          cambiarClienteManual(e.target.value)
                        }}
                        onKeyDown={(e) => {
                          if (!autocompletadoHabilitado || !mostrarDropdownSugerencias || sugerenciasActivas.length === 0) return
                          if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            setMostrarDropdownSugerencias(true)
                            setIndiceSugerenciaActiva(i => moverIndiceSugerencia(i, sugerenciasActivas.length, 1))
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            setMostrarDropdownSugerencias(true)
                            setIndiceSugerenciaActiva(i => moverIndiceSugerencia(i, sugerenciasActivas.length, -1))
                          } else if (e.key === 'Enter') {
                            e.preventDefault()
                            const indice = indiceSugerenciaActiva >= 0 ? indiceSugerenciaActiva : 0
                            seleccionarSugerenciaCliente(sugerenciasActivas[indice])
                            setIndiceSugerenciaActiva(-1)
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            setMostrarDropdownSugerencias(false)
                            setIndiceSugerenciaActiva(-1)
                          }
                        }}
                        placeholder="Ej: Juan García"
                        className={claseInput}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                        Celular <span className="text-slate-400 font-normal lowercase tracking-normal">(opcional)</span>
                      </label>
                      <input
                        type="tel"
                        value={telefono}
                        onChange={(e) => cambiarTelefonoManual(e.target.value)}
                        placeholder="381-555-0000"
                        className={claseInput}
                      />
                    </div>

                    {pideDireccion ? (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 mt-4">
                        <CampoUbicacion
                          direccion={direccion}
                          onDireccionChange={cambiarDireccionManual}
                          coordenadas={coordenadas}
                          onCoordenadasChange={setCoordenadas}
                          claseInput={claseInput}
                          distanciaKm={distanciaKm}
                          obligatorio
                        />
                      </div>
                    ) : (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2 mt-4">
                        <Check size={16} className="shrink-0" />
                        {tipoEntrega === 'retiro'
                          ? 'Retiro por mostrador. No hace falta dirección.'
                          : 'Consumo en el local. No hace falta dirección.'}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* COLUMNA DERECHA DEL MODAL: Productos, Pago y Cierre */}
              <div className="lg:col-span-1 space-y-8">
                
                <section className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400">3</span>
                    Productos
                  </h3>
                  <SeccionProductosPedido
                    filas={filasProductos}
                    onFilasChange={setFilasProductos}
                  />
                </section>

                <section className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400">4</span>
                    Cobro y Detalles
                  </h3>

                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                          Método de pago
                        </label>
                        <select
                          value={metodoPago}
                          onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                          className={claseInput}
                        >
                          <option value="sin_especificar">Sin especificar</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="tarjeta">Tarjeta / Posnet</option>
                          <option value="mixto">Mixto (Dividido)</option>
                        </select>
                      </div>

                      {metodoPago === 'mixto' && (
                        <div className="col-span-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 space-y-3 animate-[slideIn_0.15s_ease-out]">
                          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Desglose del pago dividido</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Efectivo</label>
                              <input
                                type="number"
                                value={montoEfectivo}
                                onChange={(e) => setMontoEfectivo(e.target.value)}
                                placeholder="$0"
                                min="0"
                                className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/50 rounded-lg px-2 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Transf.</label>
                              <input
                                type="number"
                                value={montoTransferencia}
                                onChange={(e) => setMontoTransferencia(e.target.value)}
                                placeholder="$0"
                                min="0"
                                className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/50 rounded-lg px-2 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Tarjeta</label>
                              <input
                                type="number"
                                value={montoTarjeta}
                                onChange={(e) => setMontoTarjeta(e.target.value)}
                                placeholder="$0"
                                min="0"
                                className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/50 rounded-lg px-2 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                          Observaciones
                        </label>
                        <input
                          type="text"
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Sin cebolla, timbre 2B, etc."
                          className={claseInput}
                        />
                      </div>
                    </div>
                    
                    {pideDireccion && (
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                          <input
                            type="checkbox"
                            id="envioManual"
                            checked={envioManual}
                            onChange={(e) => setEnvioManual(e.target.checked)}
                            className="w-4 h-4 text-chefsy border-slate-300 rounded focus:ring-chefsy cursor-pointer"
                          />
                          <label htmlFor="envioManual" className="text-xs font-bold text-slate-600 dark:text-slate-300 select-none cursor-pointer flex-1">
                            Ajustar costo de envío manualmente
                          </label>
                        </div>

                        {envioManual ? (
                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 animate-[slideIn_0.15s_ease-out]">
                            <label className="block text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                              Costo Fijo ($)
                            </label>
                            <input
                              type="number"
                              value={costoEnvioManualInput}
                              onChange={(e) => setCostoEnvioManualInput(e.target.value)}
                              placeholder="Ej: 1500"
                              className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                              min="0"
                            />
                          </div>
                        ) : (
                          coordenadas && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 text-xs flex justify-between items-center text-blue-800 dark:text-blue-300">
                              {cargandoEnvio ? (
                                <span className="font-bold animate-pulse">Calculando ruta...</span>
                              ) : (
                                <>
                                  <span className="font-medium">Distancia: <strong>{distanciaKm.toFixed(2)} km</strong></span>
                                  <span className="font-black bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
                                    Envío: {formatearPrecio(costoEnvioFinal)}
                                  </span>
                                </>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Resumen Total */}
                  <div className="bg-slate-800 dark:bg-slate-950 rounded-2xl p-5 text-white flex flex-col gap-2 mt-4 shadow-lg border border-slate-700 transition-all">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <span>Subtotal</span>
                      <span>{formatearPrecio(subtotal)}</span>
                    </div>
                    {pideDireccion && (
                      <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <span>Envío</span>
                          {cargandoEnvio && (
                            <span className="text-[10px] text-chefsy-400 font-normal animate-pulse">
                              (calculando ruta...)
                            </span>
                          )}
                        </span>
                        <span className={cargandoEnvio ? 'opacity-70' : ''}>
                          {formatearPrecio(costoEnvioFinal)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-slate-700/60 my-1 pt-3 flex items-end justify-between">
                      <span className="text-sm font-black uppercase tracking-widest text-chefsy-300">Total a cobrar</span>
                      <span className="text-3xl font-black">{formatearPrecio(total)}</span>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={manejarEnvio}
                      className="flex-1 bg-chefsy hover:bg-chefsy-700 text-white p-4 rounded-xl font-bold text-base transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-5 h-5" />
                      <span>{pedidoInicial ? 'Guardar Cambios' : 'Generar Pedido'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={cancelar}
                      className="px-6 py-4 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </section>
              </div>

            </div>

            {/* FOOTER: Opciones de Desarrollador */}
            {!pedidoInicial && (
              <div className="pt-8 border-t border-slate-200 dark:border-slate-800/60 mt-12 pb-16 md:pb-0">
                <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-lg text-amber-600 dark:text-amber-400">
                      <Settings size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-500 uppercase tracking-widest">Opciones de Desarrollador</p>
                      <p className="text-[11px] text-amber-700/70 dark:text-amber-600/70">Herramientas ocultas para testeos.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={cargarEjemplo}
                    className="w-full sm:w-auto bg-amber-600/10 hover:bg-amber-600/20 text-amber-700 dark:text-amber-500 border border-amber-600/20 text-[11px] font-bold px-4 py-2 rounded-lg transition-all"
                  >
                    Cargar Pedido Aleatorio
                  </button>
                </div>
              </div>
            )}

        </div>
      </div>

      {/* ── Barra de Confirmación Inferior Fija para Móvil ──────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-800/80 p-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.6)] pointer-events-auto">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total ({filasProductos.reduce((acc: number, f) => acc + (f.idProductoCatalogo ? (f.cantidad || 1) : 0), 0)} ítems)
            </span>
            <span className="text-xl font-black text-emerald-400 font-mono leading-tight">
              {formatearPrecio(total)}
            </span>
          </div>

          <button
            type="button"
            onClick={manejarEnvio}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white py-3 px-4 rounded-2xl font-black text-xs transition-all shadow-lg shadow-emerald-600/30 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{pedidoInicial ? 'Guardar Cambios' : 'Confirmar Pedido'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  )
}
