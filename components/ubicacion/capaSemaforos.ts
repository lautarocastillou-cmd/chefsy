// ─────────────────────────────────────────────────────────────────────────────
// components/ubicacion/capaSemaforos.ts
// Generador de capa minimalista de semáforos para Leaflet Maps (Cliente y Torre)
// ─────────────────────────────────────────────────────────────────────────────

import { SEMAFOROS_CATAMARCA } from '@/datos/semaforos'

export interface CapaSemaforosControl {
  layerGroup: any
  toggle: (mostrar: boolean) => void
  destruir: () => void
}

export function crearCapaSemaforos(L: any, map: any, inicialVisible = true): CapaSemaforosControl {
  const layerGroup = L.layerGroup()
  let visibleManual = inicialVisible

  const semaforoHtml = `
    <div class="semaforo-mini-capsule">
      <span class="semaforo-led red"></span>
      <span class="semaforo-led yellow"></span>
      <span class="semaforo-led green"></span>
    </div>
  `

  const semaforoIcon = L.divIcon({
    html: semaforoHtml,
    className: 'custom-semaforo-div-icon',
    iconSize: [12, 22],
    iconAnchor: [6, 11],
  })

  SEMAFOROS_CATAMARCA.forEach((sem) => {
    const marker = L.marker([sem.lat, sem.lng], {
      icon: semaforoIcon,
      interactive: true,
      zIndexOffset: 40,
    }).bindTooltip(
      `<div style="font-size:11px;font-weight:800;color:#0f172a;padding:2px 6px;white-space:nowrap;">🚦 ${sem.nombre}</div>`,
      { direction: 'top', offset: [0, -10], opacity: 0.95 }
    )
    layerGroup.addLayer(marker)
  })

  const actualizarPorZoom = () => {
    if (!visibleManual) {
      if (map.hasLayer(layerGroup)) map.removeLayer(layerGroup)
      return
    }

    const zoom = map.getZoom()
    // Visibles a partir de zoom 14 (cuando se ven las calles) para no saturar la vista general
    if (zoom >= 14) {
      if (!map.hasLayer(layerGroup)) {
        map.addLayer(layerGroup)
      }
    } else {
      if (map.hasLayer(layerGroup)) {
        map.removeLayer(layerGroup)
      }
    }
  }

  map.on('zoomend', actualizarPorZoom)
  actualizarPorZoom()

  return {
    layerGroup,
    toggle: (mostrar: boolean) => {
      visibleManual = mostrar
      actualizarPorZoom()
    },
    destruir: () => {
      map.off('zoomend', actualizarPorZoom)
      if (map.hasLayer(layerGroup)) {
        map.removeLayer(layerGroup)
      }
      layerGroup.clearLayers()
    },
  }
}
