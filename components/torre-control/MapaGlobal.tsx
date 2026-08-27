'use client'

import { useEffect, useRef } from 'react'
import { UBICACION_LOCAL } from '@/lib/ubicacion'
import { formatearPrecio } from '@/lib/utils'
import 'leaflet/dist/leaflet.css'

// Coordenadas del local Chefsy
const LOCAL_LAT = UBICACION_LOCAL.latitud
const LOCAL_LNG = UBICACION_LOCAL.longitud

export interface CadeteData {
  id: string
  nombre: string
  lat: number | null
  lng: number | null
  gps_activo: boolean
  bateria?: number | null
  updated_at: string | null
  segundos_offline?: number | null
  pedidoActivo?: {
    id: string
    cliente: string
    direccion?: string | null
    coordenadas?: { latitud: number; longitud: number } | null
    estado: string
    total?: number | null
  } | null
}

interface MapaGlobalProps {
  cadetes: CadeteData[]
  focusedId?: string | null
}

export default function MapaGlobal({ cadetes, focusedId }: MapaGlobalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<{
    local?: any
    cadetes: Record<string, any>
    clientes: Record<string, any>
    rutas: Record<string, any>
  }>({ cadetes: {}, clientes: {}, rutas: {} })

  // 1. Inicializar Mapa (1 sola vez al montar)
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapInstanceRef.current) return

    const L = require('leaflet')

    // Evitar errores de re-inicialización
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id
    }

    const map = L.map(mapContainerRef.current, {
      center: [LOCAL_LAT, LOCAL_LNG],
      zoom: 14,
      zoomControl: true,
    })

    // Tiles de Google Maps (alta definición, ultra rápido y sin bloqueos de tiles)
    L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    }).addTo(map)

    mapInstanceRef.current = map

    // Marcador del Local Chefsy
    const localIcon = L.divIcon({
      html: `
        <div style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;background:#DC2626;border:3px solid #fff;border-radius:50%;box-shadow:0 4px 12px rgba(220,38,38,0.45);font-size:24px;user-select:none;">
          🏪
        </div>
      `,
      className: 'custom-local-icon',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -24],
    })

    markersRef.current.local = L.marker([LOCAL_LAT, LOCAL_LNG], { icon: localIcon, zIndexOffset: 500 })
      .addTo(map)
      .bindPopup(`
        <div style="text-align:center;padding:4px;font-family:sans-serif;">
          <b style="font-size:14px;color:#1e293b;">🏪 Local Chefsy</b>
          <p style="margin:4px 0 0;font-size:11px;color:#64748b;">Punto de retiro y cocina</p>
        </div>
      `)

    // Múltiples invalidaciones para garantizar renderizado inmediato del mapa
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 400)
    const t3 = setTimeout(() => map.invalidateSize(), 1000)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize()
      })
      resizeObserver.observe(mapContainerRef.current)
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      if (resizeObserver) resizeObserver.disconnect()
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markersRef.current = { cadetes: {}, clientes: {}, rutas: {} }
      }
    }
  }, [])

  // 2. Actualizar marcadores de cadetes, clientes y rutas
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const L = require('leaflet')
    const map = mapInstanceRef.current

    // Cadetes con ubicación válida
    const cadetesConUbicacion = cadetes.filter((c) => c.lat != null && c.lng != null && c.gps_activo)
    const currentCadeteIds = new Set(cadetesConUbicacion.map((c) => c.id))

    // Limpiar marcadores de cadetes viejos/inactivos
    Object.keys(markersRef.current.cadetes).forEach((id) => {
      if (!currentCadeteIds.has(id)) {
        markersRef.current.cadetes[id].remove()
        delete markersRef.current.cadetes[id]
      }
    })

    // Clientes con pedidos activos y coordenadas
    const activeClientOrderIds = new Set<string>()

    // Dibujar o actualizar cadetes y sus clientes
    cadetes.forEach((cadete) => {
      const tieneGps = cadete.lat != null && cadete.lng != null && cadete.gps_activo
      const esEnViaje = !!cadete.pedidoActivo
      const colorBg = esEnViaje ? '#EA580C' : '#10B981'
      const sombraColor = esEnViaje ? 'rgba(234,88,12,0.45)' : 'rgba(16,185,129,0.45)'
      
      const batBadge =
        cadete.bateria != null
          ? `<div style="position:absolute;top:-6px;right:-8px;background:${
              cadete.bateria > 20 ? '#10B981' : '#EF4444'
            };color:#fff;font-size:9px;font-weight:900;padding:1px 4px;border-radius:10px;border:1.5px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.25);">${Math.round(
              cadete.bateria
            )}%</div>`
          : ''

      // A) Marcador del Cadete (con nombre visible para el administrador)
      if (tieneGps && cadete.lat != null && cadete.lng != null) {
        const cadeteIcon = L.divIcon({
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;">
              <div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;background:${colorBg};border:3px solid #fff;border-radius:50%;box-shadow:0 4px 12px ${sombraColor};font-size:22px;">
                🛵
                ${batBadge}
              </div>
              <div style="margin-top:2px;background:rgba(15,23,42,0.92);color:#ffffff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.35);white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;border:1.5px solid #ffffff;letter-spacing:0.2px;">
                ${cadete.nombre}
              </div>
            </div>
          `,
          className: 'custom-cadete-icon',
          iconSize: [120, 72],
          iconAnchor: [60, 22],
          popupAnchor: [0, -24],
        })

        const popupContent = `
          <div style="min-width:180px;padding:4px;font-family:sans-serif;">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
              <b style="font-size:14px;color:#0f172a;">🛵 ${cadete.nombre}</b>
              ${
                cadete.bateria != null
                  ? `<span style="font-size:11px;font-weight:bold;color:${
                      cadete.bateria > 20 ? '#16a34a' : '#dc2626'
                    };background:${
                      cadete.bateria > 20 ? '#dcfce7' : '#fee2e2'
                    };padding:2px 6px;border-radius:6px;">${Math.round(cadete.bateria)}%</span>`
                  : ''
              }
            </div>
            <div style="font-size:12px;margin-bottom:6px;">
              ${
                cadete.pedidoActivo
                  ? `<span style="color:#ea580c;font-weight:bold;">📦 EN VIAJE</span>
                     <div style="color:#334155;font-size:12px;margin-top:2px;">Cliente: <b>${cadete.pedidoActivo.cliente}</b></div>
                     ${cadete.pedidoActivo.direccion ? `<div style="color:#64748b;font-size:11px;margin-top:1px;">📍 ${cadete.pedidoActivo.direccion}</div>` : ''}`
                  : `<span style="color:#16a34a;font-weight:bold;">🟢 DISPONIBLE</span>
                     <div style="color:#64748b;font-size:11px;margin-top:2px;">En espera en el local</div>`
              }
            </div>
            <div style="font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:4px;">
              Última señal: ${cadete.updated_at ? new Date(cadete.updated_at).toLocaleTimeString() : 'Hace instantes'}
            </div>
          </div>
        `

        if (markersRef.current.cadetes[cadete.id]) {
          markersRef.current.cadetes[cadete.id].setLatLng([cadete.lat, cadete.lng])
          markersRef.current.cadetes[cadete.id].setIcon(cadeteIcon)
          markersRef.current.cadetes[cadete.id].setPopupContent(popupContent)
        } else {
          markersRef.current.cadetes[cadete.id] = L.marker([cadete.lat, cadete.lng], {
            icon: cadeteIcon,
            zIndexOffset: 300,
          })
            .addTo(map)
            .bindPopup(popupContent)
        }
      }

      // B) Marcador del Cliente de Entrega (con nombre del cliente siempre visible)
      const coords = cadete.pedidoActivo?.coordenadas
      if (cadete.pedidoActivo && coords && coords.latitud != null && coords.longitud != null) {
        const pedido = cadete.pedidoActivo
        const clientKey = `cliente_${pedido.id}`
        activeClientOrderIds.add(clientKey)

        const clientLat = coords.latitud
        const clientLng = coords.longitud

        const clienteIcon = L.divIcon({
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;">
              <div style="position:relative;display:flex;align-items:center;justify-content:center;width:42px;height:42px;background:#2563EB;border:3px solid #fff;border-radius:50%;box-shadow:0 4px 10px rgba(37,99,235,0.4);font-size:20px;">
                🏠
              </div>
              <div style="margin-top:2px;background:#1e40af;color:#ffffff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;border:1.5px solid #ffffff;letter-spacing:0.2px;">
                ${pedido.cliente}
              </div>
            </div>
          `,
          className: 'custom-cliente-icon',
          iconSize: [120, 70],
          iconAnchor: [60, 21],
          popupAnchor: [0, -22],
        })

        const clientPopup = `
          <div style="min-width:180px;padding:4px;font-family:sans-serif;">
            <div style="border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:6px;">
              <b style="font-size:13px;color:#1e40af;">🏠 Entrega: ${pedido.cliente}</b>
            </div>
            ${pedido.direccion ? `<div style="font-size:12px;color:#334155;margin-bottom:4px;">📍 ${pedido.direccion}</div>` : ''}
            <div style="font-size:11px;color:#64748b;">Cadete: <b>🛵 ${cadete.nombre}</b></div>
            ${pedido.total ? `<div style="font-size:11px;font-weight:bold;color:#0f172a;margin-top:2px;">Total: ${formatearPrecio(pedido.total)}</div>` : ''}
          </div>
        `

        if (markersRef.current.clientes[clientKey]) {
          markersRef.current.clientes[clientKey].setLatLng([clientLat, clientLng])
          markersRef.current.clientes[clientKey].setPopupContent(clientPopup)
        } else {
          markersRef.current.clientes[clientKey] = L.marker([clientLat, clientLng], {
            icon: clienteIcon,
            zIndexOffset: 200,
          })
            .addTo(map)
            .bindPopup(clientPopup)
        }

        // C) Línea de trayecto (Polyline): Cadete -> Cliente
        const startPoint: [number, number] = tieneGps && cadete.lat != null && cadete.lng != null
          ? [cadete.lat, cadete.lng]
          : [LOCAL_LAT, LOCAL_LNG]
        const endPoint: [number, number] = [clientLat, clientLng]
        const rutaCoords: [number, number][] = [startPoint, endPoint]

        if (markersRef.current.rutas[clientKey]) {
          markersRef.current.rutas[clientKey].setLatLngs(rutaCoords)
        } else {
          markersRef.current.rutas[clientKey] = L.polyline(rutaCoords, {
            color: '#2563EB',
            weight: 3.5,
            dashArray: '6, 8',
            opacity: 0.75,
          }).addTo(map)
        }
      }
    })

    // Limpiar clientes y rutas que ya fueron entregados
    Object.keys(markersRef.current.clientes).forEach((key) => {
      if (!activeClientOrderIds.has(key)) {
        markersRef.current.clientes[key].remove()
        delete markersRef.current.clientes[key]
      }
    })
    Object.keys(markersRef.current.rutas).forEach((key) => {
      if (!activeClientOrderIds.has(key)) {
        markersRef.current.rutas[key].remove()
        delete markersRef.current.rutas[key]
      }
    })
  }, [cadetes])

  // 3. Efecto de enfoque cuando el usuario selecciona un cadete en la lista lateral
  useEffect(() => {
    if (!focusedId || !mapInstanceRef.current) return
    const map = mapInstanceRef.current

    // Buscar marcador de cadete
    const cadeteMarker = markersRef.current.cadetes[focusedId]
    if (cadeteMarker) {
      map.flyTo(cadeteMarker.getLatLng(), 16, { animate: true, duration: 1 })
      cadeteMarker.openPopup()
      return
    }

    // O marcador de cliente
    const clientKey = `cliente_${focusedId}`
    const clientMarker = markersRef.current.clientes[clientKey]
    if (clientMarker) {
      map.flyTo(clientMarker.getLatLng(), 16, { animate: true, duration: 1 })
      clientMarker.openPopup()
    }
  }, [focusedId])

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[400px] z-0"
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    />
  )
}
