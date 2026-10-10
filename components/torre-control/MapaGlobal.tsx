'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'
import MapaGlobalLeaflet, {
  type CadeteData,
  type MapaGlobalProps,
} from './MapaGlobalLeaflet'

const MapaGlobalMapLibre = dynamic(
  () => import('./MapaGlobalMapLibre'),
  { ssr: false }
)

export type { CadeteData, MapaGlobalProps }

/**
 * Fachada estable del mapa de Torre de Control.
 *
 * Leaflet sigue siendo el motor por defecto. Para probar MapLibre en forma
 * aislada, abrir /cadeteria?mapa=maplibre. Cualquier fallo fatal vuelve a
 * Leaflet; retirar el experimento no requiere cambiar la página ni su API.
 */
export default function MapaGlobal(props: MapaGlobalProps) {
  const [probarMapLibre, setProbarMapLibre] = useState(() =>
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mapa') === 'maplibre'
  )
  const [fallback, setFallback] = useState(false)
  const activarFallback = useCallback(() => setFallback(true), [])

  if (!probarMapLibre || fallback) {
    return (
      <div className="relative h-full w-full">
        <MapaGlobalLeaflet {...props} />
        {fallback && (
          <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md bg-amber-100/95 px-3 py-2 text-xs font-medium text-amber-950 shadow dark:bg-amber-950/95 dark:text-amber-100">
            MapLibre no pudo iniciar; se activó Leaflet automáticamente.
          </div>
        )}
      </div>
    )
  }

  return (
    <MapaGlobalMapLibre
      {...props}
      onFatalError={activarFallback}
    />
  )
}
