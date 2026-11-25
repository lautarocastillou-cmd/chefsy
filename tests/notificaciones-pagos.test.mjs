import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buscarPedidoCoincidentePago,
  esNotificacionPagoDuplicada,
  extraerMontoArgentino,
  parsearNotificacionPagoTexto,
} from '../lib/notificaciones-pagos.ts'

test('extrae montos en formato argentino con miles y centavos', () => {
  assert.equal(extraerMontoArgentino('Recibiste $ 14.500 de Juan'), 14500)
  assert.equal(extraerMontoArgentino('¡Te transfirieron $14.500,50!'), 14500.5)
  assert.equal(extraerMontoArgentino('Transferencia recibida por ARS 8500'), 8500)
  assert.equal(extraerMontoArgentino('Sin monto aquí'), null)
})

test('parsea notificaciones reales de billeteras argentinas y rechaza egresos/promos', () => {
  const mp = parsearNotificacionPagoTexto({
    paquete: 'com.mercadopago.wallet',
    titulo: '¡Recibiste dinero!',
    texto: 'Recibiste una transferencia de Juan Pérez por $ 18.200',
  })
  assert.equal(mp.esIngreso, true)
  assert.equal(mp.monto, 18200)
  assert.equal(mp.billetera, 'Mercado Pago')
  assert.equal(mp.remitente, 'Juan Pérez')

  const nx = parsearNotificacionPagoTexto({
    paquete: 'com.naranjax.app',
    titulo: 'Transferencia recibida',
    texto: 'Te transfirieron $ 9.500,00 de parte de María Gómez',
  })
  assert.equal(nx.esIngreso, true)
  assert.equal(nx.monto, 9500)
  assert.equal(nx.billetera, 'Naranja X')
  assert.equal(nx.remitente, 'María Gómez')

  const egreso = parsearNotificacionPagoTexto({
    paquete: 'com.mercadopago.wallet',
    titulo: 'Pagaste $ 12.000',
    texto: 'Pagaste en Supermercado',
  })
  assert.equal(egreso.esIngreso, false)

  const promo = parsearNotificacionPagoTexto({
    paquete: 'com.mercadopago.wallet',
    titulo: '¡Descuento especial!',
    texto: 'Recibiste $ 2.000 de descuento en tu próxima compra',
  })
  assert.equal(promo.esIngreso, false)
})

test('cruza transferencia con el pedido pendiente más adecuado por monto y remitente', () => {
  const pedidos = [
    {
      id: 'p1',
      cliente: 'Carlos López',
      total: 14500,
      estado: 'en_camino',
      metodo_pago: 'transferencia',
      pago_confirmado: false,
      cadete_id: 'moto1',
      cadete_nombre: 'Lucas',
      created_at: '2026-11-25T00:10:00Z',
    },
    {
      id: 'p2',
      cliente: 'Juan Pérez',
      total: 14500,
      estado: 'en_camino',
      metodo_pago: 'transferencia',
      pago_confirmado: false,
      cadete_id: 'moto2',
      cadete_nombre: 'Mateo',
      created_at: '2026-11-25T00:05:00Z',
    },
    {
      id: 'p3',
      cliente: 'Juan Pérez',
      total: 14500,
      estado: 'entregado',
      metodo_pago: 'transferencia',
      pago_confirmado: true,
      created_at: '2026-11-25T00:15:00Z',
    },
  ]

  const match = buscarPedidoCoincidentePago(pedidos, {
    monto: 14500,
    remitente: 'Juan Pérez',
  })
  assert.equal(match?.id, 'p2')
  assert.equal(match?.cadete_id, 'moto2')
})

test('deduplica notificaciones repetidas dentro de la ventana de tiempo', () => {
  const ahora = Date.now()
  const existentes = [
    {
      id: 'np_1',
      cadete_id: 'local',
      cadete_nombre: 'Local',
      monto: 15000,
      metodo: 'transferencia',
      billetera: 'Mercado Pago',
      mensaje: 'Recibiste $ 15.000',
      leida: false,
      creado_en: new Date(ahora - 10_000).toISOString(),
    },
  ]

  assert.equal(
    esNotificacionPagoDuplicada(existentes, {
      monto: 15000,
      billetera: 'Mercado Pago',
      mensaje: 'Recibiste $ 15.000',
      ahoraMs: ahora,
    }),
    true
  )
  assert.equal(
    esNotificacionPagoDuplicada(existentes, {
      monto: 15000,
      billetera: 'Mercado Pago',
      mensaje: 'Recibiste $ 15.000',
      ahoraMs: ahora + 60_000,
    }),
    false
  )
})
