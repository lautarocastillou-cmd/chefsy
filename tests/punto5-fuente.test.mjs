import test from 'node:test'
import assert from 'node:assert/strict'
import { consolidarSugerenciasClientes } from '../lib/motor-clientes.ts'

const cuenta = (id, nombre, telefono = '') => ({ id, nombre, telefono })
const pedido = (cliente, telefono, direccion, created_at) => ({
  cliente,
  telefono,
  direccion,
  coordenadas: null,
  metodoPago: 'efectivo',
  tipoEntrega: 'delivery',
  created_at,
})

test('consolida todos los pedidos sin quedarse con un límite arbitrario de 300', () => {
  const pedidos = Array.from({ length: 301 }, (_, i) =>
    pedido(`Cliente ${i}`, `381555${String(i).padStart(4, '0')}`, `Calle ${i}`, `2026-01-${String((i % 28) + 1).padStart(2, '0')}T12:00:00Z`),
  )

  const resultado = consolidarSugerenciasClientes([], pedidos)

  assert.equal(resultado.length, 301)
})

test('une una cuenta formal con sus pedidos por teléfono y conserva la última dirección', () => {
  const resultado = consolidarSugerenciasClientes(
    [cuenta('cuenta-1', 'Susana Gómez', '381-555-1111')],
    [
      pedido('Susana', '+54 9 381 555-1111', 'Dirección reciente', '2026-02-02T12:00:00Z'),
      pedido('Susana Gómez', '3815551111', 'Dirección anterior', '2026-02-01T12:00:00Z'),
    ],
  )

  assert.equal(resultado.length, 1)
  assert.equal(resultado[0].id, 'cuenta-1')
  assert.equal(resultado[0].nombre, 'Susana Gómez')
  assert.equal(resultado[0].totalPedidos, 2)
  assert.equal(resultado[0].direccion, 'Dirección reciente')
})

test('no mezcla personas con nombres o teléfonos distintos', () => {
  const resultado = consolidarSugerenciasClientes(
    [cuenta('cuenta-1', 'Susana Gómez', '3815551111')],
    [pedido('Susana Pérez', '3815552222', 'Belgrano 200', '2026-02-02T12:00:00Z')],
  )

  assert.deepEqual(resultado.map(c => c.nombre).sort(), ['Susana Gómez', 'Susana Pérez'])
})
