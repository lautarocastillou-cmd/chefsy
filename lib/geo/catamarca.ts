// ─────────────────────────────────────────────────────────────────────────────
// lib/geo/catamarca.ts
// Diccionario geográfico urbano optimizado para Valle Central de Catamarca
// (San Fernando del Valle de Catamarca, Valle Viejo y Fray Mamerto Esquiú)
// Permite resolución instantánea (0ms) en memoria de barrios, calles y referencias.
// ─────────────────────────────────────────────────────────────────────────────

export interface BarrioLocal {
  nombre: string
  alias: string[]
  centroide: {
    lat: number
    lng: number
  }
  ciudad: string
  esZonaMzaCasa?: boolean
}

export interface PuntoReferenciaLocal {
  nombre: string
  alias: string[]
  lat: number
  lng: number
  categoria: 'plaza' | 'hospital' | 'rotonda' | 'escuela' | 'comercial' | 'otro'
}

export const BOUNDING_BOX_CATAMARCA = {
  minLat: -28.5600,
  minLng: -65.8600,
  maxLat: -28.3600,
  maxLng: -65.6800,
}

export const CENTRO_CATAMARCA = {
  latitud: -28.4696,
  longitud: -65.7852, // Plaza 25 de Mayo
}

export const BARRIOS_CATAMARCA: BarrioLocal[] = [
  // ── Capital Zona Norte ──
  {
    nombre: 'Eva Perón',
    alias: ['Eva Peron', 'B° Eva Perón', 'Barrio Eva Peron', 'Eva Peron Norte', 'eva p', 'eva peron', 'b° eva p'],
    centroide: { lat: -28.4385, lng: -65.7870 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'Parque América',
    alias: ['Parque America', 'B° Parque América', 'b parque america'],
    centroide: { lat: -28.4485, lng: -65.7725 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'Parque la Gruta',
    alias: ['Parque La Gruta', 'La Gruta', 'b° la gruta'],
    centroide: { lat: -28.4280, lng: -65.7920 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: '500 Viviendas',
    alias: ['500 vv', '500vv', 'B° 500 vv', 'Barrio 500 Viviendas', 'b 500 vv'],
    centroide: { lat: -28.4410, lng: -65.7780 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'Los Ceibos',
    alias: ['Ceibos', 'B° Los Ceibos', 'b los ceibos'],
    centroide: { lat: -28.4430, lng: -65.7930 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'Las Américas',
    alias: ['Las Americas', 'B° Las Américas', 'b las americas'],
    centroide: { lat: -28.4460, lng: -65.7790 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'La Esperanza',
    alias: ['B° La Esperanza', 'b la esperanza'],
    centroide: { lat: -28.4350, lng: -65.7810 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'Parque Norte',
    alias: ['B° Parque Norte', 'b parque norte'],
    centroide: { lat: -28.4490, lng: -65.7820 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },

  // ── Capital Zona Oeste / Altas ──
  {
    nombre: 'Achachay',
    alias: ['B° Achachay', 'b achachay'],
    centroide: { lat: -28.4620, lng: -65.8110 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'Huayra Punco',
    alias: ['Huayra Punco 920', 'B° Huayra Punco', 'b huayra punco'],
    centroide: { lat: -28.4660, lng: -65.8080 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: '920 Viviendas',
    alias: ['920 vv', '920vv', 'B° 920 vv', 'Barrio 920', 'b 920 vv'],
    centroide: { lat: -28.4720, lng: -65.8030 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'Apolo',
    alias: ['B° Apolo', 'b apolo'],
    centroide: { lat: -28.4690, lng: -65.7990 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'Bella Vista',
    alias: ['B° Bella Vista', 'b bella vista'],
    centroide: { lat: -28.4610, lng: -65.8020 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },

  // ── Capital Zona Sur ──
  {
    nombre: '250 Viviendas',
    alias: ['250 vv', '250vv', 'B° 250 vv', 'Barrio 250 Viviendas', 'b 250 vv'],
    centroide: { lat: -28.4830, lng: -65.7950 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: '100 Viviendas',
    alias: ['100 vv', '100vv', 'B° 100 vv', 'b 100 vv'],
    centroide: { lat: -28.4870, lng: -65.7980 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: '140 Viviendas',
    alias: ['140 vv', '140vv', 'B° 140 vv', 'b 140 vv'],
    centroide: { lat: -28.4810, lng: -65.7910 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: '107 Viviendas',
    alias: ['107 vv', '107vv', 'B° 107 vv', 'b 107 vv'],
    centroide: { lat: -28.4890, lng: -65.7940 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: '40 Viviendas',
    alias: ['40 vv', '40vv', 'B° 40 vv', 'b 40 vv'],
    centroide: { lat: -28.4790, lng: -65.7930 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'Mil Viviendas',
    alias: ['1000 vv', '1000vv', 'B° Mil Viviendas', 'b mil viviendas', 'b 1000 vv'],
    centroide: { lat: -28.4750, lng: -65.7990 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'Libertador I',
    alias: ['B° Libertador 1', 'Libertador 1', 'b libertador 1'],
    centroide: { lat: -28.4760, lng: -65.8010 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'Libertador II',
    alias: ['B° Libertador 2', 'Libertador 2', 'b libertador 2'],
    centroide: { lat: -28.4780, lng: -65.8020 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'La Viñita',
    alias: ['La Vinita', 'B° La Viñita', 'b la vinita'],
    centroide: { lat: -28.4850, lng: -65.7820 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'Villa Cubas',
    alias: ['B° Villa Cubas', 'b villa cubas'],
    centroide: { lat: -28.4720, lng: -65.7900 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'La Tablada',
    alias: ['B° La Tablada', 'b la tablada'],
    centroide: { lat: -28.4760, lng: -65.7840 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'Almirante Brown',
    alias: ['B° Almirante Brown', 'Brown', 'b brown'],
    centroide: { lat: -28.4550, lng: -65.7950 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'Santa Marta',
    alias: ['B° Santa Marta', 'b santa marta'],
    centroide: { lat: -28.4950, lng: -65.7760 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'Ojo de Agua',
    alias: ['B° Ojo de Agua', 'b ojo de agua'],
    centroide: { lat: -28.4810, lng: -65.7780 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'Piloto',
    alias: ['B° Piloto', 'b piloto'],
    centroide: { lat: -28.4840, lng: -65.7730 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'San Cayetano',
    alias: ['B° San Cayetano', 'b san cayetano'],
    centroide: { lat: -28.4870, lng: -65.7690 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'Parque Sur',
    alias: ['B° Parque Sur', 'b parque sur'],
    centroide: { lat: -28.4880, lng: -65.7800 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },

  // ── Capital Zona Este ──
  {
    nombre: 'La Chacarita',
    alias: ['Chacarita', 'B° La Chacarita', 'b la chacarita'],
    centroide: { lat: -28.4660, lng: -65.7550 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'Banda de Varela',
    alias: ['B° Banda de Varela', 'b banda de varela'],
    centroide: { lat: -28.4320, lng: -65.7480 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'La Alameda',
    alias: ['Paseo General Navarro', 'Alameda'],
    centroide: { lat: -28.4630, lng: -65.7860 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'San Ramón',
    alias: ['B° San Ramon', 'b san ramon'],
    centroide: { lat: -28.4680, lng: -65.7750 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'Judicial',
    alias: ['B° Judicial', 'b judicial'],
    centroide: { lat: -28.4520, lng: -65.7670 },
    ciudad: 'San Fernando del Valle de Catamarca',
    esZonaMzaCasa: true,
  },
  {
    nombre: 'Vial',
    alias: ['B° Vial', 'b vial'],
    centroide: { lat: -28.4740, lng: -65.7710 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'Magisterio',
    alias: ['B° Magisterio', 'b magisterio'],
    centroide: { lat: -28.4570, lng: -65.7830 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'Autonomía',
    alias: ['Autonomia', 'B° Autonomía', 'b autonomia'],
    centroide: { lat: -28.4590, lng: -65.7710 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },
  {
    nombre: 'El Pantanillo',
    alias: ['Parque Industrial El Pantanillo', 'Pantanillo'],
    centroide: { lat: -28.5280, lng: -65.7790 },
    ciudad: 'San Fernando del Valle de Catamarca',
  },

  // ── Valle Viejo ──
  {
    nombre: 'San Isidro',
    alias: ['San Isidro Valle Viejo', 'Plaza San Isidro'],
    centroide: { lat: -28.4890, lng: -65.7330 },
    ciudad: 'Valle Viejo',
  },
  {
    nombre: 'Santa Rosa',
    alias: ['Santa Rosa Valle Viejo'],
    centroide: { lat: -28.4770, lng: -65.7320 },
    ciudad: 'Valle Viejo',
  },
  {
    nombre: 'Villa Dolores',
    alias: ['Villa Dolores Valle Viejo'],
    centroide: { lat: -28.4980, lng: -65.7380 },
    ciudad: 'Valle Viejo',
  },
  {
    nombre: 'Tres Puentes',
    alias: ['Puente de Valle Viejo', 'Tres Puentes'],
    centroide: { lat: -28.4720, lng: -65.7420 },
    ciudad: 'Valle Viejo',
  },
  {
    nombre: 'Polcos',
    alias: ['Polcos Valle Viejo'],
    centroide: { lat: -28.4630, lng: -65.7370 },
    ciudad: 'Valle Viejo',
  },
  {
    nombre: 'Sumalao',
    alias: ['Sumalao Valle Viejo'],
    centroide: { lat: -28.5080, lng: -65.7340 },
    ciudad: 'Valle Viejo',
  },
  {
    nombre: 'Pozo el Mistol',
    alias: ['El Mistol', 'Pozo del Mistol'],
    centroide: { lat: -28.5210, lng: -65.7300 },
    ciudad: 'Valle Viejo',
  },

  // ── Fray Mamerto Esquiú ──
  {
    nombre: 'Piedra Blanca',
    alias: ['Piedra Blanca FME', 'Fray Mamerto Esquiú'],
    centroide: { lat: -28.3960, lng: -65.7450 },
    ciudad: 'Fray Mamerto Esquiú',
  },
  {
    nombre: 'San Antonio',
    alias: ['San Antonio FME'],
    centroide: { lat: -28.4230, lng: -65.7390 },
    ciudad: 'Fray Mamerto Esquiú',
  },
]

export const CALLES_PRINCIPALES_CATAMARCA: string[] = [
  'Virgen del Valle', 'Ocampo', 'Belgrano', 'Recalde', 'Acosta Villafañe',
  'Presidente Castillo', 'Güemes', 'Italia', 'Colón', 'México', 'Choya',
  'Los Legisladores', 'Arturo Illia', 'Sanchez Oviedo', 'Hipolito Yrigoyen',
  'San Martín', 'Chacabuco', 'Mota Botello', 'Mate de Luna', 'República',
  'Esquiú', 'Prado', 'Rivadavia', 'Sarmiento', 'Maipú', 'Junín', 'Ayacucho',
  'Caseros', 'Salta', 'Tucumán', 'Catamarca', 'La Rioja', 'Camilo Melet',
  'Mariano Moreno', 'Conesa', 'Vicario Segura', 'Zurita', 'Almagro', 'Perú',
  'Piedras', 'Alem', 'Leandro N Alem', 'Echeverría', 'Rojas', 'Almafuerte',
  'Waldino Correa', 'Valle Fértil', 'Los Misioneros', 'San Juan', 'Mendoza'
]

export const PUNTOS_REFERENCIA_CATAMARCA: PuntoReferenciaLocal[] = [
  {
    nombre: 'Plaza 25 de Mayo',
    alias: ['Plaza Principal', 'La Plaza', 'Catedral', 'Plaza 25'],
    lat: -28.4696,
    lng: -65.7852,
    categoria: 'plaza',
  },
  {
    nombre: 'Predio Ferial Catamarca',
    alias: ['Predio Ferial', 'La Fiesta del Poncho', 'Fiesta del Poncho'],
    lat: -28.4552,
    lng: -65.7615,
    categoria: 'comercial',
  },
  {
    nombre: 'Hospital Interzonal San Juan Bautista',
    alias: ['Hospital San Juan', 'San Juan Bautista', 'Hospital San Juan Bautista'],
    lat: -28.4635,
    lng: -65.7690,
    categoria: 'hospital',
  },
  {
    nombre: 'Hospital de Niños Eva Perón',
    alias: ['Hospital de Niños', 'Hospital Eva Peron'],
    lat: -28.4610,
    lng: -65.7890,
    categoria: 'hospital',
  },
  {
    nombre: 'Parque de los Niños',
    alias: ['Parque de los Ninos'],
    lat: -28.4560,
    lng: -65.7760,
    categoria: 'plaza',
  },
  {
    nombre: 'Rotonda de la Quebrada',
    alias: ['Monumento a la Virgen', 'Quebrada de Choya', 'La Quebrada'],
    lat: -28.4190,
    lng: -65.8020,
    categoria: 'rotonda',
  },
  {
    nombre: 'Terminal de Ómnibus de Catamarca',
    alias: ['Terminal', 'Terminal de Catamarca', 'Terminal de Omnibus'],
    lat: -28.4735,
    lng: -65.7745,
    categoria: 'comercial',
  },
  {
    nombre: 'Universidad Nacional de Catamarca',
    alias: ['UNCA', 'Universidad', 'Facultad'],
    lat: -28.4630,
    lng: -65.7820,
    categoria: 'escuela',
  },
]
