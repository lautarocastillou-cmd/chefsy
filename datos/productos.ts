// ─────────────────────────────────────────────────────
// datos/productos.ts
// Catálogo centralizado de productos Chefsy (Respaldo Offline Actualizado).
// Fuente única de verdad para nombres, precios base y metadatos por defecto.
// ─────────────────────────────────────────────────────

import { CategoriaCatalogo, ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'

export const categoriasCatalogo: CategoriaCatalogo[] = [
  {
    "id": "zapping",
    "orden": 0,
    "activa": true,
    "nombre": "Zapping"
  },
  {
    "id": "lomos-y-milas",
    "orden": 1,
    "activa": true,
    "nombre": "Milas"
  },
  {
    "id": "cat-1780506096615",
    "orden": 2,
    "activa": true,
    "nombre": "Lomos"
  },
  {
    "id": "patys",
    "orden": 3,
    "activa": true,
    "nombre": "Burgers"
  },
  {
    "id": "cat-1781570568487",
    "orden": 4,
    "activa": true,
    "nombre": "Patys"
  },
  {
    "id": "pizzas",
    "orden": 5,
    "activa": true,
    "nombre": "Pizzas"
  },
  {
    "id": "mila-al-plato",
    "orden": 6,
    "activa": true,
    "nombre": "Mila al Plato"
  },
  {
    "id": "tartas-xl",
    "orden": 7,
    "activa": true,
    "nombre": "Tartas XL"
  },
  {
    "id": "bebidas",
    "orden": 8,
    "activa": true,
    "nombre": "Bebidas"
  },
  {
    "id": "promos",
    "orden": 9,
    "activa": true,
    "nombre": "Promos"
  },
  {
    "id": "cat-1781574714354",
    "orden": 10,
    "activa": true,
    "nombre": "Porción de papas"
  }
]

export const productosCatalogo: ProductoCatalogo[] = [
  {
    "id": "lomos-y-milas-especial",
    "stock": null,
    "activo": true,
    "nombre": "Mila Especial",
    "precio": 11500,
    "esCombo": false,
    "categoriaId": "lomos-y-milas",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "lomos-y-milas-chefsy",
    "stock": null,
    "activo": true,
    "nombre": "Mila Chefsy",
    "precio": 13500,
    "esCombo": false,
    "categoriaId": "lomos-y-milas",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "lomos-y-milas-american",
    "stock": null,
    "activo": true,
    "nombre": "Mila American",
    "precio": 13000,
    "esCombo": false,
    "categoriaId": "lomos-y-milas",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "lomos-y-milas-4-quesos",
    "stock": null,
    "activo": true,
    "nombre": "Mila 4 Quesos",
    "precio": 11500,
    "esCombo": false,
    "categoriaId": "lomos-y-milas",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "zapping-comun",
    "stock": null,
    "activo": true,
    "nombre": "Zapping Comun",
    "precio": 10000,
    "esCombo": false,
    "categoriaId": "zapping",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "zapping-especial",
    "stock": null,
    "activo": true,
    "nombre": "Zapping Especial",
    "precio": 11000,
    "esCombo": false,
    "categoriaId": "zapping",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "zapping-chefsy",
    "stock": null,
    "activo": true,
    "nombre": "Zapping Chefsy",
    "precio": 13000,
    "esCombo": false,
    "categoriaId": "zapping",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "zapping-american",
    "stock": null,
    "activo": true,
    "nombre": "Zapping American",
    "precio": 12500,
    "esCombo": false,
    "categoriaId": "zapping",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "zapping-4-quesos",
    "stock": null,
    "activo": true,
    "nombre": "Zapping 4 Quesos",
    "precio": 12000,
    "esCombo": false,
    "categoriaId": "zapping",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933578075",
      "mod-1781933554301"
    ]
  },
  {
    "id": "patys-comun",
    "stock": null,
    "activo": true,
    "nombre": "Burger Común",
    "precio": 7000,
    "esCombo": false,
    "categoriaId": "patys",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "patys-especial",
    "stock": null,
    "activo": true,
    "nombre": "Burger Especial",
    "precio": 7500,
    "esCombo": false,
    "categoriaId": "patys",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "patys-chefsy",
    "stock": null,
    "activo": true,
    "nombre": "Burger Chefsy",
    "precio": 9000,
    "esCombo": false,
    "categoriaId": "patys",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "patys-american",
    "stock": null,
    "activo": true,
    "nombre": "Burger American",
    "precio": 8500,
    "esCombo": false,
    "categoriaId": "patys",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "patys-4-quesos",
    "stock": null,
    "activo": true,
    "nombre": "Burger 4 Quesos",
    "precio": 8000,
    "esCombo": false,
    "categoriaId": "patys",
    "modificadoresIds": [
      "mod-1781933578075",
      "mod-1781933530373",
      "mod-1781933554301"
    ]
  },
  {
    "id": "pizzas-muzzarella",
    "stock": null,
    "activo": true,
    "nombre": "Muzzarella",
    "precio": 9000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "pizzas-especial",
    "stock": null,
    "activo": true,
    "nombre": "Especial",
    "precio": 10000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "pizzas-napolitana",
    "stock": null,
    "activo": true,
    "nombre": "Napolitana",
    "precio": 10000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "pizzas-fugazzeta",
    "stock": null,
    "activo": true,
    "nombre": "Fugazzeta",
    "precio": 10000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "pizzas-calabresa",
    "stock": null,
    "activo": true,
    "nombre": "Calabresa",
    "precio": 11000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "pizzas-roquefort",
    "stock": null,
    "activo": true,
    "nombre": "Roquefort",
    "precio": 11000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "pizzas-4-quesos",
    "stock": null,
    "activo": true,
    "nombre": "4 Quesos",
    "precio": 11000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "pizzas-argentina",
    "stock": null,
    "activo": true,
    "nombre": "Argentina",
    "precio": 13000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "mila-al-plato-napolitana-con-papas",
    "stock": null,
    "activo": true,
    "nombre": "Napolitana con papas",
    "precio": 9500,
    "esCombo": false,
    "categoriaId": "mila-al-plato",
    "modificadoresIds": [
      "mod-1781933578075",
      "mod-1781933554301",
      "mod-1781933693177"
    ]
  },
  {
    "id": "mila-al-plato-a-caballo-con-papas",
    "stock": null,
    "activo": true,
    "nombre": "A caballo con papas",
    "precio": 9500,
    "esCombo": false,
    "categoriaId": "mila-al-plato",
    "modificadoresIds": [
      "mod-1781933578075",
      "mod-1781933554301",
      "mod-1781933693177"
    ]
  },
  {
    "id": "tartas-xl-jamon-y-muzza",
    "stock": null,
    "activo": true,
    "nombre": "Jamón y Muzza",
    "precio": 6000,
    "esCombo": false,
    "categoriaId": "tartas-xl",
    "modificadoresIds": []
  },
  {
    "id": "tartas-xl-salame-y-muzza",
    "stock": null,
    "activo": true,
    "nombre": "Salame y Muzza",
    "precio": 7000,
    "esCombo": false,
    "categoriaId": "tartas-xl",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837702199-442",
    "stock": null,
    "activo": true,
    "nombre": "COCA-COLA 2.25lts",
    "precio": 5500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837714149-971",
    "stock": null,
    "activo": true,
    "nombre": "SPRITE 2.25lts",
    "precio": 5500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837729405-938",
    "stock": null,
    "activo": true,
    "nombre": "FANTA MANZANA 2.25lts",
    "precio": 5500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837740021-733",
    "stock": null,
    "activo": true,
    "nombre": "COCA-COLA 1.5lts",
    "precio": 4500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837747149-255",
    "stock": null,
    "activo": true,
    "nombre": "SPRITE 1.5lts",
    "precio": 4500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837772661-992",
    "stock": null,
    "activo": true,
    "nombre": "AQUARIUS MANZANA 1.5lts",
    "precio": 3500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837780549-768",
    "stock": null,
    "activo": true,
    "nombre": "FANTA 1.5lts",
    "precio": 4500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837798902-6",
    "stock": null,
    "activo": true,
    "nombre": "COCA 375cc",
    "precio": 2000,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837802685-172",
    "stock": null,
    "activo": true,
    "nombre": "SPRITE 375cc",
    "precio": 2000,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837813726-941",
    "stock": null,
    "activo": true,
    "nombre": "COCA ZERO 375cc",
    "precio": 1500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837819730-483",
    "stock": null,
    "activo": true,
    "nombre": "COCA ZERO 2.25lts",
    "precio": 5500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779837829377-677",
    "stock": null,
    "activo": true,
    "nombre": "AGUA MINERAL 500cc",
    "precio": 2000,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779840756425-936",
    "stock": null,
    "activo": true,
    "nombre": "Lomito de pollo",
    "precio": 9500,
    "esCombo": false,
    "categoriaId": "cat-1780506096615",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779841388328-939",
    "stock": null,
    "activo": true,
    "nombre": "MEDIA ARGENTINA",
    "precio": 6500,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779842702207-427",
    "stock": null,
    "activo": true,
    "nombre": "ZAPPING ESPECIAL + ZAPPING CHEFSY",
    "precio": 22000,
    "esCombo": true,
    "categoriaId": "zapping",
    "modificadoresIds": [
      "mod-1781933578075",
      "mod-1781933554301"
    ]
  },
  {
    "id": "prod-1779844667386-4",
    "stock": null,
    "activo": true,
    "nombre": "BURGER ESPECIAL + COCA 375ml",
    "precio": 8500,
    "esCombo": true,
    "categoriaId": "patys",
    "modificadoresIds": [
      "mod-1781933578075",
      "mod-1781933554301"
    ]
  },
  {
    "id": "prod-1779846391047-631",
    "stock": null,
    "activo": true,
    "nombre": "1 MUZZA + 1 ESPECIAL",
    "precio": 17000,
    "esCombo": true,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1779932158043-401",
    "stock": null,
    "activo": true,
    "nombre": "MEDIA ESPECIAL",
    "precio": 5500,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1780016168622-927",
    "stock": null,
    "activo": true,
    "nombre": "1 ZAPPING ESPECIAL + 1 ZAPPING AMERICANA",
    "precio": 22000,
    "esCombo": true,
    "categoriaId": "zapping",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1780021634430-572",
    "stock": null,
    "activo": true,
    "nombre": "2 CHEESE",
    "precio": 12000,
    "esCombo": true,
    "categoriaId": "patys",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1780023700819-856",
    "stock": null,
    "activo": true,
    "nombre": "2 BURGERS ESPECIALES",
    "precio": 13000,
    "esCombo": true,
    "categoriaId": "patys",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1780101546747-767",
    "stock": null,
    "activo": true,
    "nombre": "ZAPPING ESPECIAL + 2.25",
    "precio": 14000,
    "esCombo": true,
    "categoriaId": "zapping",
    "modificadoresIds": [
      "mod-1781933578075",
      "mod-1781933554301"
    ]
  },
  {
    "id": "prod-1780188404733-930",
    "stock": null,
    "activo": false,
    "nombre": "BURGER ESPECIAL + COCA 600ml",
    "precio": 8500,
    "esCombo": true,
    "categoriaId": "promos",
    "modificadoresIds": []
  },
  {
    "id": "prod-1780189871653-705",
    "stock": null,
    "activo": true,
    "nombre": "2 ZAPPING COMÚN",
    "precio": 18000,
    "esCombo": true,
    "categoriaId": "zapping",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1780358767386-197",
    "stock": null,
    "activo": true,
    "nombre": "MEDIA MUZZA",
    "precio": 5000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1780448959934-362",
    "stock": null,
    "activo": true,
    "nombre": "MEDIA 4 QUESOS",
    "precio": 6000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1780506120462-538",
    "stock": null,
    "activo": true,
    "nombre": "Lomo Especial",
    "precio": 11500,
    "esCombo": false,
    "categoriaId": "cat-1780506096615",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075",
      "mod-1781933530373"
    ]
  },
  {
    "id": "prod-1780506298728-63",
    "stock": null,
    "activo": true,
    "nombre": "Lomo Chefsy",
    "precio": 13500,
    "esCombo": false,
    "categoriaId": "cat-1780506096615",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1780506321180-163",
    "stock": null,
    "activo": true,
    "nombre": "Lomo American",
    "precio": 13000,
    "esCombo": false,
    "categoriaId": "cat-1780506096615",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1780506329295-608",
    "stock": null,
    "activo": true,
    "nombre": "Lomo 4 Quesos",
    "precio": 11500,
    "esCombo": false,
    "categoriaId": "cat-1780506096615",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1780506392974-556",
    "stock": null,
    "activo": true,
    "nombre": "Mila Común",
    "precio": 10500,
    "esCombo": false,
    "categoriaId": "lomos-y-milas",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1780506404868-70",
    "stock": null,
    "activo": true,
    "nombre": "Lomo Común",
    "precio": 10500,
    "esCombo": false,
    "categoriaId": "cat-1780506096615",
    "modificadoresIds": [
      "mod-1781933530373",
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1780706531138-444",
    "stock": null,
    "activo": true,
    "nombre": "2 ZAPPING ESPECIALES",
    "precio": 20000,
    "esCombo": true,
    "categoriaId": "zapping",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1780792906680-782",
    "stock": null,
    "activo": true,
    "nombre": "1 BURGER ESPECIAL + 1 BURGER CHEFSY",
    "precio": 15000,
    "esCombo": true,
    "categoriaId": "patys",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1780975239120-898",
    "stock": null,
    "activo": true,
    "nombre": "2 MILAS ESPECIALES",
    "precio": 21000,
    "esCombo": true,
    "categoriaId": "lomos-y-milas",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1781142606295-905",
    "stock": null,
    "activo": true,
    "nombre": "COCA-COLA 600ml COMÚN",
    "precio": 2500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1781570580518-241",
    "stock": null,
    "activo": true,
    "nombre": "Paty Común",
    "precio": 8000,
    "esCombo": false,
    "categoriaId": "cat-1781570568487",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075",
      "mod-1781933530373"
    ]
  },
  {
    "id": "prod-1781570588797-274",
    "stock": null,
    "activo": true,
    "nombre": "Paty Especial",
    "precio": 8500,
    "esCombo": false,
    "categoriaId": "cat-1781570568487",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075",
      "mod-1781933530373"
    ]
  },
  {
    "id": "prod-1781570601243-437",
    "stock": null,
    "activo": true,
    "nombre": "Paty Chefsy",
    "precio": 10000,
    "esCombo": false,
    "categoriaId": "cat-1781570568487",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075",
      "mod-1781933530373"
    ]
  },
  {
    "id": "prod-1781570610792-585",
    "stock": null,
    "activo": true,
    "nombre": "Paty American",
    "precio": 9500,
    "esCombo": false,
    "categoriaId": "cat-1781570568487",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075",
      "mod-1781933530373"
    ]
  },
  {
    "id": "prod-1781570619787-432",
    "stock": null,
    "activo": true,
    "nombre": "Paty 4 Quesos",
    "precio": 9000,
    "esCombo": false,
    "categoriaId": "cat-1781570568487",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075",
      "mod-1781933530373"
    ]
  },
  {
    "id": "prod-1781574730912-966",
    "stock": null,
    "activo": true,
    "nombre": "Porción de papas con cheddar",
    "precio": 5500,
    "esCombo": false,
    "categoriaId": "cat-1781574714354",
    "modificadoresIds": [
      "mod-1781933554301"
    ]
  },
  {
    "id": "prod-1781574738897-72",
    "stock": null,
    "activo": true,
    "nombre": "Porción de papas",
    "precio": 4500,
    "esCombo": false,
    "categoriaId": "cat-1781574714354",
    "modificadoresIds": [
      "mod-1781933554301"
    ]
  },
  {
    "id": "prod-1781575936313-827",
    "stock": null,
    "activo": true,
    "nombre": "MEDIA CALABRESA",
    "precio": 6000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1781652832931-721",
    "stock": null,
    "activo": true,
    "nombre": "2 PATYS ESPECIALES",
    "precio": 15000,
    "esCombo": true,
    "categoriaId": "cat-1781570568487",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1781740437495-439",
    "stock": null,
    "activo": true,
    "nombre": "2 LOMOS ESPECIALES",
    "precio": 21000,
    "esCombo": true,
    "categoriaId": "cat-1780506096615",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1781740457908-958",
    "stock": null,
    "activo": true,
    "nombre": "2 LOMOS AMERICAN",
    "precio": 24000,
    "esCombo": true,
    "categoriaId": "cat-1780506096615",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1781740669572-984",
    "stock": null,
    "activo": true,
    "nombre": "1 LOMO ESP + 1 LOMO CHEFSY",
    "precio": 23000,
    "esCombo": true,
    "categoriaId": "cat-1780506096615",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1781740678387-85",
    "stock": null,
    "activo": true,
    "nombre": "2 LOMOS COMUNES",
    "precio": 19000,
    "esCombo": true,
    "categoriaId": "cat-1780506096615",
    "modificadoresIds": [
      "mod-1781933554301",
      "mod-1781933578075"
    ]
  },
  {
    "id": "prod-1782182960481-775",
    "stock": null,
    "activo": true,
    "nombre": "AQUARIUS MANZANA 1.5lts",
    "precio": 3500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782182970328-232",
    "stock": null,
    "activo": true,
    "nombre": "AQUARIUS POMELO ROSADO 1.5lts",
    "precio": 3500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782182982160-860",
    "stock": null,
    "activo": true,
    "nombre": "AQUARIUS PERA 375ml",
    "precio": 1500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782182991184-981",
    "stock": null,
    "activo": true,
    "nombre": "AQUARIUS NARANJA 375ml",
    "precio": 1500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782183015120-101",
    "stock": null,
    "activo": true,
    "nombre": "AQUARIUS POMELO 375ml",
    "precio": 1500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782183267208-483",
    "stock": null,
    "activo": true,
    "nombre": "AQUARIUS POMELO ROSADO 375ml",
    "precio": 1500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782183297848-83",
    "stock": null,
    "activo": true,
    "nombre": "Artesanal Amber 473ml",
    "precio": 2500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782183305567-83",
    "stock": null,
    "activo": true,
    "nombre": "Artesanal Honey 473ml",
    "precio": 2500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782183327463-540",
    "stock": null,
    "activo": true,
    "nombre": "Artesanal Lager",
    "precio": 1500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782183345584-602",
    "stock": null,
    "activo": true,
    "nombre": "Cerveza 1890",
    "precio": 2500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782183355950-186",
    "stock": null,
    "activo": true,
    "nombre": "Cerveza Bajocero 473ml",
    "precio": 2500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782183365855-287",
    "stock": null,
    "activo": true,
    "nombre": "Cerveza Imperial IPA",
    "precio": 2500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782183753233-579",
    "stock": null,
    "activo": true,
    "nombre": "AQUARIUS POMELO ROSADO 1.5lts",
    "precio": 3500,
    "esCombo": false,
    "categoriaId": "bebidas",
    "modificadoresIds": []
  },
  {
    "id": "prod-1782523162080-118",
    "stock": null,
    "activo": true,
    "nombre": "MEDIA FUGAZZETTA",
    "precio": 6000,
    "esCombo": false,
    "categoriaId": "pizzas",
    "modificadoresIds": []
  }
]

export const modificadoresCatalogo: ModificadorCatalogo[] = [
  {
    "id": "mod-1781933530373",
    "nombre": "Roquefort",
    "precioExtra": 1500
  },
  {
    "id": "mod-1781933554301",
    "nombre": "Extra pote de mayo",
    "precioExtra": 1000
  },
  {
    "id": "mod-1781933578075",
    "nombre": "Extra papas",
    "precioExtra": 1500
  },
  {
    "id": "mod-1781933693177",
    "nombre": "Ensalada de tomate y lechuga",
    "precioExtra": 0
  }
]

export const metadataRespaldo: Record<string, { nombre_publico: string; descripcion_publica: string; imagen_url: string }> = {
  "lomos-y-milas-chefsy": {
    "nombre_publico": "Mila Chefsy",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "lomos-y-milas-american": {
    "nombre_publico": "Mila American",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "patys-comun": {
    "nombre_publico": "Burger Común",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "zapping-american": {
    "nombre_publico": "Zapping American ",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "zapping-chefsy": {
    "nombre_publico": "Zapping Chefsy",
    "descripcion_publica": "",
    "imagen_url": "https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782000396/owzbgirplgffnqu6ycjf.webp"
  },
  "prod-1780506392974-556": {
    "nombre_publico": "Mila Común",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780506404868-70": {
    "nombre_publico": "Lomo Común",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "lomos-y-milas-especial": {
    "nombre_publico": "Mila Especial",
    "descripcion_publica": "",
    "imagen_url": "https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782346979850_ojawu.jpeg"
  },
  "pizzas-especial": {
    "nombre_publico": "",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781574738897-72": {
    "nombre_publico": "Porción de papas",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "tartas-xl-jamon-y-muzza": {
    "nombre_publico": "",
    "descripcion_publica": "",
    "imagen_url": "https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782000412/lcavznbjm0dbws1jkwfv.webp"
  },
  "tartas-xl-salame-y-muzza": {
    "nombre_publico": "",
    "descripcion_publica": "",
    "imagen_url": "https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782000420/gxai4wz5i8m4vrne2hl9.webp"
  },
  "prod-1780358767386-197": {
    "nombre_publico": "MEDIA MUZZA",
    "descripcion_publica": "",
    "imagen_url": "https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782009737/uaxhg1i98qzqfzkfn1f1.jpg | https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782009737/uciuia9wtsg68pupasv8.jpg"
  },
  "prod-1779932158043-401": {
    "nombre_publico": "Media especial",
    "descripcion_publica": "",
    "imagen_url": "https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782009780/moshvzpxe4lc6dpb809q.jpg | https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782009780/pqlxyfpkruyc4wg0rkx8.jpg"
  },
  "pizzas-muzzarella": {
    "nombre_publico": "MUZZARELLA",
    "descripcion_publica": "",
    "imagen_url": "https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1781928496/ze1n3fdoulwcywgsu5ew.jpg | https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1781928496/gquzhf2bdvokxueu2jwe.jpg"
  },
  "patys-especial": {
    "nombre_publico": "Burger Especial",
    "descripcion_publica": "",
    "imagen_url": "https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782009810/btwjx7btqxu4i28p0rzc.jpg | https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782009810/senjbimbzzg5rhyckf4i.jpg | https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782009810/qfpfcpnvzwlxg7rxxaqd.jpg"
  },
  "pizzas-napolitana": {
    "nombre_publico": "Napolitana",
    "descripcion_publica": "",
    "imagen_url": "https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782443322510_895dre.jpeg | https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782443323237_km5nq.jpeg"
  },
  "lomos-y-milas-4-quesos": {
    "nombre_publico": "Mila 4 Quesos",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "pizzas-argentina": {
    "nombre_publico": "ARGENTINA",
    "descripcion_publica": "",
    "imagen_url": "https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782014251/nxd8pxqzcirukumlf4vz.jpg"
  },
  "zapping-comun": {
    "nombre_publico": "Zapping Común",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "zapping-4-quesos": {
    "nombre_publico": "Zapping 4 Quesos",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "patys-chefsy": {
    "nombre_publico": "Burger Chefsy",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "patys-american": {
    "nombre_publico": "Burger American",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "patys-4-quesos": {
    "nombre_publico": "Burger 4 Quesos",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "pizzas-fugazzeta": {
    "nombre_publico": "Fugazzeta",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780506321180-163": {
    "nombre_publico": "Lomo American",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "pizzas-calabresa": {
    "nombre_publico": "Calabresa",
    "descripcion_publica": "",
    "imagen_url": "https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782443339924_nnjv77.jpeg | https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782443339944_f3xz0dp.jpeg | https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782443339234_emnqsd.jpeg"
  },
  "pizzas-roquefort": {
    "nombre_publico": "Roquefort",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837702199-442": {
    "nombre_publico": "COCA-COLA 2.25lts",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837747149-255": {
    "nombre_publico": "SPRITE 1.5lts",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837802685-172": {
    "nombre_publico": "SPRITE 375cc",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779840756425-936": {
    "nombre_publico": "Lomito de pollo",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779846391047-631": {
    "nombre_publico": "1 MUZZA + 1 ESPECIAL",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780101546747-767": {
    "nombre_publico": "ZAPPING ESPECIAL + 2.25",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780706531138-444": {
    "nombre_publico": "2 ZAPPING ESPECIALES",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781570580518-241": {
    "nombre_publico": "Paty Común",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781570619787-432": {
    "nombre_publico": "Paty 4 Quesos",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781740437495-439": {
    "nombre_publico": "2 LOMOS ESPECIALES",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782182960481-775": {
    "nombre_publico": "AQUARIUS MANZANA 1.5lts",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782183015120-101": {
    "nombre_publico": "AQUARIUS POMELO 375ml",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782183327463-540": {
    "nombre_publico": "Artesanal Lager",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782183753233-579": {
    "nombre_publico": "AQUARIUS POMELO ROSADO 1.5lts",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "pizzas-4-quesos": {
    "nombre_publico": "4 Quesos",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837714149-971": {
    "nombre_publico": "SPRITE 2.25lts",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837772661-992": {
    "nombre_publico": "AQUARIUS MANZANA 1.5lts",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837813726-941": {
    "nombre_publico": "COCA ZERO 375cc",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779841388328-939": {
    "nombre_publico": "MEDIA ARGENTINA",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780016168622-927": {
    "nombre_publico": "1 ZAPPING ESPECIAL + 1 ZAPPING AMERICANA",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780189871653-705": {
    "nombre_publico": "2 ZAPPING COMÚN",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780506329295-608": {
    "nombre_publico": "Lomo 4 Quesos",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780792906680-782": {
    "nombre_publico": "1 BURGER ESPECIAL + 1 BURGER CHEFSY",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781570588797-274": {
    "nombre_publico": "Paty Especial",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781574730912-966": {
    "nombre_publico": "Porción de papas con cheddar",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781740457908-958": {
    "nombre_publico": "2 LOMOS AMERICAN",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782182970328-232": {
    "nombre_publico": "AQUARIUS POMELO ROSADO 1.5lts",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782183267208-483": {
    "nombre_publico": "AQUARIUS POMELO ROSADO 375ml",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782183345584-602": {
    "nombre_publico": "Cerveza 1890",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "mila-al-plato-napolitana-con-papas": {
    "nombre_publico": "Napolitana con papas",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837729405-938": {
    "nombre_publico": "FANTA MANZANA 2.25lts",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837780549-768": {
    "nombre_publico": "FANTA 1.5lts",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837819730-483": {
    "nombre_publico": "COCA ZERO 2.25lts",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779842702207-427": {
    "nombre_publico": "ZAPPING ESPECIAL + ZAPPING CHEFSY",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780021634430-572": {
    "nombre_publico": "2 CHEESE",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780448959934-362": {
    "nombre_publico": "MEDIA 4 QUESOS",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780975239120-898": {
    "nombre_publico": "2 MILAS ESPECIALES",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781570601243-437": {
    "nombre_publico": "Paty Chefsy",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781575936313-827": {
    "nombre_publico": "MEDIA CALABRESA",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781740669572-984": {
    "nombre_publico": "1 LOMO ESP + 1 LOMO CHEFSY",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782182982160-860": {
    "nombre_publico": "AQUARIUS PERA 375ml",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782183297848-83": {
    "nombre_publico": "Artesanal Amber 473ml",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782183355950-186": {
    "nombre_publico": "Cerveza Bajocero 473ml",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "mila-al-plato-a-caballo-con-papas": {
    "nombre_publico": "A caballo con papas",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837740021-733": {
    "nombre_publico": "COCA-COLA 1.5lts",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837798902-6": {
    "nombre_publico": "COCA 375cc",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779837829377-677": {
    "nombre_publico": "AGUA MINERAL 500cc",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1779844667386-4": {
    "nombre_publico": "BURGER ESPECIAL + COCA 375ml",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780506298728-63": {
    "nombre_publico": "Lomo Chefsy",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781142606295-905": {
    "nombre_publico": "COCA-COLA 600ml COMÚN",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781570610792-585": {
    "nombre_publico": "Paty American",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781652832931-721": {
    "nombre_publico": "2 PATYS ESPECIALES",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1781740678387-85": {
    "nombre_publico": "2 LOMOS COMUNES",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782182991184-981": {
    "nombre_publico": "AQUARIUS NARANJA 375ml",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782183305567-83": {
    "nombre_publico": "Artesanal Honey 473ml",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1782183365855-287": {
    "nombre_publico": "Cerveza Imperial IPA",
    "descripcion_publica": "",
    "imagen_url": ""
  },
  "prod-1780506120462-538": {
    "nombre_publico": "Lomo Especial",
    "descripcion_publica": "",
    "imagen_url": "https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782346931837_5lgxt.jpeg"
  },
  "zapping-especial": {
    "nombre_publico": "Zapping Especial",
    "descripcion_publica": "",
    "imagen_url": "https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782443398352_9lvila.jpeg | https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782443398409_c9hyj.jpeg"
  },
  "prod-1780023700819-856": {
    "nombre_publico": "2 BURGERS ESPECIALES",
    "descripcion_publica": "",
    "imagen_url": ""
  }
}
