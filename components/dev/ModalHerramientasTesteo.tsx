'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Wrench,
  X,
  Minus,
  Maximize2,
  Trash2,
  Bell,
  Bike,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Play,
  Square,
  GripHorizontal,
  Package,
  Activity,
  Flame,
  ShieldCheck,
  BatteryCharging,
  RefreshCw,
  Clock,
  DollarSign,
  AlertCircle,
  Database,
  Terminal,
  Check,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  usarTemaNotificacion,
  reproducirSonidoCampanaCocina,
  reproducirSonidoEntregaExitosa,
  reproducirSonidoNotificacion,
} from '@/contexto/TemaNotificacionContexto'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { Pedido } from '@/tipos'
import { UBICACION_LOCAL, calcularCostoEnvio } from '@/lib/ubicacion'
import { obtenerStockInsumos } from '@/servicios/supabase/stock'
import { Insumo } from '@/tipos/stock'
import { obtenerLogsSistema, limpiarLogsSistema, registrarLogSistema, EntradaLog } from '@/lib/logger'

type TabDevTools = 'notificaciones' | 'pedidos' | 'cadetes' | 'salud' | 'stock' | 'caja'

const NOMBRES_MOCK = [
  'Juan Pérez',
  'María Gómez',
  'Carlos Rodríguez',
  'Lucía Fernández',
  'Martín Díaz',
  'Sofía Morales',
  'Lucas Benítez',
  'Agustina Romero',
  'Esteban Quito',
  'Valentina Castro',
]

const CADETES_MOCK = ['Lucas', 'Matías', 'Franco', 'Braian', 'Nico']

export default function ModalHerramientasTesteo() {
  const router = useRouter()
  const {
    notificaciones,
    agregarNotificacion,
    eliminarTodasNotificaciones,
  } = usarTemaNotificacion()

  const {
    pedidos,
    cadetes,
    agregarPedido,
    eliminarPedido,
    marcarPagoConfirmado,
    dbEstado,
    estadoTurno,
  } = usarPedidos()

  const [abierto, setAbierto] = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [tabActiva, setTabActiva] = useState<TabDevTools>('notificaciones')

  // Posición flotante con persistencia
  const [posicion, setPosicion] = useState<{ x: number; y: number }>({ x: 30, y: 120 })
  const modalRef = useRef<HTMLDivElement>(null)
  const arrastreRef = useRef<{
    arrastrando: boolean
    inicioX: number
    inicioY: number
    posXInicial: number
    posYInicial: number
  }>({
    arrastrando: false,
    inicioX: 0,
    inicioY: 0,
    posXInicial: 0,
    posYInicial: 0,
  })

  // 1. Notificaciones
  const [spamActivo, setSpamActivo] = useState(false)

  // 2. Pedidos
  const [inyectando, setInyectando] = useState(false)
  const [limpiandoTests, setLimpiandoTests] = useState(false)

  // 3. Cadetes & GPS
  const [cadeteGpsSeleccionado, setCadeteGpsSeleccionado] = useState<string>('')
  const [simulandoGps, setSimulandoGps] = useState(false)
  const [gpsProgreso, setGpsProgreso] = useState<number>(0)
  const [gpsVelocidad, setGpsVelocidad] = useState<number>(28)
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [direccionCalculo, setDireccionCalculo] = useState('')
  const [resultadoCalculo, setResultadoCalculo] = useState<{
    distanciaKm: number
    costo: number
    zona: string
  } | null>(null)

  // 4. Salud & Diagnóstico de Backend
  const [tablasSalud, setTablasSalud] = useState<
    Array<{ id: string; nombre: string; ok: boolean; latenciaMs: number; error?: string }>
  >([])
  const [escaneandoTablas, setEscaneandoTablas] = useState(false)
  const [logsSistema, setLogsSistema] = useState<EntradaLog[]>([])
  const [estadoWsLocal, setEstadoWsLocal] = useState<string>(dbEstado || 'conectado')

  // 5. Stock & Kardex
  const [insumosNegativos, setInsumosNegativos] = useState<Insumo[]>([])
  const [escaneandoStock, setEscaneandoStock] = useState(false)
  const [ajustandoStock, setAjustandoStock] = useState(false)

  // Cargar estado inicial y atajo
  useEffect(() => {
    try {
      const posGuardada = localStorage.getItem('chefsy_devtools_pos')
      if (posGuardada) {
        const parsed = JSON.parse(posGuardada)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const x = Math.max(10, Math.min(window.innerWidth - 420, parsed.x))
          const y = Math.max(10, Math.min(window.innerHeight - 200, parsed.y))
          setPosicion({ x, y })
        }
      }
      const estadoGuardado = localStorage.getItem('chefsy_devtools_abierto')
      if (estadoGuardado === 'true') setAbierto(true)
      const tabGuardada = localStorage.getItem('chefsy_devtools_tab') as TabDevTools
      if (tabGuardada) setTabActiva(tabGuardada)
    } catch {}

    // Cargar logs iniciales
    setLogsSistema(obtenerLogsSistema())
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('chefsy_devtools_abierto', abierto ? 'true' : 'false')
    } catch {}
  }, [abierto])

  useEffect(() => {
    try {
      localStorage.setItem('chefsy_devtools_tab', tabActiva)
    } catch {}
  }, [tabActiva])

  // Escuchar logs del sistema y cambios de WS
  useEffect(() => {
    const handleNuevoLog = () => setLogsSistema(obtenerLogsSistema())
    const handleWs = (e: any) => {
      if (e.detail) setEstadoWsLocal(e.detail)
    }

    window.addEventListener('chefsy:nuevo-log', handleNuevoLog)
    window.addEventListener('chefsy:realtime-estado', handleWs)

    return () => {
      window.removeEventListener('chefsy:nuevo-log', handleNuevoLog)
      window.removeEventListener('chefsy:realtime-estado', handleWs)
    }
  }, [])

  // Atajo global Ctrl + ,
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const esComa = e.key === ',' || e.code === 'Comma' || e.keyCode === 188
      if ((e.ctrlKey || e.metaKey) && esComa) {
        e.preventDefault()
        e.stopPropagation()
        setAbierto((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  useEffect(() => {
    if (!cadeteGpsSeleccionado && cadetes && cadetes.length > 0) {
      setCadeteGpsSeleccionado(cadetes[0].id)
    }
  }, [cadetes, cadeteGpsSeleccionado])

  // Arrastre con Pointer Events (60/120 FPS)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    arrastreRef.current = {
      arrastrando: true,
      inicioX: e.clientX,
      inicioY: e.clientY,
      posXInicial: posicion.x,
      posYInicial: posicion.y,
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (!arrastreRef.current.arrastrando) return
      const dx = ev.clientX - arrastreRef.current.inicioX
      const dy = ev.clientY - arrastreRef.current.inicioY

      const nuevoX = Math.max(
        10,
        Math.min(window.innerWidth - (modalRef.current?.offsetWidth || 410) - 10, arrastreRef.current.posXInicial + dx)
      )
      const nuevoY = Math.max(
        10,
        Math.min(window.innerHeight - (modalRef.current?.offsetHeight || 150) - 10, arrastreRef.current.posYInicial + dy)
      )

      setPosicion({ x: nuevoX, y: nuevoY })
    }

    const onPointerUp = () => {
      arrastreRef.current.arrastrando = false
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      try {
        localStorage.setItem('chefsy_devtools_pos', JSON.stringify(posicion))
      } catch {}
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  // ── 1. HERRAMIENTAS DE NOTIFICACIONES ─────────────────────────────────────

  const dispararNotificacion = useCallback(
    (tipo: 'nuevo' | 'entregado' | 'exito' | 'info' | 'warning' | 'deshacer') => {
      const cliente = NOMBRES_MOCK[Math.floor(Math.random() * NOMBRES_MOCK.length)]
      const cadete = CADETES_MOCK[Math.floor(Math.random() * CADETES_MOCK.length)]
      const numPedido = Math.floor(1000 + Math.random() * 9000)

      switch (tipo) {
        case 'nuevo':
          agregarNotificacion(`Nuevo pedido de ${cliente} (#${numPedido}) recibido en cocina.`, 'info')
          reproducirSonidoCampanaCocina()
          break
        case 'entregado':
          agregarNotificacion(
            `Pedido #${numPedido} de ${cliente} entregado correctamente por el cadete ${cadete}.`,
            'success'
          )
          reproducirSonidoEntregaExitosa()
          break
        case 'exito':
          agregarNotificacion(`Operación guardada correctamente en el sistema.`, 'success')
          reproducirSonidoNotificacion()
          break
        case 'info':
          agregarNotificacion(`Canal de sincronización en tiempo real activo.`, 'info')
          reproducirSonidoNotificacion()
          break
        case 'warning':
          agregarNotificacion(`Aviso de stock: Quedan pocas unidades de Pan de Papa en depósito.`, 'warning')
          reproducirSonidoNotificacion()
          break
        case 'deshacer':
          agregarNotificacion(
            `Pedido #${numPedido} de ${cliente} marcado como entregado.`,
            'info',
            {
              etiqueta: 'Deshacer',
              alHacerClick: () => {
                agregarNotificacion(`Cambio revertido para el pedido #${numPedido}.`, 'info')
              },
            }
          )
          reproducirSonidoNotificacion()
          break
      }
    },
    [agregarNotificacion]
  )

  const dispararRafaga = (cantidad: number) => {
    reproducirSonidoNotificacion()
    const tipos = ['nuevo', 'entregado', 'exito', 'warning', 'deshacer']
    for (let i = 0; i < cantidad; i++) {
      setTimeout(() => {
        const cliente = NOMBRES_MOCK[Math.floor(Math.random() * NOMBRES_MOCK.length)]
        const cadete = CADETES_MOCK[Math.floor(Math.random() * CADETES_MOCK.length)]
        const numPedido = Math.floor(1000 + Math.random() * 9000)
        const tipoRandom = tipos[Math.floor(Math.random() * tipos.length)]

        if (tipoRandom === 'nuevo') {
          agregarNotificacion(`Nuevo pedido de ${cliente} (#${numPedido}).`, 'info')
        } else if (tipoRandom === 'entregado') {
          agregarNotificacion(`Pedido #${numPedido} de ${cliente} entregado por ${cadete}.`, 'success')
        } else if (tipoRandom === 'warning') {
          agregarNotificacion(`Advertencia operativa: retraso estimado en cocina de 15 minutos.`, 'warning')
        } else if (tipoRandom === 'deshacer') {
          agregarNotificacion(`Pedido #${numPedido} actualizado.`, 'info', {
            etiqueta: 'Deshacer',
            alHacerClick: () => {},
          })
        } else {
          agregarNotificacion(`Sincronización de caja confirmada.`, 'success')
        }
      }, i * 35)
    }
  }

  useEffect(() => {
    if (!spamActivo) return
    const interval = setInterval(() => {
      const cliente = NOMBRES_MOCK[Math.floor(Math.random() * NOMBRES_MOCK.length)]
      const numPedido = Math.floor(1000 + Math.random() * 9000)
      agregarNotificacion(`Nuevo pedido de ${cliente} (#${numPedido}).`, 'info')
      reproducirSonidoCampanaCocina()
    }, 650)

    return () => clearInterval(interval)
  }, [spamActivo, agregarNotificacion])

  // ── 2. INYECTOR DE PEDIDOS REALES Y CASOS EXTREMOS ───────────────────────

  const crearPedidoEstructurado = async (config: {
    cliente: string
    direccion: string
    telefono: string
    tipoEntrega: 'delivery' | 'retiro'
    productos: Array<{ id: string; nombre: string; cantidad: number; precio: number }>
    costoEnvio?: number
    total: number
    metodoPago: 'efectivo' | 'transferencia' | 'tarjeta'
    observaciones?: string
    pagoConfirmado?: boolean
  }) => {
    const ahora = new Date()
    const id = `TEST-${Date.now().toString().slice(-6)}`
    const hora = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    const fecha = ahora.toISOString().split('T')[0]

    const pedido: Pedido = {
      id,
      cliente: config.cliente,
      telefono: config.telefono,
      tipoEntrega: config.tipoEntrega,
      direccion: config.direccion,
      coordenadas: {
        latitud: UBICACION_LOCAL.latitud + (Math.random() - 0.5) * 0.03,
        longitud: UBICACION_LOCAL.longitud + (Math.random() - 0.5) * 0.03,
      },
      productos: config.productos,
      costoEnvio: config.costoEnvio || 0,
      total: config.total,
      estado: 'nuevo',
      metodoPago: config.metodoPago,
      observaciones: config.observaciones || '',
      hora,
      fecha,
      created_at: ahora.toISOString(),
      pago_confirmado: config.pagoConfirmado !== undefined ? config.pagoConfirmado : config.metodoPago !== 'efectivo',
    }

    await agregarPedido(pedido)
  }

  const inyectarPedidoEstandar = async () => {
    setInyectando(true)
    try {
      await crearPedidoEstructurado({
        cliente: 'Carlos Rodríguez (Test)',
        telefono: '3834123456',
        direccion: 'Av. Güemes 850, B° Centro',
        tipoEntrega: 'delivery',
        productos: [
          { id: 'lomo-comp', nombre: 'Lomo Completo con Papas', cantidad: 2, precio: 14000 },
          { id: 'coca-15', nombre: 'Coca Cola 1.5L', cantidad: 1, precio: 3500 },
        ],
        costoEnvio: 2000,
        total: 33500,
        metodoPago: 'efectivo',
        observaciones: 'Por favor no tocar timbre, avisar por WhatsApp.',
      })
      agregarNotificacion('Pedido de prueba insertado correctamente en cocina y base de datos.', 'success')
    } catch (e: any) {
      registrarLogSistema('error', 'Inyector Pedido', e.message)
      agregarNotificacion(`Error al inyectar pedido: ${e.message}`, 'warning')
    } finally {
      setInyectando(false)
    }
  }

  const inyectarHoraPico = async () => {
    setInyectando(true)
    try {
      const opciones = [
        {
          cliente: 'Martín Benítez (Test)',
          direccion: 'Sarmiento 420',
          tipoEntrega: 'delivery' as const,
          productos: [{ id: 'burg-doble', nombre: 'Burger Doble Smash con Papas', cantidad: 2, precio: 12000 }],
          costoEnvio: 2000,
          total: 26000,
          metodoPago: 'efectivo' as const,
        },
        {
          cliente: 'Lucía Gómez (Test)',
          direccion: 'Retiro en Local',
          tipoEntrega: 'retiro' as const,
          productos: [{ id: 'papas-ched', nombre: 'Papas Especiales con Cheddar y Bacon', cantidad: 1, precio: 8500 }],
          costoEnvio: 0,
          total: 8500,
          metodoPago: 'transferencia' as const,
          pagoConfirmado: false, // Pago en el limbo intencional
        },
        {
          cliente: 'Esteban Morales (Test)',
          direccion: 'Chacabuco 1120',
          tipoEntrega: 'delivery' as const,
          productos: [
            { id: 'lomo-simp', nombre: 'Lomo Simple', cantidad: 1, precio: 11000 },
            { id: 'cerveza', nombre: 'Cerveza Patagonia 730ml', cantidad: 2, precio: 4500 },
          ],
          costoEnvio: 2500,
          total: 22500,
          metodoPago: 'tarjeta' as const,
        },
      ]

      for (let i = 0; i < 10; i++) {
        const plantilla = opciones[i % opciones.length]
        await crearPedidoEstructurado({
          ...plantilla,
          cliente: `${NOMBRES_MOCK[i % NOMBRES_MOCK.length]} (Test)`,
          telefono: `3834${Math.floor(100000 + Math.random() * 900000)}`,
        })
        await new Promise((r) => setTimeout(r, 120))
      }
      agregarNotificacion('Se han inyectado 10 pedidos variados en cocina con éxito.', 'success')
    } catch (e: any) {
      registrarLogSistema('error', 'Hora Pico', e.message)
      agregarNotificacion(`Error en hora pico: ${e.message}`, 'warning')
    } finally {
      setInyectando(false)
    }
  }

  const inyectarCasoExtremo = async (caso: 'nombre_largo' | 'muchas_notas' | 'importe_gigante') => {
    setInyectando(true)
    try {
      if (caso === 'nombre_largo') {
        await crearPedidoEstructurado({
          cliente: 'Maximiliano Estanislao de la Santísima Trinidad González y Asociados (Test)',
          telefono: '3834999999',
          direccion: 'Pasaje de los Artesanos del Bicentenario de la Independencia 1485, Piso 14, Departamento B, Escalera Derecha',
          tipoEntrega: 'delivery',
          productos: [{ id: 'combo-1', nombre: 'Combo Degustación Especial', cantidad: 1, precio: 15000 }],
          costoEnvio: 2500,
          total: 17500,
          metodoPago: 'efectivo',
          observaciones: 'Nombre extralargo para validar que el texto no rompa las tarjetas ni los encabezados.',
        })
      } else if (caso === 'muchas_notas') {
        await crearPedidoEstructurado({
          cliente: 'Valeria Instrucciones (Test)',
          telefono: '3834888888',
          direccion: 'Rivadavia 350',
          tipoEntrega: 'delivery',
          productos: [
            { id: 'lomo-custom', nombre: 'Lomo Personalizado con 12 Ajustes', cantidad: 2, precio: 16500 },
          ],
          costoEnvio: 2000,
          total: 35000,
          metodoPago: 'transferencia',
          pagoConfirmado: false,
          observaciones:
            'Sin mayonesa, extra queso cheddar fundido, papas muy crocantes, carne a punto medio, salsa tártara aparte en pote térmico, sin lechuga, sin tomate fresco, doble huevo bien cocido, pan ligeramente tostado, cubiertos descartables y tres sobrecitos de mostaza dulce.',
        })
      } else if (caso === 'importe_gigante') {
        const prods = Array.from({ length: 15 }).map((_, idx) => ({
          id: `catering-${idx}`,
          nombre: `Bandeja Evento Corporativo #${idx + 1}`,
          cantidad: 2,
          precio: 16500,
        }))
        await crearPedidoEstructurado({
          cliente: 'Empresa Constructora del Valle S.A. (Test)',
          telefono: '3834777777',
          direccion: 'Parque Industrial El Pantanillo, Nave Central',
          tipoEntrega: 'delivery',
          productos: prods,
          costoEnvio: 5000,
          total: 500000,
          metodoPago: 'transferencia',
          observaciones: 'Pedido corporativo gigante por $500.000 para probar formateo de totales y badge de pago.',
        })
      }
      agregarNotificacion('Caso extremo generado y enviado al tablero.', 'success')
    } catch (e: any) {
      registrarLogSistema('error', 'Caso Extremo', e.message)
      agregarNotificacion(`Error en caso extremo: ${e.message}`, 'warning')
    } finally {
      setInyectando(false)
    }
  }

  const limpiarPedidosDePrueba = async () => {
    const pedidosTest = pedidos.filter(
      (p) => p.id.startsWith('TEST-') || p.cliente.includes('(Test)')
    )
    if (pedidosTest.length === 0) {
      agregarNotificacion('No se encontraron pedidos de prueba activos para eliminar.', 'info')
      return
    }

    setLimpiandoTests(true)
    try {
      let count = 0
      for (const p of pedidosTest) {
        await eliminarPedido(p.id)
        count++
      }
      agregarNotificacion(`Se eliminaron ${count} pedidos de prueba del sistema.`, 'success')
    } catch (e: any) {
      registrarLogSistema('error', 'Limpieza Tests', e.message)
      agregarNotificacion(`Error al limpiar pruebas: ${e.message}`, 'warning')
    } finally {
      setLimpiandoTests(false)
    }
  }

  // ── 3. SIMULADOR DE CADETES & GPS VIRTUAL ─────────────────────────────────

  const toggleSimulacionGps = async () => {
    if (simulandoGps) {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current)
      setSimulandoGps(false)
      agregarNotificacion('Simulación de recorrido de cadete detenida.', 'info')
      return
    }

    if (!cadeteGpsSeleccionado) {
      agregarNotificacion('Seleccioná un cadete para iniciar la simulación.', 'warning')
      return
    }

    setSimulandoGps(true)
    agregarNotificacion('Simulación GPS en curso: enviando coordenadas hacia destino cada 2 segundos.', 'info')

    let step = 0
    const totalSteps = 25
    const latOrigen = UBICACION_LOCAL.latitud
    const lngOrigen = UBICACION_LOCAL.longitud
    const latDestino = UBICACION_LOCAL.latitud + 0.022
    const lngDestino = UBICACION_LOCAL.longitud + 0.015

    gpsIntervalRef.current = setInterval(async () => {
      step = (step + 1) % (totalSteps + 1)
      const ratio = step / totalSteps
      setGpsProgreso(Math.round(ratio * 100))

      const lat = latOrigen + (latDestino - latOrigen) * ratio + (Math.random() - 0.5) * 0.0004
      const lng = lngOrigen + (lngDestino - lngOrigen) * ratio + (Math.random() - 0.5) * 0.0004
      const velocidad = Math.floor(25 + Math.random() * 12)
      setGpsVelocidad(velocidad)

      try {
        await fetch('/api/public/ubicacion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer chefsy_expo_secure_track_99XQ',
          },
          body: JSON.stringify({
            cadeteId: cadeteGpsSeleccionado,
            lat,
            lng,
            speed: velocidad,
            heading: 45,
            batteryLevel: Math.max(10, 95 - step * 2),
            gps_activo: true,
          }),
        })
      } catch (err: any) {
        registrarLogSistema('warn', 'Simulador GPS', err.message || 'Error de red en GPS')
      }
    }, 2000)
  }

  useEffect(() => {
    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current)
    }
  }, [])

  const simularCadeteSinBateria = async () => {
    if (!cadeteGpsSeleccionado) {
      agregarNotificacion('Seleccioná un cadete.', 'warning')
      return
    }
    try {
      await fetch('/api/public/ubicacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer chefsy_expo_secure_track_99XQ',
        },
        body: JSON.stringify({
          cadeteId: cadeteGpsSeleccionado,
          lat: UBICACION_LOCAL.latitud,
          lng: UBICACION_LOCAL.longitud,
          speed: 0,
          heading: 0,
          batteryLevel: 4,
          gps_activo: false,
        }),
      })
      agregarNotificacion(`Señal de GPS apagada y batería al 4% enviada para ${cadeteGpsSeleccionado}.`, 'warning')
    } catch (e: any) {
      registrarLogSistema('error', 'GPS Batería', e.message)
      agregarNotificacion(`Error: ${e.message}`, 'warning')
    }
  }

  const ejecutarCalculoEnvio = () => {
    if (!direccionCalculo.trim()) {
      agregarNotificacion('Ingresá una dirección para calcular la tarifa.', 'warning')
      return
    }
    const hash = direccionCalculo.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const kmSimulado = Number(((hash % 45) / 10 + 0.8).toFixed(1))
    const costo = calcularCostoEnvio(kmSimulado)
    const zona = kmSimulado <= 1.5 ? 'Zona 1 (Centro)' : kmSimulado <= 3 ? 'Zona 2 (Intermedia)' : 'Zona 3 (Periferia)'

    setResultadoCalculo({
      distanciaKm: kmSimulado,
      costo,
      zona,
    })
  }

  // ── 4. DIAGNÓSTICO DE BACKEND, LOGS Y SALUD DE TABLAS ─────────────────────

  const escanearSaludTablas = async () => {
    setEscaneandoTablas(true)
    try {
      const res = await fetch('/api/admin/debug?accion=tablas')
      if (!res.ok) {
        throw new Error(`Error en endpoint de diagnóstico: HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data.tablas) {
        setTablasSalud(data.tablas)
        agregarNotificacion('Escaneo de tablas completado con éxito.', 'info')
      }
    } catch (e: any) {
      registrarLogSistema('error', 'Escáner Tablas', e.message)
      agregarNotificacion(`Fallo en escaneo: ${e.message}`, 'warning')
    } finally {
      setEscaneandoTablas(false)
    }
  }

  const forzarReconexionRealtime = () => {
    setEstadoWsLocal('cargando')
    window.dispatchEvent(new CustomEvent('chefsy:forzar-reconexion-realtime'))
    agregarNotificacion('Canal WebSocket reconectado y revalidado con éxito.', 'success')
    setTimeout(() => {
      setEstadoWsLocal('conectado')
    }, 800)
  }

  // ── 5. AUDITOR DE STOCK E INSUMOS (KARDEX) ───────────────────────────────

  const escanearStockNegativo = async () => {
    setEscaneandoStock(true)
    try {
      const insumos = await obtenerStockInsumos()
      const negativos = (insumos || []).filter((i) => (Number(i.stock_actual) || 0) < 0)
      setInsumosNegativos(negativos)
      if (negativos.length > 0) {
        agregarNotificacion(`Se detectaron ${negativos.length} insumos con stock negativo.`, 'warning')
      } else {
        agregarNotificacion('Escaneo finalizado: inventario íntegro sin insumos negativos.', 'success')
      }
    } catch (e: any) {
      registrarLogSistema('error', 'Auditor Stock', e.message)
      agregarNotificacion(`Error al escanear stock: ${e.message}`, 'warning')
    } finally {
      setEscaneandoStock(false)
    }
  }

  const ajustarStockNegativoACero = async () => {
    if (insumosNegativos.length === 0) return
    setAjustandoStock(true)
    try {
      for (const insumo of insumosNegativos) {
        const delta = Math.abs(Number(insumo.stock_actual) || 0)
        await fetch('/api/admin/stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accion: 'update_stock',
            payload: {
              id: insumo.id,
              stock_actual: 0,
              delta,
              tipo_movimiento: 'ajuste_manual',
              motivo: 'Ajuste de emergencia desde DevTools (corrección de stock negativo)',
            },
          }),
        })
      }
      agregarNotificacion(`Se ajustaron ${insumosNegativos.length} insumos negativos a 0.`, 'success')
      setInsumosNegativos([])
      await escanearStockNegativo()
    } catch (e: any) {
      registrarLogSistema('error', 'Ajuste Stock', e.message)
      agregarNotificacion(`Error al ajustar stock: ${e.message}`, 'warning')
    } finally {
      setAjustandoStock(false)
    }
  }

  const simularDescuentoReceta = async () => {
    try {
      const insumos = await obtenerStockInsumos()
      if (!insumos || insumos.length === 0) {
        agregarNotificacion('No hay insumos registrados para simular la receta.', 'warning')
        return
      }
      const insumoObjetivo = insumos[0]
      const stockAnterior = Number(insumoObjetivo.stock_actual) || 0

      await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'update_stock',
          payload: {
            id: insumoObjetivo.id,
            delta: -1,
            stock_actual: stockAnterior - 1,
            tipo_movimiento: 'venta',
            motivo: `Simulación de venta de 1 Burger desde DevTools (${insumoObjetivo.nombre})`,
          },
        }),
      })
      agregarNotificacion(`Descuento simulado (-1 ${insumoObjetivo.nombre}) registrado en Kardex.`, 'success')
    } catch (e: any) {
      registrarLogSistema('error', 'Simular Receta', e.message)
      agregarNotificacion(`Error al simular receta: ${e.message}`, 'warning')
    }
  }

  // ── 6. COMPROBADOR DE ARQUEO DE CAJA Y DISCREPANCIAS ──────────────────────

  const metricasCaja = useMemo(() => {
    const pedidosActivos = pedidos.filter((p) => p.estado !== 'cancelado')

    const totalEfectivo = pedidosActivos
      .filter((p) => p.metodoPago === 'efectivo')
      .reduce((sum, p) => sum + (Number(p.total) || 0), 0)

    const totalTransferencias = pedidosActivos
      .filter((p) => p.metodoPago === 'transferencia')
      .reduce((sum, p) => sum + (Number(p.total) || 0), 0)

    const totalTarjetas = pedidosActivos
      .filter((p) => p.metodoPago === 'tarjeta')
      .reduce((sum, p) => sum + (Number(p.total) || 0), 0)

    const totalVentas = totalEfectivo + totalTransferencias + totalTarjetas
    const cajaInicial = Number(estadoTurno?.cajaInicial) || 0
    const efectivoEsperado = cajaInicial + totalEfectivo

    const pedidosEnElLimbo = pedidosActivos.filter(
      (p) => (p.metodoPago === 'transferencia' || p.metodoPago === 'tarjeta') && !p.pago_confirmado
    )

    return {
      totalEfectivo,
      totalTransferencias,
      totalTarjetas,
      totalVentas,
      cajaInicial,
      efectivoEsperado,
      pedidosEnElLimbo,
    }
  }, [pedidos, estadoTurno])

  const confirmarPagoEnElLimbo = async (pedidoId: string) => {
    try {
      await marcarPagoConfirmado(pedidoId, true)
      agregarNotificacion(`Pago confirmado correctamente para el pedido #${pedidoId}.`, 'success')
    } catch (e: any) {
      registrarLogSistema('error', 'Confirmar Pago', e.message)
      agregarNotificacion(`Error al confirmar pago: ${e.message}`, 'warning')
    }
  }

  if (!abierto) return null

  const countTests = pedidos.filter((p) => p.id.startsWith('TEST-') || p.cliente.includes('(Test)')).length

  return (
    <div
      ref={modalRef}
      style={{
        transform: `translate3d(${posicion.x}px, ${posicion.y}px, 0)`,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999998,
      }}
      className="w-84 sm:w-[425px] bg-[#0f172a] text-slate-100 border border-white/15 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* ── Barra Superior Draggable ────────────────────────────────────────── */}
      <div
        onPointerDown={handlePointerDown}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-white/10 cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-slate-500" />
          <div className="flex items-center gap-1.5">
            <Wrench size={13} className="text-amber-400" />
            <span className="font-bold text-xs tracking-tight text-white">
              Herramientas de Testeo
            </span>
          </div>
          <span className="text-[10px] font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded font-bold">
            Ctrl + ,
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimizado(!minimizado)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
            title={minimizado ? 'Expandir' : 'Minimizar'}
          >
            {minimizado ? <Maximize2 size={12} /> : <Minus size={12} />}
          </button>
          <button
            type="button"
            onClick={() => {
              setAbierto(false)
              setSpamActivo(false)
            }}
            className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar panel (Ctrl + ,)"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Contenido de las pestañas ───────────────────────────────────────── */}
      {!minimizado && (
        <div>
          {/* Navegación por pestañas */}
          <div className="flex border-b border-white/10 bg-slate-950/60 p-1 gap-1 text-[11px] font-bold overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setTabActiva('notificaciones')}
              className={`flex-1 min-w-[58px] flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                tabActiva === 'notificaciones' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell size={11} />
              <span>Notis</span>
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('pedidos')}
              className={`flex-1 min-w-[58px] flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all cursor-pointer relative ${
                tabActiva === 'pedidos' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package size={11} />
              <span>Pedidos</span>
              {countTests > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1 right-1" />}
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('cadetes')}
              className={`flex-1 min-w-[58px] flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                tabActiva === 'cadetes' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bike size={11} />
              <span>Cadetes</span>
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('salud')}
              className={`flex-1 min-w-[58px] flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                tabActiva === 'salud' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity size={11} />
              <span>Salud</span>
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('stock')}
              className={`flex-1 min-w-[58px] flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all cursor-pointer relative ${
                tabActiva === 'stock' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database size={11} />
              <span>Stock</span>
              {insumosNegativos.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute top-1 right-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('caja')}
              className={`flex-1 min-w-[58px] flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all cursor-pointer relative ${
                tabActiva === 'caja' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <DollarSign size={11} />
              <span>Caja</span>
              {metricasCaja.pedidosEnElLimbo.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1 right-1" />
              )}
            </button>
          </div>

          <div className="p-3.5 max-h-[72vh] overflow-y-auto no-scrollbar space-y-3.5 text-xs">
            {/* ── TAB 1: NOTIFICACIONES ────────────────────────────────────────── */}
            {tabActiva === 'notificaciones' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-950/60 border border-white/5 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        notificaciones.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    <span className="text-slate-400 font-medium">Activas en pantalla:</span>
                    <span className="font-mono font-bold text-white text-sm">{notificaciones.length}</span>
                  </div>
                  {notificaciones.length > 0 && (
                    <button
                      type="button"
                      onClick={eliminarTodasNotificaciones}
                      className="flex items-center gap-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer"
                    >
                      <Trash2 size={11} />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Disparadores individuales
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => dispararNotificacion('nuevo')}
                      className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2 rounded-xl text-left transition-all active:scale-95 cursor-pointer"
                    >
                      <Bell size={13} className="text-sky-400 shrink-0" />
                      <span className="font-semibold truncate">Pedido Nuevo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => dispararNotificacion('entregado')}
                      className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2 rounded-xl text-left transition-all active:scale-95 cursor-pointer"
                    >
                      <Bike size={13} className="text-emerald-400 shrink-0" />
                      <span className="font-semibold truncate">Entregado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => dispararNotificacion('exito')}
                      className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2 rounded-xl text-left transition-all active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 size={13} className="text-teal-400 shrink-0" />
                      <span className="font-semibold truncate">Éxito General</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => dispararNotificacion('warning')}
                      className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2 rounded-xl text-left transition-all active:scale-95 cursor-pointer"
                    >
                      <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                      <span className="font-semibold truncate">Advertencia</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => dispararNotificacion('deshacer')}
                      className="col-span-2 flex items-center justify-center gap-2 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 p-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span className="font-semibold">Con botón Deshacer</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Ráfagas de estrés (sin saturación de audio)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => dispararRafaga(5)}
                      className="flex items-center justify-center gap-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 py-1.5 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <Zap size={12} /> +5
                    </button>
                    <button
                      type="button"
                      onClick={() => dispararRafaga(10)}
                      className="flex items-center justify-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 py-1.5 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <Zap size={12} /> +10
                    </button>
                    <button
                      type="button"
                      onClick={() => dispararRafaga(25)}
                      className="flex items-center justify-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 py-1.5 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <Zap size={12} /> +25
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSpamActivo(!spamActivo)}
                    className={`w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl font-bold transition-all cursor-pointer active:scale-98 ${
                      spamActivo ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {spamActivo ? (
                      <>
                        <Square size={13} fill="currentColor" />
                        <span>Detener Spam Continuo</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} fill="currentColor" />
                        <span>Iniciar Spam Continuo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB 2: PEDIDOS & CASOS EXTREMOS ──────────────────────────────── */}
            {tabActiva === 'pedidos' && (
              <div className="space-y-3">
                <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-emerald-400" />
                    <span className="text-slate-400 font-medium">Pedidos de test activos:</span>
                    <span className="font-mono font-bold text-white text-sm">{countTests}</span>
                  </div>
                  {countTests > 0 && (
                    <button
                      type="button"
                      disabled={limpiandoTests}
                      onClick={limpiarPedidosDePrueba}
                      className="flex items-center gap-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer"
                    >
                      <Trash2 size={11} />
                      <span>{limpiandoTests ? 'Limpiando...' : 'Borrar Tests'}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Inyección en Base de Datos Real
                  </span>
                  <button
                    type="button"
                    disabled={inyectando}
                    onClick={inyectarPedidoEstandar}
                    className="w-full flex items-center justify-between bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 p-2.5 rounded-xl text-left transition-all active:scale-98 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-100">Crear Pedido Estándar</p>
                        <p className="text-[10px] text-slate-400">2 Lomos + Gaseosa + Delivery ($33.500)</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                      1 Clic
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={inyectando}
                    onClick={inyectarHoraPico}
                    className="w-full flex items-center justify-between bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 p-2.5 rounded-xl text-left transition-all active:scale-98 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Flame size={14} className="text-amber-400 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-100">Inyector de Hora Pico</p>
                        <p className="text-[10px] text-slate-400">10 pedidos variados simultáneos en cocina</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                      +10
                    </span>
                  </button>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Generador de Casos Extremos
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      disabled={inyectando}
                      onClick={() => inyectarCasoExtremo('nombre_largo')}
                      className="flex items-center justify-between bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2 rounded-xl text-left transition-all active:scale-98 cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">Nombre y Dirección Extralarga</p>
                        <p className="text-[10px] text-slate-400">50 letras y dirección de 3 renglones</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Layout</span>
                    </button>

                    <button
                      type="button"
                      disabled={inyectando}
                      onClick={() => inyectarCasoExtremo('muchas_notas')}
                      className="flex items-center justify-between bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2 rounded-xl text-left transition-all active:scale-98 cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">12 Modificaciones de Cocina</p>
                        <p className="text-[10px] text-slate-400">Sin sal, tártara aparte, papas crocantes...</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Comandas</span>
                    </button>

                    <button
                      type="button"
                      disabled={inyectando}
                      onClick={() => inyectarCasoExtremo('importe_gigante')}
                      className="flex items-center justify-between bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2 rounded-xl text-left transition-all active:scale-98 cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">Pedido Gigante ($500.000)</p>
                        <p className="text-[10px] text-slate-400">Catering con 15 ítems y total masivo</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Totales</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: CADETES & GPS VIRTUAL ─────────────────────────────────── */}
            {tabActiva === 'cadetes' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Seleccionar Cadete para Test
                  </span>
                  <select
                    value={cadeteGpsSeleccionado}
                    onChange={(e) => setCadeteGpsSeleccionado(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="">Seleccionar cadete...</option>
                    {cadetes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Simulador de Cadete en Ruta</span>
                    {simulandoGps && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {gpsVelocidad} km/h ({gpsProgreso}%)
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Envía coordenadas reales a la API cada 2 segundos simulando que el cadete viaja desde el local al cliente.
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={toggleSimulacionGps}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                        simulandoGps ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {simulandoGps ? (
                        <>
                          <Square size={13} fill="currentColor" /> Detener Ruta
                        </>
                      ) : (
                        <>
                          <Play size={13} fill="currentColor" /> Iniciar Ruta en Vivo
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={simularCadeteSinBateria}
                      className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer"
                    >
                      <BatteryCharging size={13} />
                      <span>Batería 4%</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Calculador de Tarifas de Envío al Vuelo
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Ej: Av. San Martín 450"
                      value={direccionCalculo}
                      onChange={(e) => setDireccionCalculo(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && ejecutarCalculoEnvio()}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={ejecutarCalculoEnvio}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-bold border border-white/10 transition-all cursor-pointer"
                    >
                      Calcular
                    </button>
                  </div>

                  {resultadoCalculo && (
                    <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-200">{resultadoCalculo.zona}</p>
                        <p className="text-[10px] text-slate-400">{resultadoCalculo.distanciaKm} km desde el local</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ${resultadoCalculo.costo.toLocaleString('es-AR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 4: SALUD & DIAGNÓSTICO DE BACKEND ─────────────────────────── */}
            {tabActiva === 'salud' && (
              <div className="space-y-3">
                {/* WebSocket Realtime */}
                <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        estadoWsLocal === 'conectado'
                          ? 'bg-emerald-400 animate-pulse'
                          : estadoWsLocal === 'cargando'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <p className="font-bold text-slate-200">WebSocket Realtime</p>
                      <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                        {estadoWsLocal === 'conectado' ? 'Canal en Vivo Conectado' : estadoWsLocal}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={forzarReconexionRealtime}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer"
                  >
                    <RefreshCw size={11} />
                    <span>Forzar Reconexión</span>
                  </button>
                </div>

                {/* Escáner de Tablas de Supabase */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Salud de Tablas de Supabase
                    </span>
                    <button
                      type="button"
                      disabled={escaneandoTablas}
                      onClick={escanearSaludTablas}
                      className="flex items-center gap-1 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer"
                    >
                      <RefreshCw size={10} className={escaneandoTablas ? 'animate-spin' : ''} />
                      <span>{escaneandoTablas ? 'Escaneando...' : 'Escanear Tablas'}</span>
                    </button>
                  </div>

                  {tablasSalud.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1">
                      {tablasSalud.map((t) => (
                        <div
                          key={t.id}
                          className="bg-slate-950/60 border border-white/5 px-2.5 py-1.5 rounded-xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                t.ok ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                              }`}
                            />
                            <span className="font-semibold text-slate-200 truncate">{t.nombre}</span>
                            {!t.ok && t.error && (
                              <span className="text-[10px] text-rose-400 truncate max-w-[140px]" title={t.error}>
                                ({t.error})
                              </span>
                            )}
                          </div>
                          <span
                            className={`font-mono text-[11px] font-bold shrink-0 ${
                              t.latenciaMs < 50
                                ? 'text-emerald-400'
                                : t.latenciaMs < 120
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {t.latenciaMs} ms
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl text-center text-slate-500 text-[11px]">
                      Presioná "Escanear Tablas" para medir la latencia individual en Supabase.
                    </div>
                  )}
                </div>

                {/* Visor de Últimos Errores del Sistema */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Últimos Errores del Sistema (Log en Vivo)
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          registrarLogSistema('error', 'Test DevTools', 'Error de prueba forzado manualmente')
                        }
                        className="text-[10px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
                      >
                        Simular Error
                      </button>
                      {logsSistema.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            limpiarLogsSistema()
                            setLogsSistema([])
                          }}
                          className="text-[10px] text-rose-400 hover:text-rose-300 px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-black/60 border border-white/10 rounded-xl p-2 max-h-32 overflow-y-auto no-scrollbar font-mono text-[10.5px] space-y-1">
                    {logsSistema.length > 0 ? (
                      logsSistema.map((log) => (
                        <div key={log.id} className="leading-tight text-slate-300 flex items-start gap-1.5">
                          <span className="text-slate-500 shrink-0">[{log.hora}]</span>
                          <span
                            className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                              log.nivel === 'error'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {log.modulo}
                          </span>
                          <span className="truncate text-slate-200">{log.mensaje}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-600 text-center py-2">
                        Sin errores registrados en esta sesión. Todo estable.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: AUDITOR DE STOCK E INSUMOS (KARDEX) ───────────────────── */}
            {tabActiva === 'stock' && (
              <div className="space-y-3">
                {/* Detector de Negativos */}
                <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        size={14}
                        className={insumosNegativos.length > 0 ? 'text-rose-400' : 'text-emerald-400'}
                      />
                      <span className="font-bold text-slate-200">Detector de Stock Negativo</span>
                    </div>
                    <button
                      type="button"
                      disabled={escaneandoStock}
                      onClick={escanearStockNegativo}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      <RefreshCw size={10} className={escaneandoStock ? 'animate-spin' : ''} />
                      <span>{escaneandoStock ? 'Escaneando...' : 'Escanear'}</span>
                    </button>
                  </div>

                  {insumosNegativos.length > 0 ? (
                    <div className="space-y-2">
                      <div className="bg-rose-950/30 border border-rose-500/30 p-2 rounded-lg space-y-1">
                        <p className="text-[10px] font-bold text-rose-300">
                          Se detectaron {insumosNegativos.length} insumos con valores por debajo de 0:
                        </p>
                        <div className="max-h-24 overflow-y-auto no-scrollbar space-y-0.5">
                          {insumosNegativos.map((i) => (
                            <div key={i.id} className="flex items-center justify-between text-[11px] text-slate-300">
                              <span className="truncate">{i.nombre}</span>
                              <span className="font-mono font-bold text-rose-400">
                                {i.stock_actual} {i.unidad_medida}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={ajustandoStock}
                        onClick={ajustarStockNegativoACero}
                        className="w-full flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-98"
                      >
                        <Wrench size={12} />
                        <span>{ajustandoStock ? 'Ajustando...' : 'Ajustar Stock Negativo a Cero'}</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Presioná "Escanear" para auditar el inventario y detectar insumos en negativo.
                    </p>
                  )}
                </div>

                {/* Simulador de Descuento de Receta */}
                <div className="space-y-1.5 pt-1 border-t border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Simulador de Deducción en Kardex
                  </span>
                  <button
                    type="button"
                    onClick={simularDescuentoReceta}
                    className="w-full flex items-center justify-between bg-slate-800/80 hover:bg-slate-700 border border-white/5 p-2.5 rounded-xl text-left transition-all active:scale-98 cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-200">Simular Venta de 1 Burger</p>
                      <p className="text-[10px] text-slate-400">Descuenta 1 unidad en Kardex y asienta auditoría</p>
                    </div>
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold">
                      Probar
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB 6: ARQUEO DE CAJA & PAGOS EN EL LIMBO ────────────────────── */}
            {tabActiva === 'caja' && (
              <div className="space-y-3">
                {/* Resumen del Turno */}
                <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Balances del Turno Actual</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {estadoTurno?.activo ? 'Turno Abierto' : 'Turno Cerrado'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Total Efectivo</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ${metricasCaja.totalEfectivo.toLocaleString('es-AR')}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Total Transferencias</span>
                      <span className="font-mono font-bold text-sky-400 text-sm">
                        ${metricasCaja.totalTransferencias.toLocaleString('es-AR')}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Total Tarjetas</span>
                      <span className="font-mono font-bold text-purple-400 text-sm">
                        ${metricasCaja.totalTarjetas.toLocaleString('es-AR')}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Efectivo en Cajón</span>
                      <span className="font-mono font-bold text-white text-sm">
                        ${metricasCaja.efectivoEsperado.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detector de Pagos en el Limbo */}
                <div className="space-y-1.5 pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pedidos con Pago en el Limbo ({metricasCaja.pedidosEnElLimbo.length})
                    </span>
                  </div>

                  {metricasCaja.pedidosEnElLimbo.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                      {metricasCaja.pedidosEnElLimbo.map((p) => (
                        <div
                          key={p.id}
                          className="bg-amber-950/30 border border-amber-500/30 p-2 rounded-xl flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-200 text-xs truncate">
                              #{p.id.slice(-4)} - {p.cliente}
                            </p>
                            <p className="text-[10px] text-amber-300/90 font-mono">
                              ${p.total.toLocaleString('es-AR')} ({p.metodoPago})
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => confirmarPagoEnElLimbo(p.id)}
                            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 active:scale-95"
                          >
                            <Check size={11} strokeWidth={3} />
                            <span>Confirmar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-950/40 border border-white/5 p-2.5 rounded-xl text-center text-slate-500 text-[11px]">
                      Todos los pagos electrónicos del turno están confirmados.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-slate-900 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
            <span>Arrastrá desde la barra superior</span>
            <span className="font-mono">chefsy-diagnostic-suite</span>
          </div>
        </div>
      )}
    </div>
  )
}
