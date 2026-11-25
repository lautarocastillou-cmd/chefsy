import test from 'node:test'
import assert from 'node:assert/strict'
import {
  construirProductoPromoFlash,
  contarUnidadesPromoFlashEnItems,
  contarUnidadesPromoFlashEnPedidos,
  crearConfiguracionPromoFlashDefault,
  esItemPromoFlash,
  evaluarEstadoPromoFlash,
  normalizarConfiguracionPromoFlash,
  PROMO_FLASH_PRODUCTO_ID,
} from '../lib/promo-flash.ts'
import { esProductoPromo } from '../tipos/promo.ts'

test('crea configuración default de Burger Cheese a $5.000 para hoy y normaliza límites', () => {
  const def = crearConfiguracionPromoFlashDefault('2026-11-25')
  assert.equal(def.precioPromo, 5000)
  assert.equal(def.fechaVigencia, '2026-11-25')
  assert.equal(def.activa, true)
  assert.equal(def.limiteTotal, 30)

  const norm = normalizarConfiguracionPromoFlash(
    {
      precioPromo: 5000,
      precioRegular: 4000, // menor al promo -> se ajusta >= precioPromo
      limiteTotal: 20,
      maxPorPedido: 50, // mayor al límite -> se recorta
      imagenUrl: 'javascript:alert(1)', // inválida -> fallback seguro
    },
    '2026-11-25'
  )
  assert.equal(norm.precioRegular >= norm.precioPromo, true)
  assert.equal(norm.precioRegular, 8500)
  assert.equal(norm.limiteTotal, 20)
  assert.equal(norm.maxPorPedido, 3)
  assert.equal(norm.imagenUrl, '/burger-loca.webp')
})

test('cuenta unidades vendidas ignorando pedidos cancelados y pedidos de prueba', () => {
  const pedidos = [
    {
      estado: 'entregado',
      es_prueba: false,
      productos: [
        { idCatalogo: PROMO_FLASH_PRODUCTO_ID, nombre: 'Promo Burger Cheese ($5.000)', cantidad: 2 },
        { idCatalogo: 'lomo-especial', nombre: 'Lomo Especial', cantidad: 1 },
      ],
    },
    {
      estado: 'en_cocina',
      es_prueba: false,
      productos: [
        { id: `${PROMO_FLASH_PRODUCTO_ID}-1789123`, nombre: 'Promo Burger Cheese ($5.000)', cantidad: 3 },
      ],
    },
    {
      estado: 'cancelado',
      es_prueba: false,
      productos: [
        { idCatalogo: PROMO_FLASH_PRODUCTO_ID, nombre: 'Promo Burger Cheese ($5.000)', cantidad: 5 },
      ],
    },
    {
      estado: 'nuevo',
      es_prueba: true,
      productos: [
        { idCatalogo: PROMO_FLASH_PRODUCTO_ID, nombre: 'Promo Burger Cheese ($5.000)', cantidad: 10 },
      ],
    },
  ]

  assert.equal(contarUnidadesPromoFlashEnPedidos(pedidos), 5)
  assert.equal(
    contarUnidadesPromoFlashEnItems([
      { idCatalogo: PROMO_FLASH_PRODUCTO_ID, cantidad: 2 },
      { nombre: 'Promo Burger Cheese ($5.000)', cantidad: 1 },
      { idCatalogo: 'burger-comun', nombre: 'Burger Común', cantidad: 4 },
    ]),
    3
  )
  assert.equal(esItemPromoFlash({ idCatalogo: PROMO_FLASH_PRODUCTO_ID }), true)
  assert.equal(esItemPromoFlash({ idCatalogo: 'burger-chefsy', nombre: 'Burger Chefsy' }), false)
})

test('desactiva automáticamente la promo al alcanzar el límite o al cambiar de día', () => {
  const config = normalizarConfiguracionPromoFlash(
    { activa: true, limiteTotal: 10, fechaVigencia: '2026-11-25' },
    '2026-11-25'
  )

  const activa = evaluarEstadoPromoFlash(config, 7, '2026-11-25')
  assert.equal(activa.disponible, true)
  assert.equal(activa.restantes, 3)
  assert.equal(activa.motivo, 'activa')
  assert.equal(activa.porcentajeConsumido, 70)

  const agotada = evaluarEstadoPromoFlash(config, 10, '2026-11-25')
  assert.equal(agotada.disponible, false)
  assert.equal(agotada.agotada, true)
  assert.equal(agotada.restantes, 0)
  assert.equal(agotada.motivo, 'agotada')

  const vencida = evaluarEstadoPromoFlash(config, 2, '2026-11-26')
  assert.equal(vencida.disponible, false)
  assert.equal(vencida.vencida, true)
  assert.equal(vencida.motivo, 'vencida')
})

test('el producto de Promo Flash NO se acumula con la promo de Fanta/Sprite gratis', () => {
  const config = crearConfiguracionPromoFlashDefault('2026-11-25')
  const prod = construirProductoPromoFlash(config)
  assert.equal(prod.precio, 5000)
  assert.equal(esProductoPromo(prod, true), false)
  assert.equal(esProductoPromo(prod.id, prod.nombre, true, prod.esCombo, prod.categoriaId), false)
})
