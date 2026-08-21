import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // El formulario público y el panel no deben aparecer en Google.
      disallow: ['/f/', '/admin', '/api/'],
    },
    sitemap: 'https://qrolvis.com/sitemap.xml',
  };
}
