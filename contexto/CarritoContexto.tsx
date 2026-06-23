'use client'
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react'
import { ItemCarrito } from '@/tipos/tienda'
import { Coordenadas, Pedido } from '@/tipos'
import { ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { UBICACION_LOCAL, obtenerDistanciaConduccion, calcularCostoEnvio } from '@/lib/ubicacion'
import { generarId } from '@/lib/utils'
import { insertarPedidoLocal } from '@/servicios/supabase/pedidos'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import { supabase } from '@/lib/supabase'

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
  procesarCompra: () => Promise<void>
}

const ContextoCarrito = createContext<ValorContextoCarrito | undefined>(undefined)

export function ProveedorCarrito({ children }: { children: ReactNode }) {
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [cartAbierto, setCartAbierto] = useState(false)
  
  const [productoAPersonalizar, setProductoAPersonalizar] = useState<ProductoCatalogo | null>(null)
  const [modsSeleccionados, setModsSeleccionados] = useState<ModificadorCatalogo[]>([])
  const [cantidadModal, setCantidadModal] = useState(1)
  const [notaPersonalizacion, setNotaPersonalizacion] = useState('')

  const [mostrarCheckout, setMostrarCheckout] = useState(false)
  const [tipoEntrega, setTipoEntrega] = useState<'delivery' | 'retiro'>('delivery')
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
    const n = localStorage.getItem('chefsy_nombre')
    const t = localStorage.getItem('chefsy_telefono')
    const d = localStorage.getItem('chefsy_direccion')
    if (n) setNombreCliente(n)
    if (t) setTelefonoCliente(t)
    if (d) setDireccionCliente(d)
  }, [])

  const procesarCompra = useCallback(async () => {
    if (!nombreCliente.trim() || !telefonoCliente.trim()) {
      alert('Por favor completa tu nombre y número de teléfono de contacto.')
      return
    }
    if (tipoEntrega === 'delivery' && !direccionCliente.trim()) {
      alert('Por favor ingresa la dirección para la entrega del delivery.')
      return
    }

    // Obtener sesión actual (cliente logueado)
    const { data: { session } } = await supabase.auth.getSession()
    const clienteId = session?.user?.id

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
      total: totalCarrito,
      costoEnvio: tipoEntrega === 'delivery' ? costoEnvio : 0,
      distanciaKm: distanciaClienteKm,
      coordenadas: coordenadasCliente || undefined,
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
      await insertarPedidoLocal({ ...nuevoPedido, archivado: false })
    } catch (err) {
      console.error('Error enviando pedido', err)
      alert('Hubo un error al procesar tu pedido. Por favor intentá de nuevo o contactanos por WhatsApp.')
      return
    }

    localStorage.setItem('chefsy_nombre', nombreCliente.trim())
    localStorage.setItem('chefsy_telefono', telefonoCliente.trim())
    if (tipoEntrega === 'delivery') {
      localStorage.setItem('chefsy_direccion', direccionCliente.trim())
    }
    localStorage.setItem('chefsy_ultimo_pedido_id', nuevoPedido.id)

    setPedidoCompletado(nuevoPedido)
    setCarrito([])
    setMostrarCheckout(false)
    setCartAbierto(false)
  }, [nombreCliente, telefonoCliente, tipoEntrega, direccionCliente, carrito, totalCarrito, costoEnvio, metodoPago, observaciones, distanciaClienteKm, coordenadasCliente])

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
      procesarCompra
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
