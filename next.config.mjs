/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true, // Habilitar compresión Gzip explícitamente
  poweredByHeader: false, // Ocultar tecnología del servidor
  async headers() {
    return [
      {
        // Headers de seguridad globales
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://images.unsplash.com https://res.cloudinary.com https://bdwgglizirgyuxfwssvc.supabase.co https://unpkg.com https://mt1.google.com https://lh3.googleusercontent.com https://drive.google.com; media-src 'self' https://bdwgglizirgyuxfwssvc.supabase.co; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; connect-src 'self' https://bdwgglizirgyuxfwssvc.supabase.co wss://bdwgglizirgyuxfwssvc.supabase.co https://nominatim.openstreetmap.org https://apis.google.com https://www.googleapis.com" }
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
      },
      {
        protocol: 'https',
        hostname: 'bdwgglizirgyuxfwssvc.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      }
    ],
  },
  async redirects() {
    return [
      {
        source: '/whatsapp',
        destination: 'https://wa.me/5493834225445',
        permanent: false,
      },
      {
        source: '/wa',
        destination: 'https://wa.me/5493834225445',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
