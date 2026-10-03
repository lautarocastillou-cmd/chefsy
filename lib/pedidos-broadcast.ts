// ─────────────────────────────────────────────────────────────────────────────
// lib/pedidos-broadcast.ts
// Señal de "cambió algo en pedidos" para el panel en vivo.
//
// Ver lib/realtime-senal.ts para el porqué de la separación señal/dato y por
// qué el payload tiene que mantenerse mínimo.
// ─────────────────────────────────────────────────────────────────────────────

import { emitirSenal, crearClienteEscucha } from './realtime-senal'

const CANAL = 'chefsy-pedidos'

export type TipoCambioPedido = 'insert' | 'update' | 'delete' | 'archive'

/** Emite una señal de cambio de un pedido. */
export async function notificarCambioPedido(
  id: string,
  tipo: TipoCambioPedido
): Promise<void> {
  // Payload mínimo a propósito: ver nota de arriba.
  await emitirSenal(CANAL, 'cambio', { id, tipo })
}

/** Canal que escucha el navegador. Exportado para no duplicar el string. */
export const CANAL_PEDIDOS = CANAL

/** Cliente anónimo para escuchar el broadcast. */
export { crearClienteEscucha }
