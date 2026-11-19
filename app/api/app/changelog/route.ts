import { NextResponse } from 'next/server'

// Changelog interno de la app Flutter de cadetes.
// Se actualiza manualmente aquí para tener control de versiones sobre la app.
// Cada versión puede incluir: features, actualizaciones y correcciones.
const CHANGELOG = [
  {
    version: '1.0.6',
    build: 9,
    fecha: '2026-11-18',
    estado: 'publicada',
    cambios: [
      { tipo: 'correccion', texto: 'Corregido criterio online de cadetes: ahora se considera online solo si reportó GPS en los últimos 3 minutos y tiene coordenadas válidas.' },
      { tipo: 'correccion', texto: 'Corregido conteo de paradas en rastreo: entregas ya finalizadas ya no cuentan como paradas pendientes.' },
      { tipo: 'correccion', texto: 'Corregido header del cadete: ya no muestra "Pedido X de Y entregado" cuando va directo al domicilio (un solo pedido).' },
      { tipo: 'actualizacion', texto: 'Sistema de consumos de personal: se puede excluir personas que ya no trabajan sin borrar su historial de consumos.' },
      { tipo: 'actualizacion', texto: 'Timers de pedidos: ya no se reinician a 00:00 al pasar a "En Camino" ni al copiar el link de seguimiento.' },
    ],
  },
  {
    version: '1.0.5',
    build: 8,
    fecha: '2026-11-15',
    estado: 'publicada',
    cambios: [
      { tipo: 'feature', texto: 'Agregado panel de simulación de GPS para desarrolladores (doble tap en el logo).' },
      { tipo: 'feature', texto: 'Agregado informe de rendimiento de cadetes con velocidad y ranking.' },
      { tipo: 'actualizacion', texto: 'Polling de pedidos reducido a 3 segundos para sincronización inmediata.' },
    ],
  },
  {
    version: '1.0.4',
    build: 7,
    fecha: '2026-11-10',
    estado: 'publicada',
    cambios: [
      { tipo: 'feature', texto: 'Primera versión estable del portal de cadetes con rastreo GPS en segundo plano.' },
      { tipo: 'feature', texto: 'Asignación de pedidos, cambio de estado (listo/en camino/entregado) y pagos extras.' },
    ],
  },
]

export async function GET() {
  return NextResponse.json({ ok: true, versiones: CHANGELOG })
}
