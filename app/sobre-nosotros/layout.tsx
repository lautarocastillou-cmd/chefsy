import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sobre Nosotros | Chefsy Fast Food',
  description: 'Conocé nuestra historia, pasión por la comida rápida artesanal y compromiso con la calidad en Chefsy.',
  openGraph: {
    title: 'Sobre Nosotros | Chefsy Fast Food',
    description: 'Conocé nuestra historia, pasión por la comida rápida artesanal y compromiso con la calidad en Chefsy.',
    url: 'https://chefsy.xyz/sobre-nosotros',
    siteName: 'Chefsy Fast Food',
    images: [
      {
        url: 'https://chefsy.xyz/logo.jpg',
        width: 800,
        height: 600,
        alt: 'Chefsy Fast Food',
      },
    ],
    type: 'website',
  },
}

export default function SobreNosotrosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
