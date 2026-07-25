'use client'
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'
import { setCache, getCache, removeCache } from '@/lib/localCache'
import { ItemCarrito } from '@/tipos/tienda'
import { Coordenadas, Pedido } from '@/tipos'
import { ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { UBICACION_LOCAL, obtenerDistanciaConduccion, calcularCostoEnvio, buscarCoordenadasPorDireccion } from '@/lib/ubicacion'
import { generarId } from '@/lib/utils'
import { insertarPedidoLocal } from '@/servicios/supabase/pedidos'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { supabase } from '@/lib/supabase'
import { guardarPedidoActivo } from '@/components/tienda/BotonPedidoFlotante'

// TTL para los datos del checkout: 30 días.
// Permite pre-rellenar el formulario en visitas posteriores pero evita mostrar
// datos muy viejos si el cliente cambió de teléfono/dirección.
const TTL_CHECKOUT_DIAS = 30 * 24  // en horas


interface ValorContextoCarrito {
  carrito: ItemCarrito[]
  cartAbierto: boolean
  setCartAbierto: (v: boolean) => void

  productoAPersonalizar: ProductoCatalogo | null
  modsSeleccionados: ModificadorCatalogo[]
  cantidadModal: number
  notaPersonalizacion: string
  setProductoAPersonalizar: (p: ProductoCatalogo | null) => void
  setModsSeleccionados: React.Dispatch<React.SetStateAction<ModificadorCatalogo[]>>
  setCantidadModal: (c: number) => void
  setNotaPersonalizacion: (n: string) => void
  abrirModalPersonalizacion: (prod: ProductoCatalogo) => void
  alternarModificador: (mod: ModificadorCatalogo) => void
  calcularPrecioUnitarioModal: () => number
  agregarAlCarritoDesdeModal: () => void

  actualizarCantidadCarrito: (idCart: string, delta: number) => void
  eliminarDelCarrito: (idCart: string) => void

  mostrarCheckout: boolean
  setMostrarCheckout: (v: boolean) => void
  tipoEntrega: 'delivery' | 'retiro'
  setTipoEntrega: (v: 'delivery' | 'retiro') => void
  nombreCliente: string
  setNombreCliente: (v: string) => void
  telefonoCliente: string
  setTelefonoCliente: (v: string) => void
  direccionCliente: string
  setDireccionCliente: (v: string) => void
  coordenadasCliente: Coordenadas | null
  setCoordenadasCliente: (v: Coordenadas | null) => void
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'sin_especificar'
  setMetodoPago: (v: 'efectivo' | 'tarjeta' | 'transferencia' | 'sin_especificar') => void
  observaciones: string
  setObservaciones: (v: string) => void

  distanciaClienteKm: number | undefined
  costoEnvio: number

  totalProductosCarrito: number
  subtotalCarrito: number
  totalCarrito: number
  totalPuntosGastados: number

  pedidoCompletado: Pedido | null
  setPedidoCompletado: (p: Pedido | null) => void
  procesarCompra: (onError?: (msg: string) => void) => Promise<void>
  turnoActivo: boolean | null
  procesandoCompra: boolean
}

const ContextoCarrito = createContext<ValorContextoCarrito | undefined>(undefined)

export function ProveedorCarrito({ children }: { children: ReactNode }) {
  const [turnoActivo, setTurnoActivo] = useState<boolean | null>(null)
  const [procesandoCompra, setProcesandoCompra] = useState(false)

  useEffect(() => {
    const verificarTurno = async () => {
      try {
        const res = await fetch(`/api/tienda/turno?t=${Date.now()}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setTurnoActivo(data.activo)
        }
      } catch (err) {
        console.error('Error verificando turno de tienda:', err)
      }
    }
    verificarTurno()
    const intv = setInterval(verificarTurno, 30000)
    return () => clearInterval(intv)
  }, [])

  const { usuario, estaListo: authListo } = usarClienteAuth()
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [cartAbierto, setCartAbierto] = useState(false)
  const carritoInicialCargadoRef = useRef<string | null>(null)

  // Cargar carrito de caché (TTL 7 días) cuando se monta o cambia el usuario
  useEffect(() => {
    if (!authListo) return
    const userId = usuario?.id || 'guest'

    if (carritoInicialCargadoRef.current !== userId) {
      carritoInicialCargadoRef.current = userId
      try {
        // getCache devuelve null si el carrito tiene más de 7 días
        const items = getCache<ItemCarrito[]>(`chefsy_carrito_${userId}`, 7 * 24)
        if (Array.isArray(items) && items.length > 0) {
          setCarrito(prev => prev.length === 0 ? items : prev)
        }
      } catch (e) {
        console.error('Error cargando carrito guardado:', e)
      }
    }
  }, [authListo, usuario?.id])

  // Guardar carrito en caché (TTL 7 días) en cada cambio
  useEffect(() => {
    if (!authListo) return
    const userId = usuario?.id || 'guest'
    if (carritoInicialCargadoRef.current === userId) {
      try {
        if (carrito.length > 0) {
          setCache(`chefsy_carrito_${userId}`, carrito)
        } else {
          removeCache(`chefsy_carrito_${userId}`)
        }
      } catch (e) {
        console.error('Error guardando carrito:', e)
      }
    }
  }, [carrito, authListo, usuario?.id])
  
  const [productoAPersonalizar, setProductoAPersonalizar] = useState<ProductoCatalogo | null>(null)
  const [modsSeleccionados, setModsSeleccionados] = useState<ModificadorCatalogo[]>([])
  const [cantidadModal, setCantidadModal] = useState(1)
  const [notaPersonalizacion, setNotaPersonalizacion] = useState('')

  const [mostrarCheckout, setMostrarCheckout] = useState(false)
  const [tipoEntrega, setTipoEntrega] = useState<'delivery' | 'retiro'>('retiro')
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [direccionCliente, setDireccionCliente] = useState('')
  const [coordenadasCliente, setCoordenadasCliente] = useState<Coordenadas | null>(null)
  const [distanciaClienteKm, setDistanciaClienteKm] = useState<number | undefined>(undefined)
  const [costoEnvio, setCostoEnvio] = useState(1500)
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'sin_especificar'>('sin_especificar')
  const [observaciones, setObservaciones] = useState('')
  
  const [pedidoCompletado, setPedidoCompletado] = useState<Pedido | null>(null)

  const abrirModalPersonalizacion = useCallback((prod: ProductoCatalogo) => {
    setProductoAPersonalizar(prod)
    setModsSeleccionados([])
    setCantidadModal(1)
    setNotaPersonalizacion('')
  }, [])

  const alternarModificador = useCallback((mod: ModificadorCatalogo) => {
    setModsSeleccionados(prev => 
      prev.some(m => m.id === mod.id)
        ? prev.filter(m => m.id !== mod.id)
        : [...prev, mod]
    )
  }, [])

  const calcularPrecioUnitarioModal = useCallback((): number => {
    if (!productoAPersonalizar) return 0
    const extra = modsSeleccionados.reduce((acc, curr) => acc + curr.precioExtra, 0)
    return productoAPersonalizar.precio + extra
  }, [productoAPersonalizar, modsSeleccionados])

  const agregarAlCarritoDesdeModal = useCallback((conPuntos: boolean = false) => {
    if (!productoAPersonalizar) return
    const precioUnitario = calcularPrecioUnitarioModal()
    const modsIdsStr = modsSeleccionados.map(m => m.id).sort().join('-')
    const idCart = modsIdsStr ? `${productoAPersonalizar.id}-${modsIdsStr}${conPuntos ? '-pts' : ''}` : `${productoAPersonalizar.id}${conPuntos ? '-pts' : ''}`

    setCarrito(prev => {
      const indexExistente = prev.findIndex(item => item.idCart === idCart && !!item.pago_con_puntos === conPuntos)
      if (indexExistente > -1) {
        const nuevoCarrito = [...prev]
        nuevoCarrito[indexExistente].cantidad += cantidadModal
        return nuevoCarrito
      } else {
        return [...prev, {
          idCart,
          producto: productoAPersonalizar,
          cantidad: cantidadModal,
          modificadoresSeleccionados: modsSeleccionados,
          precioUnitario,
          notaPersonalizacion: notaPersonalizacion.trim() || undefined,
          pago_con_puntos: conPuntos
        }]
      }
    })
    setProductoAPersonalizar(null)
  }, [productoAPersonalizar, cantidadModal, modsSeleccionados, notaPersonalizacion, calcularPrecioUnitarioModal])

  const actualizarCantidadCarrito = useCallback((idCart: string, delta: number) => {
    setCarrito(prev => 
      prev.map(item => {
        if (item.idCart === idCart) {
          const nuevaCantidad = item.cantidad + delta
          return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : item
        }
        return item
      }).filter(item => item.cantidad > 0)
    )
  }, [])

  const eliminarDelCarrito = useCallback((idCart: string) => {
    setCarrito(prev => prev.filter(item => item.idCart !== idCart))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    if (tipoEntrega === 'delivery' && coordenadasCliente) {
      obtenerDistanciaConduccion(UBICACION_LOCAL, coordenadasCliente, controller.signal).then(dist => {
        setDistanciaClienteKm(Number(dist.toFixed(2)))
        setCostoEnvio(calcularCostoEnvio(dist))
      }).catch(err => {
        if (err.name !== 'AbortError') console.error(err)
      })
    } else if (tipoEntrega === 'delivery') {
      setDistanciaClienteKm(undefined)
      setCostoEnvio(1500) // Tarifa base mínima de seguridad contra envíos a $0
    } else {
      setDistanciaClienteKm(undefined)
      setCostoEnvio(0)
    }
    return () => controller.abort()
  }, [coordenadasCliente, tipoEntrega])

  const totalProductosCarrito = carrito.reduce((acc, curr) => acc + curr.cantidad, 0)
  const subtotalCarrito = carrito.reduce((acc, curr) => acc + (curr.pago_con_puntos ? 0 : (curr.precioUnitario * curr.cantidad)), 0)
  const totalPuntosGastados = carrito.reduce((acc, curr) => acc + (curr.pago_con_puntos && curr.producto.precio_puntos ? (curr.producto.precio_puntos * curr.cantidad) : 0), 0)
  const totalCarrito = subtotalCarrito + (tipoEntrega === 'delivery' ? costoEnvio : 0)

  useEffect(() => {
    // getCache devuelve null si la clave no existe o superó los 30 días
    const n = getCache<string>('chefsy_nombre', TTL_CHECKOUT_DIAS)
    const t = getCache<string>('chefsy_telefono', TTL_CHECKOUT_DIAS)
    const d = getCache<string>('chefsy_direccion', TTL_CHECKOUT_DIAS)
    if (n) setNombreCliente(n)
    if (t) setTelefonoCliente(t)
    if (d) setDireccionCliente(d)
  }, [])

  const procesarCompra = useCallback(async (onError?: (msg: string) => void) => {
    if (procesandoCompra) return
    if (carrito.length === 0) {
      if (onError) onError('Tu carrito está vacío.')
      else alert('Tu carrito está vacío.')
      return
    }
    if (!nombreCliente.trim()) {
      if (onError) onError('¡Por favor ingresá tu nombre!')
      else alert('Por favor ingresá tu nombre.')
      return
    }
    if (telefonoCliente.replace(/\D/g, '').length < 8) {
      if (onError) onError('¡Ingresá un número de teléfono válido!')
      else alert('Por favor ingresá un número de teléfono válido (al menos 8 dígitos).')
      return
    }
    if (tipoEntrega === 'delivery' && !direccionCliente.trim()) {
      if (onError) onError('¡Ingresá tu dirección para la entrega!')
      else alert('Por favor ingresa la dirección para la entrega del delivery.')
      return
    }
    if (metodoPago === 'sin_especificar') {
      if (onError) onError('¡Elegí un método de pago!')
      else alert('Por favor selecciona un método de pago antes de confirmar el pedido.')
      return
    }

    setProcesandoCompra(true)
    try {
      let coordsFinal = coordenadasCliente
      let distFinal = distanciaClienteKm
      let costoFinal = costoEnvio

      // Capa 2: Geocodificación silenciosa de respaldo si aún no hay coordenadas
      if (tipoEntrega === 'delivery' && !coordsFinal && direccionCliente.trim()) {
        try {
          const resCoords = await buscarCoordenadasPorDireccion(direccionCliente)
          if (resCoords) {
            coordsFinal = resCoords
            setCoordenadasCliente(resCoords)
            const dist = await obtenerDistanciaConduccion(UBICACION_LOCAL, resCoords)
            distFinal = Number(dist.toFixed(2))
            costoFinal = calcularCostoEnvio(dist)
            setDistanciaClienteKm(distFinal)
            setCostoEnvio(costoFinal)
          }
        } catch (e) {
          console.error('Fallback geocoding procesarCompra:', e)
        }
      }

    // Obtener sesión actual (cliente logueado) con timeout de 5s
    let clienteId: string | undefined
    try {
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ])
      clienteId = sessionResult.data?.session?.user?.id
    } catch {
      // Sin sesión o timeout — continuar como invitado
      clienteId = undefined
    }

    const puntosGanados = Math.floor(totalCarrito * 0.05) // 5% de cashback en puntos

    const nuevoPedido: Pedido & { cliente_id?: string; puntos_gastados?: number; puntos_ganados?: number } = {
      id: generarId(),
      cliente: nombreCliente.trim(),
      telefono: telefonoCliente.trim(),
      tipoEntrega,
      direccion: tipoEntrega === 'delivery' ? direccionCliente.trim() : 'Retiro por el local',
      productos: carrito.map(item => {
        let nombreFormateado = item.producto.nombre
        const anexos = []
        if (item.modificadoresSeleccionados.length > 0) {
          anexos.push(item.modificadoresSeleccionados.map(m => m.nombre).join(', '))
        }
        if (item.notaPersonalizacion) {
          anexos.push(`"${item.notaPersonalizacion}"`)
        }
        if (item.pago_con_puntos) {
          anexos.push(`[PAGADO CON PUNTOS]`)
        }
        if (anexos.length > 0) {
          nombreFormateado += ` (+ ${anexos.join(' | ')})`
        }
        return {
          id: `${item.producto.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          nombre: nombreFormateado,
          cantidad: item.cantidad,
          precio: item.pago_con_puntos ? 0 : item.precioUnitario,
          idCatalogo: item.producto.id,
          categoriaId: item.producto.categoriaId
        }
      }),
      total: subtotalCarrito + (tipoEntrega === 'delivery' ? costoFinal : 0),
      costoEnvio: tipoEntrega === 'delivery' ? costoFinal : 0,
      distanciaKm: distFinal,
      coordenadas: coordsFinal || undefined,
      estado: 'nuevo',
      metodoPago,
      observaciones: observaciones.trim() || undefined,
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      fecha: obtenerFechaNegocio(new Date()),
      created_at: new Date().toISOString(),
      cliente_id: clienteId, // Se asigna si el cliente está logueado
      puntos_gastados: totalPuntosGastados,
      puntos_ganados: puntosGanados
    }

    try {
      const resTurno = await fetch(`/api/tienda/turno?t=${Date.now()}`, { cache: 'no-store' })
      if (resTurno.ok) {
        const dataTurno = await resTurno.json()
        if (!dataTurno.activo) {
          setTurnoActivo(false)
          alert('Nuestro horario de atención es de 20:30 a 01:00hs.')
          return
        }
      }
    } catch (e) {
      console.error('Error verificando turno en compra:', e)
    }

    try {
      await insertarPedidoLocal({ ...nuevoPedido, archivado: false })
    } catch (err) {
      console.error('Error enviando pedido', err)
      alert('Hubo un error al procesar tu pedido. Por favor intentá de nuevo o contactanos por WhatsApp.')
      return
    }

    setCache('chefsy_nombre', nombreCliente.trim())
    setCache('chefsy_telefono', telefonoCliente.trim())
    if (tipoEntrega === 'delivery') {
      setCache('chefsy_direccion', direccionCliente.trim())
    }
    // TTL 24h: solo necesario para mostrar el botón de rastreo inmediatamente post-compra
    setCache('chefsy_ultimo_pedido_id', nuevoPedido.id)
    // Guardar pedido activo completo para el botón flotante
    guardarPedidoActivo({
      id: nuevoPedido.id,
      clienteNombre: nuevoPedido.cliente,
      tipoEntrega,
      estado: 'nuevo',
    })

    setPedidoCompletado(nuevoPedido)
    setCarrito([])
    setMostrarCheckout(false)
    setCartAbierto(false)
    setTipoEntrega('retiro')
    } finally {
      setProcesandoCompra(false)
    }
  }, [procesandoCompra, nombreCliente, telefonoCliente, tipoEntrega, direccionCliente, carrito, totalCarrito, costoEnvio, metodoPago, observaciones, distanciaClienteKm, coordenadasCliente])

  return (
    <ContextoCarrito.Provider value={{
      carrito, cartAbierto, setCartAbierto,
      productoAPersonalizar, modsSeleccionados, cantidadModal, notaPersonalizacion,
      setProductoAPersonalizar, setModsSeleccionados, setCantidadModal, setNotaPersonalizacion,
      abrirModalPersonalizacion, alternarModificador, calcularPrecioUnitarioModal, agregarAlCarritoDesdeModal,
      actualizarCantidadCarrito, eliminarDelCarrito,
      mostrarCheckout, setMostrarCheckout,
      tipoEntrega, setTipoEntrega,
      nombreCliente, setNombreCliente,
      telefonoCliente, setTelefonoCliente,
      direccionCliente, setDireccionCliente,
      coordenadasCliente, setCoordenadasCliente,
      metodoPago, setMetodoPago,
      observaciones, setObservaciones,
      distanciaClienteKm, costoEnvio,
      totalProductosCarrito, subtotalCarrito, totalCarrito, totalPuntosGastados,
      pedidoCompletado, setPedidoCompletado,
      procesarCompra, turnoActivo, procesandoCompra
    }}>
      {children}
    </ContextoCarrito.Provider>
  )
}

export function usarCarrito() {
  const context = useContext(ContextoCarrito)
  if (!context) throw new Error('usarCarrito debe usarse dentro de un ProveedorCarrito')
  return context
}
