import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarClientesPorCampo } from '../lib/motor-clientes.ts'

const cliente = (nombre, telefono, direccion = '') => ({
  nombre,
  telefono,
  telefonoNormalizado: telefono.replace(/\D/g, ''),
  direccion,
})

test('al buscar por nombre no mezcla coincidencias de teléfono o dirección', () => {
  const clientes = [
    cliente('Susana Gómez', '3815551111', 'San Martín 100'),
    cliente('Mariana López', '3815552222', 'Susana 450'),
    cliente('Carlos Pérez', '3815553333', 'Belgrano 200'),
  ]

  const resultados = buscarClientesPorCampo(clientes, 'Susana', 'nombre')

  assert.deepEqual(resultados.map(c => c.nombre), ['Susana Gómez'])
})

test('al buscar por teléfono no mezcla coincidencias del nombre', () => {
  const clientes = [
    cliente('3815559999', '3815551111'),
    cliente('Susana Gómez', '3815552222'),
    cliente('Carlos Pérez', '3815553333'),
  ]

  const resultados = buscarClientesPorCampo(clientes, '381-555-2222', 'telefono')

  assert.deepEqual(resultados.map(c => c.nombre), ['Susana Gómez'])
})

test('no devuelve sugerencias de nombre con menos de tres letras', () => {
  const clientes = [cliente('Susana Gómez', '3815551111')]

  assert.deepEqual(buscarClientesPorCampo(clientes, 'Su', 'nombre'), [])
})

test('tolera un error pequeño de escritura sin buscar en otros campos', () => {
  const clientes = [
    cliente('Susana Gómez', '3815551111', 'Belgrano 200'),
    cliente('Mariana López', '3815552222', 'Susna 450'),
  ]

  const resultados = buscarClientesPorCampo(clientes, 'Susna', 'nombre')

  assert.deepEqual(resultados.map(c => c.nombre), ['Susana Gómez'])
})
