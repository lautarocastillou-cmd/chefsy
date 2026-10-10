'use client'

import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Bike, Compass, Store, Box, Map as MapIcon } from 'lucide-react'
import {
  UBICACION_LOCAL,
  calcularDistanciaKm,
  obtenerRutaConduccion,
  obtenerRutaMultiParada,
  type Coordenadas,
} from '@/lib/ubicacion'
import { formatearPrecio } from '@/lib/utils'
import type { CadeteData, MapaGlobalProps } from './MapaGlobalLeaflet'

const ESTILOS_MAPA = {
  oscuro: 'https://tiles.openfreemap.org/styles/dark',
  claro: 'https://tiles.openfreemap.org/styles/liberty',
} as const
const WORKER_URL = '/lib/maplibre/maplibre-gl-worker.mjs'
const SOURCE_RUTAS = 'ruta-source'
const LAYER_RUTAS = 'ruta-line'
const CAPA_TRANSITO = 'poi_transit'

type ModoCamara = 'flota' | 'cadete' | 'manual' | 'local'
type EstiloMapa = keyof typeof ESTILOS_MAPA

function instalarCapaRutas(
  mapa: maplibregl.Map,
  features: Record<string, GeoJSON.Feature<GeoJSON.LineString>>
) {
  if (!mapa.getSource(SOURCE_RUTAS)) {
    mapa.addSource(SOURCE_RUTAS, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (!mapa.getLayer(LAYER_RUTAS)) {
    mapa.addLayer({
      id: LAYER_RUTAS,
      type: 'line',
      source: SOURCE_RUTAS,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#10b981', 'line-width': 4, 'line-opacity': 0.95 },
    })
  }
  const source = mapa.getSource(SOURCE_RUTAS) as maplibregl.GeoJSONSource | undefined
  source?.setData({ type: 'FeatureCollection', features: Object.values(features) })
}

/**
 * El estilo claro (OpenFreeMap Liberty) incluye paradas de colectivo en la
 * capa `poi_transit` (airport/bus/rail). En modo claro se excluye la clase
 * `bus` y se conservan aeropuerto/tren; en oscuro se restaura el filtro
 * original. Se reaplica en cada carga de estilo porque `setStyle` resetea
 * los filtros personalizados.
 */
function aplicarFiltrosEstilo(mapa: maplibregl.Map, estilo: EstiloMapa) {
  try {
    if (!mapa.getLayer(CAPA_TRANSITO)) return
    mapa.setFilter(
      CAPA_TRANSITO,
      estilo === 'claro'
        ? ['match', ['get', 'class'], ['airport', 'rail'], true, false]
        : ['match', ['get', 'class'], ['airport', 'bus', 'rail'], true, false]
    )
  } catch {
    // Si el estilo aún no está listo, se reintenta en la sincronización.
  }
}

interface Props extends MapaGlobalProps {
  onFatalError: () => void
}

function prepararWorkerMapLibre() {
  const libreria = maplibregl as typeof maplibregl & {
    setWorkerUrl?: (url: string) => void
  }
  libreria.setWorkerUrl?.(WORKER_URL)
}

function crearIconoLocal() {
  const elemento = document.createElement('div')
  elemento.setAttribute('aria-label', 'Local Chefsy')
  elemento.style.cssText = [
    'width:40px', 'height:40px', 'display:grid', 'place-items:center',
    'border:2px solid white', 'border-radius:50%', 'background:#2A6348',
    'color:white', 'font:700 11px system-ui', 'box-shadow:0 2px 8px #0005',
  ].join(';')
  elemento.textContent = 'C'
  return elemento
}

function crearIconoCadete(cadete: CadeteData, seleccionado: boolean, bajoConsumo: boolean) {
  const elemento = document.createElement('button')
  elemento.type = 'button'
  elemento.setAttribute('aria-label', `Seleccionar cadete ${cadete.nombre}`)
  elemento.style.cssText = [
    'position:relative',
    'width:38px', 'height:38px', 'display:grid', 'place-items:center',
    'border:2px solid white', 'border-radius:50%',
    `background:${cadete.pedidoActivo || (cadete.pedidosActivos?.length ?? 0) > 0 ? '#e11d48' : '#10b981'}`,
    `box-shadow:${bajoConsumo ? 'none' : `0 2px 10px #0006${seleccionado ? ',0 0 0 3px #ffffffaa' : ''}`}`,
    'color:white', 'font:700 11px system-ui', 'cursor:pointer',
  ].join(';')
  elemento.innerHTML = '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>'
  const nombre = document.createElement('span')
  nombre.textContent = cadete.nombre
  if (!bajoConsumo) {
    nombre.style.cssText = 'position:absolute;top:42px;left:50%;transform:translateX(-50%);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#0f172a;color:white;padding:2px 8px;border-radius:9999px;font:800 11px system-ui;border:1px solid white'
    elemento.appendChild(nombre)
  }
  return elemento
}

function obtenerPedidos(cadete: CadeteData) {
  return cadete.pedidosActivos?.length ? cadete.pedidosActivos : cadete.pedidoActivo ? [cadete.pedidoActivo] : []
}

function crearIconoCliente(nombre: string, parada: number, totalParadas: number, bajoConsumo: boolean) {
  const elemento = document.createElement('div')
  elemento.setAttribute('aria-label', `Entrega ${parada}: ${nombre}`)
  elemento.style.cssText = `position:relative;width:38px;height:38px;display:grid;place-items:center;border:2px solid white;border-radius:50%;background:${totalParadas > 1 && parada === 1 ? '#059669' : '#2563eb'};${bajoConsumo ? '' : 'box-shadow:0 4px 10px #2563eb66;'}color:white;font:900 12px system-ui`
  elemento.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
  if (!bajoConsumo) {
    const etiqueta = document.createElement('span')
    etiqueta.textContent = totalParadas > 1 ? `#${parada} ${nombre}` : nombre
    etiqueta.style.cssText = 'position:absolute;top:40px;left:50%;transform:translateX(-50%);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#1e40af;color:white;padding:2px 7px;border-radius:9999px;font:800 10px system-ui;border:1px solid white'
    elemento.appendChild(etiqueta)
  }
  return elemento
}

function contenidoPopupCadete(cadete: CadeteData) {
  const contenedor = document.createElement('div')
  contenedor.style.cssText = 'min-width:190px;padding:5px;font:12px system-ui;color:#0f172a'
  const titulo = document.createElement('strong')
  titulo.textContent = cadete.nombre
  titulo.style.cssText = 'display:block;font-size:14px;margin-bottom:6px'
  contenedor.appendChild(titulo)
  const pedidos = obtenerPedidos(cadete)
  const estado = document.createElement('div')
  estado.textContent = pedidos.length ? `EN REPARTO (${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'})` : 'DISPONIBLE'
  estado.style.cssText = `font-weight:800;color:${pedidos.length ? '#e11d48' : '#16a34a'};margin-bottom:5px`
  contenedor.appendChild(estado)
  pedidos.forEach((pedido, indice) => {
    const parada = document.createElement('div')
    parada.style.cssText = 'border-left:2px solid #e11d48;padding-left:6px;margin:4px 0'
    const cliente = document.createElement('strong')
    cliente.textContent = `#${pedido.parada_num || indice + 1}: ${pedido.cliente}`
    parada.appendChild(cliente)
    if (pedido.direccion) {
      const direccion = document.createElement('div')
      direccion.textContent = pedido.direccion
      direccion.style.cssText = 'color:#64748b;margin-top:2px'
      parada.appendChild(direccion)
    }
    if (pedido.total) {
      const total = document.createElement('div')
      total.textContent = formatearPrecio(pedido.total)
      total.style.fontWeight = '700'
      parada.appendChild(total)
    }
    contenedor.appendChild(parada)
  })
  if (cadete.bateria != null) {
    const bateria = document.createElement('div')
    bateria.textContent = `Batería: ${Math.round(cadete.bateria)}%`
    bateria.style.cssText = 'border-top:1px solid #e2e8f0;padding-top:5px;margin-top:5px;color:#64748b'
    contenedor.appendChild(bateria)
  }
  return contenedor
}

function contenidoPopupCliente(cadete: CadeteData, pedido: NonNullable<ReturnType<typeof obtenerPedidos>[number]>, parada: number, total: number) {
  const contenedor = document.createElement('div')
  contenedor.style.cssText = 'min-width:180px;padding:5px;font:12px system-ui;color:#0f172a'
  const titulo = document.createElement('strong')
  titulo.textContent = `Entrega: ${pedido.cliente}`
  titulo.style.cssText = 'display:block;color:#1e40af;font-size:13px;margin-bottom:5px'
  contenedor.appendChild(titulo)
  if (total > 1) {
    const orden = document.createElement('div')
    orden.textContent = `Parada ${parada} de ${total}`
    orden.style.cssText = 'color:#b45309;font-weight:700;margin-bottom:4px'
    contenedor.appendChild(orden)
  }
  if (pedido.direccion) {
    const direccion = document.createElement('div')
    direccion.textContent = pedido.direccion
    direccion.style.marginBottom = '4px'
    contenedor.appendChild(direccion)
  }
  const asignado = document.createElement('div')
  asignado.textContent = `Cadete asignado: ${cadete.nombre}`
  contenedor.appendChild(asignado)
  if (pedido.total) {
    const precio = document.createElement('strong')
    precio.textContent = `Total: ${formatearPrecio(pedido.total)}`
    precio.style.cssText = 'display:block;margin-top:3px'
    contenedor.appendChild(precio)
  }
  return contenedor
}

export default function MapaGlobalMapLibre({
  cadetes,
  focusedId,
  onSelectCadete,
  onFatalError,
  bajoConsumo = false,
}: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<maplibregl.Map | null>(null)
  const marcadorLocalRef = useRef<maplibregl.Marker | null>(null)
  const marcadoresCadeteRef = useRef<Record<string, maplibregl.Marker>>({})
  const marcadoresClienteRef = useRef<Record<string, maplibregl.Marker>>({})
  const firmasMarcadorCadeteRef = useRef<Record<string, string>>({})
  const firmasPopupCadeteRef = useRef<Record<string, string>>({})
  const firmasMarcadorClienteRef = useRef<Record<string, string>>({})
  const posicionesCadeteRef = useRef<Record<string, string>>({})
  const firmasRutaRef = useRef<Record<string, string>>({})
  const geometriaRutaRef = useRef<Record<string, [number, number][]>>({})
  const featuresRutaRef = useRef<Record<string, GeoJSON.Feature<GeoJSON.LineString>>>({})
  const firmaCapaRutasRef = useRef('')
  const abortRutasRef = useRef<Record<string, AbortController>>({})
  const ultimasSolicitudesRutaRef = useRef<Record<string, { lat: number; lng: number; at: number }>>({})
  const cadetesRef = useRef(cadetes)
  const onFatalErrorRef = useRef(onFatalError)
  const estiloAplicadoRef = useRef<EstiloMapa>('oscuro')
  const fatalRef = useRef(false)
  const modoBajoConsumoRef = useRef(bajoConsumo)
  const modoCamaraRef = useRef<ModoCamara>('flota')
  const [modoCamara, setModoCamara] = useState<ModoCamara>('flota')
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [estiloMapa, setEstiloMapa] = useState<EstiloMapa>('oscuro')
  const [versionEstilo, setVersionEstilo] = useState(0)
  const [vista3D, setVista3D] = useState(false)

  useEffect(() => {
    cadetesRef.current = cadetes
  }, [cadetes])

  useEffect(() => {
    onFatalErrorRef.current = onFatalError
  }, [onFatalError])

  useEffect(() => {
    if (!contenedorRef.current) return

    let observador: ResizeObserver | undefined
    let temporizador: number | undefined
    let cancelado = false

    const fallar = () => {
      if (cancelado || fatalRef.current) return
      fatalRef.current = true
      setEstado('error')
      onFatalErrorRef.current()
    }

    try {
      prepararWorkerMapLibre()
      // maplibre-gl.css declara `.maplibregl-map { position: relative }`, lo
      // que pisa `absolute inset-0` de Tailwind en el contenedor del mapa y
      // puede dejarlo con altura cero dentro del panel flex. Fijar el tamaño
      // en línea asegura que MapLibre mida el área real disponible.
      Object.assign(contenedorRef.current.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
      })
      const mapa = new maplibregl.Map({
        container: contenedorRef.current,
        style: ESTILOS_MAPA.oscuro,
        center: [UBICACION_LOCAL.longitud, UBICACION_LOCAL.latitud],
        zoom: 13,
        pitch: 0,
        attributionControl: false,
        fadeDuration: 0,
        maxTileCacheSize: bajoConsumo ? 60 : 120,
        canvasContextAttributes: {
          antialias: false,
          powerPreference: 'low-power',
          preserveDrawingBuffer: false,
        },
      })
      mapaRef.current = mapa
      mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
      mapa.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
      mapa.on('dragstart', () => {
        modoCamaraRef.current = 'manual'
        setModoCamara('manual')
      })
      mapa.on('rotatestart', () => {
        modoCamaraRef.current = 'manual'
        setModoCamara('manual')
      })

      // No se cambia a Leaflet por fallos aislados de tiles: solo por error
      // fatal del motor o si el estilo no llega a cargar dentro del timeout.
      mapa.on('error', (evento) => {
        const mensaje = evento.error?.message ?? ''
        if (/webgl|worker|failed to initialize/i.test(mensaje)) {
          fallar()
        }
      })

      mapa.once('load', () => {
        if (cancelado) return
        window.clearTimeout(temporizador)
        instalarCapaRutas(mapa, featuresRutaRef.current)
        aplicarFiltrosEstilo(mapa, estiloAplicadoRef.current)
        setEstado('listo')
        mapa.resize()
        marcadorLocalRef.current = new maplibregl.Marker({
          element: crearIconoLocal(),
          anchor: 'center',
        })
          .setLngLat([UBICACION_LOCAL.longitud, UBICACION_LOCAL.latitud])
          .addTo(mapa)
      })

      mapa.on('idle', () => {
        if (cancelado || fatalRef.current) return
        window.clearTimeout(temporizador)
        setEstado('listo')
        marcadorLocalRef.current ??= new maplibregl.Marker({
          element: crearIconoLocal(),
          anchor: 'center',
        })
          .setLngLat([UBICACION_LOCAL.longitud, UBICACION_LOCAL.latitud])
          .addTo(mapa)
      })

      temporizador = window.setTimeout(fallar, 15000)
      observador = new ResizeObserver(() => mapa.resize())
      observador.observe(contenedorRef.current)
      window.setTimeout(() => mapa.resize(), 100)
    } catch {
      fallar()
    }

    return () => {
      cancelado = true
      window.clearTimeout(temporizador)
      observador?.disconnect()
      Object.values(abortRutasRef.current).forEach((controller) => controller.abort())
      abortRutasRef.current = {}
      ultimasSolicitudesRutaRef.current = {}
      featuresRutaRef.current = {}
      firmaCapaRutasRef.current = ''
      Object.values(marcadoresCadeteRef.current).forEach((marcador) => marcador.remove())
      marcadoresCadeteRef.current = {}
      Object.values(marcadoresClienteRef.current).forEach((marcador) => marcador.remove())
      marcadoresClienteRef.current = {}
      marcadorLocalRef.current?.remove()
      marcadorLocalRef.current = null
      mapaRef.current?.remove()
      mapaRef.current = null
    }
  }, [])

  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || estado !== 'listo' || !mapa.isStyleLoaded()) return

    // El modo de rendimiento se detecta justo después del montaje. Si cambia
    // en ese primer render, reconstruimos solo los marcadores DOM para aplicar
    // la variante liviana sin reiniciar MapLibre ni volver a cargar tiles.
    if (modoBajoConsumoRef.current !== bajoConsumo) {
      Object.values(marcadoresCadeteRef.current).forEach((marcador) => marcador.remove())
      Object.values(marcadoresClienteRef.current).forEach((marcador) => marcador.remove())
      marcadoresCadeteRef.current = {}
      firmasMarcadorCadeteRef.current = {}
      firmasPopupCadeteRef.current = {}
      marcadoresClienteRef.current = {}
      firmasMarcadorClienteRef.current = {}
      posicionesCadeteRef.current = {}
      modoBajoConsumoRef.current = bajoConsumo
    }

    const idsValidos = new Set(
      cadetes
        .filter((cadete) => cadete.gps_activo && cadete.lat != null && cadete.lng != null)
        .map((cadete) => cadete.id)
    )

    for (const [id, marcador] of Object.entries(marcadoresCadeteRef.current)) {
      if (!idsValidos.has(id)) {
        marcador.remove()
        delete marcadoresCadeteRef.current[id]
        abortRutasRef.current[id]?.abort()
        delete abortRutasRef.current[id]
        delete firmasRutaRef.current[id]
        delete geometriaRutaRef.current[id]
        delete featuresRutaRef.current[id]
        delete ultimasSolicitudesRutaRef.current[id]
        delete firmasMarcadorCadeteRef.current[id]
        delete firmasPopupCadeteRef.current[id]
        delete posicionesCadeteRef.current[id]
      }
    }

    const idsClientesActivos = new Set<string>()
    cadetes.forEach((cadete) => {
      if (!cadete.gps_activo || cadete.lat == null || cadete.lng == null) return
      const pedidos = obtenerPedidos(cadete)
      let marcador = marcadoresCadeteRef.current[cadete.id]

      const firmaMarcadorCadete = [
        cadete.nombre,
        cadete.gps_activo,
        cadete.bateria == null ? '' : Math.round(cadete.bateria),
        cadete.pedidoActivo?.id ?? '',
        cadete.pedidosActivos?.map((pedido) => `${pedido.id}:${pedido.parada_num ?? ''}:${pedido.orden_entrega ?? ''}`).join(',') ?? '',
        cadete.id === focusedId,
        bajoConsumo,
      ].join('|')
      const firmaPopupCadete = [
        firmaMarcadorCadete,
        cadete.updated_at ? Math.floor(new Date(cadete.updated_at).getTime() / 30000) : '',
        pedidos.map((pedido) => `${pedido.id}:${pedido.cliente}:${pedido.direccion ?? ''}:${pedido.total ?? ''}:${pedido.parada_num ?? ''}`).join('|'),
      ].join('::')

      if (!marcador) {
        const elemento = crearIconoCadete(cadete, cadete.id === focusedId, bajoConsumo)
        elemento.addEventListener('click', () => onSelectCadete?.(cadete.id))
        marcador = new maplibregl.Marker({ element: elemento, anchor: 'center' })
          .setLngLat([cadete.lng, cadete.lat])
          .addTo(mapa)
          .setPopup(new maplibregl.Popup({ offset: 28, maxWidth: '320px' }).setDOMContent(contenidoPopupCadete(cadete)))
        marcadoresCadeteRef.current[cadete.id] = marcador
        firmasMarcadorCadeteRef.current[cadete.id] = firmaMarcadorCadete
        firmasPopupCadeteRef.current[cadete.id] = firmaPopupCadete
        posicionesCadeteRef.current[cadete.id] = `${cadete.lng.toFixed(6)},${cadete.lat.toFixed(6)}`
      } else {
        const nueva: [number, number] = [cadete.lng, cadete.lat]
        const posicionCadete = `${cadete.lng.toFixed(6)},${cadete.lat.toFixed(6)}`
        if (posicionesCadeteRef.current[cadete.id] !== posicionCadete) {
          marcador.setLngLat(nueva)
          posicionesCadeteRef.current[cadete.id] = posicionCadete
        }
        if (firmasMarcadorCadeteRef.current[cadete.id] !== firmaMarcadorCadete) {
          const elemento = marcador.getElement()
          elemento.style.background = cadete.pedidoActivo || (cadete.pedidosActivos?.length ?? 0) > 0
            ? '#e11d48'
            : '#10b981'
          const seleccionado = cadete.id === focusedId
          elemento.style.boxShadow = bajoConsumo
            ? 'none'
            : seleccionado ? '0 2px 10px #0006,0 0 0 3px #ffffffaa' : '0 2px 10px #0006'
          elemento.setAttribute('aria-label', `Seleccionar cadete ${cadete.nombre}`)
          const etiqueta = elemento.querySelector('span')
          if (etiqueta) etiqueta.textContent = cadete.nombre
          firmasMarcadorCadeteRef.current[cadete.id] = firmaMarcadorCadete
        }
        if (firmasPopupCadeteRef.current[cadete.id] !== firmaPopupCadete) {
          marcador.getPopup()?.setDOMContent(contenidoPopupCadete(cadete))
          firmasPopupCadeteRef.current[cadete.id] = firmaPopupCadete
        }
      }

      const mostrarDetallesRuta = !bajoConsumo || cadete.id === focusedId
      const paradas = pedidos.filter((pedido) =>
        mostrarDetallesRuta &&
        pedido.coordenadas &&
        Number.isFinite(pedido.coordenadas.latitud) &&
        Number.isFinite(pedido.coordenadas.longitud)
      )
      paradas.forEach((pedido, indice) => {
        const key = pedido.id
        idsClientesActivos.add(key)
        const parada = pedido.parada_num || indice + 1
        const firmaMarcadorCliente = [
          pedido.coordenadas!.latitud,
          pedido.coordenadas!.longitud,
          pedido.cliente,
          pedido.direccion ?? '',
          pedido.total ?? '',
          parada,
          paradas.length,
          cadete.id,
          bajoConsumo,
        ].join('|')
        let markerCliente = marcadoresClienteRef.current[key]
        if (!markerCliente) {
          markerCliente = new maplibregl.Marker({
            element: crearIconoCliente(pedido.cliente, parada, paradas.length, bajoConsumo),
            anchor: 'top',
          })
            .setLngLat([pedido.coordenadas!.longitud, pedido.coordenadas!.latitud])
            .setPopup(new maplibregl.Popup({ offset: 24, maxWidth: '300px' }).setDOMContent(
              contenidoPopupCliente(cadete, pedido, parada, paradas.length)
            ))
            .addTo(mapa)
          marcadoresClienteRef.current[key] = markerCliente
        } else {
          if (firmasMarcadorClienteRef.current[key] !== firmaMarcadorCliente) {
            markerCliente.setLngLat([pedido.coordenadas!.longitud, pedido.coordenadas!.latitud])
            markerCliente.getPopup()?.setDOMContent(contenidoPopupCliente(cadete, pedido, parada, paradas.length))
            firmasMarcadorClienteRef.current[key] = firmaMarcadorCliente
          }
        }
        if (!firmasMarcadorClienteRef.current[key]) firmasMarcadorClienteRef.current[key] = firmaMarcadorCliente
      })

      if (paradas.length) {
        const firma = paradas.map((pedido) =>
          `${pedido.id}:${pedido.coordenadas!.latitud.toFixed(5)},${pedido.coordenadas!.longitud.toFixed(5)}`
        ).join('|')
        const start: [number, number] = [cadete.lng, cadete.lat]
        const geometria = geometriaRutaRef.current[cadete.id]
        const coordenadasRuta = geometria?.length
          ? [[...start], ...geometria.slice(1)]
          : [start, ...paradas.map((pedido) => [pedido.coordenadas!.longitud, pedido.coordenadas!.latitud])]

        featuresRutaRef.current[cadete.id] = {
          type: 'Feature',
          properties: { cadeteId: cadete.id },
          geometry: { type: 'LineString', coordinates: coordenadasRuta },
        }

        const solicitudAnterior = ultimasSolicitudesRutaRef.current[cadete.id]
        const distanciaDesdeUltimaSolicitud = solicitudAnterior
          ? calcularDistanciaKm(
            { latitud: solicitudAnterior.lat, longitud: solicitudAnterior.lng },
            { latitud: cadete.lat, longitud: cadete.lng }
          ) * 1000
          : Infinity
        const puedeRecalcularPorAvance = distanciaDesdeUltimaSolicitud >= 250 &&
          (!solicitudAnterior || performance.now() - solicitudAnterior.at >= 30000)
        const itinerarioCambio = firmasRutaRef.current[cadete.id] !== firma
        const haySolicitudEnCurso = Boolean(abortRutasRef.current[cadete.id])
        const tieneGeometria = Boolean(geometriaRutaRef.current[cadete.id]?.length)

        if (itinerarioCambio || (!tieneGeometria && !haySolicitudEnCurso) || (puedeRecalcularPorAvance && !haySolicitudEnCurso)) {
          firmasRutaRef.current[cadete.id] = firma
          if (itinerarioCambio) abortRutasRef.current[cadete.id]?.abort()
          const controller = new AbortController()
          abortRutasRef.current[cadete.id] = controller
          ultimasSolicitudesRutaRef.current[cadete.id] = {
            lat: cadete.lat,
            lng: cadete.lng,
            at: performance.now(),
          }
          const origen: Coordenadas = { latitud: cadete.lat, longitud: cadete.lng }
          const destinos: Coordenadas[] = paradas.map((pedido) => ({
            latitud: pedido.coordenadas!.latitud,
            longitud: pedido.coordenadas!.longitud,
          }))
          const cadeteId = cadete.id
          const nombre = cadete.nombre
          const solicitarRuta = destinos.length === 1
            ? obtenerRutaConduccion(origen, destinos[0], controller.signal)
            : obtenerRutaMultiParada([origen, ...destinos], controller.signal)

          void solicitarRuta.then((ruta) => {
            if (!ruta?.puntos?.length || controller.signal.aborted || mapaRef.current !== mapa) return
            geometriaRutaRef.current[cadeteId] = ruta.puntos.map(([lat, lng]) => [lng, lat])
            featuresRutaRef.current[cadeteId] = {
              type: 'Feature',
              properties: { cadeteId },
              geometry: { type: 'LineString', coordinates: geometriaRutaRef.current[cadeteId] },
            }
            instalarCapaRutas(mapa, featuresRutaRef.current)
            firmaCapaRutasRef.current = ''
          }).catch((error: unknown) => {
            if (!controller.signal.aborted) console.warn(`[TorreControl] Error al obtener ruta para ${nombre}:`, error)
          }).finally(() => {
            if (abortRutasRef.current[cadeteId] === controller) {
              delete abortRutasRef.current[cadeteId]
            }
          })
        }
      } else {
        abortRutasRef.current[cadete.id]?.abort()
        delete abortRutasRef.current[cadete.id]
        delete firmasRutaRef.current[cadete.id]
        delete geometriaRutaRef.current[cadete.id]
        delete featuresRutaRef.current[cadete.id]
        delete ultimasSolicitudesRutaRef.current[cadete.id]
      }
    })

    for (const [id, marker] of Object.entries(marcadoresClienteRef.current)) {
      if (!idsClientesActivos.has(id)) {
        marker.remove()
        delete marcadoresClienteRef.current[id]
        delete firmasMarcadorClienteRef.current[id]
      }
    }

    const firmaCapaRutas = Object.entries(featuresRutaRef.current)
      .map(([id, feature]) => `${id}:${feature.geometry.coordinates.map((p) => `${p[0]},${p[1]}`).join(';')}`)
      .sort()
      .join('|')
    if (firmaCapaRutasRef.current !== firmaCapaRutas) {
      instalarCapaRutas(mapa, featuresRutaRef.current)
      firmaCapaRutasRef.current = firmaCapaRutas
    }
    aplicarFiltrosEstilo(mapa, estiloMapa)
  }, [cadetes, estado, focusedId, onSelectCadete, versionEstilo, estiloMapa, bajoConsumo])

  useEffect(() => {
    if (!focusedId) return
    modoCamaraRef.current = 'cadete'
    const cadete = cadetesRef.current.find((item) => item.id === focusedId)
    const mapa = mapaRef.current
    if (!mapa) return

    const marcadorCliente = marcadoresClienteRef.current[focusedId]
    if (!cadete || cadete.lat == null || cadete.lng == null) {
      if (marcadorCliente) {
        const coordenadas = marcadorCliente.getLngLat()
        mapa.easeTo({ center: [coordenadas.lng, coordenadas.lat], zoom: 16, duration: 800 })
        if (!marcadorCliente.getPopup()?.isOpen()) marcadorCliente.togglePopup()
      }
      return
    }

    mapa.easeTo({ center: [cadete.lng, cadete.lat], zoom: 16, duration: 800 })
    const marcadorCadete = marcadoresCadeteRef.current[focusedId]
    if (marcadorCadete) {
      if (!marcadorCadete.getPopup()?.isOpen()) marcadorCadete.togglePopup()
    } else if (marcadorCliente) {
      const coordenadas = marcadorCliente.getLngLat()
      mapa.easeTo({ center: [coordenadas.lng, coordenadas.lat], zoom: 16, duration: 800 })
      if (!marcadorCliente.getPopup()?.isOpen()) marcadorCliente.togglePopup()
    }
  }, [focusedId, estado])

  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || estado !== 'listo' || estiloAplicadoRef.current === estiloMapa) return
    estiloAplicadoRef.current = estiloMapa
    const reinstalarRutas = () => {
      instalarCapaRutas(mapa, featuresRutaRef.current)
      aplicarFiltrosEstilo(mapa, estiloMapa)
      setVersionEstilo((version) => version + 1)
    }
    mapa.on('style.load', reinstalarRutas)
    mapa.setStyle(ESTILOS_MAPA[estiloMapa])
    return () => {
      mapa.off('style.load', reinstalarRutas)
    }
  }, [estiloMapa, estado])

  const cambiarModoCamara = (modo: ModoCamara) => {
    modoCamaraRef.current = modo
    setModoCamara(modo)
    const mapa = mapaRef.current
    if (!mapa) return

    if (modo === 'cadete') {
      const cadete = cadetesRef.current.find((item) => item.id === focusedId)
      if (cadete?.lat != null && cadete.lng != null) {
        mapa.easeTo({ center: [cadete.lng, cadete.lat], zoom: 16, pitch: vista3D ? 45 : 0, duration: 700 })
      }
      return
    }

    if (modo === 'flota') {
      const bounds = new maplibregl.LngLatBounds()
      bounds.extend([UBICACION_LOCAL.longitud, UBICACION_LOCAL.latitud])
      cadetesRef.current.forEach((cadete) => {
        if (cadete.gps_activo && cadete.lat != null && cadete.lng != null) bounds.extend([cadete.lng, cadete.lat])
        obtenerPedidos(cadete).forEach((pedido) => {
          if (pedido.coordenadas && Number.isFinite(pedido.coordenadas.latitud) && Number.isFinite(pedido.coordenadas.longitud)) {
            bounds.extend([pedido.coordenadas.longitud, pedido.coordenadas.latitud])
          }
        })
      })
      mapa.fitBounds(bounds, { padding: 70, maxZoom: 16, pitch: vista3D ? 25 : 0, duration: 700 })
    }

    if (modo === 'local') {
      mapa.easeTo({ center: [UBICACION_LOCAL.longitud, UBICACION_LOCAL.latitud], zoom: 15, pitch: vista3D ? 45 : 0, bearing: 0, duration: 700 })
    }
  }

  const alternarVista = () => {
    const siguiente = !vista3D
    setVista3D(siguiente)
    mapaRef.current?.easeTo({ pitch: siguiente ? 45 : 0, duration: 500 })
  }

  return (
    <div className={`mapa-bajo-consumo-${bajoConsumo ? 'si' : 'no'} relative z-0 h-full min-h-[400px] w-full overflow-hidden bg-slate-100 dark:bg-slate-900`}>
      <div ref={contenedorRef} className="absolute inset-0" />
      <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-xl border border-white/15 bg-slate-950/85 p-1 shadow-lg backdrop-blur" aria-label="Controles del mapa">
        {([
          ['flota', 'Ver toda la flota', 'flota'],
          ['cadete', 'Seguir cadete seleccionado', 'cadete'],
          ['manual', 'Cámara libre', 'manual'],
          ['local', 'Centrar en el local Chefsy', 'local'],
        ] as const).map(([modo, etiqueta, icono]) => (
          <button
            key={modo}
            type="button"
            onClick={() => cambiarModoCamara(modo)}
            aria-pressed={modoCamara === modo}
            title={etiqueta}
            aria-label={etiqueta}
            className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-bold transition-colors ${modoCamara === modo ? 'bg-emerald-500 text-white' : 'text-slate-200 hover:bg-white/10'}`}
          >
            {icono === 'flota' ? <Compass size={17} /> : icono === 'cadete' ? <Bike size={17} /> : icono === 'local' ? <Store size={17} /> : 'Libre'}
          </button>
        ))}
        {!bajoConsumo && <button
          type="button"
          onClick={alternarVista}
          aria-pressed={vista3D}
          aria-label={vista3D ? 'Cambiar a vista 2D' : 'Cambiar a vista 3D'}
          title={vista3D ? 'Vista 3D (cambiar a 2D)' : 'Vista 2D (cambiar a 3D)'}
          className="flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-slate-200 transition-colors hover:bg-white/10"
        >
          {vista3D ? <MapIcon size={17} /> : <Box size={17} />}
        </button>}
        <div className="mx-0.5 w-px bg-white/15" aria-hidden="true" />
        {(['oscuro', 'claro'] as const).map((estilo) => (
          <button
            key={estilo}
            type="button"
            onClick={() => setEstiloMapa(estilo)}
            aria-pressed={estiloMapa === estilo}
            aria-label={`Estilo ${estilo}`}
            title={`Estilo ${estilo}`}
            className={`rounded-lg px-2 py-1.5 text-[10px] font-bold capitalize ${estiloMapa === estilo ? 'bg-emerald-500 text-white' : 'text-slate-200 hover:bg-white/10'}`}
          >
            {estilo}
          </button>
        ))}
      </div>
      {estado === 'cargando' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-slate-100 text-sm font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          Cargando mapa experimental…
        </div>
      )}
    </div>
  )
}
