/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true, // Habilitar compresión Gzip explícitamente
  async headers() {
    return [
      {
        // Headers de seguridad globales
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=()' }
        ]
      },
      {
        // Caché agresiva (1 año) para assets estáticos en la carpeta public
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
    ]
  },
  images: {
    formats: ['image/avif', 'image/webp'], // Soportar formatos de nueva generación
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      }
    ],
  },
}

export default nextConfig
