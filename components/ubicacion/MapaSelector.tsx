'use client'

import { useEffect, useRef } from 'react'
import type { Map as MapaLeaflet, Marker as MarcadorLeaflet } from 'leaflet'
import { Coordenadas } from '@/tipos'

interface PropsMapaSelector {
  centro: Coordenadas
  coordenadas: Coordenadas | null
  onCoordenadasChange: (coordenadas: Coordenadas) => void
}

export default function MapaSelector({
  centro,
  coordenadas,
  onCoordenadasChange,
}: PropsMapaSelector) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<MapaLeaflet | null>(null)
  const marcadorRef = useRef<MarcadorLeaflet | null>(null)
  const estaDesmontadoRef = useRef(false)

  useEffect(() => {
    estaDesmontadoRef.current = false
    if (!contenedorRef.current || mapaRef.current) return

    let mapa: MapaLeaflet

    const iniciarMapa = async () => {
      const L = (await import('leaflet')).default

      if (estaDesmontadoRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const posicionInicial = coordenadas ?? centro

      if (estaDesmontadoRef.current || !contenedorRef.current) return

      // Limpieza preventiva si el elemento DOM de alguna manera conserva la propiedad interna de Leaflet
      if (contenedorRef.current && (contenedorRef.current as any)._leaflet_id) {
        delete (contenedorRef.current as any)._leaflet_id
      }

      try {
        mapa = L.map(contenedorRef.current, {
          center: [posicionInicial.latitud, posicionInicial.longitud],
          zoom: coordenadas ? 17 : 14,
        })
      } catch (error) {
        console.warn("Leaflet ya estaba inicializado o falló al crear el mapa:", error)
        return
      }

      if (estaDesmontadoRef.current) {
        mapa.remove()
        return
      }

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
      }).addTo(mapa)

      const marcador = L.marker([posicionInicial.latitud, posicionInicial.longitud], {
        draggable: true,
      }).addTo(mapa)

      const actualizarPosicion = (latitud: number, longitud: number) => {
        onCoordenadasChange({ latitud, longitud })
      }

      marcador.on('dragend', () => {
        const pos = marcador.getLatLng()
        actualizarPosicion(pos.lat, pos.lng)
      })

      mapa.on('click', (evento) => {
        marcador.setLatLng(evento.latlng)
        actualizarPosicion(evento.latlng.lat, evento.latlng.lng)
      })

      mapaRef.current = mapa
      marcadorRef.current = marcador

      if (!coordenadas) {
        actualizarPosicion(posicionInicial.latitud, posicionInicial.longitud)
      }
    }

    iniciarMapa()

    return () => {
      estaDesmontadoRef.current = true
      if (mapaRef.current) {
        mapaRef.current.remove()
        mapaRef.current = null
      }
      marcadorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={contenedorRef}
      className="h-64 w-full rounded-md border border-gray-300 z-0"
    />
  )
}
