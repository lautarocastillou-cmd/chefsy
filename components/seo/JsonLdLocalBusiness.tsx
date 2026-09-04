import React from 'react'

export default function JsonLdLocalBusiness() {
  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': ['FastFoodRestaurant', 'Restaurant'],
    '@id': 'https://chefsy.xyz/#restaurant',
    name: 'Chefsy',
    legalName: 'Chefsy Catamarca',
    alternateName: 'Chefsy Fast Food',
    description:
      'Pedí online las mejores hamburguesas, lomitos, pizzas y milanesas en San Fernando del Valle de Catamarca. Delivery rápido a domicilio y retiro en el local.',
    url: 'https://chefsy.xyz',
    logo: 'https://chefsy.xyz/logo.jpg',
    image: ['https://chefsy.xyz/logo.jpg'],
    telephone: '+54 383 422-5445',
    priceRange: '$$',
    servesCuisine: [
      'Hamburguesas',
      'Lomitos',
      'Pizzas',
      'Milanesas',
      'Papas Fritas',
      'Comida Rápida',
      'Fast Food',
      'Sandwiches',
    ],
    currenciesAccepted: 'ARS',
    paymentAccepted: 'Efectivo, Transferencia Bancaria, Mercado Pago',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'San Fernando del Valle de Catamarca',
      addressLocality: 'San Fernando del Valle de Catamarca',
      addressRegion: 'Catamarca',
      postalCode: '4700',
      addressCountry: 'AR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -28.462809031658047,
      longitude: -65.77850065400358,
    },
    areaServed: [
      {
        '@type': 'City',
        name: 'San Fernando del Valle de Catamarca',
      },
      {
        '@type': 'City',
        name: 'Catamarca',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Valle Viejo',
      },
    ],
    hasMenu: 'https://chefsy.xyz/tienda',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ],
        opens: '11:30',
        closes: '14:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ],
        opens: '20:30',
        closes: '25:00',
      },
    ],
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://chefsy.xyz/tienda',
        inLanguage: 'es-AR',
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
          'http://schema.org/IOSPlatform',
          'http://schema.org/AndroidPlatform',
        ],
      },
      result: {
        '@type': 'FoodEstablishmentReservation',
        name: 'Pedido Online Chefsy',
      },
    },
  }

  const webSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://chefsy.xyz/#website',
    url: 'https://chefsy.xyz',
    name: 'Chefsy',
    description: 'Hamburguesas, Lomos y Pizzas en Catamarca — Delivery Online',
    inLanguage: 'es-AR',
    publisher: {
      '@id': 'https://chefsy.xyz/#restaurant',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://chefsy.xyz/tienda',
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }}
      />
    </>
  )
}
