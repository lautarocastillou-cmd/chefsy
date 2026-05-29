import { supabase } from '@/lib/supabase'
import { Pedido } from '@/tipos'

/**
 * Obtiene todos los pedidos ordenados de forma descendente (más nuevos primero)
 */
export async function obtenerPedidosHistoricos(): Promise<Pedido[]> {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error en Supabase al obtener pedidos:', error.message)
      throw new Error(error.message)
    }

    // Aseguramos un tipado estricto
    return (data as Pedido[]) || []
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al obtener pedidos'
    console.error('Error atrapado en la capa de servicios:', errorMessage)
    throw new Error(errorMessage)
  }
}
