import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Coordenadas, MetodoPago, Pedido, TipoEntrega } from '@/tipos'
import { FilaProductoPedido } from '@/tipos/catalogo'
import { crearFilaProductoVacia } from '@/lib/utils'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { calcularTotalFilas, filasAProductosPedido } from '@/lib/catalogo'
import { requiereDireccion } from '@/lib/entrega'
import { UBICACION_LOCAL, obtenerDistanciaConduccion, calcularCostoEnvio } from '@/lib/ubicacion'
import { generarId, generarIdProducto } from '@/lib/utils'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import useSWR from 'swr'
import {
  SugerenciaCliente,
  crearIndiceBuscadorClientes,
  normalizarTelefonoArgentino
} from '@/lib/motor-clientes'

export const STORAGE_KEY_BORRADOR_PEDIDO = 'chefsy_borrador_nuevo_pedido'

export interface BorradorPedido {
  cliente: string
  telefono: string
  tipoEntrega: TipoEntrega
  direccion: string
  coordenadas: Coordenadas | null
  metodoPago: MetodoPago
  observaciones: string
  montoEfectivo: string
  montoTransferencia: string
  montoTarjeta: string
  filasProductos: FilaProductoPedido[]
  costoEnvio: number
  distanciaKm: number
  envioManual: boolean
  costoEnvioManualInput: string
  guardadoEn: number
}

interface PropsUseFormularioPedido {
  pedidoInicial?: Pedido
  onClose?: () => void
}

export function useFormularioPedido({ pedidoInicial, onClose }: PropsUseFormularioPedido = {}) {
  const { agregarPedido, editarPedido, pedidos, productos, categorias, configuracionOperativa } = usarPedidos()
  const router = useRouter()

  const autocompletadoHabilitado = (configuracionOperativa as any)?.autocompletadoClientesHabilitado !== false

  const [clienteEncontrado, setClienteEncontrado] = useState<Pedido | null>(null)
  const [sugerenciasActivas, setSugerenciasActivas] = useState<SugerenciaCliente[]>([])
  const [mostrarDropdownSugerencias, setMostrarDropdownSugerencias] = useState(false)

  // Cargar lista de sugerencias del servidor (cacheada)
  const { data: sugerenciasDb } = useSWR<SugerenciaCliente[]>(
    '/api/admin/clientes-sugerencias',
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) return []
      return res.json()
    },
    { dedupingInterval: 60000, revalidateOnFocus: false }
  )

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

  // ── Gestión de borrador temporal (Lectura directa para 0 lag al abrir modal) ──
  const [borradorGuardado, setBorradorGuardado] = useState<BorradorPedido | null>(() => {
    if (pedidoInicial || typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BORRADOR_PEDIDO)
      if (raw) {
        const parsed = JSON.parse(raw) as BorradorPedido
        if (parsed && typeof parsed === 'object') return parsed
      }
    } catch {}
    return null
  })
  const [borradorActivoCargado, setBorradorActivoCargado] = useState(false)

  const setError = (msg: string) => {
    setRawError(msg)
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    if (msg) {
      errorTimeoutRef.current = setTimeout(() => setRawError(''), 3000)
    }
  }

  const determinarEnvioManual = (p?: Pedido): boolean => {
    if (!p || p.tipoEntrega !== 'delivery' || p.costoEnvio === undefined) return false
    if (p.envioManual !== undefined) return p.envioManual
    if (!p.distanciaKm || p.distanciaKm === 0) {
      return p.costoEnvio !== 1500 && p.costoEnvio > 0
    }
    return p.costoEnvio !== calcularCostoEnvio(p.distanciaKm)
  }

  const [costoEnvio, setCostoEnvio] = useState(() => {
    if (pedidoInicial?.tipoEntrega === 'delivery' && pedidoInicial?.costoEnvio !== undefined) {
      return pedidoInicial.costoEnvio
    }
    return pedidoInicial?.tipoEntrega === 'delivery' || !pedidoInicial ? 1500 : 0
  })
  const [distanciaKm, setDistanciaKm] = useState(pedidoInicial?.distanciaKm || 0)
  const [cargandoEnvio, setCargandoEnvio] = useState(false)
  const [envioManual, setEnvioManualState] = useState(() => determinarEnvioManual(pedidoInicial))
  const [costoEnvioManualInput, setCostoEnvioManualInput] = useState(() => {
    const isManual = determinarEnvioManual(pedidoInicial)
    return isManual && pedidoInicial?.costoEnvio !== undefined ? pedidoInicial.costoEnvio.toString() : ''
  })

  const manejarSetEnvioManual = (manual: boolean) => {
    setEnvioManualState(manual)
    if (manual && (!costoEnvioManualInput || Number(costoEnvioManualInput) === 0)) {
      const val = costoEnvio > 0 ? costoEnvio : (costoEnvioFinal > 0 ? costoEnvioFinal : 1500)
      setCostoEnvioManualInput(val.toString())
    }
  }

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
      const isManual = determinarEnvioManual(pedidoInicial)
      setEnvioManualState(isManual)
      setCostoEnvioManualInput(isManual && pedidoInicial.costoEnvio !== undefined ? pedidoInicial.costoEnvio.toString() : '')
      setDistanciaKm(pedidoInicial.distanciaKm || 0)
      if (pedidoInicial.tipoEntrega === 'delivery') {
        setCostoEnvio(pedidoInicial.costoEnvio !== undefined ? pedidoInicial.costoEnvio : 1500)
      } else {
        setCostoEnvio(0)
      }

      const filas: FilaProductoPedido[] = pedidoInicial.productos.map(p => {
        const prodCatalogo = productos.find(pr => pr.id === p.idCatalogo)
        const catId = p.categoriaId || prodCatalogo?.categoriaId || ''
        const catCatalogo = categorias.find(c => c.id === catId)

        let nombreLimpio = prodCatalogo?.nombre
        if (!nombreLimpio && p.nombre) {
          const partes = p.nombre.split(' - ')
          nombreLimpio = partes.length > 1 ? partes.slice(1).join(' - ') : p.nombre
          nombreLimpio = nombreLimpio.replace(/\s*\(\+.*?\)$/, '').trim()
        }

        return {
          id: p.id,
          idCategoria: catId,
          nombreCategoria: catCatalogo?.nombre,
          idProductoCatalogo: p.idCatalogo || '',
          nombreProducto: nombreLimpio || p.nombre,
          cantidad: p.cantidad,
          precio: p.precio,
          modificadoresSeleccionadosIds: [],
          coccion: (p.coccion === 'fritas' || p.coccion === 'al_horno') ? p.coccion : undefined,
        }
      })
      setFilasProductos(filas.length > 0 ? filas : [crearFilaProductoVacia()])
    }
  }, [pedidoInicial, productos, categorias])


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

  // 3. Cálculos Derivados con Blindaje de Envío
  const subtotal = calcularTotalFilas(filasProductos)
  const pideDireccion = requiereDireccion(tipoEntrega)
  const costoEnvioFinal = pideDireccion
    ? (envioManual ? (costoEnvioManualInput === '' ? 0 : Number(costoEnvioManualInput) || 0) : (costoEnvio > 0 ? costoEnvio : 1500))
    : 0
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
            // Fallback de seguridad si falla la red: mantener costo base
            if (costoEnvio === 0) setCostoEnvio(1500)
          }
        })
    } else if (!pideDireccion) {
      setDistanciaKm(0)
      setCostoEnvio(0)
    } else if (pideDireccion && !coordenadas && !envioManual && costoEnvio === 0) {
      // Si es delivery pero aún no hay coordenadas, asegurar costo base de $1500
      setCostoEnvio(1500)
    }

    return () => controller.abort()
  }, [coordenadas, pideDireccion, envioManual])

  // ── Índice Fuse.js en memoria que combina sugerencias del servidor con pedidos activos ──
  const indiceClientes = React.useMemo(() => {
    const mapa = new Map<string, SugerenciaCliente>()

    if (Array.isArray(sugerenciasDb)) {
      sugerenciasDb.forEach(s => {
        const key = s.telefonoNormalizado || s.nombre.toLowerCase().trim()
        mapa.set(key, { ...s })
      })
    }

    if (Array.isArray(pedidos)) {
      pedidos.forEach(p => {
        if (!p.cliente || p.cliente.trim().length < 2) return
        const telNorm = normalizarTelefonoArgentino(p.telefono)
        const key = telNorm || p.cliente.toLowerCase().trim()
        const existente = mapa.get(key)
        if (existente) {
          if (!existente.direccion && p.direccion) {
            existente.direccion = p.direccion
            existente.coordenadas = p.coordenadas
          }
        } else {
          mapa.set(key, {
            nombre: p.cliente.trim(),
            telefono: p.telefono || '',
            telefonoNormalizado: telNorm,
            direccion: p.direccion || '',
            coordenadas: p.coordenadas || null,
            metodoPago: p.metodoPago || 'efectivo',
            tipoEntrega: p.tipoEntrega || 'delivery',
          })
        }
      })
    }

    return crearIndiceBuscadorClientes(Array.from(mapa.values()))
  }, [sugerenciasDb, pedidos])

  // ── Búsqueda reactiva en tiempo real al escribir Nombre o Celular ──────────
  useEffect(() => {
    if (pedidoInicial || !autocompletadoHabilitado) {
      setSugerenciasActivas([])
      setMostrarDropdownSugerencias(false)
      setClienteEncontrado(null)
      return
    }

    const queryNom = (cliente || '').trim()
    const queryTel = normalizarTelefonoArgentino(telefono) || (telefono || '').trim()

    // Activar sugerencias a partir de 2 letras de nombre o 3 dígitos de celular
    const terminoBusqueda = queryNom.length >= 2 ? queryNom : (queryTel.length >= 3 ? queryTel : '')

    if (!terminoBusqueda) {
      setSugerenciasActivas([])
      setMostrarDropdownSugerencias(false)
      setClienteEncontrado(null)
      return
    }

    const resultados = indiceClientes.search(terminoBusqueda)
    if (resultados.length > 0) {
      const top = resultados.slice(0, 4).map(r => r.item)
      setSugerenciasActivas(top)
      setMostrarDropdownSugerencias(true)

      const mejor = resultados[0]
      if (mejor && ((mejor.score !== undefined && mejor.score < 0.3) || (queryTel && mejor.item.telefonoNormalizado === queryTel))) {
        setClienteEncontrado({
          id: mejor.item.id || 'crm-match',
          cliente: mejor.item.nombre,
          telefono: mejor.item.telefono,
          direccion: mejor.item.direccion || '',
          coordenadas: mejor.item.coordenadas || undefined,
          tipoEntrega: (mejor.item.tipoEntrega as TipoEntrega) || 'delivery',
          metodoPago: (mejor.item.metodoPago as MetodoPago) || 'efectivo',
          productos: [],
          total: 0,
          estado: 'en_cocina',
          hora: '',
          fecha: '',
        })
      } else {
        setClienteEncontrado(null)
      }
    } else {
      setSugerenciasActivas([])
      setMostrarDropdownSugerencias(false)
      setClienteEncontrado(null)
    }
  }, [cliente, telefono, indiceClientes, pedidoInicial, autocompletadoHabilitado])

  // 5. Acciones
  const seleccionarSugerenciaCliente = (sug: SugerenciaCliente) => {
    setCliente(sug.nombre)
    if (sug.telefono && sug.telefono !== 'Sin especificar') {
      setTelefono(sug.telefono)
    }
    if (sug.tipoEntrega && ['delivery', 'retiro', 'consumo_local'].includes(sug.tipoEntrega)) {
      manejarTipoEntrega(sug.tipoEntrega as TipoEntrega)
    }
    if (sug.direccion) {
      setDireccion(sug.direccion)
      if (sug.coordenadas) {
        setCoordenadas(sug.coordenadas)
      }
    }
    if (sug.metodoPago && ['efectivo', 'tarjeta', 'transferencia', 'mixto', 'sin_especificar'].includes(sug.metodoPago)) {
      setMetodoPago(sug.metodoPago as MetodoPago)
    }
    setMostrarDropdownSugerencias(false)
    setSugerenciasActivas([])
    setClienteEncontrado(null)
  }

  const aplicarDatosCRM = () => {
    if (clienteEncontrado) {
      setCliente(clienteEncontrado.cliente)
      if (clienteEncontrado.telefono && clienteEncontrado.telefono !== 'Sin especificar') {
        setTelefono(clienteEncontrado.telefono)
      }
      manejarTipoEntrega(clienteEncontrado.tipoEntrega)
      if (clienteEncontrado.tipoEntrega === 'delivery') {
        if (clienteEncontrado.direccion) setDireccion(clienteEncontrado.direccion)
        if (clienteEncontrado.coordenadas) setCoordenadas(clienteEncontrado.coordenadas)
      }
      setMetodoPago(clienteEncontrado.metodoPago)
      setClienteEncontrado(null)
      setMostrarDropdownSugerencias(false)
      setSugerenciasActivas([])
    }
  }

  const manejarTipoEntrega = (nuevoTipo: TipoEntrega) => {
    const eraDelivery = requiereDireccion(tipoEntrega)
    const seraDelivery = requiereDireccion(nuevoTipo)

    setTipoEntrega(nuevoTipo)

    if (!seraDelivery) {
      setDireccion('')
      setCoordenadas(null)
      setCostoEnvio(0)
      setDistanciaKm(0)
      setEnvioManualState(false)
      setCostoEnvioManualInput('')
    } else {
      if (!eraDelivery) {
        // Al pasar de retiro/consumo a delivery, la casilla de envío manual jamás debe marcarse sola
        setEnvioManualState(false)
        setCostoEnvioManualInput('')
        if (costoEnvio === 0) setCostoEnvio(1500)
      } else if (costoEnvio === 0) {
        setCostoEnvio(1500)
      }
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

          const eraDelivery = requiereDireccion(prev)
          const seraDelivery = requiereDireccion(siguiente)

          if (!seraDelivery) {
            setDireccion('')
            setCoordenadas(null)
            setCostoEnvio(0)
            setDistanciaKm(0)
            setEnvioManualState(false)
            setCostoEnvioManualInput('')
          } else {
            if (!eraDelivery) {
              setEnvioManualState(false)
              setCostoEnvioManualInput('')
              setCostoEnvio(1500)
            } else if (costoEnvio === 0) {
              setCostoEnvio(1500)
            }
          }
          return siguiente
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [costoEnvio])

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

  const manejarEnvio = async () => {
    setError('')

    if (!cliente.trim()) return setError('El nombre del cliente es obligatorio.')
    if (pideDireccion && !direccion.trim()) {
      return setError('La dirección es obligatoria para delivery.')
    }

    const productosParseados = filasAProductosPedido(
      filasProductos, 
      generarIdProducto, 
      productos, 
      categorias
    )

    if (productosParseados.length === 0) {
      return setError('Agregá al menos un producto del catálogo.')
    }

    // ── Respaldo Infalible de Costo de Envío en Guardado Rápido ──
    let costoEnvioRespaldo = costoEnvioFinal
    let distRespaldo = distanciaKm

    if (pideDireccion && !envioManual) {
      if (cargandoEnvio && coordenadas) {
        try {
          const dist = await obtenerDistanciaConduccion(UBICACION_LOCAL, coordenadas)
          distRespaldo = dist
          costoEnvioRespaldo = calcularCostoEnvio(dist)
        } catch {
          costoEnvioRespaldo = costoEnvio > 0 ? costoEnvio : 1500
        }
      } else if (costoEnvioRespaldo === 0) {
        // Si no hay coordenadas o la API no respondió aún, aplicar costo base de $1500
        costoEnvioRespaldo = 1500
      }
    }

    const totalCalculado = subtotal + (pideDireccion ? costoEnvioRespaldo : 0)

    if (metodoPago === 'mixto') {
      const sumaMixto = (Number(montoEfectivo) || 0) + (Number(montoTransferencia) || 0) + (Number(montoTarjeta) || 0)
      if (sumaMixto !== totalCalculado) {
        return setError(`El pago mixto ($${sumaMixto}) no coincide con el total ($${totalCalculado}).`)
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
      total: totalCalculado,
      costoEnvio: pideDireccion ? (costoEnvioRespaldo > 0 ? costoEnvioRespaldo : undefined) : undefined,
      distanciaKm: distRespaldo > 0 ? Number(distRespaldo.toFixed(2)) : undefined,
      envioManual: envioManual,
      estado: pedidoInicial ? pedidoInicial.estado : 'en_cocina',
      metodoPago,
      observaciones: observaciones.trim() || undefined,
      hora: pedidoInicial?.hora || ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      fecha: pedidoInicial?.fecha || obtenerFechaNegocio(ahora),
      created_at: pedidoInicial?.created_at || ahora.toISOString(),
      cocina_at: pedidoInicial ? pedidoInicial.cocina_at : ahora.toISOString(),
      pago_confirmado: pedidoInicial?.pago_confirmado,
      montoEfectivo: metodoPago === 'mixto' && Number(montoEfectivo) > 0 ? Number(montoEfectivo) : undefined,
      montoTransferencia: metodoPago === 'mixto' && Number(montoTransferencia) > 0 ? Number(montoTransferencia) : undefined,
      montoTarjeta: metodoPago === 'mixto' && Number(montoTarjeta) > 0 ? Number(montoTarjeta) : undefined,
    }

    if (pedidoInicial) {
      editarPedido(nuevoPedido)
    } else {
      agregarPedido(nuevoPedido)
      // Si se crea el pedido con éxito, se elimina la data guardada temporalmente
      try {
        localStorage.removeItem(STORAGE_KEY_BORRADOR_PEDIDO)
      } catch {}
      setBorradorGuardado(null)
      setBorradorActivoCargado(false)
    }
    
    cancelar()
  }

  // ── Acciones de Borrador Temporal ──────────────────────────────────────────
  const guardarBorrador = () => {
    if (pedidoInicial) return

    const tieneAlgo = 
      cliente.trim() !== '' || 
      telefono.trim() !== '' || 
      direccion.trim() !== '' || 
      observaciones.trim() !== '' || 
      filasProductos.some(f => Boolean(f.idProductoCatalogo))

    if (!tieneAlgo) {
      setError('No hay datos cargados para guardar temporalmente.')
      return
    }

    const borrador: BorradorPedido = {
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      tipoEntrega,
      direccion: direccion.trim(),
      coordenadas,
      metodoPago,
      observaciones: observaciones.trim(),
      montoEfectivo,
      montoTransferencia,
      montoTarjeta,
      filasProductos,
      costoEnvio,
      distanciaKm,
      envioManual,
      costoEnvioManualInput,
      guardadoEn: Date.now()
    }

    try {
      localStorage.setItem(STORAGE_KEY_BORRADOR_PEDIDO, JSON.stringify(borrador))
      setBorradorGuardado(borrador)
    } catch (e) {
      console.error('Error al guardar borrador en localStorage', e)
    }

    // Si está en modal, cerrar para permitir atender al otro cliente de inmediato
    if (onClose) {
      onClose()
    } else {
      // En la página /nuevo-pedido, limpiar el formulario para comenzar otro pedido
      setCliente('')
      setTelefono('')
      setDireccion('')
      setCoordenadas(null)
      setObservaciones('')
      setMetodoPago('sin_especificar')
      setMontoEfectivo('')
      setMontoTransferencia('')
      setMontoTarjeta('')
      setFilasProductos([crearFilaProductoVacia()])
      setEnvioManualState(false)
      setCostoEnvioManualInput('')
      setBorradorActivoCargado(false)
    }
  }

  const restaurarBorrador = () => {
    if (!borradorGuardado) return

    setCliente(borradorGuardado.cliente || '')
    setTelefono(borradorGuardado.telefono || '')
    setTipoEntrega(borradorGuardado.tipoEntrega || 'delivery')
    setDireccion(borradorGuardado.direccion || '')
    setCoordenadas(borradorGuardado.coordenadas || null)
    setMetodoPago(borradorGuardado.metodoPago || 'sin_especificar')
    setObservaciones(borradorGuardado.observaciones || '')
    setMontoEfectivo(borradorGuardado.montoEfectivo || '')
    setMontoTransferencia(borradorGuardado.montoTransferencia || '')
    setMontoTarjeta(borradorGuardado.montoTarjeta || '')
    
    if (borradorGuardado.filasProductos && borradorGuardado.filasProductos.length > 0) {
      setFilasProductos(borradorGuardado.filasProductos)
    }

    if (borradorGuardado.envioManual !== undefined) {
      setEnvioManualState(borradorGuardado.envioManual)
      setCostoEnvioManualInput(borradorGuardado.costoEnvioManualInput || '')
    }
    if (borradorGuardado.costoEnvio !== undefined) {
      setCostoEnvio(borradorGuardado.costoEnvio)
    }
    if (borradorGuardado.distanciaKm !== undefined) {
      setDistanciaKm(borradorGuardado.distanciaKm)
    }

    setBorradorActivoCargado(true)
  }

  const descartarBorrador = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_BORRADOR_PEDIDO)
    } catch {}
    setBorradorGuardado(null)
    setBorradorActivoCargado(false)
  }

  return {
    estado: {
      clienteEncontrado, tipoEntrega, cliente, telefono, direccion, coordenadas,
      metodoPago, observaciones, filasProductos, error, costoEnvio, distanciaKm,
      cargandoEnvio, envioManual, costoEnvioManualInput,
      montoEfectivo, montoTransferencia, montoTarjeta,
      borradorGuardado, borradorActivoCargado,
      sugerenciasActivas, mostrarDropdownSugerencias,
      autocompletadoHabilitado
    },
    setters: {
      setCliente, setTelefono, setDireccion, setCoordenadas, setMetodoPago,
      setObservaciones, setFilasProductos, setEnvioManual: manejarSetEnvioManual, setCostoEnvioManualInput,
      setMontoEfectivo, setMontoTransferencia, setMontoTarjeta,
      setMostrarDropdownSugerencias
    },
    derivados: {
      subtotal, pideDireccion, costoEnvioFinal, total
    },
    acciones: {
      aplicarDatosCRM, seleccionarSugerenciaCliente, manejarTipoEntrega, cargarEjemplo, manejarEnvio, cancelar,
      guardarBorrador, restaurarBorrador, descartarBorrador
    }
  }
}
