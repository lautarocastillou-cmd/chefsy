import type { Metadata } from 'next'
import { obtenerDatosProductoParaLink } from '@/lib/productoDeepLink'
import RedireccionProductoCliente from '@/components/tienda/RedireccionProductoCliente'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const prod = await obtenerDatosProductoParaLink(id)

  if (!prod) {
    return {
      title: 'Chefsy Catamarca | Tienda Online',
      description: 'Pedí online las mejores hamburguesas, lomitos, pizzas y milanesas en Catamarca.',
    }
  }

  const titulo = `${prod.nombre} · Chefsy Catamarca`
  const descripcion = prod.descripcion
    ? `${prod.descripcion} · Precio: ${prod.precioFormateado}. ¡Pedilo online en Chefsy!`
    : `Pedí online ${prod.nombre} en Chefsy Catamarca por ${prod.precioFormateado}. Delivery rápido a tu puerta.`

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chefsy.xyz'
  const imagenUrl = prod.imagen.startsWith('http') ? prod.imagen : `${baseUrl}${prod.imagen}`

  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: `${prod.nombre} · ${prod.precioFormateado}`,
      description: descripcion,
      url: `${baseUrl}/p/${encodeURIComponent(id)}`,
      siteName: 'Chefsy Catamarca',
      images: [
        {
          url: imagenUrl,
          width: 800,
          height: 600,
          alt: prod.nombre,
        },
      ],
      locale: 'es_AR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${prod.nombre} · ${prod.precioFormateado}`,
      description: descripcion,
      images: [imagenUrl],
    },
  }
}

export default async function PaginaEnlaceCortoProducto({ params }: Props) {
  const { id } = await params
  const prod = await obtenerDatosProductoParaLink(id)
  const destino = `/tienda?p=${encodeURIComponent(prod?.id || id)}`

  return (
    <>
      <head>
        <meta httpEquiv="refresh" content={`0;url=${destino}`} />
      </head>
      <RedireccionProductoCliente
        destino={destino}
        nombreProducto={prod?.nombre}
        imagen={prod?.imagen}
        precioFormateado={prod?.precioFormateado}
      />
    </>
  )
}
