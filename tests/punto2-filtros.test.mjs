import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarClientesConFiltros } from '../lib/motor-clientes.ts'

const cliente = (nombre, telefono, direccion) => ({
  nombre,
  telefono,
  telefonoNormalizado: telefono.replace(/\D/g, ''),
  direccion,
})

test('combina nombre y teléfono: ambos datos deben pertenecer al mismo cliente', () => {
  const clientes = [
    cliente('Susana Gómez', '3815551111', 'San Martín 100'),
    cliente('Mariana López', '3815552222', 'Belgrano 200'),
  ]

  const resultados = buscarClientesConFiltros(clientes, {
    nombre: 'Susana',
    telefono: '381-555-2222',
  })

  assert.deepEqual(resultados, [])
})

test('combina nombre y dirección sin devolver coincidencias de un solo campo', () => {
  const clientes = [
    cliente('Susana Gómez', '3815551111', 'San Martín 100'),
    cliente('Susana Pérez', '3815552222', 'Belgrano 200'),
  ]

  const resultados = buscarClientesConFiltros(clientes, {
    nombre: 'Susana',
    direccion: 'Belgrano',
  })

  assert.deepEqual(resultados.map(c => c.nombre), ['Susana Pérez'])
})

test('permite buscar por nombre mientras los otros campos todavía están vacíos', () => {
  const clientes = [
    cliente('Susana Gómez', '3815551111', 'San Martín 100'),
    cliente('Mariana López', '3815552222', 'Belgrano 200'),
  ]

  const resultados = buscarClientesConFiltros(clientes, { nombre: 'Susana' })

  assert.deepEqual(resultados.map(c => c.nombre), ['Susana Gómez'])
})

test('no usa datos incompletos como filtros', () => {
  const clientes = [cliente('Susana Gómez', '3815551111', 'San Martín 100')]

  assert.deepEqual(
    buscarClientesConFiltros(clientes, { nombre: 'Su', telefono: '38' }),
    [],
  )
})
