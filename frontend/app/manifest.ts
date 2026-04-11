import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mobile Phone Store',
    short_name: 'Mobile Store',
    description: 'Shop the latest mobile phones',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/images/placeholder.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
