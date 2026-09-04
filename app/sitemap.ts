import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://chefsy.xyz'
  // Fecha del último deploy relevante — actualizar al hacer cambios significativos de contenido
  const ultimaActualizacion = new Date('2026-09-04')

  return [
    {
      url: `${baseUrl}/`,
      lastModified: ultimaActualizacion,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/tienda`,
      lastModified: ultimaActualizacion,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: ultimaActualizacion,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: ultimaActualizacion,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
}
