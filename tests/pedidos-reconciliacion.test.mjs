import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STORAGE_KEY_OFFLINE_QUEUE,
  VENTANA_LOCK_LOCAL_MS,
  MAX_ANTIGUEDAD_COLA_OFFLINE_MS,
  encolarAccionOffline,
  leerColaOffline,
  reconciliarPedidosConEstadoLocal,
} from '../lib/pedidos-reconciliacion.ts'

function crearPedido(id, overrides = {}) {
  return {
    id,
    cliente: 'Cliente Test',
    telefono: '3834000000',
    tipoEntrega: 'delivery',
    direccion: 'Av. Belgrano 123',
    productos: [{ id: 'p1', nombre: 'Lomo', cantidad: 1, precio: 10000 }],
    total: 11500,
    costoEnvio: 1500,
    estado: 'en_cocina',
    metodoPago: 'efectivo',
    hora: '21:30',
    fecha: '2026-11-24',
    created_at: '2026-11-25T00:30:00.000Z',
    ...overrides,
  }
}

function crearStorageMemoria(inicial = {}) {
  const mapa = new Map(Object.entries(inicial))
  return {
    getItem(k) {
      return mapa.has(k) ? mapa.get(k) : null
    },
    setItem(k, v) {
      mapa.set(k, String(v))
    },
    removeItem(k) {
      mapa.delete(k)
    },
  }
}

test('conserva un pedido recién creado aunque prevPedidosRef todavía no se haya actualizado (carrera Realtime)', () => {
  const ahora = 1_700_000_000_000
  const pedidoNuevo = crearPedido('ped-nuevo-1', { cliente: 'Agus' })
  const pedidoViejo = crearPedido('ped-viejo-1', { cliente: 'Lautaro' })

  const cambiosMap = {
    'ped-nuevo-1': {
      timestamp: ahora - 500,
      cambios: { ...pedidoNuevo },
      pedidoCompleto: pedidoNuevo,
      enVuelo: false,
    },
  }

  const resultado = reconciliarPedidosConEstadoLocal({
    pedidosServidor: [pedidoViejo],
    pedidosLocalesPrevios: [pedidoViejo], // simula prevPedidosRef atrasado por 1 render
    cambiosMap,
    eliminadosMap: {},
    colaOffline: [],
    ahora,
  })

  assert.deepEqual(
    resultado.map((p) => p.id),
    ['ped-nuevo-1', 'ped-viejo-1']
  )
})

test('conserva un pedido mientras el POST sigue en vuelo más allá de la ventana anterior de 6 segundos', () => {
  const ahora = 1_700_000_000_000
  const pedidoNuevo = crearPedido('ped-lento-1')

  const cambiosMap = {
    'ped-lento-1': {
      timestamp: ahora - 15_000, // 15s (antes se borraba a los 6s!)
      cambios: { ...pedidoNuevo },
      pedidoCompleto: pedidoNuevo,
      enVuelo: true,
    },
  }

  const resultado = reconciliarPedidosConEstadoLocal({
    pedidosServidor: [],
    pedidosLocalesPrevios: [],
    cambiosMap,
    eliminadosMap: {},
    colaOffline: [],
    ahora,
  })

  assert.equal(resultado.length, 1)
  assert.equal(resultado[0].id, 'ped-lento-1')
})

test('protege pedidos encolados en chefsy-offline-queue para que SWR no los borre de la pantalla', () => {
  const ahora = 1_700_000_000_000
  const pedidoOffline = crearPedido('ped-offline-1', { cliente: 'Franco' })
  const storage = crearStorageMemoria()

  const cola = encolarAccionOffline(storage, { accion: 'crear', pedido: pedidoOffline }, ahora - 120_000)

  const resultado = reconciliarPedidosConEstadoLocal({
    pedidosServidor: [crearPedido('ped-db-1')],
    pedidosLocalesPrevios: [],
    cambiosMap: {}, // el lock temporal ya expiró hace rato
    eliminadosMap: {},
    colaOffline: cola,
    ahora,
  })

  assert.deepEqual(
    resultado.map((p) => p.id),
    ['ped-offline-1', 'ped-db-1']
  )
})

test('deduplica creaciones en la cola offline por pedido.id y descarta acciones vencidas (>6h)', () => {
  const ahora = 1_700_000_000_000
  const storage = crearStorageMemoria({
    [STORAGE_KEY_OFFLINE_QUEUE]: JSON.stringify([
      {
        payload: { accion: 'crear', pedido: crearPedido('ped-ayer') },
        timestamp: ahora - MAX_ANTIGUEDAD_COLA_OFFLINE_MS - 10_000,
      },
      {
        payload: { accion: 'crear', pedido: crearPedido('ped-hoy', { total: 10000 }) },
        timestamp: ahora - 10_000,
      },
    ]),
  })

  const leido = leerColaOffline(storage, ahora)
  assert.equal(leido.descartados, 1)
  assert.equal(leido.items.length, 1)
  assert.equal(leido.items[0].payload.pedido.id, 'ped-hoy')

  // Re-encolar el mismo pedido.id actualiza en lugar de duplicar
  const colaActualizada = encolarAccionOffline(
    storage,
    { accion: 'crear', pedido: crearPedido('ped-hoy', { total: 12000 }) },
    ahora
  )
  assert.equal(colaActualizada.length, 1)
  assert.equal(colaActualizada[0].payload.pedido.total, 12000)
})

test('respeta eliminaciones locales recientes incluso si el pedido figura en servidor o cola offline', () => {
  const ahora = 1_700_000_000_000
  const pedidoBorrado = crearPedido('ped-borrado-1')

  const resultado = reconciliarPedidosConEstadoLocal({
    pedidosServidor: [pedidoBorrado, crearPedido('ped-ok-1')],
    pedidosLocalesPrevios: [pedidoBorrado],
    cambiosMap: {},
    eliminadosMap: { 'ped-borrado-1': ahora - 2000 },
    colaOffline: [{ payload: { accion: 'crear', pedido: pedidoBorrado }, timestamp: ahora - 5000 }],
    ahora,
  })

  assert.deepEqual(
    resultado.map((p) => p.id),
    ['ped-ok-1']
  )
})

test('libera el lock local cuando el servidor ya devuelve el pedido creado y el POST terminó', () => {
  const ahora = 1_700_000_000_000
  const pedido = crearPedido('ped-confirmado-1')
  const cambiosMap = {
    'ped-confirmado-1': {
      timestamp: ahora - 1000,
      cambios: { ...pedido },
      pedidoCompleto: pedido,
      enVuelo: false,
    },
  }

  const resultado = reconciliarPedidosConEstadoLocal({
    pedidosServidor: [pedido],
    pedidosLocalesPrevios: [pedido],
    cambiosMap,
    eliminadosMap: {},
    colaOffline: [],
    ahora,
  })

  assert.equal(resultado.length, 1)
  assert.equal('ped-confirmado-1' in cambiosMap, false)
})

test('expira lock optimista no-enVuelo cuando supera VENTANA_LOCK_LOCAL_MS', () => {
  const ahora = 1_700_000_000_000
  const pedido = crearPedido('ped-expirado-1')
  const cambiosMap = {
    'ped-expirado-1': {
      timestamp: ahora - VENTANA_LOCK_LOCAL_MS - 1000,
      cambios: { ...pedido },
      pedidoCompleto: pedido,
      enVuelo: false,
    },
  }

  const resultado = reconciliarPedidosConEstadoLocal({
    pedidosServidor: [],
    pedidosLocalesPrevios: [pedido],
    cambiosMap,
    eliminadosMap: {},
    colaOffline: [],
    ahora,
  })

  assert.equal(resultado.length, 0)
  assert.equal('ped-expirado-1' in cambiosMap, false)
})
