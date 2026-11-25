import type { Metadata, Viewport } from 'next'
import VisorCartaPublica from '@/components/carta/VisorCartaPublica'
import { obtenerHojasVisibles } from '@/lib/carta-digital'
import {
  obtenerConfiguracionCartaServidor,
  obtenerEstadoHorarioCartaServidor,
} from '@/lib/carta-digital-servidor'

export const dynamic = 'force-dynamic'

// Bloqueo de zoom en móvil para que personas mayores no se pierdan ampliando la pantalla
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await obtenerConfiguracionCartaServidor()
  const hojasVisibles = obtenerHojasVisibles(config)
  const portada = hojasVisibles[0]?.imagenUrl || '/logo.jpg'

  return {
    title: {
      absolute: `${config.titulo} | Chefsy Catamarca`,
    },
    description: config.subtitulo,
    alternates: {
      canonical: 'https://chefsy.xyz/carta',
    },
    openGraph: {
      title: config.titulo,
      description: config.subtitulo,
      url: 'https://chefsy.xyz/carta',
      siteName: 'Chefsy Catamarca',
      locale: 'es_AR',
      type: 'website',
      images: [
        {
          url: portada,
          width: hojasVisibles[0]?.ancho || 800,
          height: hojasVisibles[0]?.alto || 800,
          alt: config.titulo,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: config.titulo,
      description: config.subtitulo,
      images: [portada],
    },
  }
}

export default async function PaginaCartaDigital() {
  const [config, estadoHorario] = await Promise.all([
    obtenerConfiguracionCartaServidor(),
    obtenerEstadoHorarioCartaServidor(),
  ])
  const hojasVisibles = obtenerHojasVisibles(config)

  return (
    <VisorCartaPublica
      config={config}
      hojas={hojasVisibles}
      estadoHorario={estadoHorario}
    />
  )
}
