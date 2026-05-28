'use client'

// ─────────────────────────────────────────────────────
// modules/malu/contexto.tsx
// Context global del sistema Malú Clothing.
// Aísla el estado de clientas, ventas y pagos.
// No importa ni usa nada de Chefsy.
// ─────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { ClientaMalu, VentaFiada, PagoMalu, ResumenClienta, ProductoMalu, VentaMostrador, ApartadoMalu, GastoMalu } from './tipos'
import {
  obtenerClientas,
  obtenerTodasLasVentas,
  obtenerTodosLosPagos,
  crearClienta,
  actualizarClienta,
  crearVenta,
  actualizarVenta,
  eliminarVenta,
  crearPago,
  eliminarPago,
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerVentasMostrador,
  crearVentaMostrador,
  obtenerApartados,
  crearApartado,
  actualizarApartado,
  obtenerGastos,
  crearGasto,
  eliminarGasto,
} from './supabase'
import { esSesionMaluValida, guardarSesionMalu, cerrarSesionMalu } from './auth'

// Helper para obtener la fecha de negocio (Rollover a las 05:00 AM de Argentina)
export function obtenerFechaNegocioMalu(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() - 5 * 60 * 60 * 1000)
  return shifted.toLocaleDateString('sv').substring(0, 10)
}

// ── Estado ──────────────────────────────────────────

interface EstadoMalu {
  autenticada: boolean
  cargando: boolean
  clientas: ClientaMalu[]
  ventas: VentaFiada[]
  pagos: PagoMalu[]
  productos: ProductoMalu[]
  ventasMostrador: VentaMostrador[]
  apartados: ApartadoMalu[]
  gastos: GastoMalu[]
  clientaSeleccionadaId: string | null
  error: string | null
}

const estadoInicial: EstadoMalu = {
  autenticada: false,
  cargando: true,
  clientas: [],
  ventas: [],
  pagos: [],
  productos: [],
  ventasMostrador: [],
  apartados: [],
  gastos: [],
  clientaSeleccionadaId: null,
  error: null,
}

// ── Reducer ─────────────────────────────────────────

type AccionMalu =
  | { tipo: 'SET_AUTENTICADA'; valor: boolean }
  | { tipo: 'SET_CARGANDO'; valor: boolean }
  | { tipo: 'CARGAR_DATOS'; clientas: ClientaMalu[]; ventas: VentaFiada[]; pagos: PagoMalu[]; productos: ProductoMalu[]; ventasMostrador: VentaMostrador[]; apartados: ApartadoMalu[]; gastos: GastoMalu[] }
  | { tipo: 'AGREGAR_CLIENTA'; clienta: ClientaMalu }
  | { tipo: 'ACTUALIZAR_CLIENTA'; clienta: ClientaMalu }
  | { tipo: 'AGREGAR_VENTA'; venta: VentaFiada }
  | { tipo: 'ACTUALIZAR_VENTA'; venta: VentaFiada }
  | { tipo: 'ELIMINAR_VENTA'; id: string }
  | { tipo: 'AGREGAR_PAGO'; pago: PagoMalu }
  | { tipo: 'ELIMINAR_PAGO'; id: string }
  | { tipo: 'AGREGAR_PRODUCTO'; producto: ProductoMalu }
  | { tipo: 'ACTUALIZAR_PRODUCTO'; producto: ProductoMalu }
  | { tipo: 'ELIMINAR_PRODUCTO'; id: string }
  | { tipo: 'AGREGAR_VENTA_MOSTRADOR'; venta: VentaMostrador }
  | { tipo: 'AGREGAR_APARTADO'; apartado: ApartadoMalu }
  | { tipo: 'ACTUALIZAR_APARTADO'; apartado: ApartadoMalu }
  | { tipo: 'AGREGAR_GASTO'; gasto: GastoMalu }
  | { tipo: 'ELIMINAR_GASTO'; id: string }
  | { tipo: 'SELECCIONAR_CLIENTA'; id: string | null }
  | { tipo: 'SET_ERROR'; mensaje: string | null }

function reductorMalu(estado: EstadoMalu, accion: AccionMalu): EstadoMalu {
  switch (accion.tipo) {
    case 'SET_AUTENTICADA':
      return { ...estado, autenticada: accion.valor }
    case 'SET_CARGANDO':
      return { ...estado, cargando: accion.valor }
    case 'CARGAR_DATOS':
      return { 
        ...estado, 
        clientas: accion.clientas, 
        ventas: accion.ventas, 
        pagos: accion.pagos, 
        productos: accion.productos, 
        ventasMostrador: accion.ventasMostrador, 
        apartados: accion.apartados || [], 
        gastos: accion.gastos || [],
        cargando: false 
      }
    case 'AGREGAR_APARTADO':
      return { ...estado, apartados: [accion.apartado, ...estado.apartados] }
    case 'ACTUALIZAR_APARTADO':
      return { ...estado, apartados: estado.apartados.map(a => a.id === accion.apartado.id ? accion.apartado : a) }
    case 'AGREGAR_CLIENTA':
      return { ...estado, clientas: [accion.clienta, ...estado.clientas] }
    case 'ACTUALIZAR_CLIENTA':
      return { ...estado, clientas: estado.clientas.map(c => c.id === accion.clienta.id ? accion.clienta : c) }
    case 'AGREGAR_VENTA':
      return { ...estado, ventas: [accion.venta, ...estado.ventas] }
    case 'ACTUALIZAR_VENTA':
      return { ...estado, ventas: estado.ventas.map(v => v.id === accion.venta.id ? accion.venta : v) }
    case 'ELIMINAR_VENTA':
      return { ...estado, ventas: estado.ventas.filter(v => v.id !== accion.id) }
    case 'AGREGAR_PAGO':
      return { ...estado, pagos: [accion.pago, ...estado.pagos] }
    case 'ELIMINAR_PAGO':
      return { ...estado, pagos: estado.pagos.filter(p => p.id !== accion.id) }
    case 'AGREGAR_PRODUCTO':
      return { ...estado, productos: [accion.producto, ...estado.productos] }
    case 'ACTUALIZAR_PRODUCTO':
      return { ...estado, productos: estado.productos.map(p => p.id === accion.producto.id ? accion.producto : p) }
    case 'ELIMINAR_PRODUCTO':
      return { ...estado, productos: estado.productos.filter(p => p.id !== accion.id) }
    case 'AGREGAR_VENTA_MOSTRADOR':
      return { ...estado, ventasMostrador: [accion.venta, ...estado.ventasMostrador] }
    case 'AGREGAR_GASTO':
      return { ...estado, gastos: [accion.gasto, ...estado.gastos] }
    case 'ELIMINAR_GASTO':
      return { ...estado, gastos: estado.gastos.filter(g => g.id !== accion.id) }
    case 'SELECCIONAR_CLIENTA':
      return { ...estado, clientaSeleccionadaId: accion.id }
    case 'SET_ERROR':
      return { ...estado, error: accion.mensaje }
    default:
      return estado
  }
}

// ── Contexto ─────────────────────────────────────────

interface ValorContextoMalu {
  autenticada: boolean
  cargando: boolean
  error: string | null
  clientas: ClientaMalu[]
  ventas: VentaFiada[]
  pagos: PagoMalu[]
  productos: ProductoMalu[]
  ventasMostrador: VentaMostrador[]
  apartados: ApartadoMalu[]
  gastos: GastoMalu[]
  clientaSeleccionadaId: string | null
  // Helpers calculados
  obtenerResumen: (clientaId: string) => ResumenClienta | null
  obtenerClientasConSaldo: () => ClientaMalu[]
  // Acciones auth
  iniciarSesion: (contrasena: string) => Promise<boolean>
  cerrarSesion: () => void
  // Acciones datos
  recargarDatos: () => Promise<void>
  agregarClienta: (datos: Pick<ClientaMalu, 'nombre' | 'telefono' | 'notas' | 'fecha_nacimiento' | 'talle_general'>) => Promise<void>
  editarClienta: (id: string, datos: Partial<Pick<ClientaMalu, 'nombre' | 'telefono' | 'notas' | 'fecha_nacimiento' | 'talle_general'>>) => Promise<void>
  agregarVenta: (datos: Pick<VentaFiada, 'clienta_id' | 'descripcion' | 'monto' | 'fecha' | 'nota'>) => Promise<void>
  editarVenta: (id: string, datos: Partial<Pick<VentaFiada, 'descripcion' | 'monto' | 'fecha' | 'nota'>>) => Promise<void>
  borrarVenta: (id: string) => Promise<void>
  agregarPago: (datos: Pick<PagoMalu, 'clienta_id' | 'monto' | 'metodo' | 'fecha' | 'nota'>) => Promise<void>
  borrarPago: (id: string) => Promise<void>
  seleccionarClienta: (id: string | null) => void
  // Acciones Productos (Stock)
  agregarProducto: (datos: Pick<ProductoMalu, 'codigo' | 'nombre' | 'descripcion' | 'precio' | 'stock' | 'imagen_url' | 'categoria' | 'talle' | 'color' | 'external_id'>) => Promise<void>
  editarProducto: (id: string, datos: Partial<Pick<ProductoMalu, 'codigo' | 'nombre' | 'descripcion' | 'precio' | 'stock' | 'imagen_url' | 'categoria' | 'talle' | 'color' | 'external_id' | 'activo'>>) => Promise<void>
  borrarProducto: (id: string) => Promise<void>
  sincronizarStock: (url: string) => Promise<{ creados: number; actualizados: number; total: number }>
  agregarVentaMostrador: (datos: Pick<VentaMostrador, 'producto_id' | 'descripcion' | 'talle' | 'cantidad' | 'monto' | 'metodo' | 'fecha'>) => Promise<void>
  agregarApartado: (datos: Pick<ApartadoMalu, 'clienta_id' | 'producto_id' | 'descripcion' | 'talle' | 'cantidad' | 'monto_total' | 'monto_senado' | 'metodo_seña' | 'fecha' | 'estado'>) => Promise<void>
  entregarApartado: (id: string, metodoPago: 'efectivo' | 'transferencia') => Promise<void>
  cancelarApartado: (id: string) => Promise<void>
  // Acciones Gastos
  agregarGasto: (datos: Pick<GastoMalu, 'descripcion' | 'monto' | 'fecha'>) => Promise<void>
  borrarGasto: (id: string) => Promise<void>
}

const ContextoMalu = createContext<ValorContextoMalu | undefined>(undefined)

// ── Provider ─────────────────────────────────────────

export function ProveedorMalu({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reductorMalu, estadoInicial)

  // Verificar sesión al montar
  useEffect(() => {
    const valida = esSesionMaluValida()
    despachar({ tipo: 'SET_AUTENTICADA', valor: valida })
    if (!valida) {
      despachar({ tipo: 'SET_CARGANDO', valor: false })
    }
  }, [])

  // Cargar datos cuando se autentica
  useEffect(() => {
    if (estado.autenticada) {
      cargarDatos()
    }
  }, [estado.autenticada])

  const cargarDatos = useCallback(async () => {
    despachar({ tipo: 'SET_CARGANDO', valor: true })
    try {
      const [clientas, ventas, pagos, productos] = await Promise.all([
        obtenerClientas(),
        obtenerTodasLasVentas(),
        obtenerTodosLosPagos(),
        obtenerProductos().catch(() => []),
      ])

      let ventasMostrador: VentaMostrador[] = []
      try {
        ventasMostrador = await obtenerVentasMostrador()
      } catch (err: any) {
        console.warn('Fallo al obtener ventas mostrador de Supabase, usando localStorage:', err.message)
        const local = localStorage.getItem('malu-ventas-mostrador')
        if (local) {
          try {
            ventasMostrador = JSON.parse(local)
          } catch {
            ventasMostrador = []
          }
        }
      }

      let apartados: ApartadoMalu[] = []
      try {
        apartados = await obtenerApartados()
      } catch (err: any) {
        console.warn('Fallo al obtener apartados de Supabase, usando localStorage:', err.message)
        const local = localStorage.getItem('malu-apartados')
        if (local) {
          try {
            apartados = JSON.parse(local)
          } catch {
            apartados = []
          }
        }
      }

      let gastos: GastoMalu[] = []
      try {
        gastos = await obtenerGastos()
      } catch (err: any) {
        console.warn('Fallo al obtener gastos de Supabase, usando localStorage:', err.message)
        const local = localStorage.getItem('malu-gastos')
        if (local) {
          try {
            gastos = JSON.parse(local)
          } catch {
            gastos = []
          }
        }
      }

      despachar({ tipo: 'CARGAR_DATOS', clientas, ventas, pagos, productos, ventasMostrador, apartados, gastos })
    } catch (e: any) {
      console.error('Error al cargar datos:', e)
      despachar({ tipo: 'SET_ERROR', mensaje: 'Error al cargar datos de Malú.' })
      despachar({ tipo: 'SET_CARGANDO', valor: false })
    }
  }, [])

  // ── Helpers calculados ─────────────────────────────

  const obtenerResumen = useCallback((clientaId: string): ResumenClienta | null => {
    const clienta = estado.clientas.find(c => c.id === clientaId)
    if (!clienta) return null
    const ventas = estado.ventas.filter(v => v.clienta_id === clientaId)
    const pagos = estado.pagos.filter(p => p.clienta_id === clientaId)
    const totalVentas = ventas.reduce((acc, v) => acc + v.monto, 0)
    const totalPagos = pagos.reduce((acc, p) => acc + p.monto, 0)
    return { clienta, ventas, pagos, totalVentas, totalPagos, saldo: totalVentas - totalPagos }
  }, [estado.clientas, estado.ventas, estado.pagos])

  const obtenerClientasConSaldo = useCallback((): ClientaMalu[] => {
    return estado.clientas
      .map(c => {
        const totalVentas = estado.ventas.filter(v => v.clienta_id === c.id).reduce((a, v) => a + v.monto, 0)
        const totalPagos = estado.pagos.filter(p => p.clienta_id === c.id).reduce((a, p) => a + p.monto, 0)
        const ultimaVenta = estado.ventas.filter(v => v.clienta_id === c.id)[0]?.fecha
        const ultimoPago = estado.pagos.filter(p => p.clienta_id === c.id)[0]?.fecha
        const ultimaActividad = [ultimaVenta, ultimoPago].filter(Boolean).sort().reverse()[0] || null
        return { ...c, deudaTotal: totalVentas - totalPagos, ultimaActividad }
      })
      .sort((a, b) => (b.deudaTotal ?? 0) - (a.deudaTotal ?? 0))
  }, [estado.clientas, estado.ventas, estado.pagos])

  // ── Acciones Auth ──────────────────────────────────

  const iniciarSesion = useCallback(async (contrasena: string): Promise<boolean> => {
    const res = await fetch('/api/malu/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrasena }),
    })
    if (res.ok) {
      guardarSesionMalu(contrasena)
      despachar({ tipo: 'SET_AUTENTICADA', valor: true })
      return true
    }
    return false
  }, [])

  const cerrarSesion = useCallback(() => {
    cerrarSesionMalu()
    despachar({ tipo: 'SET_AUTENTICADA', valor: false })
    despachar({ tipo: 'CARGAR_DATOS', clientas: [], ventas: [], pagos: [], productos: [], ventasMostrador: [], apartados: [], gastos: [] })
  }, [])

  // ── Acciones Datos ─────────────────────────────────

  const agregarClienta = useCallback(async (datos: Pick<ClientaMalu, 'nombre' | 'telefono' | 'notas' | 'fecha_nacimiento' | 'talle_general'>) => {
    const nueva = await crearClienta(datos)
    despachar({ tipo: 'AGREGAR_CLIENTA', clienta: nueva })
  }, [])

  const editarClienta = useCallback(async (id: string, datos: Partial<Pick<ClientaMalu, 'nombre' | 'telefono' | 'notas' | 'fecha_nacimiento' | 'talle_general'>>) => {
    const actualizada = await actualizarClienta(id, datos)
    despachar({ tipo: 'ACTUALIZAR_CLIENTA', clienta: actualizada })
  }, [])

  const agregarVenta = useCallback(async (datos: Pick<VentaFiada, 'clienta_id' | 'descripcion' | 'monto' | 'fecha' | 'nota'>) => {
    const nueva = await crearVenta(datos)
    despachar({ tipo: 'AGREGAR_VENTA', venta: nueva })
  }, [])

  const editarVenta = useCallback(async (id: string, datos: Partial<Pick<VentaFiada, 'descripcion' | 'monto' | 'fecha' | 'nota'>>) => {
    const actualizada = await actualizarVenta(id, datos)
    despachar({ tipo: 'ACTUALIZAR_VENTA', venta: actualizada })
  }, [])

  const borrarVenta = useCallback(async (id: string) => {
    await eliminarVenta(id)
    despachar({ tipo: 'ELIMINAR_VENTA', id })
  }, [])

  const agregarPago = useCallback(async (datos: Pick<PagoMalu, 'clienta_id' | 'monto' | 'metodo' | 'fecha' | 'nota'>) => {
    const nuevo = await crearPago(datos)
    despachar({ tipo: 'AGREGAR_PAGO', pago: nuevo })
  }, [])

  const borrarPago = useCallback(async (id: string) => {
    await eliminarPago(id)
    despachar({ tipo: 'ELIMINAR_PAGO', id })
  }, [])

  const seleccionarClienta = useCallback((id: string | null) => {
    despachar({ tipo: 'SELECCIONAR_CLIENTA', id })
  }, [])

  const agregarProducto = useCallback(async (datos: Pick<ProductoMalu, 'codigo' | 'nombre' | 'descripcion' | 'precio' | 'stock' | 'imagen_url' | 'categoria' | 'talle' | 'color' | 'external_id'>) => {
    const nuevo = await crearProducto(datos)
    despachar({ tipo: 'AGREGAR_PRODUCTO', producto: nuevo })
  }, [])

  const editarProducto = useCallback(async (id: string, datos: Partial<Pick<ProductoMalu, 'codigo' | 'nombre' | 'descripcion' | 'precio' | 'stock' | 'imagen_url' | 'categoria' | 'talle' | 'color' | 'external_id' | 'activo'>>) => {
    const actualizado = await actualizarProducto(id, datos)
    despachar({ tipo: 'ACTUALIZAR_PRODUCTO', producto: actualizado })
  }, [])

  const borrarProducto = useCallback(async (id: string) => {
    await eliminarProducto(id)
    despachar({ tipo: 'ELIMINAR_PRODUCTO', id })
  }, [])

  const sincronizarStock = useCallback(async (url: string) => {
    const sesion = typeof window !== 'undefined' ? localStorage.getItem('malu-sesion-pass') : null
    const res = await fetch('/api/malu/stock/sincronizar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sesion ? { 'x-malu-auth': sesion } : {}),
      },
      body: JSON.stringify({ url }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Error ${res.status}`)
    }

    const data = await res.json()
    await cargarDatos()
    return data.detalles
  }, [cargarDatos])

  const agregarVentaMostrador = useCallback(async (datos: Pick<VentaMostrador, 'producto_id' | 'descripcion' | 'talle' | 'cantidad' | 'monto' | 'metodo' | 'fecha'>) => {
    let nueva: VentaMostrador
    try {
      nueva = await crearVentaMostrador(datos)
    } catch (err: any) {
      console.warn('Fallo al guardar venta mostrador en Supabase, guardando localmente:', err.message)
      nueva = {
        id: 'local-' + Math.random().toString(36).substring(2, 9),
        producto_id: datos.producto_id,
        descripcion: datos.descripcion,
        talle: datos.talle,
        cantidad: datos.cantidad,
        monto: datos.monto,
        metodo: datos.metodo,
        fecha: datos.fecha,
        creada_en: new Date().toISOString()
      }
      const local = localStorage.getItem('malu-ventas-mostrador')
      let array: VentaMostrador[] = []
      if (local) {
        try {
          array = JSON.parse(local)
        } catch {
          array = []
        }
      }
      array.unshift(nueva)
      localStorage.setItem('malu-ventas-mostrador', JSON.stringify(array))
    }
    despachar({ tipo: 'AGREGAR_VENTA_MOSTRADOR', venta: nueva })
  }, [])

  const agregarApartado = useCallback(async (datos: Pick<ApartadoMalu, 'clienta_id' | 'producto_id' | 'descripcion' | 'talle' | 'cantidad' | 'monto_total' | 'monto_senado' | 'metodo_seña' | 'fecha' | 'estado'>) => {
    let nuevo: ApartadoMalu
    try {
      nuevo = await crearApartado(datos)
    } catch (err: any) {
      console.warn('Fallo al guardar apartado en Supabase, guardando localmente:', err.message)
      nuevo = {
        id: 'local-ap-' + Math.random().toString(36).substring(2, 9),
        clienta_id: datos.clienta_id,
        producto_id: datos.producto_id,
        descripcion: datos.descripcion,
        talle: datos.talle,
        cantidad: datos.cantidad,
        monto_total: datos.monto_total,
        monto_senado: datos.monto_senado,
        metodo_seña: datos.metodo_seña,
        fecha: datos.fecha,
        estado: datos.estado,
        creado_en: new Date().toISOString()
      }
      const local = localStorage.getItem('malu-apartados')
      let array: ApartadoMalu[] = []
      if (local) {
        try {
          array = JSON.parse(local)
        } catch {
          array = []
        }
      }
      array.unshift(nuevo)
      localStorage.setItem('malu-apartados', JSON.stringify(array))
    }
    despachar({ tipo: 'AGREGAR_APARTADO', apartado: nuevo })

    // Impacto 1: Registrar seña en la caja diaria
    const descSeña = `Seña Apartado: ${datos.descripcion}`
    await agregarVentaMostrador({
      producto_id: datos.producto_id,
      descripcion: descSeña,
      talle: datos.talle,
      cantidad: datos.cantidad,
      monto: datos.monto_senado,
      metodo: datos.metodo_seña,
      fecha: datos.fecha
    })
  }, [agregarVentaMostrador])

  const entregarApartado = useCallback(async (id: string, metodoPago: 'efectivo' | 'transferencia') => {
    const ap = estado.apartados.find(a => a.id === id)
    if (!ap) throw new Error('Apartado no encontrado')
    const saldoRestante = ap.monto_total - ap.monto_senado

    let actualizado: ApartadoMalu
    if (id.startsWith('local-')) {
      actualizado = { ...ap, estado: 'retirado' }
      const local = localStorage.getItem('malu-apartados')
      if (local) {
        try {
          const array = JSON.parse(local) as ApartadoMalu[]
          const index = array.findIndex(a => a.id === id)
          if (index !== -1) {
            array[index].estado = 'retirado'
            localStorage.setItem('malu-apartados', JSON.stringify(array))
          }
        } catch {}
      }
    } else {
      actualizado = await actualizarApartado(id, { estado: 'retirado' })
    }
    despachar({ tipo: 'ACTUALIZAR_APARTADO', apartado: actualizado })

    if (saldoRestante > 0) {
      const descRetiro = `Entrega Apartado: ${ap.descripcion} (Saldo)`
      await agregarVentaMostrador({
        producto_id: ap.producto_id,
        descripcion: descRetiro,
        talle: ap.talle,
        cantidad: ap.cantidad,
        monto: saldoRestante,
        metodo: metodoPago,
        fecha: obtenerFechaNegocioMalu()
      })
    }
  }, [estado.apartados, agregarVentaMostrador])

  const cancelarApartado = useCallback(async (id: string) => {
    const ap = estado.apartados.find(a => a.id === id)
    if (!ap) throw new Error('Apartado no encontrado')

    let actualizado: ApartadoMalu
    if (id.startsWith('local-')) {
      actualizado = { ...ap, estado: 'cancelado' }
      const local = localStorage.getItem('malu-apartados')
      if (local) {
        try {
          const array = JSON.parse(local) as ApartadoMalu[]
          const index = array.findIndex(a => a.id === id)
          if (index !== -1) {
            array[index].estado = 'cancelado'
            localStorage.setItem('malu-apartados', JSON.stringify(array))
          }
        } catch {}
      }
    } else {
      actualizado = await actualizarApartado(id, { estado: 'cancelado' })
    }
    despachar({ tipo: 'ACTUALIZAR_APARTADO', apartado: actualizado })

    if (ap.producto_id) {
      const prod = estado.productos.find(p => p.id === ap.producto_id)
      if (prod) {
        await editarProducto(ap.producto_id, { stock: (prod.stock || 0) + ap.cantidad })
      }
    }
  }, [estado.apartados, estado.productos, editarProducto])

  const agregarGasto = useCallback(async (datos: Pick<GastoMalu, 'descripcion' | 'monto' | 'fecha'>) => {
    let nuevo: GastoMalu
    try {
      nuevo = await crearGasto(datos)
    } catch (err: any) {
      console.warn('Fallo al guardar Gasto en Supabase, guardando localmente:', err.message)
      nuevo = {
        id: 'local-g-' + Math.random().toString(36).substring(2, 9),
        descripcion: datos.descripcion,
        monto: datos.monto,
        fecha: datos.fecha,
        creado_en: new Date().toISOString()
      }
      const local = localStorage.getItem('malu-gastos')
      let array: GastoMalu[] = []
      if (local) {
        try {
          array = JSON.parse(local)
        } catch {
          array = []
        }
      }
      array.unshift(nuevo)
      localStorage.setItem('malu-gastos', JSON.stringify(array))
    }
    despachar({ tipo: 'AGREGAR_GASTO', gasto: nuevo })
  }, [])

  const borrarGasto = useCallback(async (id: string) => {
    if (id.startsWith('local-')) {
      const local = localStorage.getItem('malu-gastos')
      if (local) {
        try {
          const array = JSON.parse(local) as GastoMalu[]
          const filtrados = array.filter(g => g.id !== id)
          localStorage.setItem('malu-gastos', JSON.stringify(filtrados))
        } catch {}
      }
    } else {
      await eliminarGasto(id)
    }
    despachar({ tipo: 'ELIMINAR_GASTO', id })
  }, [])

  const valor: ValorContextoMalu = {
    autenticada: estado.autenticada,
    cargando: estado.cargando,
    error: estado.error,
    clientas: estado.clientas,
    ventas: estado.ventas,
    pagos: estado.pagos,
    productos: estado.productos,
    ventasMostrador: estado.ventasMostrador,
    apartados: estado.apartados,
    gastos: estado.gastos,
    clientaSeleccionadaId: estado.clientaSeleccionadaId,
    obtenerResumen,
    obtenerClientasConSaldo,
    iniciarSesion,
    cerrarSesion,
    recargarDatos: cargarDatos,
    agregarClienta,
    editarClienta,
    agregarVenta,
    editarVenta,
    borrarVenta,
    agregarPago,
    borrarPago,
    seleccionarClienta,
    agregarProducto,
    editarProducto,
    borrarProducto,
    sincronizarStock,
    agregarVentaMostrador,
    agregarApartado,
    entregarApartado,
    cancelarApartado,
    agregarGasto,
    borrarGasto,
  }

  return <ContextoMalu.Provider value={valor}>{children}</ContextoMalu.Provider>
}

// ── Hook ─────────────────────────────────────────────

export function usarMalu(): ValorContextoMalu {
  const ctx = useContext(ContextoMalu)
  if (!ctx) throw new Error('usarMalu debe usarse dentro de ProveedorMalu')
  return ctx
}
