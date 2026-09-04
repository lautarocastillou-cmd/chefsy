import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://chefsy.xyz'
  const ahora = new Date()

  return [
    {
      url: `${baseUrl}/`,
      lastModified: ahora,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/sobre-nosotros`,
      lastModified: ahora,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tienda-v2`,
      lastModified: ahora,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: ahora,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: ahora,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
}
