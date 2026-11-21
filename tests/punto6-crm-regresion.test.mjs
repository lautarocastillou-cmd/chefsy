import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buscarClientesPorCampo,
  buscarClientesConFiltros,
  clienteCoincideConConfirmacion,
  datosCoincidenConConfirmacion,
  moverIndiceSugerencia,
  obtenerClaveCliente,
  obtenerNivelCoincidencia,
} from '../lib/motor-clientes.ts'

const cliente = (nombre, telefono, direccion = '') => ({
  nombre,
  telefono,
  telefonoNormalizado: telefono.replace(/\D/g, ''),
  direccion,
})

test('separa una coincidencia exacta de una sugerencia débil por nombre', () => {
  const exacto = cliente('Susana Gómez', '3815551111')
  const debil = cliente('Susana Gómez Díaz', '3815552222')

  assert.equal(obtenerNivelCoincidencia(exacto, { nombre: 'Susana Gómez' }), 'exacta')
  assert.equal(obtenerNivelCoincidencia(debil, { nombre: 'Susana Gómez' }), 'debil')
})

test('mantiene la búsqueda específica por campo y tolera un typo solo en nombre', () => {
  const clientes = [
    cliente('Susana Gómez', '3815551111', 'Belgrano 200'),
    cliente('Mariana López', '3815552222', 'Susana 450'),
  ]

  assert.deepEqual(
    buscarClientesPorCampo(clientes, 'Susna', 'nombre').map(c => c.nombre),
    ['Susana Gómez'],
  )
  assert.deepEqual(
    buscarClientesPorCampo(clientes, '381-555-2222', 'telefono').map(c => c.nombre),
    ['Mariana López'],
  )
})

test('aplica todos los filtros al mismo cliente', () => {
  const clientes = [
    cliente('Susana Gómez', '3815551111', 'San Martín 100'),
    cliente('Susana Pérez', '3815552222', 'Belgrano 200'),
  ]

  assert.deepEqual(
    buscarClientesConFiltros(clientes, { nombre: 'Susana', direccion: 'Belgrano' }).map(c => c.nombre),
    ['Susana Pérez'],
  )
  assert.deepEqual(buscarClientesConFiltros(clientes, { nombre: 'Susana', telefono: '3815552222', direccion: 'San Martín' }), [])
})

test('confirma la selección por clave estable y detecta edición de datos', () => {
  const seleccionado = cliente('Susana Gómez', '381-555-1111')
  const mismo = cliente('Susana Gómez', '+54 9 381 555-1111')
  const otro = cliente('Susana Pérez', '3815552222')

  assert.equal(clienteCoincideConConfirmacion(mismo, obtenerClaveCliente(seleccionado)), true)
  assert.equal(clienteCoincideConConfirmacion(otro, obtenerClaveCliente(seleccionado)), false)
  assert.equal(datosCoincidenConConfirmacion(seleccionado, { nombre: 'Susana Gómez', telefono: '3815551111' }), true)
  assert.equal(datosCoincidenConConfirmacion(seleccionado, { nombre: 'Susana Gómez', telefono: '3815559999' }), false)
})

test('la navegación de teclado recorre y envuelve sugerencias, y el helper de motivo conserva contexto', () => {
  assert.equal(moverIndiceSugerencia(-1, 3, 1), 0)
  assert.equal(moverIndiceSugerencia(2, 3, 1), 0)
  assert.equal(moverIndiceSugerencia(0, 3, -1), 2)
  assert.equal(moverIndiceSugerencia(0, 0, 1), -1)
})

// La confirmación de datos vacíos no debe ocultar una selección válida.

test('clasifica una coincidencia por teléfono exacto aunque el nombre sea parcial', () => {
  const susana = cliente('Susana Gómez', '3815551111')
  assert.equal(obtenerNivelCoincidencia(susana, { nombre: 'Sus', telefono: '381-555-1111' }), 'exacta')
})
