import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://qrolvis.com'),
  title: {
    default: 'Qrolvis · Más reseñas en Google para tu negocio de Girona',
    template: '%s · Qrolvis',
  },
  description:
    'Tus clientes valoran su visita en 20 segundos con un QR en tu local, se les invita a reseñarte en Google y recibes un aviso inmediato si alguien se va descontento. Servicio local en Girona para hostelería y estética. Desde 35 €/mes.',
  keywords: [
    'reseñas Google Girona',
    'opiniones clientes QR',
    'encuestas satisfacción bar',
    'reseñas peluquería Girona',
    'código QR valoraciones',
  ],
  authors: [{ name: 'Sergi de Domingo i Rosas' }],
  alternates: {
    canonical: 'https://qrolvis.com',
  },
  openGraph: {
    type: 'website',
    url: 'https://qrolvis.com',
    siteName: 'Qrolvis',
    locale: 'es_ES',
    title: 'Qrolvis · Más reseñas en Google, y avisos antes de que sea tarde',
    description:
      'Tus clientes contentos no dejan reseña. Los enfadados, sí. Qrolvis le da la vuelta, en Girona.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const negocio = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Qrolvis',
  description:
    'Servicio de recogida de opiniones mediante QR y NFC para negocios de hostelería y estética en Girona.',
  url: 'https://qrolvis.com',
  email: 'soporte@qrolvis.com',
  telephone: '+34679702934',
  founder: { '@type': 'Person', name: 'Sergi de Domingo i Rosas' },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Quart',
    addressRegion: 'Girona',
    postalCode: '17242',
    addressCountry: 'ES',
  },
  areaServed: { '@type': 'City', name: 'Girona' },
  priceRange: '25 € - 60 €',
  inLanguage: ['es', 'ca'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(negocio) }}
        />
        {children}
      </body>
    </html>
  );
}
