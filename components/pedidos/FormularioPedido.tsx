'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coordenadas, MetodoPago, Pedido, TipoEntrega } from '@/tipos'
import { FilaProductoPedido } from '@/tipos/catalogo'
import CampoUbicacion from '@/components/ubicacion/CampoUbicacion'
import SeccionProductosPedido, {
  crearFilaProductoVacia,
} from '@/components/productos/SeccionProductosPedido'
import SelectorTipoEntrega from '@/components/pedidos/SelectorTipoEntrega'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { calcularTotalFilas, filasAProductosPedido } from '@/lib/catalogo'
import { requiereDireccion } from '@/lib/entrega'
import { UBICACION_LOCAL, obtenerDistanciaConduccion, calcularCostoEnvio } from '@/lib/ubicacion'
import { generarId, generarIdProducto, formatearPrecio } from '@/lib/utils'
import { useEffect } from 'react'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { useEscapeKey } from '@/hooks/useEscapeKey'

const claseInput =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent'

interface PropsFormularioPedido {
  pedidoInicial?: Pedido
  onClose?: () => void
}

export default function FormularioPedido({ pedidoInicial, onClose }: PropsFormularioPedido = {}) {
  const { agregarPedido, editarPedido, pedidos, productos } = usarPedidos()
  const router = useRouter()

  useEscapeKey(() => {
    if (onClose) onClose()
    else router.push('/pedidos')
  })

  const cargarEjemplo = () => {
    setCliente('Lautaro de Prueba')
    setTelefono('3815559876')
    setTipoEntrega('delivery')
    setDireccion('Av. Belgrano 1234, San Fernando del Valle de Catamarca')
    setCoordenadas({
      latitud: -28.468200,
      longitud: -65.782100,
    })
    setMetodoPago('efectivo')
    setObservaciones('Entregar rápido, por favor. Ejemplo de prueba.')

    if (productos && productos.length > 0) {
      const prod = productos.find(p => p.activo) || productos[0]
      if (prod) {
        setFilasProductos([
          {
            id: generarIdProducto(),
            idCategoria: prod.categoriaId,
            idProductoCatalogo: prod.id,
            cantidad: 2,
            precio: prod.precio,
            modificadoresSeleccionadosIds: [],
          }
        ])
        return
      }
    }

    setFilasProductos([
      {
        id: generarIdProducto(),
        idCategoria: 'promos',
        idProductoCatalogo: 'promos-promo-2-lomos',
        cantidad: 1,
        precio: 22000,
        modificadoresSeleccionadosIds: [],
      }
    ])
  }

  const [clienteEncontrado, setClienteEncontrado] = useState<Pedido | null>(null)

  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('delivery')
  const [cliente, setCliente] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [observaciones, setObservaciones] = useState('')
  const [filasProductos, setFilasProductos] = useState<FilaProductoPedido[]>([
    crearFilaProductoVacia(),
  ])
  const [error, setError] = useState('')
  const [costoEnvio, setCostoEnvio] = useState(0)
  const [distanciaKm, setDistanciaKm] = useState(pedidoInicial?.distanciaKm || 0)
  const [cargandoEnvio, setCargandoEnvio] = useState(false)
  const [envioManual, setEnvioManual] = useState(!!pedidoInicial?.costoEnvio && pedidoInicial.distanciaKm === undefined)
  const [costoEnvioManualInput, setCostoEnvioManualInput] = useState(pedidoInicial?.costoEnvio?.toString() || '')

  useEffect(() => {
    if (pedidoInicial) {
      setCliente(pedidoInicial.cliente)
      setTelefono(pedidoInicial.telefono)
      setTipoEntrega(pedidoInicial.tipoEntrega)
      if (pedidoInicial.direccion) setDireccion(pedidoInicial.direccion)
      if (pedidoInicial.coordenadas) setCoordenadas(pedidoInicial.coordenadas)
      setMetodoPago(pedidoInicial.metodoPago)
      if (pedidoInicial.observaciones) setObservaciones(pedidoInicial.observaciones)
      
      const filas: FilaProductoPedido[] = pedidoInicial.productos.map(p => ({
        id: p.id,
        idCategoria: p.categoriaId || '',
        idProductoCatalogo: p.idCatalogo || '',
        cantidad: p.cantidad,
        precio: p.precio,
        modificadoresSeleccionadosIds: [] // No fully supported currently if no id mapping
      }))
      setFilasProductos(filas.length > 0 ? filas : [crearFilaProductoVacia()])
    }
  }, [pedidoInicial])

  // CRM Express: buscar cliente recurrente por teléfono en tiempo real
  useEffect(() => {
    const telLimpio = telefono.replace(/\D/g, '')
    if (telLimpio.length >= 6) {
      const match = pedidos.find(p => p.telefono.replace(/\D/g, '') === telLimpio)
      if (match) {
        setClienteEncontrado(match)
      } else {
        setClienteEncontrado(null)
      }
    } else {
      setClienteEncontrado(null)
    }
  }, [telefono, pedidos])

  const aplicarDatosCRM = () => {
    if (clienteEncontrado) {
      setCliente(clienteEncontrado.cliente)
      setTipoEntrega(clienteEncontrado.tipoEntrega)
      if (clienteEncontrado.direccion) {
        setDireccion(clienteEncontrado.direccion)
      }
      if (clienteEncontrado.coordenadas) {
        setCoordenadas(clienteEncontrado.coordenadas)
      }
      setMetodoPago(clienteEncontrado.metodoPago)
      setClienteEncontrado(null)
    }
  }

  const subtotal = calcularTotalFilas(filasProductos)
  const pideDireccion = requiereDireccion(tipoEntrega)
  
  useEffect(() => {
    if (pideDireccion && coordenadas) {
      setCargandoEnvio(true)
      obtenerDistanciaConduccion(UBICACION_LOCAL, coordenadas).then((dist) => {
        setDistanciaKm(dist)
        setCostoEnvio(calcularCostoEnvio(dist))
        setCargandoEnvio(false)
      })
    } else {
      setDistanciaKm(0)
      setCostoEnvio(0)
    }
  }, [coordenadas, pideDireccion])
  
  const costoEnvioFinal = envioManual ? (Number(costoEnvioManualInput) || 0) : costoEnvio
  const total = subtotal + costoEnvioFinal

  const manejarTipoEntrega = (nuevoTipo: TipoEntrega) => {
    setTipoEntrega(nuevoTipo)
    if (!requiereDireccion(nuevoTipo)) {
      setDireccion('')
      setCoordenadas(null)
    }
  }

  const manejarEnvio = () => {
    setError('')

    if (!cliente.trim()) return setError('El nombre del cliente es obligatorio.')
    if (pideDireccion && !direccion.trim()) {
      return setError('La dirección es obligatoria para delivery.')
    }

    const productos = filasAProductosPedido(filasProductos, generarIdProducto)

    if (productos.length === 0) {
      return setError('Agregá al menos un producto del catálogo.')
    }

    const ahora = new Date()

    const nuevoPedido: Pedido = {
      id: pedidoInicial?.id || generarId(),
      cliente: cliente.trim(),
      telefono: telefono.trim() || 'Sin especificar',
      tipoEntrega,
      direccion: pideDireccion ? direccion.trim() : '',
      coordenadas: pideDireccion ? coordenadas ?? undefined : undefined,
      productos,
      total,
      costoEnvio: costoEnvioFinal > 0 ? costoEnvioFinal : undefined,
      distanciaKm: !envioManual && distanciaKm > 0 ? Number(distanciaKm.toFixed(2)) : undefined,
      estado: pedidoInicial?.estado || 'nuevo',
      metodoPago,
      observaciones: observaciones.trim() || undefined,
      hora: pedidoInicial?.hora || ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      fecha: pedidoInicial?.fecha || obtenerFechaNegocio(ahora),
      created_at: pedidoInicial?.created_at || ahora.toISOString(),
      pago_confirmado: pedidoInicial?.pago_confirmado,
    }

    if (pedidoInicial) {
      editarPedido(nuevoPedido)
    } else {
      agregarPedido(nuevoPedido)
    }
    
    if (onClose) {
      onClose()
    } else {
      router.push('/pedidos')
    }
  }

  return (
    <div className="space-y-7 max-w-2xl">

      {!pedidoInicial && (
        <div className="bg-amber-500/10 border border-amber-500/20 dark:bg-amber-500/5 dark:border-amber-500/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-[slideIn_0.25s_ease-out]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🧪</span>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Modo Desarrollador</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-500/80">Carga un pedido de ejemplo con datos válidos para agilizar las pruebas.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={cargarEjemplo}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 duration-150 shrink-0 text-center"
          >
            Cargar Ejemplo
          </button>
        </div>
      )}

      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Tipo de pedido
        </h3>
        <SelectorTipoEntrega valor={tipoEntrega} onCambio={manejarTipoEntrega} />
      </section>

      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Datos del cliente
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Juan García"
              className={claseInput}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="381-555-0000"
              className={claseInput}
            />
            {clienteEncontrado && (
              <button
                type="button"
                onClick={aplicarDatosCRM}
                className="text-xs bg-chefsy-50 hover:bg-chefsy-100 text-chefsy-800 border border-chefsy-200 rounded-lg p-2.5 flex items-center justify-between mt-2 animate-[slideIn_0.15s_ease-out] w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">👤</span>
                  <span>
                    ¿Completar datos de cliente recurrente: <strong>{clienteEncontrado.cliente}</strong>?
                    <span className="block text-[10px] text-chefsy-600 mt-0.5">
                      Último pedido: {clienteEncontrado.direccion ? `📍 ${clienteEncontrado.direccion}` : '🏪 Retiro en local'} • {clienteEncontrado.productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}
                    </span>
                  </span>
                </div>
                <span className="text-[10px] font-bold text-chefsy-700 bg-white border border-chefsy-200 px-2 py-0.5 rounded shadow-sm shrink-0 ml-2">
                  Autocompletar →
                </span>
              </button>
            )}
          </div>

          {pideDireccion ? (
            <CampoUbicacion
              direccion={direccion}
              onDireccionChange={setDireccion}
              coordenadas={coordenadas}
              onCoordenadasChange={setCoordenadas}
              claseInput={claseInput}
              obligatorio
            />
          ) : (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              {tipoEntrega === 'retiro'
                ? '🏪 Retiro en el local — no hace falta cargar dirección.'
                : '🍽️ Consumo en el local — no hace falta cargar dirección.'}
            </p>
          )}
        </div>
      </section>

      <SeccionProductosPedido
        filas={filasProductos}
        onFilasChange={setFilasProductos}
      />

      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Pago y observaciones
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
              className={claseInput}
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Sin cebolla, timbre 2B, mesa 4, etc."
              rows={3}
              className={claseInput}
            />
          </div>
        </div>
        
        {pideDireccion && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="envioManual"
                checked={envioManual}
                onChange={(e) => setEnvioManual(e.target.checked)}
                className="w-4 h-4 text-chefsy border-gray-300 rounded focus:ring-chefsy cursor-pointer"
              />
              <label htmlFor="envioManual" className="text-xs font-semibold text-gray-700 select-none cursor-pointer">
                🔧 Ajustar costo de envío de forma manual
              </label>
            </div>

            {envioManual ? (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-850 space-y-2 animate-[slideIn_0.15s_ease-out]">
                <p className="font-semibold text-amber-900">Configuración Manual del Envío</p>
                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1">
                    Costo de envío ($) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={costoEnvioManualInput}
                    onChange={(e) => setCostoEnvioManualInput(e.target.value)}
                    placeholder="Ej: 1500"
                    className="w-full bg-white border border-amber-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-800"
                    min="0"
                  />
                </div>
              </div>
            ) : (
              coordenadas && (
                <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-800 space-y-1">
                  <p className="font-semibold text-blue-900">Detalle de Envío Automático</p>
                  {cargandoEnvio ? (
                    <p className="text-blue-600 animate-pulse">Calculando ruta real...</p>
                  ) : (
                    <>
                      <p>Distancia estimada: {distanciaKm.toFixed(2)} km</p>
                      <p>Costo del envío: <span className="font-semibold">{formatearPrecio(costoEnvio)}</span></p>
                    </>
                  )}
                </div>
              )
            )}
          </div>
        )}
        
        <div className="bg-chefsy-50 border border-chefsy-200 rounded-md px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-chefsy-600 font-medium uppercase tracking-wider">Subtotal: {formatearPrecio(subtotal)}</p>
            <p className="text-sm font-bold text-chefsy-800 uppercase tracking-wide">Total a cobrar</p>
          </div>
          <p className="text-2xl font-black text-chefsy-900">{formatearPrecio(total)}</p>
        </div>
      </section>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 pb-6">
        <button
          type="button"
          onClick={manejarEnvio}
          className="flex-1 bg-chefsy text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-chefsy-700"
        >
          {pedidoInicial ? 'Guardar Cambios' : 'Crear Pedido'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (onClose) {
              onClose()
            } else {
              router.push('/pedidos')
            }
          }}
          className="px-4 py-2.5 border border-chefsy-300 text-chefsy-700 rounded-md text-sm hover:bg-chefsy-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
