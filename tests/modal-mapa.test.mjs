import test from 'node:test'
import assert from 'node:assert/strict'

async function leer(ruta) {
  const fs = await import('node:fs/promises')
  return fs.readFile(new URL(ruta, import.meta.url), 'utf8')
}

test('el botón Ver en mapa del nuevo pedido abre el modal local', async () => {
  const contenido = await leer('../components/ubicacion/CampoUbicacion.tsx')

  assert.match(contenido, /import ModalVistaUbicacion from ['"]\.\/ModalVistaUbicacion['"]/)
  assert.match(contenido, /onClick=\{\(\) => setVistaMapaAbierta\(true\)\}/)
  assert.match(contenido, /<ModalVistaUbicacion/)
  assert.doesNotMatch(contenido, /href=\{crearEnlaceGoogleMaps\(coordenadas\)\}/)
})

test('la vista rápida tiene mapa local, cierre y acceso externo opcional', async () => {
  const contenido = await leer('../components/ubicacion/ModalVistaUbicacion.tsx')

  assert.match(contenido, /createPortal/)
  assert.match(contenido, /<MapaSelector/)
  assert.match(contenido, /evento\.key === 'Escape'/)
  assert.match(contenido, /target="_blank"/)
  assert.match(contenido, /google\.com\/maps\?q=/)
})

test('las ubicaciones sin coordenadas conservan la búsqueda externa de Google Maps', async () => {
  const contenido = await leer('../components/pedidos/InfoEntregaPedido.tsx')

  assert.match(contenido, /target="_blank"/)
  assert.match(contenido, /crearEnlaceGoogleMaps\(null, pedido\.direccion\)/)
})
