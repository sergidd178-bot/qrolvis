import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const hoy = new Date();
  return [
    { url: 'https://qrolvis.com', lastModified: hoy, changeFrequency: 'monthly', priority: 1 },
    { url: 'https://qrolvis.com/aviso-legal', lastModified: hoy, changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://qrolvis.com/privacidad', lastModified: hoy, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
