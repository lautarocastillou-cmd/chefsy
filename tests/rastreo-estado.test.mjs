import test from 'node:test'
import assert from 'node:assert/strict'
import { debeMostrarDestinoDirecto } from '../lib/rastreo-estado.ts'

test('no anuncia que va directo si falta la ubicación actual del cadete', () => {
  assert.equal(debeMostrarDestinoDirecto({
    estado: 'en_camino',
    esProximaEntrega: true,
    gpsActivo: true,
    tieneCoordenadasCadete: false,
  }), false)
})

test('anuncia destino directo solo para la próxima entrega con GPS activo', () => {
  assert.equal(debeMostrarDestinoDirecto({
    estado: 'en_camino',
    esProximaEntrega: true,
    gpsActivo: true,
    tieneCoordenadasCadete: true,
  }), true)
})

test('no anuncia destino directo si hay paradas previas o GPS apagado', () => {
  assert.equal(debeMostrarDestinoDirecto({
    estado: 'en_camino',
    esProximaEntrega: false,
    gpsActivo: true,
    tieneCoordenadasCadete: true,
  }), false)
  assert.equal(debeMostrarDestinoDirecto({
    estado: 'en_camino',
    esProximaEntrega: true,
    gpsActivo: false,
    tieneCoordenadasCadete: true,
  }), false)
})
