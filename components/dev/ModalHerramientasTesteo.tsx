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
  Compass,
  Activity,
  Store,
  Layers,
  Flame,
  ShieldCheck,
  BatteryCharging,
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  ExternalLink,
  MapPin,
  Clock,
  DollarSign,
  UserCheck,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  usarTemaNotificacion,
  reproducirSonidoCampanaCocina,
  reproducirSonidoEntregaExitosa,
  reproducirSonidoNotificacion,
} from '@/contexto/TemaNotificacionContexto'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { Pedido, EstadoPedido } from '@/tipos'
import { UBICACION_LOCAL, calcularCostoEnvio, calcularDistanciaKm } from '@/lib/ubicacion'

type TabDevTools = 'notificaciones' | 'pedidos' | 'cadetes' | 'sistema' | 'tienda'

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

  // Estados específicos de herramientas
  const [spamActivo, setSpamActivo] = useState(false)
  const [inyectando, setInyectando] = useState(false)
  const [limpiandoTests, setLimpiandoTests] = useState(false)

  // GPS Simulado
  const [cadeteGpsSeleccionado, setCadeteGpsSeleccionado] = useState<string>('')
  const [simulandoGps, setSimulandoGps] = useState(false)
  const [gpsProgreso, setGpsProgreso] = useState<number>(0)
  const [gpsVelocidad, setGpsVelocidad] = useState<number>(28)
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Calculador de Envíos
  const [direccionCalculo, setDireccionCalculo] = useState('')
  const [resultadoCalculo, setResultadoCalculo] = useState<{
    distanciaKm: number
    costo: number
    zona: string
  } | null>(null)

  // Salud y Ping de Supabase
  const [pingMs, setPingMs] = useState<number | null>(null)
  const [midiendoPing, setMidiendoPing] = useState(false)
  const [simulandoOffline, setSimulandoOffline] = useState(false)

  // Banners Tienda V2
  const [bannerDesktopUrl, setBannerDesktopUrl] = useState('')
  const [bannerMobileUrl, setBannerMobileUrl] = useState('')

  // Cargar estado inicial y atajo
  useEffect(() => {
    try {
      const posGuardada = localStorage.getItem('chefsy_devtools_pos')
      if (posGuardada) {
        const parsed = JSON.parse(posGuardada)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const x = Math.max(10, Math.min(window.innerWidth - 380, parsed.x))
          const y = Math.max(10, Math.min(window.innerHeight - 200, parsed.y))
          setPosicion({ x, y })
        }
      }
      const estadoGuardado = localStorage.getItem('chefsy_devtools_abierto')
      if (estadoGuardado === 'true') {
        setAbierto(true)
      }
      const tabGuardada = localStorage.getItem('chefsy_devtools_tab') as TabDevTools
      if (tabGuardada) {
        setTabActiva(tabGuardada)
      }
    } catch {}
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

  // Auto-seleccionar primer cadete si está disponible
  useEffect(() => {
    if (!cadeteGpsSeleccionado && cadetes && cadetes.length > 0) {
      setCadeteGpsSeleccionado(cadetes[0].id)
    }
  }, [cadetes, cadeteGpsSeleccionado])

  // Arrastre con Pointer Events
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
        Math.min(window.innerWidth - (modalRef.current?.offsetWidth || 380) - 10, arrastreRef.current.posXInicial + dx)
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

  // Spam continuo
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

  const crearPedidoEstructurado = async (
    config: {
      cliente: string
      direccion: string
      telefono: string
      tipoEntrega: 'delivery' | 'retiro'
      productos: Array<{ id: string; nombre: string; cantidad: number; precio: number }>
      costoEnvio?: number
      total: number
      metodoPago: 'efectivo' | 'transferencia' | 'tarjeta'
      observaciones?: string
    }
  ) => {
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
      pago_confirmado: config.metodoPago !== 'efectivo',
    }

    await agregarPedido(pedido)
  }

  // Inyectar pedido estándar
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
      agregarNotificacion(`Error al inyectar pedido: ${e.message}`, 'warning')
    } finally {
      setInyectando(false)
    }
  }

  // Inyector de Hora Pico (10 Pedidos)
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
      agregarNotificacion(`Error en hora pico: ${e.message}`, 'warning')
    } finally {
      setInyectando(false)
    }
  }

  // Casos Extremos (Edge Cases)
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
      agregarNotificacion(`Error en caso extremo: ${e.message}`, 'warning')
    } finally {
      setInyectando(false)
    }
  }

  // Eliminar todos los pedidos de test
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
    // Coordenadas origen (local) y destino (2.5 km al norte)
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
      } catch (err) {
        console.warn('[Simulador GPS] Error al enviar coordenadas:', err)
      }
    }, 2000)
  }

  // Detener intervalo al desmontar
  useEffect(() => {
    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current)
    }
  }, [])

  // Simular corte de batería / señal baja
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
      agregarNotificacion(`Error: ${e.message}`, 'warning')
    }
  }

  // Calculador de envíos al vuelo
  const ejecutarCalculoEnvio = () => {
    if (!direccionCalculo.trim()) {
      agregarNotificacion('Ingresá una dirección para calcular la tarifa.', 'warning')
      return
    }
    // Simulación precisa basada en distancia Catamarca
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

  // ── 4. TURNOS, SALUD & SISTEMA ────────────────────────────────────────────

  const cambiarEstadoTurno = async (activo: boolean, tipoTurno: 'noche' | 'mediodia' = 'noche') => {
    try {
      const res = await fetch('/api/admin/turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo,
          cajaInicial: activo ? 10000 : 0,
          fechaInicio: activo ? new Date().toISOString() : null,
          tipoTurno,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al actualizar el turno')
      }
      agregarNotificacion(
        activo ? `Turno de ${tipoTurno} abierto con éxito ($10.000 caja inicial).` : 'Turno cerrado correctamente.',
        'success'
      )
    } catch (e: any) {
      agregarNotificacion(`Error de turno: ${e.message}`, 'warning')
    }
  }

  const medirPingSupabase = async () => {
    setMidiendoPing(true)
    const inicio = performance.now()
    try {
      const res = await fetch('/api/admin/turno', { method: 'GET', cache: 'no-store' })
      const delta = Math.round(performance.now() - inicio)
      if (res.ok) {
        setPingMs(delta)
        agregarNotificacion(`Latencia de Supabase: ${delta} ms (Conexión óptima).`, 'info')
      } else {
        setPingMs(delta)
        agregarNotificacion(`Respuesta con código ${res.status} en ${delta} ms.`, 'warning')
      }
    } catch {
      setPingMs(null)
      agregarNotificacion('Fallo en la prueba de conexión a la base de datos.', 'warning')
    } finally {
      setMidiendoPing(false)
    }
  }

  // Inspector de Pedidos Fantasma
  const pedidosFantasma = useMemo(() => {
    const cadetesIds = new Set(cadetes.map((c) => c.id.toLowerCase()))
    return pedidos.filter((p) => {
      if (p.estado === 'en_camino' && !p.cadete_id) return true
      if (p.cadete_id && !cadetesIds.has(p.cadete_id.toLowerCase())) return true
      return false
    })
  }, [pedidos, cadetes])

  const limpiarCacheNuclear = () => {
    try {
      localStorage.removeItem('chefsy_pedidos_cache')
      localStorage.removeItem('chefsy-offline-queue')
      localStorage.removeItem('chefsy_admin_sesion_cache')
      agregarNotificacion('Caché local y colas reseteadas con éxito. Recargando página...', 'success')
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch {
      window.location.reload()
    }
  }

  // ── 5. TIENDA V2 & BANNERS EN VIVO ────────────────────────────────────────

  const aplicarBannersTienda = () => {
    if (!bannerDesktopUrl.trim() && !bannerMobileUrl.trim()) {
      agregarNotificacion('Ingresá al menos una URL de imagen para el banner.', 'warning')
      return
    }

    try {
      const nuevaPromo = {
        id: `promo-test-${Date.now()}`,
        titulo: 'Banner de Prueba V2',
        imagenUrl: bannerDesktopUrl.trim() || '/burger-loca.webp',
        imagenUrlMobile: bannerMobileUrl.trim() || bannerDesktopUrl.trim() || '/burger-loca.webp',
        categoriaId: 'burgers',
      }

      const promosActualesStr = localStorage.getItem('chefsy_tienda_v2_promos')
      const promosActuales = promosActualesStr ? JSON.parse(promosActualesStr) : []
      const actualizadas = [nuevaPromo, ...promosActuales]

      localStorage.setItem('chefsy_tienda_v2_promos', JSON.stringify(actualizadas))
      window.dispatchEvent(new CustomEvent('chefsy:promos-actualizadas'))

      agregarNotificacion('Banner inyectado con éxito en Tienda V2.', 'success')
    } catch (e: any) {
      agregarNotificacion(`Error al inyectar banner: ${e.message}`, 'warning')
    }
  }

  const restaurarBannersPorDefecto = () => {
    localStorage.removeItem('chefsy_tienda_v2_promos')
    window.dispatchEvent(new CustomEvent('chefsy:promos-actualizadas'))
    setBannerDesktopUrl('')
    setBannerMobileUrl('')
    agregarNotificacion('Banners de la Tienda V2 restaurados a los originales.', 'info')
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
      className="w-84 sm:w-[410px] bg-[#0f172a] text-slate-100 border border-white/15 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150"
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
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
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
            className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-white/10 transition-colors"
            title="Cerrar panel (Ctrl + ,)"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Contenido Completo ──────────────────────────────────────────────── */}
      {!minimizado && (
        <div>
          {/* Navegación por pestañas */}
          <div className="flex border-b border-white/10 bg-slate-950/60 p-1 gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setTabActiva('notificaciones')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                tabActiva === 'notificaciones'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Bell size={12} />
              <span>Notis</span>
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('pedidos')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all relative ${
                tabActiva === 'pedidos'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Package size={12} />
              <span>Pedidos</span>
              {countTests > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1 right-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('cadetes')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                tabActiva === 'cadetes'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Bike size={12} />
              <span>Cadetes</span>
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('sistema')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                tabActiva === 'sistema'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Activity size={12} />
              <span>Sistema</span>
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('tienda')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                tabActiva === 'tienda'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Store size={12} />
              <span>Tienda V2</span>
            </button>
          </div>

          <div className="p-3.5 max-h-[70vh] overflow-y-auto no-scrollbar space-y-3.5 text-xs">
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
                      spamActivo
                        ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
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
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="">Seleccionar cadete...</option>
                    {cadetes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recorrido Virtual */}
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
                        simulandoGps
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
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
                      title="Simula batería al 4% y corte de señal"
                    >
                      <BatteryCharging size={13} />
                      <span>Batería 4%</span>
                    </button>
                  </div>
                </div>

                {/* Calculador de Tarifas al Vuelo */}
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
                    <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
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

            {/* ── TAB 4: SISTEMA, TURNOS & SALUD ───────────────────────────────── */}
            {tabActiva === 'sistema' && (
              <div className="space-y-3">
                {/* Control de Turno */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Simulador de Apertura / Cierre de Turno
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => cambiarEstadoTurno(true, 'noche')}
                      className="bg-slate-800 hover:bg-slate-700 border border-white/5 py-2 px-1 rounded-xl text-center font-bold text-slate-200 transition-all cursor-pointer"
                    >
                      Turno Noche
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiarEstadoTurno(true, 'mediodia')}
                      className="bg-slate-800 hover:bg-slate-700 border border-white/5 py-2 px-1 rounded-xl text-center font-bold text-slate-200 transition-all cursor-pointer"
                    >
                      Turno Mediodía
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiarEstadoTurno(false)}
                      className="bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 py-2 px-1 rounded-xl text-center font-bold text-rose-300 transition-all cursor-pointer"
                    >
                      Cerrar Turno
                    </button>
                  </div>
                </div>

                {/* Monitor de Latencia Supabase */}
                <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-sky-400" />
                    <div>
                      <p className="font-bold text-slate-200">Salud de Supabase</p>
                      <p className="text-[10px] text-slate-400">
                        {pingMs !== null ? `Latencia: ${pingMs} ms` : 'Sin medir'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={midiendoPing}
                    onClick={medirPingSupabase}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer"
                  >
                    <RefreshCw size={11} className={midiendoPing ? 'animate-spin' : ''} />
                    <span>Test Ping</span>
                  </button>
                </div>

                {/* Inspector de Pedidos Fantasma */}
                <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className={pedidosFantasma.length > 0 ? 'text-amber-400' : 'text-emerald-400'} />
                    <div>
                      <p className="font-bold text-slate-200">Inspector de Inconsistencias</p>
                      <p className="text-[10px] text-slate-400">
                        {pedidosFantasma.length > 0
                          ? `${pedidosFantasma.length} pedidos con anomalías`
                          : '0 pedidos fantasma detectados'}
                      </p>
                    </div>
                  </div>
                  {pedidosFantasma.length > 0 && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded">
                      Revisar
                    </span>
                  )}
                </div>

                {/* Reset Nuclear */}
                <div className="pt-2 border-t border-white/10 flex gap-2">
                  <button
                    type="button"
                    onClick={limpiarCacheNuclear}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 py-2 rounded-xl font-bold transition-all cursor-pointer active:scale-95"
                  >
                    <Trash2 size={13} />
                    <span>Limpiar Caché Local</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB 5: TIENDA V2 & BANNERS ───────────────────────────────────── */}
            {tabActiva === 'tienda' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Inyector de Banners en Vivo (Tienda V2)
                  </span>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="URL Banner Desktop (horizontal)..."
                      value={bannerDesktopUrl}
                      onChange={(e) => setBannerDesktopUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="URL Banner Mobile (opcional 9:16)..."
                      value={bannerMobileUrl}
                      onChange={(e) => setBannerMobileUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={aplicarBannersTienda}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-xl font-bold transition-all cursor-pointer"
                    >
                      Aplicar a Tienda V2
                    </button>
                    <button
                      type="button"
                      onClick={restaurarBannersPorDefecto}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl font-bold border border-white/10 transition-all cursor-pointer"
                    >
                      Restaurar
                    </button>
                  </div>
                </div>

                {/* Acceso Rápido por Módulos (Impersonator) */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Acceso Rápido por Rol y Módulo
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => router.push('/pedidos')}
                      className="bg-slate-800 hover:bg-slate-700 border border-white/5 py-2 rounded-xl text-center font-bold text-slate-200 transition-all cursor-pointer"
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/cadeteria')}
                      className="bg-slate-800 hover:bg-slate-700 border border-white/5 py-2 rounded-xl text-center font-bold text-slate-200 transition-all cursor-pointer"
                    >
                      Cadetería
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/tienda-v2')}
                      className="bg-slate-800 hover:bg-slate-700 border border-white/5 py-2 rounded-xl text-center font-bold text-slate-200 transition-all cursor-pointer"
                    >
                      Tienda V2
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-slate-900 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
            <span>Arrastrá desde la barra superior</span>
            <span className="font-mono">chefsy-testing-suite</span>
          </div>
        </div>
      )}
    </div>
  )
}
