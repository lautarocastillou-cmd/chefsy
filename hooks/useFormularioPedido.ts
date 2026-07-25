import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Coordenadas, MetodoPago, Pedido, TipoEntrega } from '@/tipos'
import { FilaProductoPedido } from '@/tipos/catalogo'
import { crearFilaProductoVacia } from '@/components/productos/SeccionProductosPedido'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { calcularTotalFilas, filasAProductosPedido } from '@/lib/catalogo'
import { requiereDireccion } from '@/lib/entrega'
import { UBICACION_LOCAL, obtenerDistanciaConduccion, calcularCostoEnvio } from '@/lib/ubicacion'
import { generarId, generarIdProducto } from '@/lib/utils'
import { obtenerFechaNegocio } from '@/lib/tiempo'

interface PropsUseFormularioPedido {
  pedidoInicial?: Pedido
  onClose?: () => void
}

export function useFormularioPedido({ pedidoInicial, onClose }: PropsUseFormularioPedido = {}) {
  const { agregarPedido, editarPedido, pedidos, productos } = usarPedidos()
  const router = useRouter()

  const [clienteEncontrado, setClienteEncontrado] = useState<Pedido | null>(null)
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('delivery')
  const [cliente, setCliente] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('sin_especificar')
  const [observaciones, setObservaciones] = useState('')
  const [montoEfectivo, setMontoEfectivo] = useState('')
  const [montoTransferencia, setMontoTransferencia] = useState('')
  const [montoTarjeta, setMontoTarjeta] = useState('')
  const [filasProductos, setFilasProductos] = useState<FilaProductoPedido[]>([
    crearFilaProductoVacia(),
  ])
  const [error, setRawError] = useState('')
  const errorTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const setError = (msg: string) => {
    setRawError(msg)
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    if (msg) {
      errorTimeoutRef.current = setTimeout(() => setRawError(''), 3000)
    }
  }

  const [costoEnvio, setCostoEnvio] = useState(0)
  const [distanciaKm, setDistanciaKm] = useState(pedidoInicial?.distanciaKm || 0)
  const [cargandoEnvio, setCargandoEnvio] = useState(false)
  const [envioManual, setEnvioManual] = useState(!!pedidoInicial?.costoEnvio && pedidoInicial.distanciaKm === undefined)
  const [costoEnvioManualInput, setCostoEnvioManualInput] = useState(pedidoInicial?.costoEnvio?.toString() || '')

  // 1. Inicialización si hay un pedido
  useEffect(() => {
    if (pedidoInicial) {
      setCliente(pedidoInicial.cliente)
      setTelefono(pedidoInicial.telefono)
      setTipoEntrega(pedidoInicial.tipoEntrega)
      if (pedidoInicial.direccion) setDireccion(pedidoInicial.direccion)
      if (pedidoInicial.coordenadas) setCoordenadas(pedidoInicial.coordenadas)
      setMetodoPago(pedidoInicial.metodoPago)
      if (pedidoInicial.observaciones) setObservaciones(pedidoInicial.observaciones)
      if (pedidoInicial.montoEfectivo) setMontoEfectivo(String(pedidoInicial.montoEfectivo))
      if (pedidoInicial.montoTransferencia) setMontoTransferencia(String(pedidoInicial.montoTransferencia))
      if (pedidoInicial.montoTarjeta) setMontoTarjeta(String(pedidoInicial.montoTarjeta))
      
      // Sincronizar estados de envío manual y costos
      const isManual = !!pedidoInicial.costoEnvio && pedidoInicial.distanciaKm === undefined
      setEnvioManual(isManual)
      setCostoEnvioManualInput(pedidoInicial.costoEnvio?.toString() || '')
      setDistanciaKm(pedidoInicial.distanciaKm || 0)
      if (!isManual && pedidoInicial.costoEnvio) {
        setCostoEnvio(pedidoInicial.costoEnvio)
      }

      const filas: FilaProductoPedido[] = pedidoInicial.productos.map(p => ({
        id: p.id,
        idCategoria: p.categoriaId || '',
        idProductoCatalogo: p.idCatalogo || '',
        cantidad: p.cantidad,
        precio: p.precio,
        modificadoresSeleccionadosIds: []
      }))
      setFilasProductos(filas.length > 0 ? filas : [crearFilaProductoVacia()])
    }
  }, [pedidoInicial])

  // 2. CRM Express
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

  // 3. Cálculos Derivados
  const subtotal = calcularTotalFilas(filasProductos)
  const pideDireccion = requiereDireccion(tipoEntrega)
  const costoEnvioFinal = envioManual ? (Number(costoEnvioManualInput) || 0) : costoEnvio
  const total = subtotal + costoEnvioFinal

  // 4. API de Mapa (Google Maps / OSRM)
  useEffect(() => {
    const controller = new AbortController()

    if (pideDireccion && coordenadas && !envioManual) {
      setCargandoEnvio(true)
      obtenerDistanciaConduccion(UBICACION_LOCAL, coordenadas, controller.signal)
        .then((dist) => {
          setDistanciaKm(dist)
          setCostoEnvio(calcularCostoEnvio(dist))
          setCargandoEnvio(false)
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            setCargandoEnvio(false)
          }
        })
    } else if (!pideDireccion) {
      setDistanciaKm(0)
      setCostoEnvio(0)
    }

    return () => controller.abort()
  }, [coordenadas, pideDireccion, envioManual])

  // 5. Acciones
  const aplicarDatosCRM = () => {
    if (clienteEncontrado) {
      setCliente(clienteEncontrado.cliente)
      setTipoEntrega(clienteEncontrado.tipoEntrega)
      if (clienteEncontrado.direccion) setDireccion(clienteEncontrado.direccion)
      if (clienteEncontrado.coordenadas) setCoordenadas(clienteEncontrado.coordenadas)
      setMetodoPago(clienteEncontrado.metodoPago)
      setClienteEncontrado(null)
    }
  }

  const manejarTipoEntrega = (nuevoTipo: TipoEntrega) => {
    setTipoEntrega(nuevoTipo)
    if (!requiereDireccion(nuevoTipo)) {
      setDireccion('')
      setCoordenadas(null)
    }
  }

  // 4b. Atajo de teclado: Ctrl + Flecha Derecha para rotar Tipo de Entrega (delivery -> retiro -> consumo_local -> delivery)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowRight' || e.code === 'ArrowRight')) {
        e.preventDefault()
        setTipoEntrega((prev) => {
          let siguiente: TipoEntrega = 'delivery'
          if (prev === 'delivery') siguiente = 'retiro'
          else if (prev === 'retiro') siguiente = 'consumo_local'
          else if (prev === 'consumo_local') siguiente = 'delivery'

          if (!requiereDireccion(siguiente)) {
            setDireccion('')
            setCoordenadas(null)
          }
          return siguiente
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const cargarEjemplo = () => {
    const ejemplos = [
      {
        cliente: 'Lautaro (Delivery Grande)',
        tel: '3815559876',
        tipo: 'delivery' as TipoEntrega,
        dir: 'Av. Belgrano 1234, Centro',
        coords: { latitud: -28.468200, longitud: -65.782100 },
        pago: 'efectivo' as MetodoPago,
        obs: 'Traer cambio de 50.000, tocar timbre fuerte.',
        filas: [{ cant: 3, cat: 'promos', prod: 'promos-promo-2-lomos' }, { cant: 2, cat: 'bebidas', prod: 'bebidas-coca-cola-15l' }]
      },
      {
        cliente: 'Martina (Retiro Rápido)',
        tel: '3834112233',
        tipo: 'retiro' as TipoEntrega,
        dir: '',
        coords: null,
        pago: 'transferencia' as MetodoPago,
        obs: 'Pasa a buscar en 15 min.',
        filas: [{ cant: 1, cat: 'hamburguesas', prod: 'hamburguesas-chefsy-burger' }]
      },
      {
        cliente: 'Mesa 4',
        tel: 'Sin especificar',
        tipo: 'consumo_local' as TipoEntrega,
        dir: '',
        coords: null,
        pago: 'efectivo' as MetodoPago,
        obs: 'Sin aderezos en una de las papas.',
        filas: [{ cant: 4, cat: 'papas', prod: 'papas-fritas-cheddar' }, { cant: 4, cat: 'bebidas', prod: 'bebidas-pinta-artesanal' }]
      }
    ]

    const random = ejemplos[Math.floor(Math.random() * ejemplos.length)]

    setCliente(random.cliente)
    setTelefono(random.tel)
    setTipoEntrega(random.tipo)
    setDireccion(random.dir)
    setCoordenadas(random.coords)
    setMetodoPago(random.pago)
    setObservaciones(random.obs)

    if (productos && productos.length > 0) {
      // Intentamos matchear los productos del ejemplo con el catálogo real
      const nuevasFilas = random.filas.map(f => {
        const pReal = productos.find(p => p.id === f.prod)
        return {
          id: generarIdProducto(),
          idCategoria: f.cat,
          idProductoCatalogo: pReal ? pReal.id : (productos[0]?.id || ''),
          cantidad: f.cant,
          precio: pReal ? pReal.precio : (productos[0]?.precio || 0),
          modificadoresSeleccionadosIds: [],
        }
      })
      setFilasProductos(nuevasFilas)
    }
  }

  const cancelar = () => {
    if (onClose) {
      onClose()
    } else {
      router.push('/pedidos')
    }
  }

  const manejarEnvio = () => {
    setError('')

    if (!cliente.trim()) return setError('El nombre del cliente es obligatorio.')
    if (pideDireccion && !direccion.trim()) {
      return setError('La dirección es obligatoria para delivery.')
    }

    const productosParseados = filasAProductosPedido(filasProductos, generarIdProducto)

    if (productosParseados.length === 0) {
      return setError('Agregá al menos un producto del catálogo.')
    }

    if (metodoPago === 'mixto') {
      const sumaMixto = (Number(montoEfectivo) || 0) + (Number(montoTransferencia) || 0) + (Number(montoTarjeta) || 0)
      if (sumaMixto !== total) {
        return setError(`El pago mixto ($${sumaMixto}) no coincide con el total ($${total}).`)
      }
    }

    const ahora = new Date()

    const nuevoPedido: Pedido = {
      ...(pedidoInicial || {}),
      id: pedidoInicial?.id || generarId(),
      cliente: cliente.trim(),
      telefono: telefono.trim() || 'Sin especificar',
      tipoEntrega,
      direccion: pideDireccion ? direccion.trim() : '',
      coordenadas: pideDireccion ? coordenadas ?? undefined : undefined,
      productos: productosParseados,
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
      montoEfectivo: metodoPago === 'mixto' && Number(montoEfectivo) > 0 ? Number(montoEfectivo) : undefined,
      montoTransferencia: metodoPago === 'mixto' && Number(montoTransferencia) > 0 ? Number(montoTransferencia) : undefined,
      montoTarjeta: metodoPago === 'mixto' && Number(montoTarjeta) > 0 ? Number(montoTarjeta) : undefined,
    }

    if (pedidoInicial) {
      editarPedido(nuevoPedido)
    } else {
      agregarPedido(nuevoPedido)
    }
    
    cancelar()
  }

  return {
    estado: {
      clienteEncontrado, tipoEntrega, cliente, telefono, direccion, coordenadas,
      metodoPago, observaciones, filasProductos, error, costoEnvio, distanciaKm,
      cargandoEnvio, envioManual, costoEnvioManualInput,
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
  }
}
