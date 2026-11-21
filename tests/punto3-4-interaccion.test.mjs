import test from 'node:test'
import assert from 'node:assert/strict'
import {
  obtenerClaveCliente,
  clienteCoincideConConfirmacion,
  moverIndiceSugerencia,
  obtenerMotivoCoincidencia,
} from '../lib/motor-clientes.ts'

const cliente = (nombre, telefono, id = undefined) => ({
  id,
  nombre,
  telefono,
  telefonoNormalizado: telefono.replace(/\D/g, ''),
})

test('una selección confirmada se identifica aunque cambie el formato del teléfono', () => {
  const seleccionado = cliente('Susana Gómez', '381-555-1111', 'cliente-1')
  const vueltoABuscar = cliente('Susana Gómez', '+54 9 381 555-1111', 'cliente-1')

  assert.equal(
    clienteCoincideConConfirmacion(vueltoABuscar, obtenerClaveCliente(seleccionado)),
    true,
  )
})

test('un cliente distinto no queda oculto por una selección anterior', () => {
  const seleccionado = cliente('Susana Gómez', '381-555-1111', 'cliente-1')
  const otro = cliente('Susana Pérez', '381-555-2222', 'cliente-2')

  assert.equal(
    clienteCoincideConConfirmacion(otro, obtenerClaveCliente(seleccionado)),
    false,
  )
})

test('la navegación de sugerencias recorre la lista y vuelve al principio', () => {
  assert.equal(moverIndiceSugerencia(-1, 3, 1), 0)
  assert.equal(moverIndiceSugerencia(2, 3, 1), 0)
  assert.equal(moverIndiceSugerencia(0, 3, -1), 2)
  assert.equal(moverIndiceSugerencia(0, 0, 1), -1)
})

test('explica si la coincidencia viene del nombre, teléfono o ambos', () => {
  assert.equal(obtenerMotivoCoincidencia({ nombre: 'Susana', telefono: '' }), 'Coincide en el nombre')
  assert.equal(obtenerMotivoCoincidencia({ nombre: '', telefono: '3815551111' }), 'Teléfono exacto')
  assert.equal(obtenerMotivoCoincidencia({ nombre: 'Susana', telefono: '3815551111' }), 'Nombre y teléfono')
  assert.equal(obtenerMotivoCoincidencia({ nombre: 'Susana', telefono: '', direccion: 'Belgrano' }), 'Nombre y dirección')
})
