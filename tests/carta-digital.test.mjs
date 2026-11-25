import test from 'node:test'
import assert from 'node:assert/strict'
import {
  construirEnlaceWhatsAppCarta,
  crearConfiguracionCartaDefault,
  esUrlImagenCartaValida,
  normalizarConfiguracionCarta,
  obtenerHojasVisibles,
  obtenerUrlsEliminadasStorage,
  reordenarHojasCarta,
} from '../lib/carta-digital.ts'

test('normaliza configuración de carta con defaults seguros y descarta URLs inválidas', () => {
  const config = normalizarConfiguracionCarta({
    titulo: '  Carta   Chefsy  ',
    whatsappTelefono: '+54 9 3834 22-5445',
    hojas: [
      { id: 'h2', titulo: 'Bebidas', imagenUrl: 'https://ejemplo.com/2.webp', orden: 2, activa: true, ancho: 1200, alto: 1800 },
      { id: 'bad', titulo: 'Mala', imagenUrl: 'javascript:alert(1)', orden: 0, activa: true },
      { id: 'h1', titulo: 'Promos', imagenUrl: 'https://ejemplo.com/1.webp', orden: 0, activa: true },
      { id: 'h3', titulo: 'Oculta', imagenUrl: 'https://ejemplo.com/3.webp', orden: 1, activa: false },
    ],
  })

  assert.equal(config.titulo, 'Carta Chefsy')
  assert.equal(config.whatsappTelefono, '5493834225445')
  assert.deepEqual(
    config.hojas.map((h) => h.id),
    ['h1', 'h3', 'h2']
  )
  assert.deepEqual(
    obtenerHojasVisibles(config).map((h) => h.id),
    ['h1', 'h2']
  )
})

test('reordena hojas y recalcula índices de orden consecutivos', () => {
  const base = normalizarConfiguracionCarta({
    hojas: [
      { id: 'a', imagenUrl: '/a.webp', activa: true, orden: 0 },
      { id: 'b', imagenUrl: '/b.webp', activa: true, orden: 1 },
      { id: 'c', imagenUrl: '/c.webp', activa: true, orden: 2 },
    ],
  }).hojas

  const movidas = reordenarHojasCarta(base, 2, 0)
  assert.deepEqual(
    movidas.map((h) => [h.id, h.orden]),
    [
      ['c', 0],
      ['a', 1],
      ['b', 2],
    ]
  )
})

test('construye enlace wa.me con teléfono limpio y mensaje codificado', () => {
  const url = construirEnlaceWhatsAppCarta({
    whatsappTelefono: '+54 9 (3834) 22-5445',
    whatsappMensaje: '¡Hola! Quiero 2 lomos',
  })
  assert.equal(
    url,
    'https://wa.me/5493834225445?text=%C2%A1Hola!%20Quiero%202%20lomos'
  )
})

test('detecta únicamente URLs eliminadas pertenecientes al bucket images de Supabase', () => {
  const anteriores = normalizarConfiguracionCarta({
    hojas: [
      { id: '1', imagenUrl: 'https://proj.supabase.co/storage/v1/object/public/images/carta_1.webp' },
      { id: '2', imagenUrl: 'https://proj.supabase.co/storage/v1/object/public/images/carta_2.webp' },
      { id: '3', imagenUrl: 'https://externo.com/foto.webp' },
    ],
  }).hojas

  const nuevas = normalizarConfiguracionCarta({
    hojas: [
      { id: '1', imagenUrl: 'https://proj.supabase.co/storage/v1/object/public/images/carta_1.webp' },
    ],
  }).hojas

  assert.deepEqual(obtenerUrlsEliminadasStorage(anteriores, nuevas), [
    'https://proj.supabase.co/storage/v1/object/public/images/carta_2.webp',
  ])
})

test('valida URLs permitidas y rechaza esquemas peligrosos o protocol-relative', () => {
  assert.equal(esUrlImagenCartaValida('https://chefsy.xyz/a.webp'), true)
  assert.equal(esUrlImagenCartaValida('/logo.jpg'), true)
  assert.equal(esUrlImagenCartaValida('//malo.com/x.png'), false)
  assert.equal(esUrlImagenCartaValida('data:image/png;base64,AAA'), false)
  assert.equal(crearConfiguracionCartaDefault().hojas.length, 0)
})
