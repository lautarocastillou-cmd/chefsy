import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chefsy - Burgers, Lomos & Pizzas Catamarca',
    short_name: 'Chefsy',
    description: 'Pedí online las mejores hamburguesas, lomitos, pizzas y milanesas en San Fernando del Valle de Catamarca. Delivery rápido a tu puerta.',
    start_url: '/',
    display: 'standalone',
    background_color: '#102a20',
    theme_color: '#1a3d2e',
    lang: 'es-AR',
    categories: ['food', 'shopping', 'lifestyle'],
    icons: [
      {
        src: '/logo.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  }
}
