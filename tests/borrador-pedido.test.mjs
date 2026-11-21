import test from 'node:test'
import assert from 'node:assert/strict'
import { limpiarBorradorTrasCrearPedido, leerBorrador } from '../lib/borrador-pedido.ts'

function crearStorage(contenido = 'borrador') {
  const llamadas = []
  return {
    llamadas,
    removeItem(clave) {
      llamadas.push(clave)
    },
    getItem() {
      return contenido
    },
  }
}

test('conserva el borrador al crear un pedido distinto sin restaurarlo', () => {
  const storage = crearStorage()

  const eliminado = limpiarBorradorTrasCrearPedido(storage, 'chefsy_borrador_nuevo_pedido', false)

  assert.equal(eliminado, false)
  assert.deepEqual(storage.llamadas, [])
})

test('elimina el borrador cuando el pedido creado proviene del borrador restaurado', () => {
  const storage = crearStorage()

  const eliminado = limpiarBorradorTrasCrearPedido(storage, 'chefsy_borrador_nuevo_pedido', true)

  assert.equal(eliminado, true)
  assert.deepEqual(storage.llamadas, ['chefsy_borrador_nuevo_pedido'])
})

test('descartar manualmente sigue siendo independiente de crear pedidos', () => {
  const storage = crearStorage()

  const eliminado = limpiarBorradorTrasCrearPedido(storage, 'chefsy_borrador_nuevo_pedido', false)

  assert.equal(eliminado, false)
  assert.equal(storage.getItem('chefsy_borrador_nuevo_pedido'), 'borrador')
})

test('lee un borrador válido y rechaza JSON corrupto', () => {
  assert.deepEqual(leerBorrador('{"cliente":"Lautaro"}'), { cliente: 'Lautaro' })
  assert.equal(leerBorrador('{ roto'), null)
  assert.equal(leerBorrador(null), null)
})

test('un borrador guardado nuevamente deja de considerarse restaurado', () => {
  const storage = crearStorage()
  assert.equal(limpiarBorradorTrasCrearPedido(storage, 'chefsy_borrador_nuevo_pedido', false), false)
})

test('limpieza tolera un almacenamiento que lanza errores', () => {
  const storage = { removeItem() { throw new Error('storage unavailable') } }
  assert.equal(limpiarBorradorTrasCrearPedido(storage, 'chefsy_borrador_nuevo_pedido', true), false)
})
