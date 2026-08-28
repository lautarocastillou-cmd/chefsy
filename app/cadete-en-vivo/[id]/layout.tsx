import type { Metadata } from 'next'
import { supabaseAnon } from '@/lib/supabase'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params)
  const id = resolvedParams?.id || ''

  let titulo = '🛵 Seguimiento de Pedido en Vivo | Chefsy'
  let descripcion = 'Seguí el estado de tu pedido y la ubicación del repartidor en tiempo real en el mapa interactivo de Chefsy.'

  try {
    if (id) {
      const { data: pedido } = await supabaseAnon
        .from('pedidos')
        .select('id, cliente, estado')
        .eq('id', id)
        .maybeSingle()

      if (pedido) {
        const idCorto = String(pedido.id).slice(-4)
        const primerNombre = pedido.cliente ? pedido.cliente.trim().split(' ')[0] : ''
        
        titulo = primerNombre 
          ? `🛵 Pedido de ${primerNombre} (#${idCorto}) • Seguimiento en Vivo | Chefsy`
          : `🛵 Pedido #${idCorto} • Seguimiento en Vivo | Chefsy`

        const estadoMensajes: Record<string, string> = {
          nuevo: 'Tu pedido fue recibido y está en cola de cocina.',
          en_cocina: '¡Tu pedido se está preparando en cocina en este momento!',
          listo: '¡Tu pedido ya está listo y esperando al cadete!',
          en_camino: '¡El repartidor ya va en camino a tu domicilio! Mirá el mapa en vivo.',
          entregado: 'Pedido entregado. ¡Muchas gracias por elegir Chefsy!',
          cancelado: 'Pedido cancelado.',
        }

        if (pedido.estado && estadoMensajes[pedido.estado]) {
          descripcion = `${estadoMensajes[pedido.estado]} Hacé clic para ver el mapa y estado en tiempo real.`
        }
      }
    }
  } catch (_) {
    // Fallback a metadata por defecto si falla la consulta
  }

  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      url: `https://chefsy.xyz/cadete-en-vivo/${id}`,
      siteName: 'Chefsy Fast Food',
      images: [
        {
          url: 'https://chefsy.xyz/logo.jpg',
          width: 800,
          height: 600,
          alt: 'Seguimiento de Pedido Chefsy',
        },
      ],
      locale: 'es_AR',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: titulo,
      description: descripcion,
      images: ['https://chefsy.xyz/logo.jpg'],
    },
  }
}

export default function LayoutSeguimientoCadete({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
