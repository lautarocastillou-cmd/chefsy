'use client'

import { Pedido, MetodoPago } from '@/tipos'
import CampoUbicacion from '@/components/ubicacion/CampoUbicacion'
import SeccionProductosPedido from '@/components/productos/SeccionProductosPedido'
import SelectorTipoEntrega from '@/components/pedidos/SelectorTipoEntrega'
import { formatearPrecio } from '@/lib/utils'
import { useFormularioPedido } from '@/hooks/useFormularioPedido'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

const claseInput =
  'w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-shadow shadow-sm'

interface PropsFormularioPedido {
  pedidoInicial?: Pedido
  onClose?: () => void
}

export default function FormularioPedido({ pedidoInicial, onClose }: PropsFormularioPedido = {}) {
  const router = useRouter()
  
  useEscapeKey(() => {
    if (onClose) onClose()
    else router.push('/pedidos')
  })

  const {
    estado: { 
      clienteEncontrado, tipoEntrega, cliente, telefono, direccion, coordenadas, 
      metodoPago, observaciones, filasProductos, error, cargandoEnvio, 
      envioManual, costoEnvioManualInput, distanciaKm,
      montoEfectivo, montoTransferencia, montoTarjeta
    },
    setters: { 
      setCliente, setTelefono, setDireccion, setCoordenadas, setMetodoPago, 
      setObservaciones, setFilasProductos, setEnvioManual, setCostoEnvioManualInput,
      setMontoEfectivo, setMontoTransferencia, setMontoTarjeta
    },
    derivados: { 
      subtotal, pideDireccion, costoEnvioFinal, total 
    },
    acciones: { 
      aplicarDatosCRM, manejarTipoEntrega, cargarEjemplo, manejarEnvio, cancelar 
    }
  } = useFormularioPedido({ pedidoInicial, onClose })

  return (
    <div data-formulario-pedido="true" className="w-full max-w-6xl mx-auto space-y-6">

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2 text-sm font-bold text-red-400 bg-red-950 border border-red-900/80 rounded-2xl px-6 py-4 shadow-2xl shadow-red-900/20">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* DISEÑO DE 2 COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        
        {/* COLUMNA IZQUIERDA: Entrega y Cliente */}
        <div className="space-y-8">
          
          <section className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400">1</span>
              Tipo de pedido
            </h3>
            <SelectorTipoEntrega valor={tipoEntrega} onCambio={manejarTipoEntrega} />
          </section>

          <section className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400">2</span>
              Datos del cliente
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
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
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="381-555-0000"
                  className={claseInput}
                />
                
                {/* Alerta de Autocompletado CRM */}
                {clienteEncontrado && (
                  <button
                    type="button"
                    onClick={aplicarDatosCRM}
                    className="mt-3 w-full bg-chefsy-50 hover:bg-chefsy-100 dark:bg-chefsy-950/20 dark:hover:bg-chefsy-900/30 border border-chefsy-200 dark:border-chefsy-900/50 text-chefsy-800 dark:text-chefsy-300 rounded-xl p-3 flex flex-col items-start text-left transition-all shadow-sm active:scale-95 animate-[slideIn_0.2s_ease-out]"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <span className="text-sm">👤</span> Cliente Frecuente Detectado
                      </span>
                      <span className="text-[9px] font-black bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow-sm">
                        AUTOCOMPLETAR →
                      </span>
                    </div>
                    <span className="text-sm font-bold block">{clienteEncontrado.cliente}</span>
                    <span className="block text-[10px] opacity-80 mt-1 truncate w-full">
                      Última vez: {clienteEncontrado.direccion ? `📍 ${clienteEncontrado.direccion}` : '🏪 Retiro en local'}
                    </span>
                  </button>
                )}
              </div>

              {pideDireccion ? (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 mt-4">
                  <CampoUbicacion
                    direccion={direccion}
                    onDireccionChange={setDireccion}
                    coordenadas={coordenadas}
                    onCoordenadasChange={setCoordenadas}
                    claseInput={claseInput}
                    distanciaKm={distanciaKm}
                    obligatorio
                  />
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2 mt-4">
                  <span className="text-base">✓</span>
                  {tipoEntrega === 'retiro'
                    ? 'Retiro por mostrador. No hace falta dirección.'
                    : 'Consumo en el local. No hace falta dirección.'}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA: Productos, Pago y Cierre */}
        <div className="space-y-8">
          
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
              Pago y Cierre
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
                    <option value="sin_especificar">⚠️ Sin especificar</option>
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">📱 Transferencia</option>
                    <option value="tarjeta">💳 Tarjeta / Posnet</option>
                    <option value="mixto">💵📱 Mixto (Dividido)</option>
                  </select>
                </div>

                {metodoPago === 'mixto' && (
                  <div className="col-span-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 space-y-3 animate-[slideIn_0.15s_ease-out]">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Desglose del pago dividido</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">💵 Efectivo</label>
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
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">📱 Transf.</label>
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
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">💳 Tarjeta</label>
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
                ✓ {pedidoInicial ? 'Guardar Cambios' : 'Generar Pedido'}
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

      {/* ── Barra de Confirmación Inferior Fija para Móvil ──────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 p-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
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
            <span>➔</span>
          </button>
        </div>
      </div>

    </div>
  )
}
