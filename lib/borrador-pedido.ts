export interface AlmacenamientoBorrador {
  removeItem: (clave: string) => void
}

export function leerBorrador<T>(raw: string | null): T | null {
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as T : null
  } catch {
    return null
  }
}

/**
 * Un borrador representa una comanda pendiente, no un pedido recién creado.
 * Solo se consume cuando el formulario que lo restauró termina creando el pedido.
 */
export function limpiarBorradorTrasCrearPedido(
  almacenamiento: AlmacenamientoBorrador | undefined,
  clave: string,
  pedidoFueRestaurado: boolean,
): boolean {
  if (!almacenamiento || !pedidoFueRestaurado) return false

  try {
    almacenamiento.removeItem(clave)
    return true
  } catch {
    return false
  }
}
