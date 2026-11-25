import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularFactorAlturaTitulo,
  construirEnlaceWhatsAppCarta,
  crearConfiguracionCartaDefault,
  crearHojaTituloDefault,
  detectarConexionLentaCarta,
  esUrlImagenCartaValida,
  normalizarConfiguracionCarta,
  obtenerHojasVisibles,
  obtenerPrimeraImagenVisible,
  obtenerSiguienteImagen,
  obtenerUrlsEliminadasStorage,
  reordenarHojasCarta,
  sanitizarColorHex,
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

test('normaliza separadores de título propios, sanitiza estilos y los reordena junto con imágenes', () => {
  const config = normalizarConfiguracionCarta({
    hojas: [
      {
        id: 't1',
        tipo: 'titulo',
        titulo: '  Nuestras   Promos  ',
        subtitulo: 'Válidas toda la semana',
        orden: 0,
        activa: true,
        estiloTitulo: {
          fuente: 'playfair',
          tamano: 'xl',
          altura: 'compacta',
          alineacion: 'left',
          colorFondo: '#1c1917',
          colorTexto: 'expression(alert(1))', // inválido -> fallback #ffffff
          mayusculas: false,
          decoracion: 'acento-lateral',
        },
      },
      {
        id: 't-vacio',
        tipo: 'titulo',
        titulo: '   ',
        orden: 1,
        activa: true,
      },
      {
        id: 'img1',
        tipo: 'imagen',
        imagenUrl: 'https://ejemplo.com/promos.webp',
        ancho: 1200,
        alto: 1600,
        orden: 2,
        activa: true,
      },
    ],
  })

  assert.equal(config.hojas.length, 2)
  const titulo = config.hojas[0]
  assert.equal(titulo.tipo, 'titulo')
  assert.equal(titulo.titulo, 'Nuestras Promos')
  assert.equal(titulo.subtitulo, 'Válidas toda la semana')
  assert.equal(titulo.imagenUrl, '')
  assert.equal(titulo.estiloTitulo?.fuente, 'playfair')
  assert.equal(titulo.estiloTitulo?.colorFondo, '#1c1917')
  assert.equal(titulo.estiloTitulo?.colorTexto, '#ffffff')
  assert.equal(titulo.estiloTitulo?.mayusculas, false)

  // La portada de WhatsApp debe saltar el título y tomar la primera imagen real
  const portada = obtenerPrimeraImagenVisible(obtenerHojasVisibles(config))
  assert.equal(portada?.id, 'img1')

  // Se puede reordenar un título igual que cualquier hoja
  const reordenadas = reordenarHojasCarta(config.hojas, 0, 1)
  assert.deepEqual(
    reordenadas.map((h) => [h.id, h.orden]),
    [
      ['img1', 0],
      ['t1', 1],
    ]
  )
})

test('adapta el factor de altura del título según la proporción de la imagen siguiente', () => {
  const hojas = normalizarConfiguracionCarta({
    hojas: [
      crearHojaTituloDefault(0, 'Promos'),
      { id: 'wide', imagenUrl: '/wide.webp', ancho: 1200, alto: 600, orden: 1, activa: true },
      crearHojaTituloDefault(2, 'Lomos'),
      { id: 'tall', imagenUrl: '/tall.webp', ancho: 1080, alto: 1920, orden: 3, activa: true },
    ],
  }).hojas

  const imgWide = obtenerSiguienteImagen(hojas, 0)
  const imgTall = obtenerSiguienteImagen(hojas, 2)
  assert.equal(imgWide?.id, 'wide')
  assert.equal(imgTall?.id, 'tall')

  const factorWide = calcularFactorAlturaTitulo(imgWide)
  const factorTall = calcularFactorAlturaTitulo(imgTall)
  assert.ok(factorWide < 1, `Esperaba factor < 1 para imagen apaisada, recibió ${factorWide}`)
  assert.ok(factorTall > 1, `Esperaba factor > 1 para imagen vertical alta, recibió ${factorTall}`)
  assert.equal(calcularFactorAlturaTitulo(undefined), 1)
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
      crearHojaTituloDefault(0, 'Sección'),
      {
        id: '1',
        imagenUrl: 'https://proj.supabase.co/storage/v1/object/public/images/carta_1.webp',
        imagenFallbackUrl: 'https://proj.supabase.co/storage/v1/object/public/images/carta_1.jpg',
        orden: 1,
      },
      {
        id: '2',
        imagenUrl: 'https://proj.supabase.co/storage/v1/object/public/images/carta_2.webp',
        imagenFallbackUrl: 'https://proj.supabase.co/storage/v1/object/public/images/carta_2.jpg',
        orden: 2,
      },
      { id: '3', imagenUrl: 'https://externo.com/foto.webp', orden: 3 },
    ],
  }).hojas

  const nuevas = normalizarConfiguracionCarta({
    hojas: [
      {
        id: '1',
        imagenUrl: 'https://proj.supabase.co/storage/v1/object/public/images/carta_1.webp',
        imagenFallbackUrl: 'https://proj.supabase.co/storage/v1/object/public/images/carta_1.jpg',
      },
    ],
  }).hojas

  assert.deepEqual(obtenerUrlsEliminadasStorage(anteriores, nuevas), [
    'https://proj.supabase.co/storage/v1/object/public/images/carta_2.webp',
    'https://proj.supabase.co/storage/v1/object/public/images/carta_2.jpg',
  ])
})

test('detecta conexión lenta o modo ahorro de datos (2g / slow-2g / saveData)', () => {
  assert.deepEqual(detectarConexionLentaCarta({ saveData: true, effectiveType: '4g' }), {
    ahorroDatos: true,
    motivo: 'save-data',
  })
  assert.deepEqual(detectarConexionLentaCarta({ saveData: false, effectiveType: '2g' }), {
    ahorroDatos: true,
    motivo: '2g',
  })
  assert.deepEqual(detectarConexionLentaCarta({ saveData: false, effectiveType: 'slow-2g' }), {
    ahorroDatos: true,
    motivo: '2g',
  })
  assert.deepEqual(detectarConexionLentaCarta({ saveData: false, effectiveType: '4g' }), {
    ahorroDatos: false,
    motivo: null,
  })
  assert.deepEqual(detectarConexionLentaCarta(undefined), {
    ahorroDatos: false,
    motivo: null,
  })
})

test('valida URLs permitidas, colores hex y rechaza esquemas peligrosos', () => {
  assert.equal(esUrlImagenCartaValida('https://chefsy.xyz/a.webp'), true)
  assert.equal(esUrlImagenCartaValida('/logo.jpg'), true)
  assert.equal(esUrlImagenCartaValida('//malo.com/x.png'), false)
  assert.equal(esUrlImagenCartaValida('data:image/png;base64,AAA'), false)
  assert.equal(sanitizarColorHex('#2A6348', '#000000'), '#2A6348')
  assert.equal(sanitizarColorHex('#fff', '#000000'), '#fff')
  assert.equal(sanitizarColorHex('red; background:url(x)', '#2A6348'), '#2A6348')
  assert.equal(crearConfiguracionCartaDefault().hojas.length, 0)
})
