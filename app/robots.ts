import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/sobre-nosotros',
          '/tienda-v2',
          '/terminos',
          '/privacidad',
        ],
        disallow: [
          '/api/',
          '/dashboard',
          '/pedidos',
          '/torre-control',
          '/cierre',
          '/cadeteria',
          '/nuevo-pedido',
          '/clientes',
          '/configuracion',
          '/configuracion/',
          '/dev-tools',
          '/cadete-en-vivo/',
          '/imprimir/',
          '/auth/',
        ],
      },
    ],
    sitemap: 'https://chefsy.xyz/sitemap.xml',
  }
}
