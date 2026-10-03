// ─────────────────────────────────────────────────────────────────────────────
// lib/cadetes-broadcast.ts
// Señal de "cambió algo en cadetes" (turno, GPS, batería) para el panel en vivo.
//
// Existe por la misma razón que lib/pedidos-broadcast.ts: la tabla `cadetes`
// se cierra a `anon` por RLS porque contiene la ubicación en vivo y el teléfono
// de cada repartidor, y `postgres_changes` no funciona contra una tabla cerrada.
//
// Ver lib/realtime-senal.ts para el diseño de señal/dato.
// ─────────────────────────────────────────────────────────────────────────────

import { emitirSenal } from './realtime-senal'

const CANAL = 'chefsy-cadetes'

export type TipoCambioCadete = 'gps' | 'turno' | 'bateria'

/**
 * Emite una señal de cambio de un cadete.
 *
 * `id` va en el payload solo para diagnóstico/logs del cliente. No contiene
 * PII, pero sigue sin ser necesario para funcionar: el panel ignora el
 * contenido y vuelve a pedir la lista al servidor.
 */
export async function notificarCambioCadete(
  id: string,
  tipo: TipoCambioCadete
): Promise<void> {
  await emitirSenal(CANAL, 'cambio', { id, tipo })
}

/** Canal que escucha el navegador. */
export const CANAL_CADETES = CANAL
